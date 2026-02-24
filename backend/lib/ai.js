/**
 * AI provider abstraction — supports OpenAI and Ollama
 * Controlled by AI_PROVIDER env var: "openai" | "ollama"
 */
const fetch = require('node-fetch');

const provider = process.env.AI_PROVIDER || 'openai';

// ── OpenAI ───────────────────────────────────────────────────────────────────
let openaiClient = null;
if (provider === 'openai') {
  const OpenAI = require('openai');
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Non-streaming completion — returns full text
 */
async function complete(messages, opts = {}) {
  if (provider === 'openai') {
    const resp = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 4096,
      response_format: opts.json ? { type: 'json_object' } : undefined,
    });
    return resp.choices[0].message.content;
  }

  // Ollama
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
  const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: opts.temperature ?? 0.7, num_predict: opts.max_tokens ?? 4096 },
    }),
  });
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
  const data = await resp.json();
  return data.response;
}

/**
 * Streaming completion — calls onChunk(text) for each token, then onDone()
 */
async function stream(messages, onChunk, onDone, opts = {}) {
  if (provider === 'openai') {
    const streamResp = await openaiClient.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 2048,
      stream: true,
    });
    for await (const chunk of streamResp) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) onChunk(text);
    }
    onDone();
    return;
  }

  // Ollama streaming
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
  const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: true,
      options: { temperature: opts.temperature ?? 0.7, num_predict: opts.max_tokens ?? 2048 },
    }),
  });
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);

  for await (const chunk of resp.body) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.response) onChunk(data.response);
        if (data.done) { onDone(); return; }
      } catch { /* skip malformed */ }
    }
  }
  onDone();
}

module.exports = { complete, stream, provider };
