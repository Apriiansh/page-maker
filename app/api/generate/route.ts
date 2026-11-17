import { openrouter, CODE_MODELS } from "@/app/lib/openrouter";
import {
  buildSystemPrompt,
  buildUserPrompt,
  pickStyle,
  type Blueprint,
} from "@/app/lib/designRules";
import { streamText } from "ai";
import { NextRequest } from "next/server";

// Model gratis sering lambat di token pertama (apalagi yang reasoning).
const FIRST_TOKEN_TIMEOUT_MS = 45_000;

// ---------------------------------------------------------------------------
// Membuang code fence (```jsx ... ```) yang sering tetap ditulis model,
// tanpa menunggu seluruh stream selesai.
// ---------------------------------------------------------------------------
function createFenceStripper() {
  const LEADING_FENCE = /^\s*```[a-zA-Z]*[ \t]*\r?\n/;
  const HOLD = 16;
  let head = "";
  let headDone = false;
  let tail = "";

  return {
    push(chunk: string): string {
      let text = chunk;
      if (!headDone) {
        head += chunk;
        if (head.indexOf("\n") === -1 && head.length < 20) return "";
        headDone = true;
        text = head.replace(LEADING_FENCE, "");
        head = "";
      }
      tail += text;
      if (tail.length <= HOLD) return "";
      const out = tail.slice(0, tail.length - HOLD);
      tail = tail.slice(-HOLD);
      return out;
    },
    flush(): string {
      const rest = headDone ? tail : head.replace(LEADING_FENCE, "");
      head = "";
      tail = "";
      return rest.replace(/\r?\n?```\s*$/, "");
    },
  };
}

// ---------------------------------------------------------------------------
// streamText itu lazy: error model (rate limit, model hilang, timeout) tidak
// dilempar saat dipanggil, jadi try/catch biasa tidak pernah memicu fallback.
// Di sini kita tunggu token pertama dulu. Kalau kosong/error/timeout, lanjut
// ke model berikutnya sebelum response dikirim ke client.
// ---------------------------------------------------------------------------
async function startStream(
  modelId: string,
  system: string,
  prompt: string,
  parentSignal: AbortSignal
) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  parentSignal.addEventListener("abort", onParentAbort);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FIRST_TOKEN_TIMEOUT_MS);

  const cleanup = () => {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", onParentAbort);
  };

  let streamError: unknown = null;

  try {
    const result = streamText({
      model: openrouter(modelId),
      system,
      prompt,
      temperature: 0.5,
      abortSignal: controller.signal,
      onError: ({ error }) => {
        streamError = error;
      },
    });

    const iterator = result.textStream[Symbol.asyncIterator]();
    let first = await iterator.next();
    while (!first.done && !first.value) {
      first = await iterator.next();
    }
    clearTimeout(timer);

    if (first.done) {
      throw streamError ?? new Error("Model returned an empty response");
    }
    return { iterator, first: first.value as string, controller, cleanup };
  } catch (err) {
    cleanup();
    if (timedOut) {
      throw new Error(`No response within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s`);
    }
    throw streamError ?? err;
  }
}

function toTextResponse(
  modelId: string,
  styleId: string,
  started: Awaited<ReturnType<typeof startStream>>
) {
  const { iterator, first, controller, cleanup } = started;
  const encoder = new TextEncoder();
  const stripper = createFenceStripper();

  const body = new ReadableStream<Uint8Array>({
    async start(stream) {
      try {
        let out = stripper.push(first);
        if (out) stream.enqueue(encoder.encode(out));

        while (true) {
          const { done, value } = await iterator.next();
          if (done) break;
          out = stripper.push(value);
          if (out) stream.enqueue(encoder.encode(out));
        }

        const rest = stripper.flush();
        if (rest) stream.enqueue(encoder.encode(rest));
        stream.close();
      } catch (err) {
        stream.error(err);
      } finally {
        cleanup();
      }
    },
    cancel() {
      controller.abort();
      cleanup();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Model-Used": modelId,
      // Dipakai tester supaya memeriksa dengan gaya yang sama (getStyleById).
      "X-Style-Id": styleId,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { blueprint } = (await req.json()) as { blueprint?: Blueprint };

    if (!blueprint) {
      return new Response(JSON.stringify({ error: "Blueprint is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Semua aturan desain/teknis hidup di app/lib/designRules.ts.
    const style = pickStyle(blueprint);
    const system = buildSystemPrompt(style);
    const prompt = buildUserPrompt(blueprint);

    // Urutan fallback ada di CODE_MODELS (app/lib/openrouter).
    const failures: string[] = [];
    for (const modelId of CODE_MODELS) {
      if (req.signal.aborted) break;
      try {
        const started = await startStream(modelId, system, prompt, req.signal);
        return toTextResponse(modelId, style.id, started);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Model ${modelId} failed, trying next:`, msg);
        failures.push(`${modelId}: ${msg}`);
      }
    }

    return new Response(
      JSON.stringify({
        error: "All coder models failed to produce output.",
        details: failures,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in /api/generate:", error);
    const msg = error instanceof Error ? error.message : "Failed to stream code.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}