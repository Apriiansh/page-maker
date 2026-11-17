import { NextRequest, NextResponse } from "next/server";
import { openrouter, CODE_MODELS } from "@/app/lib/openrouter";
import { runStaticTests } from "@/app/lib/codeTester";
import { PageBlueprint, TestCaseResult, VerificationReport } from "@/app/types";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const { code, blueprint, errors } = (await req.json()) as {
      code: string;
      blueprint?: PageBlueprint;
      errors?: TestCaseResult[];
    };

    if (!code) {
      return NextResponse.json(
        { error: "Original code is required for auto-repair." },
        { status: 400 }
      );
    }

    const errorDetails = (errors || [])
      .filter((e) => e.status === "failed")
      .map((e) => `- [${e.name}] ${e.message} ${e.details ? `(${e.details})` : ""}`)
      .join("\n");

    const systemPrompt = `You are an Expert React & Babel Code Repair Engine.
Your job is to fix syntax errors, import issues, and structural flaws in React JSX code so it can run inside a standalone Babel + React UMD + Tailwind browser iframe sandbox.

STRICT REPAIR RULES:
1. NO External npm imports: React, ReactDOM, and Lucide are provided globally. Do NOT write import statements.
2. React Hooks: Destructure standard hooks cleanly or use React.useState. Do not redeclare duplicate variables in the same scope.
3. Component Root: Ensure the primary component is named App (function App() { ... }).
4. Tailwind Only: Ensure all styling is pure Tailwind CSS classes. No <style jsx>.
5. Return ONLY executable JavaScript / JSX code.
6. NO markdown fences (\`\`\`jsx or \`\`\`). Output pure code directly.`;

    const userPrompt = `Fix and repair the following React code which failed testing:

TEST FAILURES DETECTED:
${errorDetails || "Syntax compilation error or missing App component"}

ORIGINAL CODE:
${code}

Return the complete, repaired, 100% syntactically valid code:`;

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

    // Verify repaired code immediately
    const staticResult = runStaticTests(repairedCode);

    const report: VerificationReport = {
      passed: staticResult.passed,
      score: staticResult.passed ? 90 : 45,
      summary: staticResult.passed
        ? "Kode berhasil diperbaiki secara otomatis oleh AI dan lolos pengujian sintaks."
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
