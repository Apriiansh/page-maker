import * as babelParser from "@babel/parser";
import { TestCaseResult } from "@/app/types";
import {
  checkDesignRules,
  formatViolationsForRetry,
  getStyleById,
  pickStyle,
  StyleDirection,
  Violation,
  Blueprint,
  TECHNICAL_RULES,
  DESIGN_BANS,
  OUTPUT_RULES,
} from "./designRules";

export interface SanitizeResult {
  cleanedCode: string;
  lucideIcons: string[];
}

export { checkDesignRules, formatViolationsForRetry };

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
  const lucideImportRegex =
    /import\s+\{([\s\S]*?)\}\s+from\s+['"]lucide-react['"];?/g;
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
 * Helper untuk memberikan label nama tes yang rapi dan mudah dipahami
 */
function getRuleDisplayName(ruleId: string): string {
  const map: Record<string, string> = {
    "react-global": "React 18 Global Setup",
    "no-import-export": "No Import/Export Statements",
    "no-self-mount": "Host-Mount Isolation",
    "plain-js": "Plain JavaScript & JSX Syntax",
    "tailwind-only": "Tailwind Utility Styling",
    "inline-svg-icons": "Inline SVG Icon Standard",
    "defensive": "Defensive Runtime Safety",
    "responsive": "Responsive Breakpoints (md/lg)",
    "load-fonts": "Dynamic Google Fonts Loader",
    "no-gradient": "Zero-Gradient Aesthetics",
    "no-glass-glow-blobs": "Clean Surface (No Glow/Blur)",
    "no-eyebrow": "No Pill/Eyebrow Badge Clutter",
    "no-emoji": "Zero Emoji/Pictograph Rule",
    "no-generic-headings": "Contextual Headings",
    "varied-layout": "Varied Section Layouts",
    "no-fake-proof": "Authentic Content (No Fake Proof)",
    "one-decoration": "Restrained Decoration",
    "minimal-footer": "Minimalist Footer",
    "code-only": "Clean Output (No Fences)",
    "component-name": "App Component Declaration",
    "style-palette": "Design System Palette Match",
    "style-radius": "Design System Corner Radius",
  };
  return map[ruleId] || ruleId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Menentukan kategori pengujian untuk UI
 */
function getRuleCategory(
  ruleId: string
): "syntax" | "compliance" | "architecture" | "ai_audit" {
  if (
    ruleId.includes("syntax") ||
    ruleId === "plain-js" ||
    ruleId === "no-import-export" ||
    ruleId === "react-global"
  ) {
    return "syntax";
  }
  if (
    ruleId === "component-name" ||
    ruleId === "no-self-mount" ||
    ruleId === "defensive"
  ) {
    return "architecture";
  }
  return "compliance";
}

/**
 * Menjalankan static tests secara terpadu berdasarkan aturan dari designRules.ts:
 * 1. AST Syntax Compilation Test (@babel/parser)
 * 2. Design Rules & Constraints Check (checkDesignRules)
 * 3. Style Conformance (Palet warna & Corner radius sesuai tema)
 */
export function runStaticTests(
  rawCode: string,
  blueprint?: Blueprint,
  styleId?: string
): {
  tests: TestCaseResult[];
  passed: boolean;
  sanitizedCode: string;
  violations: Violation[];
  style: StyleDirection;
} {
  const tests: TestCaseResult[] = [];
  const { cleanedCode } = sanitizeCode(rawCode);

  // Tentukan arah gaya (StyleDirection) sesuai blueprint atau styleId
  const style =
    getStyleById(styleId) ||
    pickStyle(blueprint || {});

  // Helper kode untuk simulasi eksekusi runtime
  const codeToParse = `
const { useState, useEffect, useRef, useMemo, useCallback } = React;
${cleanedCode}
`;

  // --- 1. AST Syntax Test (@babel/parser) ---
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
      const bErr = err as {
        message?: string;
        loc?: { line: number; column: number };
      };
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

  // --- 2. Design & Technical Rules Check dari designRules.ts ---
  const violations = checkDesignRules(cleanedCode, style);
  const violatedRuleIds = new Set(violations.map((v) => v.ruleId));

  // Masukkan pelanggaran yang terdeteksi ke dalam daftar tes
  for (const v of violations) {
    tests.push({
      id: v.ruleId,
      name: getRuleDisplayName(v.ruleId),
      category: getRuleCategory(v.ruleId),
      status: v.severity === "error" ? "failed" : "warning",
      message: v.message,
      details: `Aturan desain: ${style.name} (${v.severity.toUpperCase()})`,
    });
  }

  // Tambahkan ringkasan aturan utama yang lolos (Clean Pass)
  const coreRules = [...TECHNICAL_RULES, ...DESIGN_BANS, ...OUTPUT_RULES];
  for (const r of coreRules) {
    if (!violatedRuleIds.has(r.id)) {
      tests.push({
        id: r.id,
        name: getRuleDisplayName(r.id),
        category: getRuleCategory(r.id),
        status: "passed",
        message: `Mematuhi aturan ${getRuleDisplayName(r.id)} sesuai panduan desain.`,
      });
    }
  }

  // Style Conformance: palet & radius jika tidak ada pelanggaran
  if (!violatedRuleIds.has("style-palette")) {
    tests.push({
      id: "style-palette",
      name: "Design System Palette Match",
      category: "compliance",
      status: "passed",
      message: `Penggunaan warna selaras dengan palet tema "${style.name}".`,
    });
  }

  if (!violatedRuleIds.has("style-radius")) {
    tests.push({
      id: "style-radius",
      name: "Design System Corner Radius",
      category: "compliance",
      status: "passed",
      message: `Radius sudut elemen mematuhi standar desain "${style.name}".`,
    });
  }

  // Preview hanya boleh dibuka jika TIDAK ADA error (severity = error) dan sintaks Babel lolos
  const hasErrorViolation = violations.some((v) => v.severity === "error");
  const overallPassed = syntaxPassed && !hasErrorViolation;

  return {
    tests,
    passed: overallPassed,
    sanitizedCode: codeToParse,
    violations,
    style,
  };
}
