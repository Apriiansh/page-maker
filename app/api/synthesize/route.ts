import { openrouter, REASONING_MODEL } from "@/app/lib/openrouter";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BlueprintSchema = z.object({
  title: z.string().describe("A compelling, polished project title for the website."),
  tagline: z.string().describe("A crisp, memorable tagline or one-liner summarizing the site."),
  websiteType: z.string().describe("The primary category (e.g., 'Developer Portfolio', 'Design Agency Showcase', 'SaaS Landing Page')."),
  visualTheme: z.string().describe("The design aesthetic, color scheme, typography style, and overall tone."),
  targetAudience: z.string().describe("Who the website is specifically built for."),
  sections: z.array(
    z.object({
      name: z.string().describe("Section name (e.g., 'Hero', 'Featured Work', 'Skills & Stack', 'Experience', 'Contact')."),
      description: z.string().describe("A brief explanation of what content and value this section delivers."),
    })
  ).describe("The core narrative sections of the page in recommended order."),
  keyFeatures: z.array(z.string()).describe("Key interactive UI features (e.g., 'Filterable project grid', 'Experience timeline', 'Copy email action', 'Responsive navigation')."),
});

export async function POST(req: NextRequest) {
  try {
    const { history = [] } = await req.json();

    if (!history || history.length === 0) {
      return NextResponse.json(
        { success: false, error: "Conversation history cannot be empty." },
        { status: 400 }
      );
    }

    const formattedHistory = history
      .map(
        (h: { question: string; answer: string }, idx: number) =>
          `[Question ${idx + 1}]: ${h.question}\n[User Answer]: ${h.answer}`
      )
      .join("\n\n");

    const systemPrompt = `You are a Principal Software Architect and Design Lead.
Your task is to synthesize the user's answers and vision into a cohesive, structured Website Blueprint.
Focus on content structure, clear visual hierarchy, practical user flow, and modern React + Tailwind UI components.
Ensure the layout directly serves the user's primary goal (e.g., highlighting their best portfolio pieces, credibility, and clear contact path).`;

    const userPrompt = `Here is the complete dialogue between the user and AI:\n\n${formattedHistory}\n\nSynthesize this into a detailed, practical Website Blueprint.`;

    const { object: blueprint } = await generateObject({
      model: openrouter(REASONING_MODEL),
      schema: BlueprintSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6,
    });

    return NextResponse.json({
      success: true,
      blueprint,
    });
  } catch (error: unknown) {
    console.error("Error in /api/synthesize:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to synthesize blueprint.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
