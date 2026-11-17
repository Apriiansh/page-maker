import { NextRequest, NextResponse } from "next/server";
import { openrouter, CODE_MODELS } from "@/app/lib/openrouter";
import { runStaticTests } from "@/app/lib/codeTester";
import { formatViolationsForRetry } from "@/app/lib/designRules";
import { PageBlueprint, TestCaseResult, VerificationReport } from "@/app/types";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const { code, blueprint, styleId, errors } = (await req.json()) as {
      code: string;
      blueprint?: PageBlueprint;
      styleId?: string;
      errors?: TestCaseResult[];
    };

    if (!code) {
      return NextResponse.json(
        { error: "Original code is required for auto-repair." },
        { status: 400 }
      );
    }

    // Jalankan pengujian statis untuk mendeteksi pelanggaran aturan desain
    const initialCheck = runStaticTests(code, blueprint, styleId);
    const retryFeedback =
      formatViolationsForRetry(initialCheck.violations) ||
      (errors || [])
        .filter((e) => e.status === "failed")
        .map((e) => `- [${e.name}] ${e.message} ${e.details ? `(${e.details})` : ""}`)
        .join("\n");

    const systemPrompt = `You are an Expert React & Design System Code Repair Engine.
Your job is to fix syntax errors, design rule violations, and structural flaws in React JSX code for the "${initialCheck.style.name}" design system.

STRICT REPAIR RULES:
1. NO External npm imports: React and icons are provided globally / inline. Do NOT write import statements.
2. React Hooks: Destructure standard hooks cleanly: const { useState, useEffect, useMemo, useRef } = React;
3. Component Root: Ensure the primary component is named App (function App() { ... }).
4. Tailwind Only: Ensure all styling is pure Tailwind CSS classes. No <style jsx>.
5. Adhere to the "${initialCheck.style.name}" palette and radius rules.
6. Return ONLY executable JavaScript / JSX code without markdown fences (\`\`\`jsx or \`\`\`).`;

    const userPrompt = `Fix and repair the following React code which failed testing:

${retryFeedback || "Syntax compilation error or missing App component"}

ORIGINAL CODE:
${code}

Return the complete, repaired, 100% valid code:`;

    let repairedCode = "";
    let lastError: unknown = null;

    for (const modelId of CODE_MODELS) {
      try {
        const { text } = await generateText({
          model: openrouter(modelId),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.2,
        });

        if (text && text.trim().length > 50) {
          repairedCode = text.trim();
          break;
        }
      } catch (err) {
        console.warn(`Repair model ${modelId} failed, trying next candidate...`, err);
        lastError = err;
      }
    }

    if (!repairedCode) {
      throw lastError || new Error("Failed to auto-repair code with candidate models.");
    }

    // Clean repaired code from any markdown backticks
    repairedCode = repairedCode
      .replace(/^```[a-zA-Z]*\r?\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    // Verify repaired code immediately against design rules
    const staticResult = runStaticTests(repairedCode, blueprint, styleId);

    const report: VerificationReport = {
      passed: staticResult.passed,
      score: staticResult.passed ? 90 : 45,
      summary: staticResult.passed
        ? `Kode berhasil diperbaiki otomatis dan kini mematuhi aturan desain "${staticResult.style.name}".`
        : "Kode telah diperbaiki, namun masih terdapat catatan pengujian.",
      tests: staticResult.tests,
      canPreview: staticResult.passed,
      sanitizedCode: staticResult.sanitizedCode,
    };

    return NextResponse.json({
      success: true,
      repairedCode,
      report,
    });
  } catch (error: unknown) {
    console.error("Error in /api/repair:", error);
    const msg = error instanceof Error ? error.message : "Auto-repair failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
