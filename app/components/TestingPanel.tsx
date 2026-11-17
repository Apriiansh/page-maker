"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCw,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VerificationReport, TestCaseResult } from "@/app/types";

interface TestingPanelProps {
  report: VerificationReport | null;
  isVerifying: boolean;
  isRepairing: boolean;
  code: string;
  onProceedToPreview: () => void;
  onAutoRepair: () => void;
  onRetest: () => void;
}

export default function TestingPanel({
  report,
  isVerifying,
  isRepairing,
  code,
  onProceedToPreview,
  onAutoRepair,
  onRetest,
}: TestingPanelProps) {
  const [showCode, setShowCode] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(true);

  const statusRank: Record<string, number> = {
    failed: 0,
    warning: 1,
    passed: 2,
  };

  const sortedTests = [...(report?.tests || [])].sort(
    (a, b) => (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3)
  );

  const passedCount = report?.tests.filter((t) => t.status === "passed").length || 0;
  const failedCount = report?.tests.filter((t) => t.status === "failed").length || 0;
  const warningCount = report?.tests.filter((t) => t.status === "warning").length || 0;
  const totalCount = report?.tests.length || 0;

  const canPreview = report?.canPreview ?? false;

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="p-6 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Quality Gate & Pre-Preview Testing
            </span>
            <span className="text-zinc-300">•</span>
            {isVerifying ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" /> Running Verification Suite...
              </span>
            ) : canPreview ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Ready for Preview (Score: {report?.score || 100}/100)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-mono font-medium">
                <ShieldAlert className="w-3 h-3 text-rose-600" /> Testing Checks Failed
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif text-zinc-950">
            {canPreview ? "Code Verification Passed" : "Code Quality & Rule Verification"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-xl">
            {report?.summary ||
              "Validating JSX syntax, CDN dependencies, component structure, and design system compliance before unlocking preview."}
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            {passedCount} Passed
          </span>
          {warningCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
              {warningCount} Warning
            </span>
          )}
          {failedCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              {failedCount} Failed
            </span>
          )}
        </div>
      </div>

      {/* Main Test List Area */}
      <div className="p-6 space-y-4">
        {isVerifying ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-900 font-mono">
              Running Test Suite & AST Analysis...
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Parsing JSX via Babel, verifying Tailwind & Lucide dependencies, and auditing component architecture.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsListCollapsed((v) => !v)}
                aria-expanded={!isListCollapsed}
                aria-controls="test-result-list"
                className="flex items-center gap-1.5 text-xs font-mono text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isListCollapsed ? "-rotate-90" : ""
                  }`}
                />
                {isListCollapsed ? "Show" : "Hide"} Test Result Details ({totalCount} tests)
              </button>
              {isListCollapsed && failedCount > 0 && (
                <span className="text-[11px] font-mono text-rose-700">
                  {failedCount} failed — open for details
                </span>
              )}
            </div>

            <div
              id="test-result-list"
              aria-hidden={isListCollapsed}
              className={`grid transition-all duration-300 ease-out ${
                isListCollapsed
                  ? "grid-rows-[0fr] opacity-0"
                  : "grid-rows-[1fr] opacity-100"
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 pt-1 max-h-[28rem] overflow-y-auto pr-1">
                  {sortedTests.map((test: TestCaseResult, idx: number) => {
                    const isPass = test.status === "passed";
                    const isFail = test.status === "failed";
                    const isWarn = test.status === "warning";

                    return (
                      <div
                        key={test.id || idx}
                        className={`p-4 rounded-lg border transition-all ${
                          isFail
                            ? "bg-rose-50/70 border-rose-200 text-rose-950"
                            : isWarn
                              ? "bg-amber-50/70 border-amber-200 text-amber-950"
                              : "bg-zinc-50/80 border-zinc-200 text-zinc-900"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {isPass && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              )}
                              {isFail && (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              )}
                              {isWarn && (
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold font-mono tracking-tight text-zinc-900">
                                  {test.name}
                                </span>
                                <span
                                  className={`text-[10px] uppercase font-mono px-2 py-0.2 rounded ${
                                    isPass
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isFail
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {test.status}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-700 mt-1 leading-relaxed">
                                {test.message}
                              </p>
                              {test.details && (
                                <p className="text-[11px] text-zinc-500 font-mono mt-1 bg-white/70 p-2 rounded border border-zinc-200">
                                  {test.details}
                                </p>
                              )}
                            </div>
                          </div>

                          {test.line && (
                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-rose-100 text-rose-800 whitespace-nowrap">
                              Line {test.line}:{test.column}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Raw Code Preview */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            aria-expanded={showCode}
            aria-controls="raw-code-preview"
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition cursor-pointer font-mono"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showCode ? "Hide Raw Code" : "Show Tested Source Code"}
            {showCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showCode && (
            <div
              id="raw-code-preview"
              className="mt-3 p-4 bg-zinc-950 text-zinc-200 rounded-lg text-xs font-mono max-h-60 overflow-auto"
            >
              <pre className="leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetest}
            disabled={isVerifying || isRepairing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 transition cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            Re-test Code
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* If failed: Auto-Repair Button */}
          {!canPreview && (
            <button
              type="button"
              onClick={onAutoRepair}
              disabled={isRepairing || isVerifying}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer font-mono disabled:opacity-50 shadow-xs"
            >
              {isRepairing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Repairing Code with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Repair Code with AI</span>
                </>
              )}
            </button>
          )}

          {/* If passed: Proceed to Live Preview Button */}
          {canPreview && (
            <button
              type="button"
              onClick={onProceedToPreview}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition cursor-pointer font-mono shadow-xs"
            >
              <span>Open Live Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
