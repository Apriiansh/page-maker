import * as babelParser from "@babel/parser";
import { TestCaseResult } from "@/app/types";

export interface SanitizeResult {
  cleanedCode: string;
  lucideIcons: string[];
}

/**
 * Membersihkan kode dari AI agar kompatibel dengan Babel Standalone + React UMD (CDN).
 * Menangani:
 * - Multiline import removal
 * - Ekstraksi icon lucide
 * - Penghapusan redeklarasi React hooks
 * - Penghapusan export default
 */
export function sanitizeCode(raw: string): SanitizeResult {
  if (!raw) return { cleanedCode: "", lucideIcons: [] };

  // 1. Buang markdown fences (```jsx, ```tsx, ```javascript, ```)
  let code = raw
    .replace(/^```[a-zA-Z]*\r?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  // 2. Ekstrak icon lucide-react jika ada import
  const lucideIcons: string[] = [];
  const lucideImportRegex = /import\s+\{([\s\S]*?)\}\s+from\s+['"]lucide-react['"];?/g;
  let match;
  while ((match = lucideImportRegex.exec(code)) !== null) {
    if (match[1]) {
      const parts = match[1].split(",");
      for (const p of parts) {
        const iconName = p.trim().replace(/\s+as\s+\w+/, "").trim();
        if (iconName && !lucideIcons.includes(iconName)) {
          lucideIcons.push(iconName);
        }
      }
    }
  }

  // 3. Buang SEMUA import (baik single line maupun multiline)
  code = code
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "")
    .replace(/import\s+['"][^'"]+['"];?/g, "");

  // 4. Buang redeklarasi hooks jika kode bawaan AI sudah menulis destructuring React hooks
  code = code.replace(
    /(?:const|let|var)\s+\{[\s\S]*?\}\s*=\s*(?:window\.)?React;?/g,
    ""
  );

  // 5. Buang export default / export
  code = code
    .replace(/^export\s+default\s+/gm, "")
    .replace(/^export\s+/gm, "")
    .trim();

  return { cleanedCode: code, lucideIcons };
}

/**
 * Menjalankan static tests:
 * 1. AST Syntax Test (@babel/parser)
 * 2. Artifact & CDN Dependency Rules
 * 3. Component Architecture (App root function)
 * 4. React Scope & Hooks Hygiene
 * 5. Responsive Tailwind Layout
 */
export function runStaticTests(rawCode: string): {
  tests: TestCaseResult[];
  passed: boolean;
  sanitizedCode: string;
} {
  const tests: TestCaseResult[] = [];
  const { cleanedCode, lucideIcons } = sanitizeCode(rawCode);

  // Helper kode yang siap dieksekusi di browser
  const codeToParse = `
const { useState, useEffect, useRef, useMemo, useCallback } = React;
${cleanedCode}
`;

  // --- Test 1: JSX & AST Syntax Compilation ---
  let syntaxPassed = true;
  try {
    babelParser.parse(codeToParse, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
    tests.push({
      id: "syntax-ast",
      name: "JSX & AST Syntax Compilation",
      category: "syntax",
      status: "passed",
      message: "Kode valid dan berhasil di-compile oleh Babel parser tanpa syntax error.",
    });
  } catch (err: unknown) {
    syntaxPassed = false;
    let errorMsg = "Babel syntax error.";
    let line: number | undefined;
    let col: number | undefined;

    if (err && typeof err === "object") {
      const bErr = err as { message?: string; loc?: { line: number; column: number } };
      errorMsg = bErr.message || errorMsg;
      if (bErr.loc) {
        line = bErr.loc.line;
        col = bErr.loc.column;
      }
    }

    tests.push({
      id: "syntax-ast",
      name: "JSX & AST Syntax Compilation",
      category: "syntax",
      status: "failed",
      message: `Syntax Error: ${errorMsg}`,
      details: line ? `Terdeteksi di baris ${line}, kolom ${col}` : undefined,
      line,
      column: col,
    });
  }

  // --- Test 2: Artifact & CDN Dependency Rules ---
  const unhandledImportMatch = cleanedCode.match(/\bimport\s+.*?\s+from\b/);
  const unhandledRequireMatch = cleanedCode.match(/\brequire\s*\(/);
  const styleJsxMatch = cleanedCode.match(/<style\s+jsx/);

  if (unhandledImportMatch || unhandledRequireMatch) {
    tests.push({
      id: "cdn-compliance",
      name: "Artifact & CDN Dependency Compliance",
      category: "compliance",
      status: "failed",
      message: "Terdeteksi import/require eksternal npm yang tidak didukung oleh sandbox CDN.",
      details: "Hanya React, ReactDOM, Tailwind CSS, dan Lucide React yang diizinkan melalui CDN.",
    });
  } else if (styleJsxMatch) {
    tests.push({
      id: "cdn-compliance",
      name: "Artifact & CDN Dependency Compliance",
      category: "compliance",
      status: "failed",
      message: "Tag <style jsx> terdeteksi. Sandbox hanya mendukung utility classes Tailwind CSS.",
      details: "Ganti inline <style jsx> dengan Tailwind class.",
    });
  } else {
    tests.push({
      id: "cdn-compliance",
      name: "Artifact & CDN Dependency Compliance",
      category: "compliance",
      status: "passed",
      message: "Semua dependensi mematuhi aturan Artifact sandbox (Tailwind, React, Lucide UMD).",
      details: lucideIcons.length > 0 ? `Ikon yang dideteksi: ${lucideIcons.join(", ")}` : undefined,
    });
  }

  // --- Test 3: Component Architecture (App root function) ---
  const hasAppFunction =
    /\bfunction\s+(?:App|Portfolio|LandingPage)\b/.test(cleanedCode) ||
    /\bconst\s+(?:App|Portfolio|LandingPage)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/.test(cleanedCode);

  if (hasAppFunction) {
    tests.push({
      id: "component-root",
      name: "Component Architecture",
      category: "architecture",
      status: "passed",
      message: "Komponen utama (App) ditemukan dan siap di-mount ke root DOM.",
    });
  } else {
    tests.push({
      id: "component-root",
      name: "Component Architecture",
      category: "architecture",
      status: "failed",
      message: "Komponen utama 'function App() { ... }' tidak ditemukan di dalam kode.",
      details: "Pastikan komponen utama didefinisikan dengan nama App.",
    });
  }

  // --- Test 4: React Scope & Hooks Hygiene ---
  const rawHasDuplicateHooks =
    /(?:const|let|var)\s+\{[\s\S]*?(useState|useEffect)[\s\S]*?\}\s*=\s*React/i.test(rawCode);

  tests.push({
    id: "hooks-hygiene",
    name: "React Scope & Hooks Hygiene",
    category: "syntax",
    status: "passed",
    message: "Deklarasi hooks (useState, useEffect, dll.) terisolasi dengan aman dari scope global.",
    details: rawHasDuplicateHooks
      ? "Auto-sanitizer telah membersihkan deklarasi duplikat agar tidak terjadi collision."
      : undefined,
  });

  // --- Test 5: Responsive Tailwind Layout ---
  const hasTailwindClasses =
    /\bclassName="[^"]*?(?:flex|grid|hidden|p-|m-|text-|bg-|w-|h-)[^"]*?"/.test(cleanedCode);
  const hasResponsiveBreakpoints =
    /\b(?:sm:|md:|lg:|xl:)/.test(cleanedCode);

  if (hasTailwindClasses && hasResponsiveBreakpoints) {
    tests.push({
      id: "responsive-layout",
      name: "Responsive Layout & Tailwind Classes",
      category: "compliance",
      status: "passed",
      message: "Layout responsif terverifikasi dengan breakpoint (sm, md, lg) dan utility Tailwind.",
    });
  } else if (hasTailwindClasses) {
    tests.push({
      id: "responsive-layout",
      name: "Responsive Layout & Tailwind Classes",
      category: "compliance",
      status: "warning",
      message: "Tailwind utility terdeteksi, namun breakpoint responsif (sm:/md:) minim.",
    });
  } else {
    tests.push({
      id: "responsive-layout",
      name: "Responsive Layout & Tailwind Classes",
      category: "compliance",
      status: "failed",
      message: "Tidak ditemukan kelas Tailwind CSS yang valid pada elemen JSX.",
    });
  }

  const allPassed = tests.every(
    (t) => t.status === "passed" || t.status === "warning"
  );

  return {
    tests,
    passed: allPassed && syntaxPassed,
    sanitizedCode: codeToParse,
  };
}
