import { openrouter, QUESTION_MODELS } from "@/app/lib/openrouter";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuestionSchema = z.object({
  acknowledgment: z
    .string()
    .describe(
      "A warm, thoughtful 1-2 sentence reaction acknowledging what the user just shared and why it works well."
    ),
  category: z
    .string()
    .describe(
      "A short category tag for this question (e.g., 'Visual Identity & Colors', 'Core Content & Highlights', 'Target Audience', 'Call to Action')"
    ),
  question: z
    .string()
    .describe(
      "EXACTLY ONE single, clear, focused question ending with ONE question mark (?). Provide helpful, inspiring examples in parentheses."
    ),
});

export async function POST(req: NextRequest) {
  try {
    const { history = [] } = await req.json();

    // Fast-path for the opening question (crisp and single)
    if (history.length === 0) {
      return NextResponse.json({
        success: true,
        step: 1,
        acknowledgment: "",
        category: "Website Purpose & Identity",
        question:
          "What kind of website would you like to build today, and what is its name or brand? (e.g., an indie developer portfolio, an artisanal cafe, a modern SaaS product, or a creative agency)",
      });
    }

    const currentStep = history.length + 1;

    const formattedHistory = history
      .map(
        (h: { question: string; answer: string }, idx: number) =>
          `[Question ${idx + 1}]: ${h.question}\n[User Answer]: ${h.answer}`
      )
      .join("\n\n");

    const systemPrompt = `You are an expert Website Strategist, Art Director, and UX Architect.
Your mission is to guide the user in planning their website through an engaging, conversational, one-question-at-a-time consultation.

CRITICAL RULES:
1. STRICTLY ONE QUESTION PER TURN:
   - You MUST ask only ONE single, clear, laser-focused question.
   - Your entire question must contain ONLY ONE question mark (?).
   - NEVER ask compound or stacked questions (e.g., do not say "What are your colors, who is your audience, and what features do you want?").

2. ADAPTIVE TOPIC ROADMAP:
   - Step 2 (Visual Identity, Color Palette & Theme):
     * ALWAYS prioritize asking about their preferred aesthetic, color palette, and theme (dark mode vs light mode, primary brand colors, accent colors).
     * Provide 2-3 inspiring, vivid examples tailored to their project (e.g., sleek technical dark mode with electric lime, warm organic earth tones with terracotta, clean editorial serif with warm beige, or bold minimalist monochrome).
   - Step 3 (Core Content & Standout Offerings):
     * Ask about the 2-3 essential projects, services, menu items, or products they most want to showcase.
   - Step 4 (Target Audience & Desired Impression):
     * Ask who the primary target audience is and the main impression or feeling they should take away.
   - Step 5 (Primary Call to Action):
     * Ask what single primary action they want visitors to take (e.g., booking an appointment, copying an email, scheduling a call, or buying a product).

3. COMMUNICATION PRINCIPLES:
   - In your acknowledgment (1-2 sentences):
     * React genuinely and enthusiastically to the user's specific answer. Explain briefly why their idea or direction works well.
   - In your question:
     * Be conversational, encouraging, and clear.
     * Include brief inspiring ideas in parentheses to spark creativity, but DO NOT format as a rigid A/B/C/D multiple-choice quiz.
     * Keep the tone modern, professional, and friendly. Full English only.`;

    const stepGuidance =
      currentStep === 2
        ? "IMPORTANT: This is Step 2. Focus specifically on Visual Identity, Color Palette, and Theme (e.g., dark mode, light mode, brand colors, earthy, vibrant, editorial, or minimalist tones)."
        : currentStep === 3
        ? "Focus on Core Content & Standout Offerings (e.g., key projects, services, products, or portfolio pieces to feature)."
        : currentStep === 4
        ? "Focus on Target Audience & Desired Impression."
        : "Focus on Primary Call to Action & Visitor Journey.";

    const userPrompt = `Conversation history so far:\n\n${formattedHistory}\n\nNow craft Question #${currentStep}.\n${stepGuidance}\n\n1. Write a warm, brief 1-2 sentence acknowledgment of the user's latest response.\n2. Ask EXACTLY ONE single, clear question with inspiring examples, ending with ONE question mark (?).`;

    let generatedObject = null;
    let lastError: unknown = null;

    for (const modelId of QUESTION_MODELS) {
      try {
        const { object } = await generateObject({
          model: openrouter(modelId),
          schema: QuestionSchema,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.7,
          abortSignal: AbortSignal.timeout(25_000),
        });
        generatedObject = object;
        break;
      } catch (err) {
        console.warn(`Question model ${modelId} failed, trying next...`, err);
        lastError = err;
      }
    }

    if (!generatedObject) {
      throw lastError ?? new Error("All question models failed to generate a response.");
    }

    return NextResponse.json({
      success: true,
      step: currentStep,
      acknowledgment: generatedObject.acknowledgment,
      category: generatedObject.category,
      question: generatedObject.question,
    });
  } catch (error: unknown) {
    console.error("Error in /api/questions:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to generate question.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
