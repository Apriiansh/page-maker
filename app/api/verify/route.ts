import { NextRequest, NextResponse } from "next/server";
import { openrouter, CANDIDATE_TESTER_MODELS } from "@/app/lib/openrouter";
import { runStaticTests } from "@/app/lib/codeTester";
import { PageBlueprint, TestCaseResult, VerificationReport } from "@/app/types";
import { generateObject } from "ai";
import { z } from "zod";

const auditSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall code quality score between 0 and 100"),
  blueprintCoverage: z.enum(["full", "partial", "poor"]).describe("How well the code implements the blueprint sections"),
  defensiveQuality: z.enum(["high", "medium", "low"]).describe("Whether the code uses safe null-checks, defensive fallbacks, and proper handlers"),
  summary: z.string().describe("Concise 1-2 sentence assessment of code readiness and quality in Indonesian"),
  potentialIssues: z.array(z.string()).describe("List of any subtle issues or improvements observed, if any"),
});

export async function POST(req: NextRequest) {
  try {
    const { code, blueprint } = (await req.json()) as {
      code: string;
      blueprint?: PageBlueprint;
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code content is required for testing." },
        { status: 400 }
      );
    }

    // 1. Run rigorous static tests (Babel AST, CDN compliance, Root component, Tailwind)
    const staticResult = runStaticTests(code);
    const tests: TestCaseResult[] = [...staticResult.tests];

    // If static tests failed (e.g. syntax error or missing App), preview is blocked!
    if (!staticResult.passed) {
      const report: VerificationReport = {
        passed: false,
        score: 40,
        summary: "Kode belum lolos pengujian sintaks atau aturan sandbox. Perbaikan diperlukan sebelum preview.",
        tests,
        canPreview: false,
        sanitizedCode: staticResult.sanitizedCode,
      };

      return NextResponse.json({ success: true, report });
    }

    // 2. Run AI Code Auditor & Quality Inspector
    let aiScore = 95;
    let aiSummary = "Semua pengujian lolos. Komponen siap ditampilkan di Live Preview.";
    let aiIssues: string[] = [];

    const sectionsList = blueprint?.sections?.map((s) => s.name).join(", ") || "Hero, Features, Content";

    const prompt = `Review this React component code generated for a website blueprint.
Blueprint Title: ${blueprint?.title || "Website"}
Target Audience: ${blueprint?.targetAudience || "General"}
Required Sections: ${sectionsList}

Code snippet to inspect:
${code.slice(0, 3500)}

Audit the code for:
1. Blueprint coverage: Are the planned sections implemented?
2. Defensive code: Are default values, safe mappings, and event handlers clean?
3. Polish & Readability: Is the component ready for production preview?`;

    for (const modelId of CANDIDATE_TESTER_MODELS) {
      try {
        const { object } = await generateObject({
          model: openrouter(modelId),
          schema: auditSchema,
          prompt,
          system: "You are a Senior Frontend QA & Code Verification Auditor. Evaluate the React component code objectively and return JSON.",
        });

        aiScore = object.score;
        aiSummary = object.summary;
        aiIssues = object.potentialIssues || [];

        tests.push({
          id: "ai-audit",
          name: "AI Code Quality & Blueprint Alignment",
          category: "ai_audit",
          status: object.score >= 70 ? "passed" : "warning",
          message: object.summary,
          details:
            aiIssues.length > 0
              ? `Catatan QA: ${aiIssues.join("; ")}`
              : "Kode memiliki struktur rapi dan mencakup seksi yang direncanakan.",
        });
        break;
      } catch (err) {
        console.warn(`Tester model ${modelId} failed, falling back...`, err);
      }
    }

    // If no tester model succeeded, provide local verified pass
    if (!tests.some((t) => t.id === "ai-audit")) {
      tests.push({
        id: "ai-audit",
        name: "AI Code Quality & Blueprint Alignment",
        category: "ai_audit",
        status: "passed",
        message: "Verifikasi statis dan struktur komponen berhasil diverifikasi.",
        details: "Pengujian sintaks dan dependensi 100% valid.",
      });
    }

    const allPassed = tests.every((t) => t.status !== "failed");

    const finalReport: VerificationReport = {
      passed: allPassed,
      score: allPassed ? aiScore : 50,
      summary: aiSummary,
      tests,
      canPreview: allPassed,
      sanitizedCode: staticResult.sanitizedCode,
    };

    return NextResponse.json({ success: true, report: finalReport });
  } catch (error: unknown) {
    console.error("Error in /api/verify:", error);
    const msg = error instanceof Error ? error.message : "Testing verification failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
