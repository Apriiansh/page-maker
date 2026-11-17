import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Page Maker Studio",
  },
});

export const REASONING_MODEL =
  process.env.NEXT_PUBLIC_MODEL_REASONING ||
  "nvidia/nemotron-3.5-lightning:free";

// Rangkaian model coding React:
// 1. cohere/north-mini-code:free -> Respon instan (~3 detik), dioptimasi untuk agentic coding
// 2. baidu/ernie-5.5-flash-preview:free -> Konteks 1M token (memerlukan waktu reasoning ~30-45 detik)
// 3. recursive/flint-v1.0:free -> Model coding agent open-weight
export const CODE_MODELS = [
  "cohere/north-mini-code:free",
  "baidu/ernie-5.5-flash-preview:free",
  "recursive/flint-v1.0:free",
  process.env.NEXT_PUBLIC_MODEL_GENERATION,
].filter(Boolean) as string[];

export const CODE_MODEL = CODE_MODELS[0];

// Model QA Reviewer / Auditor (keluarga berbeda dari pembuat kode)
export const TESTER_MODELS = [
  "google/gemma-4-31b-it:free",
  process.env.NEXT_PUBLIC_MODEL_TESTER,
  "meta-llama/llama-3.3-70b-instruct:free",
].filter(Boolean) as string[];

export const TESTER_MODEL = TESTER_MODELS[0];

// Alias backwards-compatibility
export const REASIONING_MODEL = REASONING_MODEL;
export const CANDIDATE_TESTER_MODELS = TESTER_MODELS;
