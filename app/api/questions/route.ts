import { openrouter, REASONING_MODEL } from "@/app/lib/openrouter";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuestionSchema = z.object({
  acknowledgment: z
    .string()
    .describe(
      "A brief (1-2 sentences), thoughtful reaction acknowledging what the user just shared and why it works well."
    ),
  category: z
    .string()
    .describe(
      "A short category tag for this question (e.g., 'Core Content', 'Featured Projects', 'Target Audience', 'Visual Style', 'Call to Action')"
    ),
  question: z
    .string()
    .describe(
      "EXACTLY ONE single, focused question ending with ONE question mark (?). STRICTLY FORBIDDEN to ask multiple sub-questions in one prompt."
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
        category: "Website Purpose",
        question:
          "What kind of website would you like to build today and tell me the name of website? (e.g., a personal portfolio, product landing page, or company profile)",
      });
    }

    const currentStep = history.length + 1;

    const formattedHistory = history
      .map(
        (h: { question: string; answer: string }, idx: number) =>
          `[Question ${idx + 1}]: ${h.question}\n[User Answer]: ${h.answer}`
      )
      .join("\n\n");

    const systemPrompt = `You are an expert Website Strategist and UX Architect.
Your task is to guide the user in planning their website through an adaptive, one-question-at-a-time conversation.

STRICT RULE: EXACTLY ONE QUESTION PER TURN
- You MUST ask only ONE single, concise, laser-focused question.
- STRICTLY FORBIDDEN: DO NOT ask compound questions or stack multiple questions together (e.g., NEVER say "What projects do you have, what is your role, who is your audience, and what colors do you like?"). That overwhelms and confuses the user.
- Your entire question must contain ONLY ONE question mark (?).
- Guide the conversation logically across steps by asking about ONE topic at a time:
  * Topic A: Main projects, work, or services to feature.
  * Topic B: Target audience or clients.
  * Topic C: Visual mood or aesthetic style.
  * Topic D: Primary call to action (e.g., hire me, email me, book a call).

COMMUNICATION PRINCIPLES:
1. In your acknowledgment:
   - Keep it brief (1-2 sentences).
   - React with genuine interest to the specific detail the user just shared.
2. In your question:
   - Ask ONE open-ended question that is quick and easy to answer in 1-2 sentences.
   - Do NOT provide multiple-choice options (A/B/C/D).
   - Do NOT mention 3D graphics or unnecessary gimmicks. Focus on real web content and user goals.`;

    const userPrompt = `Conversation history so far:\n\n${formattedHistory}\n\nNow craft Question #${currentStep}.\n1. Write a short 1-2 sentence acknowledgment of the user's latest answer.\n2. Ask EXACTLY ONE single, clear question about the next logical aspect of the site. Ensure there is only ONE question mark (?).`;

    const { object } = await generateObject({
      model: openrouter(REASONING_MODEL),
      schema: QuestionSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      step: currentStep,
      acknowledgment: object.acknowledgment,
      category: object.category,
      question: object.question,
    });
  } catch (error: unknown) {
    console.error("Error in /api/questions:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to generate question.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
