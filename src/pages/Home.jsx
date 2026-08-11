import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Pencil, File } from "lucide-react";
import UpdateNotice from "../components/UpdateNotice";
import { extractPdfPageSections } from "../lib/pdfTextExtraction";
import toast from "react-hot-toast";

//image
import aralflow from "../assets/aralflow.png";

//pomodoro
import Pomodoro from "../pages/Pomodoro";
import ToDoList from "../pages/ToDoList";

const displayFileName = (fileName) =>
  fileName?.replace(/^\d+-/, "") || "Study material";

const PASSING_PERCENTAGE = 75;

function Home() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [questionCount, setQuestionCount] = useState(10);

  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  //delete
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((previous) => !previous);
    setSelectedMaterials([]);
  };

  const handleChoosePDF = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleUploadNewPDF = () => {
    setSelectedFile(null);
    setUploadError("");
    fileInputRef.current?.click();
  };

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setLoadingMaterials(false);
          return;
        }

        const [materialsResult, finishedResult] = await Promise.all([
          supabase
            .from("study_materials")
            .select(
              "id, user_id, file_name, file_path, question_count, exam, created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("finished_exams")
            .select("material_id, score, total, answers, completed_at")
            .eq("user_id", user.id),
        ]);

        if (materialsResult.error) throw materialsResult.error;
        if (finishedResult.error) throw finishedResult.error;

        const completionByMaterial = new Map(
          (finishedResult.data || []).map((finishedExam) => [
            finishedExam.material_id,
            {
              score: finishedExam.score,
              total: finishedExam.total,
              answers: finishedExam.answers,
              completedAt: finishedExam.completed_at,
            },
          ]),
        );

        setMaterials(
          (materialsResult.data || []).map((material) => ({
            ...material,
            exam: {
              ...material.exam,
              completion: completionByMaterial.get(material.id),
            },
          })),
        );
      } catch (error) {
        console.error("Failed to load study materials:", error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadMaterials();
  }, []);

  const handleFileSelect = (file) => {
    if (!file || isUploading) return;

    setUploadError("");

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setUploadError("Please select a PDF file.");
      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      setUploadError("The PDF file is empty, i.e. its size is zero bytes.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setSelectedFile(null);
      setUploadError("PDF must be smaller than 50 MB.");
      return;
    }

    setSelectedFile(file);
  };

  const getFunctionErrorMessage = async (functionError) => {
    const response = functionError?.context;

    if (response instanceof Response) {
      try {
        const body = await response.json();

        if (body?.error) return body.error;
      } catch {
        // Fall back to Supabase's error message when the response is not JSON.
      }
    }

    return functionError?.message || "Failed to generate the practice exam.";
  };

  // -----------------------------------------
  // Upload selected PDF + Generate Exam
  // -----------------------------------------
  const handleGenerate = async () => {
    if (!selectedFile || isUploading) return;

    const file = selectedFile;

    setUploadError("");
    setIsUploading(true);
    setGenerationProgress(20);

    try {
      // -----------------------------------------
      // Get logged-in user
      // -----------------------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You must be signed in to upload a PDF.");
      }

      setGenerationProgress(55);

      // -----------------------------------------
      // Create unique file path
      // -----------------------------------------
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      // -----------------------------------------
      // Upload PDF to Storage
      // -----------------------------------------
      

      const { data, error } = await supabase.storage
        .from("study-materials")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (error) {
        throw error;
      }


      setGenerationProgress(60);
      console.log("Uploaded:", data);

      const { pageSections, totalPages } = await extractPdfPageSections(
        file,
        ({ currentPage, totalPages: pageCount }) => {
          setGenerationProgress(
            60 + Math.round((currentPage / pageCount) * 28),
          );
        },
      );

      setGenerationProgress(90);

      // -----------------------------------------
      // Process PDF
      // -----------------------------------------
      const { data: result, error: functionError } =
        await supabase.functions.invoke("process-pdf", {
          body: {
            filePath: data.path,
            questionCount,
            pageSections,
            totalPages,
          },
        });

      if (functionError) {
        throw new Error(await getFunctionErrorMessage(functionError));
      }

      setGenerationProgress(98);
      console.log("Generated exam:", result);

      // -----------------------------------------
      // Check result
      // -----------------------------------------
      if (!result?.success) {
        throw new Error(
          result?.error || "Failed to generate the practice exam.",
        );
      }

      if (!result.exam) {
        throw new Error("No exam was returned from the server.");
      }

      setGenerationProgress(100);
      setSelectedFile(file);
      

      // -----------------------------------------
      // Add new material to library
      // -----------------------------------------
      if (result.materialId) {
        const newMaterial = {
          id: result.materialId,
          user_id: user.id,
          file_name: file.name,
          file_path: data.path,
          question_count: questionCount,
          exam: result.exam,
          created_at: new Date().toISOString(),
        };

        setMaterials((previous) => [newMaterial, ...previous]);
      }

      // -----------------------------------------
      // Go to Practice Exam
      // -----------------------------------------
      navigate("/practice-exam", {
        state: {
          exam: result.exam,
          fileName: file.name,
          materialId: result.materialId,
        },
      });
    } catch (error) {
      console.error("Upload/AI error:", error);

      setUploadError(
        error?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsUploading(false);
      setGenerationProgress(0);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    handleFileSelect(file);

    // Allow selecting the same PDF again.
    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    if (!isUploading) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (event) => {
    // Ignore drag events that only move between elements inside the drop zone.
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);

    if (isUploading) return;

    handleFileSelect(event.dataTransfer.files?.[0]);
  };

  // -----------------------------------------
  // Retake existing exam
  // -----------------------------------------
  const handleRetake = (material) => {
    if (!material?.exam) {
      setUploadError("This study material does not have a saved exam.");

      return;
    }

    navigate("/practice-exam", {
      state: {
        exam: material.exam,
        fileName: displayFileName(material.file_name),
        materialId: material.id,
      },
    });
  };

  const handleReview = (material) => {
    if (!material?.exam?.completion) return;

    navigate("/practice-exam", {
      state: {
        exam: material.exam,
        fileName: displayFileName(material.file_name),
        materialId: material.id,
        review: true,
      },
    });
  };

  const handleSelectMaterial = (id) => {
    setSelectedMaterials((previous) =>
      previous.includes(id)
        ? previous.filter((materialId) => materialId !== id)
        : [...previous, id],
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedMaterials.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedMaterials.length} selected ${
        selectedMaterials.length === 1 ? "PDF" : "PDFs"
      }? This cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setUploadError("");

    try {
      // Use the server-side function so Storage deletion is not blocked by
      // browser RLS policies. The function also verifies record ownership.
      const { data: result, error: functionError } =
        await supabase.functions.invoke("delete-materials", {
          body: { materialIds: selectedMaterials },
        });

      if (functionError) {
        throw new Error(await getFunctionErrorMessage(functionError));
      }

      if (!result?.success) {
        throw new Error(result?.error || "Failed to delete selected PDFs.");
      }

      // Remove from UI
      setMaterials((previous) =>
        previous.filter((material) => !selectedMaterials.includes(material.id)),
      );

      setSelectedMaterials([]);
    } catch (error) {
      console.error("Delete error:", error);

      setUploadError(error?.message || "Failed to delete selected PDFs.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setQuestionCount(material.question_count || 10);
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial) return;

    setIsEditing(true);
    setUploadError("");

    try {
      const { data: pdfFile, error: downloadError } = await supabase.storage
        .from("study-materials")
        .download(editingMaterial.file_path);

      if (downloadError || !pdfFile) {
        throw new Error(downloadError?.message || "Failed to download PDF.");
      }

      const { pageSections, totalPages } = await extractPdfPageSections(pdfFile);

      const { data: result, error: functionError } =
        await supabase.functions.invoke("process-pdf", {
          body: {
            filePath: editingMaterial.file_path,
            questionCount,
            mode: "update",
            materialId: editingMaterial.id,
            pageSections,
            totalPages,
          },
        });

      if (functionError) {
        throw new Error(await getFunctionErrorMessage(functionError));
      }

      if (!result?.success) {
        throw new Error(result?.error || "Failed to regenerate the exam.");
      }

      // Update existing material in the UI
      setMaterials((previous) =>
        previous.map((material) =>
          material.id === editingMaterial.id
            ? {
                ...material,
                question_count: questionCount,
                exam: result.exam,
              }
            : material,
        ),
      );

      setEditingMaterial(null);

      navigate("/practice-exam", {
        state: {
          exam: result.exam,
          fileName: displayFileName(editingMaterial.file_name),
          materialId: editingMaterial.id,
        },
      });
    } catch (error) {
      console.error("Edit error:", error);

      setUploadError(error?.message || "Failed to regenerate the exam.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors duration-300 dark:bg-zinc-950 dark:text-white">
        <UpdateNotice />
        <NavBar />

        <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                AI-powered exam preparation
              </span>
            </div>

            <h1 id="start" className="pixel-font md:text-4xl text-4xl leading-tight tracking-tight text-zinc-950 transition-colors duration-300 dark:text-white sm:text-5xl lg:text-6xl">
              Study from your notes.
              <span className="mt-2 block md:text-4xl text-3xl text-zinc-400 dark:text-zinc-500">
                Practice like it's exam day.
              </span>
            </h1>

            <p className="inter-font mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-600 transition-colors duration-300 dark:text-zinc-400 sm:text-lg">
              Upload your PDF or study material and let AralFlow turn it into an
              interactive practice exam.
            </p>
          </div>

          {/* =====================================
            UPLOAD CARD
        ===================================== */}
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-[32px] border border-zinc-200 bg-white p-3 shadow-[0_25px_80px_rgba(24,24,27,0.10)] transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group rounded-[26px] border-2 border-dashed px-6 py-12 text-center transition duration-300 sm:px-10 sm:py-14 ${
                  isDraggingFile
                    ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800"
                    : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {/* Upload icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-2xl text-white shadow-lg shadow-zinc-900/20 dark:bg-zinc-800 dark:text-zinc-900">
                  <img src={aralflow} className="h-12 w-12" />
                </div>

                <h2 className="pixel-font mt-6 text-lg tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                  Upload your study material
                </h2>

                <p className="inter-font mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Drag and drop a PDF here, or choose one from your device. Then
                  choose a question count and generate your exam.
                </p>

                <div className="mx-auto mt-8 max-w-md">
                  <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Number of questions
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[10, 50, 60, 100, 150].map((count) => (
                      <button
                        key={count}
                        type="button"
                        disabled={isUploading}
                        onClick={() => setQuestionCount(count)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          questionCount === count
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-md dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {count}

                        <span className="ml-1 text-[9px] font-normal opacity-70">
                          items
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="ibm-mono mt-6 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {questionCount} questions will be generated
                  </p>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Choose or generate PDF */}
                <button
                  type="button"
                  onClick={selectedFile ? handleGenerate : handleChoosePDF}
                  disabled={isUploading}
                  className="inter-font relative mt-7 overflow-hidden rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/15 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isUploading && (
                    <span
                      className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-500 dark:bg-zinc-900/15"
                      style={{ width: `${generationProgress}%` }}
                    />
                  )}

                  <span className="relative z-10">
                    {isUploading
                      ? `Generating ${generationProgress}%`
                      : selectedFile
                        ? `Generate ${questionCount} questions`
                        : "Choose PDF"}
                  </span>
                </button>

                {!isUploading && (
                  <p className="inter-font mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    or drop a PDF anywhere in this card
                  </p>
                )}

                {/* Selected file */}
                {selectedFile && !isUploading && (
                  <p className="inter-font mt-4 text-sm text-emerald-600 dark:text-emerald-400">
                    Selected: {selectedFile.name}
                  </p>
                )}

                {/* Error */}
                {uploadError && (
                  <div className="mt-4">
                    <p className="inter-font text-sm leading-6 text-red-500 dark:text-red-400">
                      {uploadError}
                    </p>

                    {/empty|zero bytes/i.test(uploadError) && (
                      <button
                        type="button"
                        onClick={handleUploadNewPDF}
                        className="inter-font mt-3 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:border-red-800"
                      >
                        Upload new PDF
                      </button>
                    )}
                  </div>
                )}

                <p className="ibm-mono mt-4 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  PDF files only · Maximum 50 MB
                </p>
              </div>
            </div>
          </div>

          {/* =====================================
            STUDY MATERIAL LIBRARY
        ===================================== */}
          <section id="materials" className="mx-auto mt-20 max-w-2xl">
            <div className="mb-6">
              <p  className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Your library
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="pixel-font text-xl text-zinc-900 dark:text-white sm:text-2xl">
                    PDF & Exam Library
                  </h2>

                  <p className="inter-font mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Manage your study materials, answer practice exams, and review completed results.
                  </p>
                </div>

                {materials.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="ibm-mono hidden rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:block">
                      {materials.length}{" "}
                      {materials.length === 1 ? "PDF" : "PDFs"}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleSelectionMode}
                      aria-label={isSelectionMode ? "Done" : "Select materials"}
                      className="inter-font flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      {isSelectionMode ? (
                        <Pencil className="h-4 w-4 text-red-500" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Loading */}
            {loadingMaterials && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="inter-font text-sm text-zinc-500 dark:text-zinc-400">
                  Loading your study materials...
                </p>
              </div>
            )}

            {/* Materials */}
            {!loadingMaterials && materials.length > 0 && (
              <div className="space-y-3">
                {/* Selection toolbar */}
                {isSelectionMode && (
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="ibm-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {selectedMaterials.length > 0
                        ? `${selectedMaterials.length} selected`
                        : "Select PDFs"}
                    </span>

                    {selectedMaterials.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="inter-font flex items-center gap-2 rounded-full bg-red-500 px-4 py-1 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                )}

                {[
                  {
                    title: "PDF list",
                    materials: materials.filter(
                      (material) => !material.exam?.completion,
                    ),
                  },
                  {
                    title: "Finished exams",
                    materials: materials.filter(
                      (material) => material.exam?.completion,
                    ),
                  },
                ].map(
                  (section) =>
                    section.materials.length > 0 && (
                      <div key={section.title} className="space-y-3">
                        <div className="flex items-center justify-between px-1 pt-3">
                          <h3 className="pixel-font text-sm text-zinc-900 dark:text-white">
                            {section.title}
                          </h3>
                          <span className="ibm-mono text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {section.materials.length} exam
                            {section.materials.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {section.materials.map((material) => {
                          const isSelected = selectedMaterials.includes(
                            material.id,
                          );
                          const completion = material.exam?.completion;
                          const passed = completion
                            ? completion.total > 0 &&
                              (completion.score / completion.total) * 100 >=
                                PASSING_PERCENTAGE
                            : false;

                          return (
                            <div
                              key={material.id}
                              className={`group flex items-center gap-3 rounded-3xl border bg-white p-4 shadow-sm transition dark:bg-zinc-900 ${
                                isSelected
                                  ? "border-zinc-900 ring-1 ring-zinc-50 dark:border-white dark:ring-white"
                                  : "border-zinc-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:hover:border-zinc-700"
                              }`}
                            >
                              {isSelectionMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleSelectMaterial(material.id)
                                  }
                                  className="h-4 w-4 shrink-0 cursor-pointer accent-zinc-900 dark:accent-white"
                                  aria-label={`Select ${displayFileName(material.file_name)}`}
                                />
                              )}

                              {/* PDF icon */}
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-white">
                                <span className="ibm-mono text-[9px] font-bold text-white dark:text-zinc-900">
                                  PDF
                                </span>
                              </div>

                              {/* Information */}
                              <div className="min-w-0 flex-1">
                                <h3 className="inter-font truncate text-sm font-semibold text-zinc-900 dark:text-white">
                                  {displayFileName(material.file_name)}
                                </h3>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <span className="ibm-mono text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                    {material.question_count} questions
                                  </span>

                                  <span className="text-zinc-300 dark:text-zinc-700">
                                    ·
                                  </span>

                                  <span className="ibm-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                                    {new Date(
                                      material.created_at,
                                    ).toLocaleDateString()}
                                  </span>

                                  {completion && (
                                    <>
                                      <span className="text-zinc-300 dark:text-zinc-700">
                                        ·
                                      </span>

                                      <span
                                        className={`ibm-mono rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                                          passed
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                                        }`}
                                      >
                                        {completion.score}/{completion.total}{" "}
                                        {passed ? "Passed" : "Failed"}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 items-center gap-2">
                                {completion ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleReview(material)}
                                      className="inter-font rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                    >
                                      Review
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRetake(material)}
                                      className="inter-font rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                      Re-answer
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(material)}
                                      disabled={isEditing}
                                      className="inter-font rounded-full border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                    >
                                      ⋮
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRetake(material)}
                                      className="inter-font rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                      Answer
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ),
                )}
              </div>
            )}

            {/* Empty state */}
            {!loadingMaterials && materials.length === 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <File className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />

                <p className="inter-font mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  No study materials yet.
                </p>
              </div>
            )}
          </section>
        </section>
      </main>

      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ibm-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Edit exam
                </p>

                <h2 className="pixel-font mt-2 text-xl text-zinc-900 dark:text-white">
                  Question count
                </h2>

                <p className="inter-font mt-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {displayFileName(editingMaterial.file_name)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                disabled={isEditing}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[10, 50, 60, 100, 150].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isEditing}
                  onClick={() => setQuestionCount(count)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                    questionCount === count
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                disabled={isEditing}
                className="inter-font flex-1 rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isEditing}
                className="inter-font flex-1 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isEditing
                  ? `Generating ${questionCount}...`
                  : `Generate ${questionCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <section id="study-mode">
        <Pomodoro />
      </section>

      <ToDoList />
      <Footer />
    </>
  );
}

export default Home;
