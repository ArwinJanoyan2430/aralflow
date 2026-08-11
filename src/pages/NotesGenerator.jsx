import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Library,
  LoaderCircle,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { extractPdfPageSections } from "../lib/pdfTextExtraction";
import { supabase } from "../lib/supabase";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const formatFileSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getSafeFileName = (name) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");

const displayFileName = (fileName) =>
  fileName?.replace(/^\d+(?:-\d+)?-/, "") || "Study material.pdf";

const notesToMarkdown = (notes) => {
  const sections = notes.sections
    .map(
      (section) =>
        `## ${section.heading}\n\n${section.summary}\n\n${section.keyPoints
          .map((point) => `- ${point}`)
          .join("\n")}\n\n_Source: ${section.sourcePages}_`,
    )
    .join("\n\n");
  const keyTerms = notes.keyTerms
    .map(({ term, definition }) => `- **${term}:** ${definition}`)
    .join("\n");
  const recap = notes.recap.map((item) => `- ${item}`).join("\n");

  return `# ${notes.title}\n\n${notes.overview}\n\n${sections}\n\n## Key terms\n\n${keyTerms}\n\n## Quick recap\n\n${recap}`;
};

function NotesGenerator({ initialMaterial = null }) {
  const fileInputRef = useRef(null);
  const extractionCacheRef = useRef(null);
  const customizeNotesRef = useRef(null);
  const generatedNotesRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedMaterial, setUploadedMaterial] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noteStyle, setNoteStyle] = useState("reviewer");
  const [detailLevel, setDetailLevel] = useState("balanced");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [isLoadingLibraryPdf, setIsLoadingLibraryPdf] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [notesLibrary, setNotesLibrary] = useState([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);

  useEffect(() => {
    if (!showGuide) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowGuide(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showGuide]);

  useEffect(() => {
    let cancelled = false;

    const loadNotesLibrary = async () => {
      const { data, error } = await supabase
        .from("generated_notes")
        .select("id, material_id, title, style, detail, content, created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Notes library failed to load:", error);
        setErrorMessage("Could not load your notes library.");
      } else {
        setNotesLibrary(data || []);
      }

      setIsLoadingNotes(false);
    };

    loadNotesLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const material = initialMaterial;

    if (!material?.id || !material?.file_path) return;

    let cancelled = false;

    const loadLibraryPdf = async () => {
      setIsLoadingLibraryPdf(true);
      setErrorMessage("");

      try {
        const { data: pdfBlob, error } = await supabase.storage
          .from("study-materials")
          .download(material.file_path);

        if (error || !pdfBlob) {
          throw new Error(error?.message || "Could not download this PDF.");
        }

        if (cancelled) return;

        const originalName = displayFileName(material.file_name);
        const sourceFile = new File([pdfBlob], originalName, {
          type: "application/pdf",
        });

        setUploadedMaterial({
          ...material,
          originalName,
          size: sourceFile.size,
          sourceFile,
        });
        extractionCacheRef.current = null;
      } catch (error) {
        if (!cancelled) {
          console.error("Library PDF download failed:", error);
          setErrorMessage(error?.message || "Could not load this PDF.");
        }
      } finally {
        if (!cancelled) setIsLoadingLibraryPdf(false);
      }
    };

    loadLibraryPdf();

    return () => {
      cancelled = true;
    };
  }, [initialMaterial]);

  const selectFile = (file) => {
    setErrorMessage("");
    setUploadedMaterial(null);
    setGeneratedNotes(null);
    extractionCacheRef.current = null;

    if (!file) return;

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setErrorMessage("Please choose a PDF file.");
      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setErrorMessage("This PDF is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setErrorMessage("PDF must be smaller than 50 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (!isUploading) selectFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;

    const fileToUpload = selectedFile;
    setIsUploading(true);
    setErrorMessage("");

    let uploadedPath = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in to upload a PDF.");

      const safeName = getSafeFileName(fileToUpload.name);
      const storedName = `${fileToUpload.lastModified}-${fileToUpload.size}-${safeName}`;
      const filePath = `${user.id}/${storedName}`;
      const { data: storageFile, error: storageError } = await supabase.storage
        .from("study-materials")
        .upload(filePath, fileToUpload, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) throw storageError;
      uploadedPath = storageFile.path;

      // Empty questions mark this as a PDF-only library item. An exam can be
      // generated from it later without uploading the same file again.
      const { data: material, error: materialError } = await supabase
        .from("study_materials")
        .insert({
          user_id: user.id,
          file_name: storedName,
          file_path: storageFile.path,
          question_count: 0,
          exam: { title: "Practice Exam", questions: [] },
        })
        .select("id, file_name, file_path, created_at")
        .single();

      if (materialError) throw materialError;

      const uploaded = {
        ...material,
        originalName: fileToUpload.name,
        size: fileToUpload.size,
        sourceFile: fileToUpload,
      };

      setUploadedMaterial(uploaded);
      extractionCacheRef.current = null;
      setSelectedFile(null);
      toast.success("PDF added to your library!");
      return uploaded;
    } catch (error) {
      console.error("Notes PDF upload failed:", error);

      // Avoid leaving an orphaned Storage object when the database insert fails.
      if (uploadedPath) {
        await supabase.storage.from("study-materials").remove([uploadedPath]);
      }

      setErrorMessage(error?.message || "Could not upload this PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  const getFunctionErrorMessage = async (functionError) => {
    if (functionError?.context instanceof Response) {
      try {
        const body = await functionError.context.json();
        if (body?.error) return body.error;
      } catch {
        // Use the SDK error below if the response body is not JSON.
      }
    }

    return functionError?.message || "Could not generate notes.";
  };

  const extractUploadedPdf = async (material, setStatus) => {
    if (!material?.sourceFile) {
      throw new Error("Please upload a PDF first.");
    }

    if (extractionCacheRef.current?.materialId === material.id) {
      setStatus("Using prepared PDF text...");
      return extractionCacheRef.current.extraction;
    }

    const extraction = await extractPdfPageSections(
      material.sourceFile,
      ({ currentPage, totalPages: pageCount, usedOcr }) => {
        setStatus(
          `${usedOcr ? "Reading image text" : "Reading PDF"} · page ${currentPage} of ${pageCount}`,
        );
      },
    );

    extractionCacheRef.current = {
      materialId: material.id,
      extraction,
    };

    return extraction;
  };

  const generateNotesForMaterial = async (material) => {
    if (!material?.sourceFile || isGenerating) return;

    setIsGenerating(true);
    setGeneratedNotes(null);
    setErrorMessage("");
    setGenerationStatus("Reading PDF...");

    try {
      const { pageSections, totalPages } = await extractUploadedPdf(
        material,
        setGenerationStatus,
      );

      setGenerationStatus("Writing your notes...");

      const { data, error } = await supabase.functions.invoke(
        "generate-notes",
        {
          body: {
            materialId: material.id,
            filePath: material.file_path,
            pageSections,
            totalPages,
            style: noteStyle,
            detail: detailLevel,
          },
        },
      );

      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (!data?.success || !data.notes) {
        throw new Error(data?.error || "The AI returned no notes.");
      }

      setGeneratedNotes(data.notes);
      setActiveNoteId(data.savedNote?.id || null);
      if (data.savedNote) {
        setNotesLibrary((previous) => [
          data.savedNote,
          ...previous.filter((note) => note.id !== data.savedNote.id),
        ]);
      }
      toast.success("Your notes are ready!");
      requestAnimationFrame(() => {
        generatedNotesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      console.error("Notes generation failed:", error);
      setErrorMessage(error?.message || "Could not generate notes.");
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  const handleGenerateNotes = () => generateNotesForMaterial(uploadedMaterial);

  const handleCreateNotesFromSelected = async () => {
    const material = await handleUpload();
    if (!material) return;

    requestAnimationFrame(() => {
      customizeNotesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleCopyNotes = async () => {
    if (!generatedNotes) return;
    await navigator.clipboard.writeText(notesToMarkdown(generatedNotes));
    toast.success("Notes copied!");
  };

  const handleDownloadNotes = () => {
    if (!generatedNotes) return;

    const blob = new Blob([notesToMarkdown(generatedNotes)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getSafeFileName(generatedNotes.title || "study-notes")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadLibraryNote = (note) => {
    const blob = new Blob([notesToMarkdown(note.content)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getSafeFileName(note.title || "study-notes")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenLibraryNote = (note) => {
    setGeneratedNotes(note.content);
    setActiveNoteId(note.id);
    requestAnimationFrame(() => {
      generatedNotesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleDeleteNote = async (note) => {
    const confirmed = window.confirm(`Delete "${note.title}"?`);
    if (!confirmed || deletingNoteId) return;

    setDeletingNoteId(note.id);

    try {
      const { error } = await supabase
        .from("generated_notes")
        .delete()
        .eq("id", note.id);

      if (error) throw error;

      setNotesLibrary((previous) =>
        previous.filter((libraryNote) => libraryNote.id !== note.id),
      );

      if (activeNoteId === note.id) {
        setGeneratedNotes(null);
        setActiveNoteId(null);
      }

      toast.success("Note deleted.");
    } catch (error) {
      console.error("Delete note failed:", error);
      setErrorMessage(error?.message || "Could not delete this note.");
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-20 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-white sm:px-6">
        <section className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="ibm-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Notes generator
            </p>
            <h1 className="pixel-font mt-4 text-3xl leading-tight sm:text-5xl">
              From PDF to notes!
            </h1>
            <p className="inter-font mx-auto mt-5 max-w-xl text-sm leading-7 text-zinc-500 dark:text-zinc-400 sm:text-base">
              Upload your study material now. It will be saved to your library
              and ready for note generation.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-[32px] border border-zinc-200 bg-white p-3 shadow-[0_25px_80px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isUploading) setIsDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsDragging(false);
                }
              }}
              onDrop={handleDrop}
              className={`rounded-[26px] border-2 border-dashed px-6 py-12 text-center transition sm:px-10 sm:py-14 ${
                isDragging
                  ? "border-zinc-950 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                  : "border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-950/40"
              }`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 dark:bg-white dark:text-zinc-950">
                <UploadCloud size={26} />
              </div>

              <h2 className="pixel-font mt-6 text-lg sm:text-xl">
                {isLoadingLibraryPdf ? "Loading your PDF..." : "Drop your PDF here"}
              </h2>
              <p className="inter-font mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                or choose a file from your device
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile && (
                <button
                  type="button"
                  disabled={isUploading || isLoadingLibraryPdf}
                  onClick={() => fileInputRef.current?.click()}
                  className="inter-font mt-7 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {isLoadingLibraryPdf ? "Loading..." : "Choose PDF"}
                </button>
              )}

              {selectedFile && (
                <div className="mx-auto mt-7 max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-700 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <FileText size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="inter-font truncate text-sm font-semibold">
                        {selectedFile.name}
                      </p>
                      <p className="ibm-mono mt-1 text-[9px] uppercase tracking-wider text-zinc-400">
                        {formatFileSize(selectedFile.size)} · PDF
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => setSelectedFile(null)}
                      aria-label="Remove selected PDF"
                      className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleCreateNotesFromSelected}
                    className="inter-font mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {isUploading ? "Preparing PDF..." : "Create notes"}
                    {!isUploading && <ArrowRight size={16} />}
                  </button>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleUpload}
                    className="inter-font mt-2 flex w-full items-center justify-center rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {isUploading ? "Adding to library..." : "Add to library"}
                  </button>
                </div>
              )}

              {errorMessage && (
                <p className="inter-font mt-5 text-sm text-red-500 dark:text-red-400">
                  {errorMessage}
                </p>
              )}

              <p className="ibm-mono mt-5 text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                PDF only · Maximum 50 MB
              </p>
            </div>
          </div>

          {uploadedMaterial && (
            <div className="mx-auto mt-5 max-w-5xl space-y-5">
              <div className="mx-auto flex max-w-2xl items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="inter-font truncate text-sm font-semibold">
                    {uploadedMaterial.originalName}
                  </p>
                </div>
                <a
                  href="/#materials"
                  className="inter-font shrink-0 text-xs font-semibold text-zinc-600 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  View library
                </a>
              </div>

              <div ref={customizeNotesRef} className="mx-auto max-w-2xl scroll-mt-28">
              <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <p className="ibm-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Customize notes
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGuide(true)}
                    className="inter-font rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    View guide
                  </button>
                </div>

                <div className="mt-5">
                  <p className="inter-font text-xs font-semibold">Note style</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      ["reviewer", "Reviewer"],
                      ["outline", "Outline"],
                      ["beginner", "Simple"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setNoteStyle(value)}
                        className={`inter-font rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          noteStyle === value
                            ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="inter-font text-xs font-semibold">Detail level</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      ["concise", "Concise"],
                      ["balanced", "Balanced"],
                      ["detailed", "Detailed"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setDetailLevel(value)}
                        className={`inter-font rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          detailLevel === value
                            ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateNotes}
                  className="inter-font mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {isGenerating && <LoaderCircle size={16} className="animate-spin" />}
                  {isGenerating ? generationStatus : "Generate notes"}
                </button>

              </div>
                {showGuide && (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-zinc-950/60 px-4 py-8 backdrop-blur-sm"
                  onMouseDown={() => setShowGuide(false)}
                >
                <aside
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="notes-guide-title"
                  onMouseDown={(event) => event.stopPropagation()}
                  className="relative max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:p-7"
                >
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    aria-label="Close notes guide"
                    className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                  <p className="ibm-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Guide
                  </p>
                  <h2 id="notes-guide-title" className="pixel-font mt-2 text-xl">
                    Choose your notes
                  </h2>
                  <p className="inter-font mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    Style changes how the notes are written. Detail level changes
                    how much information you get.
                  </p>

                  <div className="mt-5">
                    <h3 className="inter-font text-xs font-bold">Note styles</h3>
                    <div className="mt-3 space-y-3">
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Reviewer</span>
                        {" — "}Important facts, terms, and tricky topics. Best for
                        studying for a test.
                      </p>
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Outline</span>
                        {" — "}Topics and smaller topics in order. Best for seeing
                        how the lesson is organized.
                      </p>
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Simple</span>
                        {" — "}Easy words and clear explanations. Best when the
                        lesson is hard or new to you.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                    <h3 className="inter-font text-xs font-bold">Detail levels</h3>
                    <div className="mt-3 space-y-3">
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Concise</span>
                        {" — "}Short notes with only the main ideas. Up to about
                        four sections.
                      </p>
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Balanced</span>
                        {" — "}Main ideas with enough explanation. Up to about
                        seven sections.
                      </p>
                      <p className="inter-font text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-900 dark:text-white">Detailed</span>
                        {" — "}Longer notes with more facts and explanations. Up to
                        about ten sections.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800/70">
                    <h3 className="inter-font text-xs font-bold">Examples</h3>
                    <ul className="inter-font mt-2 space-y-1.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                      <li><b className="text-zinc-700 dark:text-zinc-200">Reviewer + Concise:</b> quick exam-cram sheet</li>
                      <li><b className="text-zinc-700 dark:text-zinc-200">Reviewer + Detailed:</b> full exam reviewer</li>
                      <li><b className="text-zinc-700 dark:text-zinc-200">Outline + Balanced:</b> organized class notes</li>
                      <li><b className="text-zinc-700 dark:text-zinc-200">Simple + Detailed:</b> full and easy explanation</li>
                      <li><b className="text-zinc-700 dark:text-zinc-200">Simple + Concise:</b> short and easy summary</li>
                    </ul>
                  </div>
                </aside>
                </div>
                )}
              </div>
            </div>
          )}

          {generatedNotes && (
            <article
              ref={generatedNotesRef}
              className="mx-auto mt-8 max-w-3xl scroll-mt-28 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
                <div>
                  <p className="ibm-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Generated notes
                  </p>
                  <h2 className="pixel-font mt-3 text-2xl leading-tight">
                    {generatedNotes.title}
                  </h2>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    aria-label="Copy notes"
                    className="rounded-xl border border-zinc-200 p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadNotes}
                    aria-label="Download notes"
                    className="rounded-xl border border-zinc-200 p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>

              <p className="inter-font mt-6 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                {generatedNotes.overview}
              </p>

              <div className="mt-8 space-y-8">
                {generatedNotes.sections.map((section, index) => (
                  <section key={`${section.heading}-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="pixel-font text-lg">{section.heading}</h3>
                      <span className="ibm-mono rounded-full bg-zinc-100 px-2.5 py-1 text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {section.sourcePages}
                      </span>
                    </div>
                    <p className="inter-font mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                      {section.summary}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {section.keyPoints.map((point, pointIndex) => (
                        <li
                          key={pointIndex}
                          className="inter-font flex gap-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {generatedNotes.keyTerms.length > 0 && (
                <section className="mt-9 border-t border-zinc-200 pt-7 dark:border-zinc-800">
                  <h3 className="pixel-font text-lg">Key terms</h3>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {generatedNotes.keyTerms.map(({ term, definition }) => (
                      <div key={term} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                        <dt className="inter-font text-xs font-bold">{term}</dt>
                        <dd className="inter-font mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                          {definition}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section className="mt-8 rounded-2xl bg-zinc-950 p-5 text-white dark:bg-white dark:text-zinc-950">
                <h3 className="pixel-font text-sm">Quick recap</h3>
                <ul className="mt-3 space-y-2">
                  {generatedNotes.recap.map((item, index) => (
                    <li key={index} className="inter-font text-xs leading-5 opacity-75">
                      {index + 1}. {item}
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          )}

          <section className="mx-auto mt-14 max-w-2xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="ibm-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Your library
                </p>
                <h2 className="pixel-font mt-2 text-2xl">Notes Library</h2>
                <p className="inter-font mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Reopen, download, or remove your generated study notes.
                </p>
              </div>
              {!isLoadingNotes && notesLibrary.length > 0 && (
                <span className="ibm-mono shrink-0 rounded-full bg-zinc-200 px-3 py-1.5 text-[9px] uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {notesLibrary.length} {notesLibrary.length === 1 ? "note" : "notes"}
                </span>
              )}
            </div>

            {isLoadingNotes && (
              <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-7 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
                <p className="inter-font mt-3 text-xs text-zinc-500">
                  Loading your notes...
                </p>
              </div>
            )}

            {!isLoadingNotes && notesLibrary.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <Library className="mx-auto h-6 w-6 text-zinc-400" />
                <p className="inter-font mt-3 text-sm font-semibold">
                  No generated notes yet
                </p>
                <p className="inter-font mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Generate notes from a PDF and they will appear here.
                </p>
              </div>
            )}

            {!isLoadingNotes && notesLibrary.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {notesLibrary.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-zinc-900 ${
                      activeNoteId === note.id
                        ? "border-zinc-950 ring-1 ring-zinc-950 dark:border-white dark:ring-white"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenLibraryNote(note)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                          <FileText size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="inter-font truncate text-sm font-semibold">
                            {note.title}
                          </h3>
                          <p className="ibm-mono mt-1.5 text-[9px] uppercase tracking-wider text-zinc-400">
                            {note.style} · {note.detail}
                          </p>
                          <p className="inter-font mt-1 text-[11px] text-zinc-400">
                            {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => handleOpenLibraryNote(note)}
                        className="inter-font flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadLibraryNote(note)}
                        aria-label={`Download ${note.title}`}
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingNoteId === note.id}
                        onClick={() => handleDeleteNote(note)}
                        aria-label={`Delete ${note.title}`}
                        className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      >
                        {deletingNoteId === note.id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

export default NotesGenerator;
