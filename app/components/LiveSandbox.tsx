"use client";

import React, { useState, useMemo } from "react";
import {
  Play,
  Code,
  Copy,
  Check,
  RotateCw,
  Monitor,
  Tablet,
  Smartphone,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { sanitizeCode } from "@/app/lib/codeTester";
import { VerificationReport } from "@/app/types";

interface LiveSandboxProps {
  code: string;
  isStreaming: boolean;
  report?: VerificationReport | null;
  onOpenTests?: () => void;
}

/**
 * Menghasilkan dokumen HTML lengkap mandiri (Artifact-style) dengan:
 * - Tailwind CSS dari cdn.tailwindcss.com
 * - React & ReactDOM UMD dari cdnjs
 * - Babel Standalone dari cdnjs
 * - Lucide React UMD dari unpkg
 */
function buildArtifactHtml(rawCode: string): string {
  const { cleanedCode, lucideIcons } = sanitizeCode(rawCode);

  const iconsToDestructure = Array.from(
    new Set([
      ...lucideIcons,
      "Sparkles",
      "ArrowRight",
      "ArrowLeft",
      "Check",
      "Menu",
      "X",
      "ChevronDown",
      "ChevronUp",
      "ExternalLink",
      "Github",
      "Twitter",
      "Linkedin",
      "Mail",
      "Phone",
      "MapPin",
      "Star",
      "Heart",
      "Search",
    ])
  );

  const safeCode =
    cleanedCode ||
    `
function App() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 text-zinc-900 font-sans p-6">
      <div className="text-center space-y-3 max-w-md p-8 bg-white border border-zinc-200 rounded-2xl shadow-sm">
        <div className="w-10 h-10 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <h2 className="text-lg font-semibold tracking-tight">Menyiapkan Halaman...</h2>
        <p className="text-zinc-500 text-xs">Sedang memproses kode React dan styling Tailwind.</p>
      </div>
    </div>
  );
}
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview Artifact</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React & ReactDOM UMD from cdnjs -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <!-- Babel Standalone from cdnjs -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js"></script>
  <!-- Lucide React UMD from unpkg -->
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
  <style>
    /* Custom scrollbar untuk iframe preview */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-white text-zinc-900 m-0 p-0 overflow-x-hidden font-sans antialiased">
  <div id="root"></div>

  <script type="text/babel">
    try {
      // 1. Inisialisasi React hooks standar
      const { useState, useEffect, useRef, useMemo, useCallback } = React;

      // 2. Setup Lucide Icons Proxy agar aman dari ReferenceError
      const LucideSource = window.LucideReact || {};
      const FallbackIcon = ({ className = "w-5 h-5 inline-block", ...props }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      );

      const IconProxy = new Proxy(LucideSource, {
        get: (target, prop) => target[prop] || FallbackIcon,
      });

      const {
        ${iconsToDestructure.join(", ")}
      } = IconProxy;

      // 3. Eksekusi kode yang sudah disanitasi
      ${safeCode}

      // 4. Cari komponen utama (App, Portfolio, atau LandingPage)
      const TargetComponent = 
        typeof App !== 'undefined' ? App :
        typeof Portfolio !== 'undefined' ? Portfolio :
        typeof LandingPage !== 'undefined' ? LandingPage :
        null;

      if (!TargetComponent) {
        throw new Error("Komponen utama (App) tidak ditemukan di dalam kode.");
      }

      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(<TargetComponent />);
    } catch (err) {
      console.error("Render Error:", err);
      document.getElementById("root").innerHTML = \`
        <div style="padding: 24px; font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 40px auto; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #9f1239;">
          <h3 style="margin-top: 0; font-size: 16px; font-weight: 600;">Terjadi Kesalahan Saat Merender Halaman</h3>
          <p style="font-size: 13px; line-height: 1.5; color: #be123c;">\${err.message}</p>
          <pre style="background: rgba(0,0,0,0.05); padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; margin-top: 12px;">\${err.stack || ''}</pre>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
}

export default function LiveSandbox({
  code,
  isStreaming,
  report,
  onOpenTests,
}: LiveSandboxProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const lineCount = useMemo(() => (code ? code.split("\n").length : 0), [code]);

  // Bangun dokumen HTML Artifact lengkap
  const iframeHtml = useMemo(() => buildArtifactHtml(code), [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([iframeHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getViewportWidth = () => {
    switch (deviceViewport) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      default:
        return "w-full";
    }
  };

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-lg">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        {/* Tab Switcher: Preview vs Code */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === "preview"
                ? "bg-white text-zinc-900 border border-zinc-200 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-600" /> Live Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === "code"
                ? "bg-white text-zinc-900 border border-zinc-200 shadow-2xs font-semibold"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Code className="w-3.5 h-3.5 text-indigo-600" /> Code Viewer
          </button>
        </div>

        {/* Viewport Switcher (Hanya saat di Tab Preview) */}
        {activeTab === "preview" && (
          <div className="hidden sm:flex items-center bg-zinc-200/70 p-0.5 rounded-lg border border-zinc-200">
            <button
              onClick={() => setDeviceViewport("desktop")}
              title="Desktop View"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceViewport === "desktop"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceViewport("tablet")}
              title="Tablet View (768px)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceViewport === "tablet"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceViewport("mobile")}
              title="Mobile View (390px)"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                deviceViewport === "mobile"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {report && onOpenTests && (
            <button
              onClick={onOpenTests}
              title="Lihat Laporan Pengujian Kualitas"
              className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition cursor-pointer shadow-2xs font-mono"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tested ({report.score}/100)</span>
            </button>
          )}

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-mono mr-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Streaming ({lineCount} baris)...
            </span>
          )}

          {activeTab === "preview" && (
            <button
              onClick={() => setReloadKey((prev) => prev + 1)}
              title="Reload Preview"
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 transition cursor-pointer shadow-2xs"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!code}
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Kode</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!code}
            title="Download Single HTML File"
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download HTML</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "preview" ? (
        <div className="bg-zinc-100/70 p-4 sm:p-6 min-h-[750px] flex items-center justify-center overflow-auto">
          {isStreaming ? (
            <div className="h-[700px] w-full flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin mb-4" />
              <h3 className="font-serif text-lg text-zinc-900 mb-1">Men-generate Desain Website...</h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm">
                AI sedang men-stream komponen React & Tailwind ({lineCount} baris). Pengujian kualitas akan dilakukan sebelum preview dibuka.
              </p>
              <button
                onClick={() => setActiveTab("code")}
                className="text-xs font-mono text-zinc-600 hover:text-zinc-900 underline underline-offset-4 mt-4 cursor-pointer"
              >
                Lihat kode yang sedang dibuat di Code Viewer →
              </button>
            </div>
          ) : (
            <div
              className={`w-full ${getViewportWidth()} h-[750px] bg-white rounded-xl overflow-hidden border border-zinc-300 shadow-md transition-all duration-300`}
            >
              <iframe
                key={reloadKey}
                title="Artifact Live Preview"
                srcDoc={iframeHtml}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-modals"
              />
            </div>
          )}
        </div>
      ) : (
        /* Code Viewer */
        <div className="p-4 bg-zinc-950 text-zinc-200 font-mono text-xs overflow-auto h-[750px]">
          <pre className="leading-relaxed">
            <code>{code || "// Belum ada kode yang dihasilkan."}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
