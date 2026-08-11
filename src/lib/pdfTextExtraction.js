import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createWorker } from "tesseract.js";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_CHARACTERS_PER_PAGE = 4_000;
const MIN_EMBEDDED_TEXT_CHARACTERS = 30;
const OCR_RENDER_SCALE = 2;

const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

export const extractPdfPageSections = async (file, onProgress) => {
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  const pageSections = [];
  let ocrWorker = null;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      let text = normalizeText(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );
      let usedOcr = false;

      // Scanned pages normally have no useful embedded text layer. Render only
      // those pages and use OCR, keeping ordinary PDFs fast.
      if (text.length < MIN_EMBEDDED_TEXT_CHARACTERS) {
        usedOcr = true;
        ocrWorker ??= await createWorker("eng");

        const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
          throw new Error("Your browser could not prepare this PDF for OCR.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({ canvasContext: context, viewport }).promise;

        const result = await ocrWorker.recognize(canvas);
        text = normalizeText(result.data.text);

        // Release the potentially large page bitmap as soon as OCR is done.
        canvas.width = 0;
        canvas.height = 0;
      }

      if (text) {
        pageSections.push(
          `[Page ${pageNumber}]\n${text.slice(0, MAX_CHARACTERS_PER_PAGE)}`,
        );
      }

      onProgress?.({
        currentPage: pageNumber,
        totalPages: pdf.numPages,
        usedOcr,
      });

      page.cleanup();
    }
  } finally {
    await ocrWorker?.terminate();
    await pdf.destroy();
  }

  if (pageSections.length === 0) {
    throw new Error(
      "No readable text was found in this PDF, even after image OCR.",
    );
  }

  return { pageSections, totalPages: pdf.numPages };
};
