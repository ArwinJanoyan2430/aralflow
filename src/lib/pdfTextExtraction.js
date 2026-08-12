// Use PDF.js's compatibility build so PDF uploads also work in Safari/iOS
// versions that do not yet implement the newest Iterator, Map, and Promise
// APIs used by the modern build.
import PdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker";

const MAX_CHARACTERS_PER_PAGE = 4_000;
const MIN_EMBEDDED_TEXT_CHARACTERS = 30;
const OCR_RENDER_SCALE = 2;

let pdfWorker;

const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

export const extractPdfPageSections = async (file, onProgress) => {
  // PDF.js is large, so load it only when the user processes a PDF instead of
  // including it in the app's initial JavaScript bundle.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Let Vite create and serve the worker. Passing a URL to PDF.js can make the
  // dev server resolve it as a normal dynamic import (`?import`), which causes
  // PDF.js to fall back to its fake worker when that request fails.
  pdfWorker ??= new PdfWorker();
  pdfjs.GlobalWorkerOptions.workerPort = pdfWorker;

  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pageSections = [];
  let ocrWorker = null;

  try {
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
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
        if (!ocrWorker) {
          // Tesseract is even heavier and is needed only for scanned pages.
          const { createWorker } = await import("tesseract.js");
          ocrWorker = await createWorker("eng");
        }

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
        totalPages,
        usedOcr,
      });

      page.cleanup?.();
    }
  } finally {
    await ocrWorker?.terminate();
    // destroy() belongs to PDFDocumentLoadingTask in this PDF.js build, not
    // consistently to the resolved PDFDocumentProxy.
    if (typeof loadingTask.destroy === "function") {
      await loadingTask.destroy();
    } else {
      await pdf.cleanup?.();
    }
  }

  if (pageSections.length === 0) {
    throw new Error(
      "No readable text was found in this PDF, even after image OCR.",
    );
  }

  return { pageSections, totalPages };
};
