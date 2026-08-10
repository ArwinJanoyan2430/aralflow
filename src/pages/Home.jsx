import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Pencil, Trash2, File } from "lucide-react";

//image
import aralflow from "../assets/aralflow.png"

function Home() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

        const { data, error } = await supabase
          .from("study_materials")
          .select(
            "id, user_id, file_name, file_path, question_count, exam, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setMaterials(data || []);
      } catch (error) {
        console.error("Failed to load study materials:", error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    loadMaterials();
  }, []);

  // -----------------------------------------
  // Upload + Generate Exam
  // -----------------------------------------
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");
    setSelectedFile(null);

    // -----------------------------------------
    // Check file type
    // -----------------------------------------
    if (file.type !== "application/pdf") {
      setUploadError("Please select a PDF file.");

      event.target.value = "";
      return;
    }

    // -----------------------------------------
    // Check file size
    // -----------------------------------------
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("PDF must be smaller than 50 MB.");

      event.target.value = "";
      return;
    }

    setIsUploading(true);

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

      console.log("Uploaded:", data);

      // -----------------------------------------
      // Process PDF
      // -----------------------------------------
      const { data: result, error: functionError } =
        await supabase.functions.invoke("process-pdf", {
          body: {
            filePath: data.path,
            questionCount,
          },
        });

      if (functionError) {
        throw functionError;
      }

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

      setSelectedFile(null);
    } finally {
      setIsUploading(false);

      // Allow selecting the same PDF again
      event.target.value = "";
    }
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
        fileName: material.file_name,
        materialId: material.id,
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
      const materialsToDelete = materials.filter((material) =>
        selectedMaterials.includes(material.id),
      );

      const filePaths = materialsToDelete
        .map((material) => material.file_path)
        .filter(Boolean);

      // Delete PDFs from Storage
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("study-materials")
          .remove(filePaths);

        if (storageError) {
          throw storageError;
        }
      }

      // Delete database records
      const { error: databaseError } = await supabase
        .from("study_materials")
        .delete()
        .in("id", selectedMaterials);

      if (databaseError) {
        throw databaseError;
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
      const { data: result, error: functionError } =
        await supabase.functions.invoke("process-pdf", {
          body: {
            filePath: editingMaterial.file_path,
            questionCount,
            mode: "update",
            materialId: editingMaterial.id,
          },
        });

      if (functionError) {
        throw functionError;
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
          fileName: editingMaterial.file_name,
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
        <NavBar />
        <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                AI-powered exam preparation
              </span>
            </div>

            <h1 className="pixel-font text-4xl leading-tight tracking-tight text-zinc-950 transition-colors duration-300 dark:text-white sm:text-5xl lg:text-6xl">
              Study from your notes.
              <span className="mt-2 block md:text-4xl text-zinc-400 dark:text-zinc-500">
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
          <div id="start" className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-[32px] border border-zinc-200 bg-white p-3 shadow-[0_25px_80px_rgba(24,24,27,0.10)] transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="group rounded-[26px] border-2 border-dashed border-zinc-200 px-6 py-12 text-center transition duration-300 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 sm:px-10 sm:py-14">
                {/* Upload icon */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-2xl text-white shadow-lg shadow-zinc-900/20 dark:bg-zinc-800 dark:text-zinc-900">
                  <img src={aralflow} className="h-12 w-12" />
                </div>

                <h2 className="pixel-font mt-6 text-lg tracking-tight text-zinc-900 dark:text-white sm:text-xl">
                  Upload your study material
                </h2>

                <p className="inter-font mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Choose a PDF and AralFlow will use its contents to create your
                  practice exam.
                </p>


                <div className="mx-auto mt-8 max-w-md">
                  <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Number of questions
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[10, 50, 60, 100].map((count) => (
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

                        <span className="ml-1 text-[10px] font-normal opacity-70">
                          items
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="ibm-mono mt-3 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
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

                {/* Choose PDF */}
                <button
                  type="button"
                  onClick={handleChoosePDF}
                  disabled={isUploading}
                  className="inter-font mt-7 rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/15 transition hover:-translate-y-0.5 hover:bg-zinc-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isUploading
                    ? `Generating ${questionCount} questions...`
                    : "Choose PDF"}
                </button>

                {/* Selected file */}
                {selectedFile && !isUploading && (
                  <p className="inter-font mt-4 text-sm text-emerald-600 dark:text-emerald-400">
                    ✓ {selectedFile.name}
                  </p>
                )}

                {/* Error */}
                {uploadError && (
                  <p className="inter-font mt-4 text-sm leading-6 text-red-500 dark:text-red-400">
                    {uploadError}
                  </p>
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
              <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Your library
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="pixel-font text-xl text-zinc-900 dark:text-white sm:text-2xl">
                    Study Materials
                  </h2>

                  <p className="inter-font mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Retake an exam from your saved study materials.
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
                        <Trash2 className="h-4 w-4" />
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
                        className="inter-font flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                )}

                {materials.map((material) => {
                  const isSelected = selectedMaterials.includes(material.id);

                  return (
                    <div
                      key={material.id}
                      className={`group flex items-center gap-3 rounded-3xl border bg-white p-4 shadow-sm transition dark:bg-zinc-900 ${
                        isSelected
                          ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-white dark:ring-white"
                          : "border-zinc-200 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:hover:border-zinc-700"
                      }`}
                    >
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectMaterial(material.id)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-zinc-900 dark:accent-white"
                          aria-label={`Select ${material.file_name}`}
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
                          {material.file_name}
                        </h3>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="ibm-mono text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {material.question_count} questions
                          </span>

                          <span className="text-zinc-300 dark:text-zinc-700">
                            ·
                          </span>

                          <span className="ibm-mono text-[9px] text-zinc-400 dark:text-zinc-500">
                            {new Date(material.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEdit(material)}
                          disabled={isEditing}
                          className="inter-font rounded-full border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </button>

                        {/* Retake */}
                        <button
                          type="button"
                          onClick={() => handleRetake(material)}
                          className="inter-font rounded-full bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                  {editingMaterial.file_name}
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
              {[10, 50, 60, 100].map((count) => (
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
      

      <section id="how-it-works" className="px-4 max-x-1xl pb-20 pt-32 sm:px-10 lg:px-80 dark:bg-zinc-950">
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            How it works
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            From notes to practice.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            AralFlow turns your study materials into practice exams in just a
            few simple steps.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {/* Step 01 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                01
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                PDF
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Upload your notes
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload your PDF study material. AralFlow securely processes the
              content so it can understand what you need to study.
            </p>
          </div>

          {/* Step 02 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                02
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                AI
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Generate your exam
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Choose how many questions you want and let AralFlow generate a
              practice exam based on your uploaded material.
            </p>
          </div>

          {/* Step 03 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <span className="ibm-mono text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                03
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
                ✓
              </div>
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Practice & improve
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Take your interactive practice exam, review your answers, and
              retake saved exams whenever you want.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 max-x-1xl pb-20 pt-10 sm:px-10 lg:px-80 dark:bg-zinc-950">
        <div className="text-center">
          <p className="ibm-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Featured
          </p>

          <h2 className="pixel-font mt-3 text-2xl tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Everything you need to study better.
          </h2>

          <p className="inter-font mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Simple tools designed to turn your study materials into effective
            exam preparation.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              AI
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              AI-generated exams
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Turn your PDFs into customized practice questions using the
              content of your own study materials.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              PDF
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              PDF-based studying
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Upload your lecture notes, reviewers, and other PDF materials and
              keep everything organized in one place.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
              ↻
            </div>

            <h3 className="pixel-font mt-6 text-base text-zinc-900 dark:text-white">
              Retake anytime
            </h3>

            <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Your generated exams are saved so you can return to them and
              practice whenever you need.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Home;
