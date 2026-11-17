import { openrouter, CODE_MODELS } from "@/app/lib/openrouter";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { blueprint } = await req.json();

    if (!blueprint) {
      return new Response(JSON.stringify({ error: "Blueprint is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a Principal Frontend Engineer and Award-Winning Web Designer specializing in modern React and Tailwind CSS.
Your task is to generate a SINGLE, SELF-CONTAINED React component (function App() { ... }) based on the user's Blueprint.

TECHNICAL SPECIFICATIONS:
1. React 18: use standard React hooks (useState, useEffect, useMemo, useRef). You can destructure: const { useState, useEffect } = React;
2. Tailwind CSS: craft a polished, modern, responsive layout (desktop & mobile) with elegant typography, spacing, subtle border accents, and micro-interactions.
3. Clean Icons: use inline SVG icons or standard Lucide icons (e.g. Sparkles, ArrowRight, Check, Menu, X, Star, Github).
4. NO External Imports: React is available globally via CDN. Do not import external npm packages.
5. NO Next.js specific tags: DO NOT use <style jsx> or <style jsx global>. Use Tailwind CSS utility classes exclusively for all styling.
6. High Quality Content: write realistic, inspiring copy and rich sample data (projects, roles, metrics, or services) matching the blueprint's theme and target audience. Avoid lazy placeholders or repetitive "Lorem Ipsum".

CRITICAL OUTPUT RULES:
- Output ONLY PURE JAVASCRIPT / JSX CODE.
- DO NOT wrap the code in markdown code fences (\`\`\`jsx or \`\`\`). Start immediately with the component code.
- DO NOT write any introductory greetings or trailing commentary.
- Ensure the component is named App (function App() { ... }).`;

    const sectionsSummary = (blueprint.sections || [])
      .map(
        (s: { name: string; description: string }) => `- ${s.name}: ${s.description}`
      )
      .join("\n");

    const userPrompt = `Generate a complete, production-grade React + Tailwind component for this website blueprint:
Title: ${blueprint.title}
Tagline: ${blueprint.tagline}
Website Type: ${blueprint.websiteType}
Visual Theme: ${blueprint.visualTheme}
Target Audience: ${blueprint.targetAudience}
Sections to Build:
${sectionsSummary}
Key Features: ${(blueprint.keyFeatures || []).join(", ")}

Write the full React component starting now:`;

    // Try primary coder model (baidu/ernie-5.5-flash-preview:free, cohere/north-mini-code:free, recursive/flint-v1.0:free)
    let lastError: unknown = null;
    for (const modelId of CODE_MODELS) {
      try {
        const result = streamText({
          model: openrouter(modelId),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.5,
        });

        return result.toTextStreamResponse();
      } catch (err) {
        console.warn(`Model ${modelId} failed to start stream, attempting fallback...`, err);
        lastError = err;
      }
    }

    throw lastError || new Error("All candidate coder models failed to start streaming.");
  } catch (error: unknown) {
    console.error("Error in /api/generate:", error);
    const msg = error instanceof Error ? error.message : "Failed to stream code.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
