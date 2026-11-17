"use client";

import {
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import LiveSandbox from "./components/LiveSandbox";
import TestingPanel from "./components/TestingPanel";
import { QnA, PageBlueprint, Step, VerificationReport } from "@/app/types";

export default function Home() {
  const [step, setStep] = useState<Step>("intro");
  const [history, setHistory] = useState<QnA[]>([]);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentAcknowledgment, setCurrentAcknowledgment] = useState<string>("");
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [answerInput, setAnswerInput] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<PageBlueprint | null>(null);
  const [generatedPage, setGeneratedPage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Testing & Quality Gate States
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  // Step 1: Start inquiry and fetch the opening question
  async function handleStart() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: [] }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengambil pertanyaan pembuka.");
      }

      setCurrentQuestion(data.question);
      setCurrentAcknowledgment("");
      setCurrentCategory(data.category || "Tujuan & Visi");
      setHistory([]);
      setQuestionNumber(1);
      setStep("questioning");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mengambil pertanyaan pembuka.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit current explanation and fetch the next adaptive question
  async function handleNextQuestion() {
    if (!answerInput.trim() || loading) return;

    const trimmedAnswer = answerInput.trim();
    const updatedHistory: QnA[] = [
      ...history,
      { question: currentQuestion, answer: trimmedAnswer },
    ];

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedHistory }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mengambil pertanyaan selanjutnya.");
      }

      setHistory(updatedHistory);
      setQuestionNumber((prev) => prev + 1);
      setCurrentQuestion(data.question);
      setCurrentAcknowledgment(data.acknowledgment || "");
      setCurrentCategory(data.category || "Konten & Tata Letak");
      setAnswerInput("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mengambil pertanyaan selanjutnya.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Finish questioning and synthesize the full page blueprint
  async function handleSynthesize() {
    if (loading) return;

    const trimmedAnswer = answerInput.trim();
    const finalHistory: QnA[] = trimmedAnswer
      ? [...history, { question: currentQuestion, answer: trimmedAnswer }]
      : history;

    if (finalHistory.length === 0) {
      setErrorMessage("Silakan bagikan gambaran website Anda sebelum melanjutkan.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: finalHistory }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal mensintesis rancangan blueprint.");
      }

      setHistory(finalHistory);
      setBlueprint(data.blueprint);
      setStep("blueprint");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  // Menjalankan verifikasi / pengujian kode melalui API /api/verify
  async function runVerification(codeToVerify: string, currentBlueprint: PageBlueprint | null) {
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToVerify,
          blueprint: currentBlueprint,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Pengujian verifikasi gagal dijalankan.");
      }

      setVerificationReport(data.report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memverifikasi kode.";
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  // Step 4: Stream React + Tailwind code generator, lalu otomatis alihkan ke Pengujian (Testing)
  async function handleGenerateCode() {
    if (!blueprint || loading) return;

    setStep("generating");
    setIsStreaming(true);
    setGeneratedPage("");
    setVerificationReport(null);
    setErrorMessage(null);

    let accumulated = "";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Gagal memulai streaming kode.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setGeneratedPage(accumulated);
      }

      // Setelah streaming selesai, arahkan ke tahap testing terlebih dahulu
      setStep("testing");
      await runVerification(accumulated, blueprint);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat men-generate kode.";
      setErrorMessage(msg);
    } finally {
      setIsStreaming(false);
    }
  }

  // Menjalankan perbaikan kode otomatis lewat AI (/api/repair)
  async function handleAutoRepair() {
    if (!generatedPage || isRepairing) return;

    setIsRepairing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: generatedPage,
          blueprint,
          errors: verificationReport?.tests || [],
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal melakukan perbaikan kode otomatis.");
      }

      setGeneratedPage(data.repairedCode);
      setVerificationReport(data.report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Perbaikan otomatis gagal.";
      setErrorMessage(msg);
    } finally {
      setIsRepairing(false);
    }
  }

  // Membuka Live Preview setelah lolos pengujian
  function handleProceedToPreview() {
    if (!verificationReport?.canPreview) {
      setErrorMessage("Kode belum lolos pengujian. Harap perbaiki kode sebelum membuka preview.");
      return;
    }
    setStep("ready");
  }

  // Reset ke awal
  function handleReset() {
    setStep("intro");
    setHistory([]);
    setQuestionNumber(1);
    setCurrentQuestion("");
    setCurrentAcknowledgment("");
    setCurrentCategory("");
    setAnswerInput("");
    setBlueprint(null);
    setGeneratedPage("");
    setVerificationReport(null);
    setErrorMessage(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleNextQuestion();
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-zinc-200 selection:text-zinc-900">
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col justify-between p-6 sm:p-12 w-full">
        {/* Top Header */}
        <header className="flex items-center justify-between pb-6 border-b border-zinc-200 mb-8 sm:mb-12">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-700" />
            <span className="text-xs tracking-wider uppercase font-mono text-zinc-600 font-medium">
              Page Maker Studio
            </span>
          </div>
          {step !== "intro" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Mulai Ulang
            </button>
          )}
        </header>

        {/* Main Container */}
        <main className="flex-1 flex flex-col justify-center">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: INTRO */}
          {step === "intro" && (
            <div className="py-8 space-y-6 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-zinc-950 leading-snug">
                Deskripsikan Visi Website Anda
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                Dialog interaktif adaptif satu pertanyaan per seksi untuk mengeksplorasi tujuan konten, target audiens, dan seksi website sebelum di-generate dan diverifikasi kualitasnya.
              </p>

              <div className="pt-4">
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer disabled:opacity-50 font-mono flex items-center gap-2 shadow-xs"
                >
                  {loading ? "Menyiapkan..." : "Mulai Percakapan"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADAPTIVE QUESTIONING (Free Text) */}
          {step === "questioning" && (
            <div className="py-4 sm:py-6">
              {/* Counter & Category */}
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-6 font-mono">
                <span>Pertanyaan #{questionNumber}</span>
                {currentCategory && (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-sans">
                    {currentCategory}
                  </span>
                )}
              </div>

              {/* AI Acknowledgment */}
              {currentAcknowledgment && (
                <div className="mb-6 p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-700 italic leading-relaxed">
                  "{currentAcknowledgment}"
                </div>
              )}

              {/* Question Text */}
              <h2 className="text-xl sm:text-2xl font-serif text-zinc-950 leading-snug mb-6">
                {currentQuestion}
              </h2>

              {/* Textarea Input */}
              <div className="mb-4">
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder="Jelaskan kebutuhan Anda, proyek/konten apa yang ingin ditampilkan, atau gaya tata letak yang diinginkan..."
                  rows={5}
                  className="w-full p-4 rounded-lg bg-white border border-zinc-300 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors text-sm leading-relaxed text-zinc-900 resize-none placeholder:text-zinc-400 disabled:opacity-60 shadow-2xs"
                />
                <div className="flex justify-between items-center mt-2 text-xs text-zinc-400 font-mono">
                  <span>Tekan Ctrl+Enter atau Cmd+Enter untuk kirim jawaban</span>
                  <span>
                    {answerInput.trim().length > 0
                      ? `${answerInput.trim().split(/\s+/).length} kata`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200">
                <div>
                  {history.length >= 1 || answerInput.trim() ? (
                    <button
                      onClick={handleSynthesize}
                      disabled={loading}
                      className="text-xs text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-40 font-mono underline underline-offset-4"
                    >
                      Selesai & susun blueprint website →
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Tuliskan penjelasan Anda di atas untuk melanjutkan
                    </span>
                  )}
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={loading || !answerInput.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer disabled:opacity-40 font-mono flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {loading ? "Memproses..." : "Pertanyaan Selanjutnya →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BLUEPRINT SYNTHESIS */}
          {step === "blueprint" && blueprint && (
            <div className="py-6 space-y-8">
              <div className="pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono uppercase text-emerald-700 font-semibold">
                    Blueprint Tersusun
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono">
                    {blueprint.websiteType}
                  </span>
                </div>
                <h2 className="text-3xl font-serif text-zinc-950">{blueprint.title}</h2>
                <p className="text-sm text-zinc-600 italic mt-1 font-serif">{blueprint.tagline}</p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                {/* Target Audience & Visual Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-mono text-zinc-500 mb-1.5">
                      <Users className="w-3.5 h-3.5" /> Target Audiens
                    </div>
                    <p className="text-zinc-800 text-sm">{blueprint.targetAudience}</p>
                  </div>

                  <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-mono text-zinc-500 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Gaya Visual & Tema
                    </div>
                    <p className="text-zinc-800 text-sm">{blueprint.visualTheme}</p>
                  </div>
                </div>

                {/* Planned Sections */}
                <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-1.5 text-xs uppercase font-mono text-zinc-500 mb-2">
                    <Layers className="w-3.5 h-3.5" /> Rencana Seksi & Konten
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {(blueprint.sections || []).map((sec, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white border border-zinc-200 rounded-md shadow-2xs"
                      >
                        <span className="font-semibold text-zinc-900 text-xs block mb-0.5">
                          {i + 1}. {sec.name}
                        </span>
                        <span className="text-xs text-zinc-600 leading-normal">
                          {sec.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Features */}
                {blueprint.keyFeatures && blueprint.keyFeatures.length > 0 && (
                  <div className="p-5 rounded-lg bg-zinc-50 border border-zinc-200 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-xs uppercase font-mono text-zinc-500 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fitur & Sorotan Interaktif
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.keyFeatures.map((feat, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-zinc-800 font-mono shadow-2xs"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-200 flex justify-end">
                <button
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors cursor-pointer font-mono flex items-center gap-2 shadow-xs"
                >
                  Generate Kode & Jalankan Pengujian
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: GENERATING (STREAMING) */}
          {step === "generating" && (
            <div className="py-4">
              <LiveSandbox code={generatedPage} isStreaming={isStreaming} />
            </div>
          )}

          {/* STEP 5: TESTING & QUALITY GATE (Pre-Preview) */}
          {step === "testing" && (
            <div className="py-4">
              <TestingPanel
                report={verificationReport}
                isVerifying={isVerifying}
                isRepairing={isRepairing}
                code={generatedPage}
                onProceedToPreview={handleProceedToPreview}
                onAutoRepair={handleAutoRepair}
                onRetest={() => runVerification(generatedPage, blueprint)}
              />
            </div>
          )}

          {/* STEP 6: READY (LIVE PREVIEW UNLOCKED) */}
          {step === "ready" && (
            <div className="py-4">
              <LiveSandbox
                code={generatedPage}
                isStreaming={false}
                report={verificationReport}
                onOpenTests={() => setStep("testing")}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
