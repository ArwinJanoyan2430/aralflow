import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const MAX_INPUT_CHARACTERS = 350_000;

const styleInstructions: Record<string, string> = {
  reviewer:
    "Create an exam-focused reviewer with concepts, definitions, relationships, and likely points of confusion.",
  outline:
    "Create a clean hierarchical outline that follows the logical structure of the material.",
  beginner:
    "Explain the material in simple language for a beginner while preserving important technical terms.",
};

const detailSections: Record<string, number> = {
  concise: 4,
  balanced: 7,
  detailed: 10,
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const materialId = body?.materialId;
    const filePath = body?.filePath;
    const style = styleInstructions[body?.style] ? body.style : "reviewer";
    const detail = detailSections[body?.detail] ? body.detail : "balanced";
    const pageSections = Array.isArray(body?.pageSections)
      ? body.pageSections.filter((section: unknown) =>
        typeof section === "string" && section.trim().length > 0
      )
      : [];

    if (!materialId || !filePath) {
      throw new Error("A saved study material is required.");
    }

    if (
      pageSections.length === 0 ||
      pageSections.some((section: string) => section.length > 4_100)
    ) {
      throw new Error("Readable PDF page text is required.");
    }

    const studyText = pageSections.join("\n\n");

    if (studyText.length > MAX_INPUT_CHARACTERS) {
      throw new Error("This PDF contains too much text to generate notes at once.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
      throw new Error("The notes service is not configured.");
    }

    if (!authHeader) throw new Error("Authorization header is missing.");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unable to identify the authenticated user.");
    }

    if (!filePath.startsWith(`${user.id}/`)) {
      throw new Error("You do not have permission to access this PDF.");
    }

    const { data: material, error: materialError } = await supabase
      .from("study_materials")
      .select("id")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .eq("file_path", filePath)
      .maybeSingle();

    if (materialError || !material) {
      throw new Error("The PDF was not found in your library.");
    }

    const sectionCount = detailSections[detail];
    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`;
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              `You are AralFlow's study-notes writer. Use ONLY the supplied PDF text. ${styleInstructions[style]} Produce useful, accurate notes with at most ${sectionCount} main sections. Preserve the [Page N] labels as source references. Never invent unsupported facts. Keep key points concise and use plain text, not Markdown, inside JSON fields.`,
          }],
        },
        contents: [{
          role: "user",
          parts: [{
            text: `Generate ${detail} ${style} notes from this PDF:\n\n${studyText}`,
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            required: ["title", "overview", "sections", "keyTerms", "recap"],
            properties: {
              title: { type: "string" },
              overview: { type: "string" },
              sections: {
                type: "array",
                minItems: 1,
                maxItems: sectionCount,
                items: {
                  type: "object",
                  required: ["heading", "summary", "keyPoints", "sourcePages"],
                  properties: {
                    heading: { type: "string" },
                    summary: { type: "string" },
                    keyPoints: {
                      type: "array",
                      minItems: 1,
                      items: { type: "string" },
                    },
                    sourcePages: { type: "string" },
                  },
                },
              },
              keyTerms: {
                type: "array",
                items: {
                  type: "object",
                  required: ["term", "definition"],
                  properties: {
                    term: { type: "string" },
                    definition: { type: "string" },
                  },
                },
              },
              recap: {
                type: "array",
                minItems: 1,
                items: { type: "string" },
              },
            },
          },
          maxOutputTokens: detail === "detailed" ? 12_288 : 8_192,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed: ${await response.text()}`);
    }

    const geminiData = await response.json();
    const content = geminiData?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: unknown }) =>
        typeof part.text === "string" ? part.text : ""
      )
      .join("")
      .trim();

    if (!content) throw new Error("The AI returned empty notes.");

    const notes = JSON.parse(
      content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""),
    );

    const { data: savedNote, error: saveError } = await supabase
      .from("generated_notes")
      .insert({
        user_id: user.id,
        material_id: materialId,
        title: notes.title,
        style,
        detail,
        content: notes,
      })
      .select("id, material_id, title, style, detail, content, created_at")
      .single();

    if (saveError || !savedNote) {
      throw new Error(
        `Failed to save generated notes: ${saveError?.message || "Unknown error"}`,
      );
    }

    return new Response(JSON.stringify({ success: true, notes, savedNote }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to generate notes.";

    console.error("generate-notes error:", error);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
});
