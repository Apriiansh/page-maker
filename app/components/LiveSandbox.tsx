"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
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
  MousePointerClick,
  Sparkles,
  Send,
  X,
  Save,
  MessageSquarePlus,
} from "lucide-react";
import { sanitizeCode } from "@/app/lib/codeTester";
import { VerificationReport } from "@/app/types";

interface SelectedElementInfo {
  tagName: string;
  innerText: string;
  outerHTML: string;
}

interface LiveSandboxProps {
  code: string;
  isStreaming: boolean;
  report?: VerificationReport | null;
  onOpenTests?: () => void;
  onApplyCodeChanges?: (newCode: string) => void;
  onReviseRequest?: (
    prompt: string,
    selectedElement?: SelectedElementInfo
  ) => Promise<void>;
  isRevising?: boolean;
}

/**
 * Builds a standalone Artifact HTML document with Tailwind, React UMD, Babel, and
 * the native element inspection & click-to-comment bridge.
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
        <h2 className="text-lg font-semibold tracking-tight">Preparing Page...</h2>
        <p className="text-zinc-500 text-xs">Processing React component and Tailwind CSS styling.</p>
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
  <title>Artifact Live Preview</title>
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
    /* Custom scrollbar */
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
      // 1. Standard React hooks
      const { useState, useEffect, useRef, useMemo, useCallback } = React;

      // 2. Lucide Icons Proxy
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

      // 3. Render clean sanitized code
      ${safeCode}

      // 4. Locate main App component
      const TargetComponent = 
        typeof App !== 'undefined' ? App :
        typeof Portfolio !== 'undefined' ? Portfolio :
        typeof LandingPage !== 'undefined' ? LandingPage :
        null;

      if (!TargetComponent) {
        throw new Error("Primary component (App) was not found in the generated code.");
      }

      const root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(<TargetComponent />);
    } catch (err) {
      console.error("Render Error:", err);
      document.getElementById("root").innerHTML = \`
        <div style="padding: 24px; font-family: ui-sans-serif, system-ui; max-width: 600px; margin: 40px auto; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #9f1239;">
          <h3 style="margin-top: 0; font-size: 16px; font-weight: 600;">Error Rendering Page</h3>
          <p style="font-size: 13px; line-height: 1.5; color: #be123c;">\${err.message}</p>
          <pre style="background: rgba(0,0,0,0.05); padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; margin-top: 12px;">\${err.stack || ''}</pre>
        </div>
      \`;
    }
  </script>

  <!-- Interactive Element Inspector & Comment Bridge -->
  <script>
    (function() {
      let isInspectMode = false;

      // Highlight outline box
      const hoverBox = document.createElement('div');
      hoverBox.id = '__inspector_hover_box__';
      hoverBox.style.cssText = 'position:fixed; pointer-events:none; border:2px dashed #4f46e5; background:rgba(99,102,241,0.08); z-index:999999; display:none; transition:all 0.05s ease; border-radius:4px; box-sizing:border-box;';
      
      const tagBadge = document.createElement('div');
      tagBadge.style.cssText = 'position:absolute; top:-22px; left:-2px; background:#4f46e5; color:#fff; font-family:monospace; font-size:10px; font-weight:600; padding:2px 6px; border-radius:3px; white-space:nowrap; pointer-events:none;';
      hoverBox.appendChild(tagBadge);
      document.body.appendChild(hoverBox);

      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SET_INSPECT_MODE') {
          isInspectMode = !!event.data.enabled;
          document.body.style.cursor = isInspectMode ? 'crosshair' : 'default';
          if (!isInspectMode) {
            hoverBox.style.display = 'none';
          }
        }
      });

      document.addEventListener('mouseover', function(e) {
        if (!isInspectMode) return;
        const target = e.target;
        if (target === document.body || target === document.documentElement || target.id === '__inspector_hover_box__') return;
        const rect = target.getBoundingClientRect();
        hoverBox.style.top = rect.top + 'px';
        hoverBox.style.left = rect.left + 'px';
        hoverBox.style.width = rect.width + 'px';
        hoverBox.style.height = rect.height + 'px';
        hoverBox.style.display = 'block';

        const tag = target.tagName.toLowerCase();
        const firstClass = target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\\s+/)[0] : '';
        tagBadge.textContent = '<' + tag + '> ' + firstClass;
      }, true);

      document.addEventListener('mouseout', function(e) {
        if (!isInspectMode) return;
        if (e.relatedTarget === null) {
          hoverBox.style.display = 'none';
        }
      }, true);

      document.addEventListener('click', function(e) {
        if (!isInspectMode) return;
        e.preventDefault();
        e.stopPropagation();
        const target = e.target;
        if (target.id === '__inspector_hover_box__') return;

        window.parent.postMessage({
          type: 'ELEMENT_SELECTED',
          tagName: target.tagName,
          innerText: target.innerText || '',
          outerHTML: target.outerHTML ? target.outerHTML.slice(0, 500) : ''
        }, '*');
      }, true);
    })();
  </script>
</body>
</html>`;
}

