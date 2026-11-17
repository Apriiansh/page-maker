import { NextRequest, NextResponse } from "next/server";
import { openrouter, CODE_MODELS } from "@/app/lib/openrouter";
import { runStaticTests } from "@/app/lib/codeTester";
import { PageBlueprint, VerificationReport } from "@/app/types";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const {
      code,
      blueprint,
      styleId,
      revisionPrompt,
      selectedElement,
    } = (await req.json()) as {
      code: string;
      blueprint?: PageBlueprint;
      styleId?: string;
      revisionPrompt: string;
      selectedElement?: {
        tagName: string;
        innerText: string;
        outerHTML: string;
      };
    };

    if (!code || !revisionPrompt) {
      return NextResponse.json(
        { error: "Original code and revision prompt are required." },
        { status: 400 }
      );
    }

    const initialCheck = runStaticTests(code, blueprint, styleId);
    const styleName = initialCheck.style.name;

    const elementContext = selectedElement
      ? `TARGET ELEMENT TO REVISE:
- Tag: <${selectedElement.tagName.toLowerCase()}>
- Current Text Content: "${selectedElement.innerText.trim().slice(0, 200)}"
- Outer HTML snippet:
${selectedElement.outerHTML.slice(0, 500)}`
      : "";

    const systemPrompt = `You are an Expert React and Tailwind CSS Engineer specializing in component revisions and visual styling updates.
Your task is to revise the provided React component based on the user's change request while maintaining the "${styleName}" design system.

STRICT REVISION RULES:
1. Preserve all existing working functionality, structure, and sections that are not asked to be changed.
2. If a specific component or element is targeted, make the change specifically on that element and its surrounding section.
3. Add a brief, clean inline comment before the changed section describing what was updated (e.g. {/* Revised: updated CTA button style and headline */}).
4. NO External npm imports: React and icons are available globally / inline. Do NOT write import statements.
5. React 18: use standard React hooks (useState, useEffect, useMemo, useRef).
6. Component Root: Ensure the primary component is named App (function App() { ... }).
7. Tailwind Only: Ensure all styling is pure Tailwind CSS utility classes. No <style jsx>.
8. Output ONLY pure executable JavaScript / JSX code without markdown fences (\`\`\`jsx or \`\`\`). No commentary before or after.`;

    const userPrompt = `Revise the following React component according to this user request:

USER REVISION REQUEST:
"${revisionPrompt}"

${elementContext}

CURRENT COMPONENT CODE:
${code}

Return the complete revised React component (code only):`;

    let revisedCode = "";
    let lastError: unknown = null;

    for (const modelId of CODE_MODELS) {
      try {
        const { text } = await generateText({
          model: openrouter(modelId),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.3,
        });

        if (text && text.trim().length > 50) {
          revisedCode = text.trim();
          break;
        }
      } catch (err) {
        console.warn(`Revision model ${modelId} failed, trying next candidate...`, err);
        lastError = err;
      }
    }

    if (!revisedCode) {
      throw lastError || new Error("Failed to revise code with candidate models.");
    }

    // Clean any markdown backticks
    revisedCode = revisedCode
      .replace(/^```[a-zA-Z]*\r?\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    // Verify revised code against all design and syntax rules
    const staticResult = runStaticTests(revisedCode, blueprint, styleId);

    const report: VerificationReport = {
      passed: staticResult.passed,
      score: staticResult.passed ? 92 : 50,
      summary: staticResult.passed
        ? `Revision successfully applied and verified against the "${staticResult.style.name}" design system.`
        : "Revision applied, but some quality checks require attention.",
      tests: staticResult.tests,
      canPreview: staticResult.passed,
      sanitizedCode: staticResult.sanitizedCode,
    };

    return NextResponse.json({
      success: true,
      revisedCode,
      report,
    });
  } catch (error: unknown) {
    console.error("Error in /api/revise:", error);
    const msg = error instanceof Error ? error.message : "Revision failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
