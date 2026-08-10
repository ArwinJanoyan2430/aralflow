import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

import { extractText, getDocumentProxy } from "npm:unpdf@1.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  console.log("=== process-pdf started ===");

  // -----------------------------------------
  // CORS
  // -----------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // -----------------------------------------
    // 1. Read request
    // -----------------------------------------

    const body = await req.json();

    const filePath = body?.filePath;

    const questionCount = Number(body?.questionCount ?? 10);

    console.log("Request:", {
      filePath,
      questionCount,
    });

    if (!filePath) {
      throw new Error("filePath is required.");
    }

    // -----------------------------------------
    // 2. Validate question count
    // -----------------------------------------

    const allowedCounts = [10, 50, 60, 100];

    if (!allowedCounts.includes(questionCount)) {
      throw new Error("questionCount must be 10, 50, 60, or 100.");
    }

    console.log(`Generating ${questionCount} questions`);

    // -----------------------------------------
    // 3. Supabase
    // -----------------------------------------

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is missing.");
    }

    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // -----------------------------------------
    // 4. Get authenticated user
    // -----------------------------------------

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Authorization header is missing.");
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("User error:", userError);

      throw new Error("Unable to identify the authenticated user.");
    }

    console.log("Authenticated user:", user.id);

    // -----------------------------------------
    // 5. Make sure file belongs to user
    // -----------------------------------------

    if (!filePath.startsWith(`${user.id}/`)) {
      throw new Error("You do not have permission to access this file.");
    }

    // -----------------------------------------
    // 6. Download PDF
    // -----------------------------------------

    console.log("Downloading PDF:", filePath);

    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from("study-materials")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);

      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    if (!pdfFile) {
      throw new Error("PDF was not found.");
    }

    console.log(`PDF downloaded: ${pdfFile.size} bytes`);

    // -----------------------------------------
    // 7. Convert PDF
    // -----------------------------------------

    const arrayBuffer = await pdfFile.arrayBuffer();

    const pdfData = new Uint8Array(arrayBuffer);

    // -----------------------------------------
    // 8. Extract text
    // -----------------------------------------

    console.log("Extracting PDF text...");

    const pdf = await getDocumentProxy(pdfData);

    const { totalPages, text } = await extractText(pdf, {
      mergePages: true,
    });

    console.log("Pages:", totalPages);

    console.log("Characters:", text?.length ?? 0);

    if (!text || !text.trim()) {
      throw new Error(
        "No readable text was found in this PDF. The PDF may be scanned or contain only images.",
      );
    }

    // -----------------------------------------
    // 9. Prepare study material
    // -----------------------------------------

    const studyText = text.replace(/\s+/g, " ").trim().slice(0, 60000);

    console.log("Study text length:", studyText.length);

    // -----------------------------------------
    // 10. Gemini API key
    // -----------------------------------------

    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is missing.");
    }

    // -----------------------------------------
    // 11. Gemini URL
    // -----------------------------------------

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`;

    console.log("Sending request to Gemini...");

    // -----------------------------------------
    // 12. Gemini request
    // -----------------------------------------

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `
You are AralFlow, an AI exam generator.

Create a practice exam ONLY from the supplied study material.

Do NOT invent facts that are not supported by the study material.

Generate EXACTLY ${questionCount} multiple-choice questions.

Every question MUST contain:

- question
- choices
- answer
- explanation

Each question MUST have exactly 4 choices.

The answer MUST exactly match one of the choices.

Questions must be different from each other.

Use a mixture of:

- factual questions
- conceptual questions
- comprehension questions
- application questions

Do not repeat questions.

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "Practice Exam",
  "questions": [
    {
      "question": "Question text",
      "choices": [
        "Choice A",
        "Choice B",
        "Choice C",
        "Choice D"
      ],
      "answer": "Choice A",
      "explanation": "Short explanation"
    }
  ]
}
                `.trim(),
            },
          ],
        },

        contents: [
          {
            role: "user",

            parts: [
              {
                text: `
Create exactly ${questionCount} multiple-choice questions from this study material:

${studyText}
                  `.trim(),
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });

    // -----------------------------------------
    // 13. Check Gemini response
    // -----------------------------------------

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      console.error("Gemini error:", errorText);

      throw new Error(`Gemini request failed: ${errorText}`);
    }

    // -----------------------------------------
    // 14. Read Gemini response
    // -----------------------------------------

    const geminiData = await geminiResponse.json();

    console.log("Gemini response received.");

    const content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("Gemini response:", JSON.stringify(geminiData, null, 2));

      throw new Error("Gemini returned an empty response.");
    }

    // -----------------------------------------
    // 15. Parse JSON
    // -----------------------------------------

    let exam;

    try {
      exam = JSON.parse(content);
    } catch {
      console.error("Invalid Gemini JSON:", content);

      throw new Error("Gemini returned invalid JSON.");
    }

    // -----------------------------------------
    // 16. Validate exam
    // -----------------------------------------

    if (!exam || !Array.isArray(exam.questions)) {
      throw new Error("Gemini did not generate valid questions.");
    }

    if (exam.questions.length < questionCount) {
      throw new Error(
        `Gemini generated only ${exam.questions.length} questions instead of ${questionCount}.`,
      );
    }

    if (exam.questions.length > questionCount) {
      console.warn(
        `Gemini generated ${exam.questions.length} questions. Trimming to ${questionCount}.`,
      );

      exam.questions = exam.questions.slice(0, questionCount);
    }

    for (const question of exam.questions) {
      if (
        !question.question ||
        !Array.isArray(question.choices) ||
        question.choices.length !== 4 ||
        !question.answer ||
        !question.explanation
      ) {
        throw new Error("One or more generated questions are invalid.");
      }

      if (!question.choices.includes(question.answer)) {
        throw new Error("A generated answer does not match its choices.");
      }
    }

    console.log(`Generated ${exam.questions.length} questions.`);

    // -----------------------------------------
    // 17. Get filename
    // -----------------------------------------

    const fileName = filePath.split("/").pop() || "study-material.pdf";

    // -----------------------------------------
    // 18. Save material + exam
    // -----------------------------------------

    console.log("Saving exam to study_materials...");

    const { data: material, error: insertError } = await supabase
      .from("study_materials")
      .insert({
        user_id: user.id,
        file_name: fileName,
        file_path: filePath,
        question_count: questionCount,
        exam,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);

      throw new Error(`Failed to save exam: ${insertError.message}`);
    }

    console.log("Saved material:", material.id);

    // -----------------------------------------
    // 19. Return result
    // -----------------------------------------

    return new Response(
      JSON.stringify({
        success: true,

        exam,

        materialId: material.id,

        filePath,

        fileName,

        pages: totalPages,

        questionCount,

        message: "PDF processed and practice exam generated successfully.",
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error("=== PROCESS PDF ERROR ===", error);

    return new Response(
      JSON.stringify({
        success: false,

        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: jsonHeaders,
      },
    );
  }
});