export default function LiveSandbox({
  code,
  isStreaming,
  report,
  onOpenTests,
  onApplyCodeChanges,
  onReviseRequest,
  isRevising = false,
}: LiveSandboxProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Editable Code State
  const [editableCode, setEditableCode] = useState(code);
  const [isCodeDirty, setIsCodeDirty] = useState(false);

  // Inspect & Visual Comment State
  const [isInspectMode, setIsInspectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);
  const [elementRevisionComment, setElementRevisionComment] = useState("");
  const [generalRevisionPrompt, setGeneralRevisionPrompt] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Synchronize incoming code if not manually dirty
  useEffect(() => {
    setEditableCode(code);
    setIsCodeDirty(false);
  }, [code]);

  // Synchronize inspect mode to iframe
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "SET_INSPECT_MODE", enabled: isInspectMode },
        "*"
      );
    }
  }, [isInspectMode, reloadKey]);

  // Listen to message from iframe when an element is clicked
  useEffect(() => {
    function handleIframeMessage(event: MessageEvent) {
      if (event.data && event.data.type === "ELEMENT_SELECTED") {
        setSelectedElement({
          tagName: event.data.tagName,
          innerText: event.data.innerText,
          outerHTML: event.data.outerHTML,
        });
        setElementRevisionComment("");
      }
    }

    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  const lineCount = useMemo(() => (code ? code.split("\n").length : 0), [code]);
  const iframeHtml = useMemo(() => buildArtifactHtml(editableCode), [editableCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode);
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

  const handleSaveCode = () => {
    if (onApplyCodeChanges) {
      onApplyCodeChanges(editableCode);
    }
    setIsCodeDirty(false);
    setReloadKey((prev) => prev + 1);
  };

  const handleSendElementRevision = async () => {
    if (!elementRevisionComment.trim() || !onReviseRequest) return;
    const comment = elementRevisionComment.trim();
    const el = selectedElement || undefined;
    setSelectedElement(null);
    setElementRevisionComment("");
    await onReviseRequest(comment, el);
  };

  const handleSendGeneralRevision = async () => {
    if (!generalRevisionPrompt.trim() || !onReviseRequest) return;
    const prompt = generalRevisionPrompt.trim();
    setGeneralRevisionPrompt("");
    await onReviseRequest(prompt);
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
    <div className="w-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-lg relative">
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
            <Code className="w-3.5 h-3.5 text-indigo-600" />
            <span>Code Editor</span>
            {isCodeDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Viewport Switcher & Inspect Mode (Preview Tab Only) */}
        {activeTab === "preview" && (
          <div className="flex items-center gap-2">
            {/* Inspect / Click-to-Comment Toggle */}
            <button
              onClick={() => setIsInspectMode(!isInspectMode)}
              title="Click on any element to submit an AI revision request"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border ${
                isInspectMode
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-xs font-semibold"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isInspectMode ? "Inspect Active (Click Element)" : "Inspect & Comment"}
              </span>
            </button>

            {/* Viewport Widths */}
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
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {report && onOpenTests && (
            <button
              onClick={onOpenTests}
              title="View Quality Audit Report"
              className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition cursor-pointer shadow-2xs font-mono"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tested ({report.score}/100)</span>
            </button>
          )}

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-mono mr-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {lineCount === 0 ? "Connecting & designing code..." : `Receiving code (${lineCount} lines)...`}
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

          {/* Save Code Changes Button in Code tab */}
          {activeTab === "code" && isCodeDirty && (
            <button
              onClick={handleSaveCode}
              title="Save changes and re-run verification"
              className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition cursor-pointer shadow-2xs font-mono"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={!editableCode}
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!editableCode}
            title="Download Single HTML File"
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 bg-white border border-zinc-200 hover:bg-zinc-100 px-3 py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export HTML</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "preview" ? (
        <div className="bg-zinc-100/70 p-4 sm:p-6 min-h-[750px] flex flex-col items-center justify-center overflow-auto relative">
          {/* Inspect Mode Banner */}
          {isInspectMode && (
            <div className="w-full mb-3 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-900 font-mono shadow-2xs">
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>
                  <strong>Inspect Mode Active:</strong> Hover over any element and click to request a component change.
                </span>
              </div>
              <button
                onClick={() => setIsInspectMode(false)}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                Exit Inspect
              </button>
            </div>
          )}

          {isStreaming ? (
            <div className="h-[700px] w-full flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin mb-4" />
              <h3 className="font-serif text-lg text-zinc-900 mb-1">
                {lineCount === 0
                  ? "AI Architect Designing Layout..."
                  : "Streaming React & Tailwind Components..."}
              </h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm">
                {lineCount === 0
                  ? "Analyzing the blueprint and setting up the visual hierarchy. Code will start streaming momentarily."
                  : `Generating React component (${lineCount} lines). Quality gate testing will execute immediately upon completion.`}
              </p>
              <button
                onClick={() => setActiveTab("code")}
                className="text-xs font-mono text-zinc-600 hover:text-zinc-900 underline underline-offset-4 mt-4 cursor-pointer"
              >
                View generated code in Code Editor →
              </button>
            </div>
          ) : (
            <div
              className={`w-full ${getViewportWidth()} h-[750px] bg-white rounded-xl overflow-hidden border border-zinc-300 shadow-md transition-all duration-300 relative`}
            >
              <iframe
                ref={iframeRef}
                key={reloadKey}
                title="Artifact Live Preview"
                srcDoc={iframeHtml}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-modals"
              />
            </div>
          )}

          {/* AI General Revision Input Bar (Below Preview) */}
          {!isStreaming && (
            <div className="w-full mt-4 p-3 bg-white border border-zinc-200 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={generalRevisionPrompt}
                onChange={(e) => setGeneralRevisionPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendGeneralRevision()}
                disabled={isRevising}
                placeholder="Ask AI to revise this page (e.g., 'Make the hero headline punchier', 'Add a 3-tier pricing table')..."
                className="flex-1 text-xs bg-transparent focus:outline-none text-zinc-900 placeholder:text-zinc-400 font-sans"
              />
              <button
                onClick={handleSendGeneralRevision}
                disabled={isRevising || !generalRevisionPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition cursor-pointer disabled:opacity-40 shadow-2xs"
              >
                {isRevising ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revising...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Revise Page</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Code Editor Tab (Powered by CodeMirror) */
        <div className="bg-zinc-950 text-zinc-200 font-mono text-xs overflow-hidden h-[750px] flex flex-col">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>React JSX Editor — Live Editable</span>
            <span>
              {isCodeDirty ? (
                <span className="text-amber-400 font-medium">Unsaved Changes (Click Apply Changes)</span>
              ) : (
                <span className="text-zinc-500">Synced with Preview</span>
              )}
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeMirror
              value={editableCode}
              height="700px"
              extensions={[javascript({ jsx: true })]}
              theme="dark"
              onChange={(value) => {
                setEditableCode(value);
                setIsCodeDirty(true);
              }}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Floating Modal for Selected Element AI Revision */}
      {selectedElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-zinc-950 font-mono">
                  Revise Selected Component
                </h3>
              </div>
              <button
                onClick={() => setSelectedElement(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Target Element
                </span>
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                      &lt;{selectedElement.tagName.toLowerCase()}&gt;
                    </span>
                    <span className="truncate text-zinc-600">
                      {selectedElement.innerText
                        ? `"${selectedElement.innerText.slice(0, 60)}..."`
                        : "Empty container"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-900 block mb-1.5">
                  What would you like the AI to change in this component?
                </label>
                <textarea
                  value={elementRevisionComment}
                  onChange={(e) => setElementRevisionComment(e.target.value)}
                  placeholder="e.g. Change text to 'Explore Our Portfolio', use a pill-shaped button, or make background darker..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition resize-none shadow-2xs font-sans placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedElement(null)}
                className="px-3.5 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendElementRevision}
                disabled={isRevising || !elementRevisionComment.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer disabled:opacity-40 shadow-xs"
              >
                {isRevising ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revising Component...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Send Revision to AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
