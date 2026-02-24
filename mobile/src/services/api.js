/**
 * NutriCoach API service — calls the Node.js backend for AI features
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || `API error ${resp.status}`);
  }
  return resp.json();
}

// ── AI Chat ──────────────────────────────────────────────────────────────────
/**
 * Stream chat response — calls onChunk(text) incrementally
 * Returns the full assistant message text when done
 */
export async function streamChat(messages, profile, onChunk) {
  const resp = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, profile }),
  });
  if (!resp.ok) throw new Error('Chat API error');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.text) { fullText += json.text; onChunk(json.text); }
        if (json.done || json.error) break;
      } catch { /* skip */ }
    }
  }
  return fullText;
}

// ── Food AI Parse ─────────────────────────────────────────────────────────────
export async function parseFoodText(text) {
  return request('/api/ai/parse-food', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ── Weekly Summary ────────────────────────────────────────────────────────────
export async function getWeeklySummary(logs, profile) {
  return request('/api/ai/weekly-summary', {
    method: 'POST',
    body: JSON.stringify({ logs, profile }),
  });
}

// ── Meal Plan ─────────────────────────────────────────────────────────────────
export async function generateMealPlan(profile) {
  return request('/api/meal-plan/generate', {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });
}

export async function regenerateMeal(profile, day, meal_type, existing_meals) {
  return request('/api/meal-plan/regenerate-meal', {
    method: 'POST',
    body: JSON.stringify({ profile, day, meal_type, existing_meals }),
  });
}

// ── Recipe Generator ──────────────────────────────────────────────────────────
export async function generateRecipe({ profile, ingredients, cuisine, time_available, target_calories }) {
  return request('/api/recipe/generate', {
    method: 'POST',
    body: JSON.stringify({ profile, ingredients, cuisine, time_available, target_calories }),
  });
}

// ── Food Search ───────────────────────────────────────────────────────────────
export async function searchFood(query, page = 1) {
  return request(`/api/food/search?q=${encodeURIComponent(query)}&page=${page}`);
}

export async function lookupBarcode(barcode) {
  return request(`/api/food/barcode/${barcode}`);
}

// ── Health Check ──────────────────────────────────────────────────────────────
export async function checkHealth() {
  return request('/health');
}
