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

const QUESTIONS_PER_BATCH = 25;
const MAX_PAGES_PER_BATCH = 25;
const MAX_CHARACTERS_PER_PAGE = 4_000;
const MAX_GENERATION_ATTEMPTS = 3;

const normalizeComparableText = (value: unknown) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().toLocaleLowerCase()
    : "";

async function generateQuestionBatch(
  geminiUrl: string,
  studyText: string,
  questionCount: number,
  batchNumber: number,
  totalBatches: number,
) {
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: `You are AralFlow, an AI exam generator. Create a practice exam ONLY from the supplied study material. Do not invent facts, and ensure every question and answer is supported by the labelled pages in this section. Generate EXACTLY ${questionCount} different multiple-choice questions, using factual, conceptual, comprehension, and application questions where the source supports them. Each question must have a question, exactly 4 choices, an answer that exactly matches a choice, and a short explanation. Return ONLY valid JSON in this format: {"questions":[{"question":"Question text","choices":["Choice A","Choice B","Choice C","Choice D"],"answer":"Choice A","explanation":"Short explanation"}]}. This is batch ${batchNumber} of ${totalBatches}; do not repeat questions from other sections.`,
        }],
      },
      contents: [{
        role: "user",
        parts: [{ text: `Create exactly ${questionCount} questions from this study-material section:\n\n${studyText}` }],
      }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
        maxOutputTokens: 16_384,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}

async function generateCompleteBatch(
  geminiUrl: string,
  studyText: string,
  questionCount: number,
  batchNumber: number,
  totalBatches: number,
) {
  let lastCount = 0;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const batch = await generateQuestionBatch(
        geminiUrl,
        studyText,
        questionCount,
        batchNumber,
        totalBatches,
      );

      lastCount = Array.isArray(batch?.questions) ? batch.questions.length : 0;

      if (lastCount >= questionCount) {
        return batch.questions.slice(0, questionCount);
      }

      lastError = new Error(
        `Gemini generated only ${lastCount} of ${questionCount} questions.`,
      );
    } catch (error) {
      lastError = error;
    }

    console.warn(
      `Batch ${batchNumber} attempt ${attempt} failed:`,
      lastError,
    );

    if (attempt < MAX_GENERATION_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  const reason = lastError instanceof Error
    ? lastError.message
    : `Gemini generated only ${lastCount} of ${questionCount} questions.`;
  throw new Error(`Batch ${batchNumber} failed after retries: ${reason}`);
}

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
    const mode = body?.mode === "update" ? "update" : "create";
    const materialId = body?.materialId;

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

    if (!Number.isInteger(questionCount) || questionCount < 10 || questionCount > 150) {
      throw new Error("questionCount must be a whole number between 10 and 150.");
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

    const { totalPages, text: pageTexts } = await extractText(pdf);

    console.log("Pages:", totalPages);

    const readablePages = pageTexts
      .map((pageText, index) => ({
        pageNumber: index + 1,
        text: pageText.replace(/\s+/g, " ").trim(),
      }))
      .filter((page) => page.text.length > 0);

    console.log("Readable pages:", readablePages.length);

    if (readablePages.length === 0) {
      throw new Error(
        "No readable text was found in this PDF. The PDF may be scanned or contain only images.",
      );
    }

    // -----------------------------------------
    // 9. Prepare study material
    // -----------------------------------------

    // Keep page boundaries so every part of a long document can be sampled.
    // A bounded excerpt per page lets the model cover 300+ pages without
    // sending one oversized prompt that would drop material near the end.
    const pageSections = readablePages.map((page) =>
      `[Page ${page.pageNumber}]\n${page.text.slice(0, MAX_CHARACTERS_PER_PAGE)}`,
    );

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

    const totalBatches = Math.ceil(questionCount / QUESTIONS_PER_BATCH);
    const batchPromises = Array.from({ length: totalBatches }, (_, batchIndex) => {
      const generatedBefore = batchIndex * QUESTIONS_PER_BATCH;
      const batchQuestionCount = Math.min(
        QUESTIONS_PER_BATCH,
        questionCount - generatedBefore,
      );
      const sectionStart = Math.floor(
        (batchIndex / totalBatches) * pageSections.length,
      );
      const sectionEnd = Math.ceil(
        ((batchIndex + 1) / totalBatches) * pageSections.length,
      );
      const availableSection = pageSections.slice(sectionStart, sectionEnd);
      const sectionStep = Math.max(
        1,
        Math.ceil(availableSection.length / MAX_PAGES_PER_BATCH),
      );
      const studySection = availableSection
        .filter((_, index) => index % sectionStep === 0)
        .slice(0, MAX_PAGES_PER_BATCH)
        .join("\n\n");

      console.log(`Generating batch ${batchIndex + 1} of ${totalBatches}`);

      return generateCompleteBatch(
        geminiUrl,
        studySection,
        batchQuestionCount,
        batchIndex + 1,
        totalBatches,
      );
    });

    // Six 25-question requests are enough for the 150-item option. Running
    // them together avoids the Edge Function timing out on sequential calls.
    const questions = (await Promise.all(batchPromises)).flat();

    const exam = { title: "Practice Exam", questions };

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

      // Gemini occasionally changes only the case or whitespace of the answer.
      // Store the exact choice text so the exam UI can always match it reliably.
      const directMatch = question.choices.find(
        (choice: unknown) =>
          normalizeComparableText(choice) ===
          normalizeComparableText(question.answer),
      );
      const answerLabel = normalizeComparableText(question.answer).match(
        /^(?:choice|option)?\s*([a-d])(?:[).:]|\s|$)/,
      )?.[1];
      const matchingChoice =
        directMatch ||
        (answerLabel ? question.choices[answerLabel.charCodeAt(0) - 97] : null);

      if (!matchingChoice) {
        throw new Error("A generated answer does not match its choices.");
      }

      question.answer = matchingChoice;
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

    if (mode === "update" && !materialId) {
      throw new Error("materialId is required when updating an exam.");
    }

    const materialQuery = supabase.from("study_materials");
    const materialValues = {
      user_id: user.id,
      file_name: fileName,
      file_path: filePath,
      question_count: questionCount,
      exam,
    };
    const saveQuery = mode === "update"
      ? materialQuery
        .update(materialValues)
        .eq("id", materialId)
        .eq("user_id", user.id)
      : materialQuery.insert(materialValues);
    const { data: material, error: insertError } = await saveQuery
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
        // Keep application errors in the JSON body. A non-2xx response makes
        // supabase-js replace this useful message with a generic FunctionsHttpError.
        status: 200,
        headers: jsonHeaders,
      },
    );
  }
});
