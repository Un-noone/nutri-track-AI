import { buildUserPrompt, systemPrompt } from './prompts/foodLogExtractionPrompt';
import { FoodLogExtraction, FoodLogExtractionSchema } from './schemas/foodLogExtractionSchema';
import { ZodError } from 'zod';
import { FOOD_LOG_EXTRACTION_JSON_SCHEMA } from './schemas/foodLogExtractionJsonSchema';

type ExtractFoodLogArgs = {
  isoDatetime: string;
  timezone: string;
  countryIso2: string;
  userText: string;
};

const parseEnvInt = (raw: string | undefined, fallback: number) => {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const strictJsonParse = (text: string) => {
  const trimmed = text.trim();

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    const preview = trimmed.slice(0, 240);
    throw new Error(
      `LLM returned non-JSON content (missing JSON object braces). Preview: ${JSON.stringify(preview)}`
    );
  }

  const candidate = trimmed.slice(first, last + 1).trim();
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const preview = candidate.slice(0, 240);
    throw new Error(`LLM returned invalid JSON. Preview: ${JSON.stringify(preview)}`);
  }
};

const formatValidationError = (err: unknown) => {
  if (err instanceof ZodError) {
    return err.issues
      .slice(0, 12)
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
  }
  if (err instanceof Error) return err.message;
  return String(err);
};

const postOllamaChat = async (
  host: string,
  payload: Record<string, unknown>,
  opts?: { timeoutMs?: number }
): Promise<{ content: string; raw: unknown }> => {
  const timeoutMs = opts?.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${errText || res.statusText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Ollama returned empty content.');
  }
  return { content, raw: data };
};

const callOllamaChat = async (
  messages: { role: 'system' | 'user'; content: string }[],
  overrides?: { maxTokens?: number }
) => {
  const host = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || 'llama3.2:1b-instruct-q4_K_M';
  const numCtx = parseEnvInt(process.env.OLLAMA_NUM_CTX, 1024);
  const maxTokens = overrides?.maxTokens ?? parseEnvInt(process.env.OLLAMA_MAX_TOKENS, 384);
  const timeoutMs = parseEnvInt(process.env.OLLAMA_REQUEST_TIMEOUT_MS, 60_000);
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE || '10m';

  const basePayload = {
    model,
    stream: false,
    messages,
    keep_alive: keepAlive,
    options: {
      temperature: 0,
      num_ctx: numCtx,
      num_predict: maxTokens,
    },
  };

  // Prefer schema-constrained JSON output when supported by the Ollama runtime.
  try {
    const { content } = await postOllamaChat(
      host,
      { ...basePayload, format: FOOD_LOG_EXTRACTION_JSON_SCHEMA },
      { timeoutMs }
    );
    return content;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Fallback to generic JSON mode for older Ollama versions.
    if (msg.includes('format') || msg.includes('json')) {
      const { content } = await postOllamaChat(host, { ...basePayload, format: 'json' }, { timeoutMs });
      return content;
    }
    throw e;
  }
};

export const extractFoodLog = async ({
  isoDatetime,
  timezone,
  countryIso2,
  userText,
}: ExtractFoodLogArgs): Promise<FoodLogExtraction> => {
  const userPrompt = buildUserPrompt({ isoDatetime, timezone, countryIso2, userText });

  const attempt = async (extraInstruction?: string, opts?: { maxTokens?: number }) => {
    const content = await callOllamaChat([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: extraInstruction ? `${userPrompt}\n\n${extraInstruction}` : userPrompt,
      },
    ], opts);

    const parsed = strictJsonParse(content);
    return FoodLogExtractionSchema.parse(parsed);
  };

  try {
    return await attempt();
  } catch (firstErr) {
    const firstErrors = formatValidationError(firstErr);
    await sleep(150);
    const correctivePrompt = `Your previous output did not validate.
Fix ALL issues and return ONLY valid JSON matching the schema (no extra keys, include required null fields).
Do NOT wrap in markdown/code fences. Start with "{" and end with "}".
Validation/parsing errors:
${firstErrors}`;

    try {
      // On retry, increase token budget (within CPU-friendly bounds) to avoid truncated JSON.
      return await attempt(correctivePrompt, { maxTokens: 512 });
    } catch (secondErr) {
      const secondErrors = formatValidationError(secondErr);
      throw new Error(`LLM failed after retry.\nFirst error:\n${firstErrors}\n\nSecond error:\n${secondErrors}`);
    }
  }
};
