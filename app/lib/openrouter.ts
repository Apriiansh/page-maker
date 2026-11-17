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

// Model pilihan khusus untuk coding React (dengan fallback rantai model)
export const CODE_MODELS = [
  process.env.NEXT_PUBLIC_MODEL_GENERATION,
  "baidu/ernie-5.5-flash-preview:free",
  "cohere/north-mini-code:free",
  "recursive/flint-v1.0:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
].filter(Boolean) as string[];

export const CODE_MODEL = CODE_MODELS[0];

// Model pilihan khusus untuk QA Reviewer / Auditor (keluarga berbeda dari pembuat kode)
export const TESTER_MODELS = [
  process.env.NEXT_PUBLIC_MODEL_TESTER,
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
].filter(Boolean) as string[];

export const TESTER_MODEL = TESTER_MODELS[0];

// Alias backwards-compatibility
export const REASIONING_MODEL = REASONING_MODEL;
export const CANDIDATE_TESTER_MODELS = TESTER_MODELS;
