/**
 * AI Chat route — streams responses via Server-Sent Events
 * POST /api/ai/chat   { messages: [{role, content}], profile: {...} }
 * POST /api/ai/parse-food  { text: "2 eggs with toast" }
 * POST /api/ai/weekly-summary  { logs: [...], profile: {...} }
 */
const express = require('express');
const router = express.Router();
const { complete, stream } = require('../lib/ai');

function buildNutritionistSystem(profile) {
  if (!profile) return 'You are NutriCoach, an expert AI nutritionist and personal chef. Be concise, evidence-based, and practical.';
  return `You are NutriCoach, an expert AI nutritionist and personal chef for a personal app.
The user's profile:
- Age: ${profile.age}, Sex: ${profile.sex}
- Height: ${profile.height_cm}cm, Weight: ${profile.weight_kg}kg, Goal: ${profile.goal_weight_kg}kg
- Activity: ${profile.activity_level}, Exercise: ${profile.exercise_type}
- Diet style: ${profile.diet_style}
- Allergies/restrictions: ${(profile.allergies || []).join(', ') || 'none'}
- Medical conditions: ${(profile.conditions || []).join(', ') || 'none'}
- Food dislikes: ${(profile.food_dislikes || []).join(', ') || 'none'}
- Daily targets: ${profile.tdee} kcal, ${profile.macro_protein}g protein, ${profile.macro_carbs}g carbs, ${profile.macro_fat}g fat
- Cuisine preferences: ${(profile.cuisine_prefs || []).join(', ') || 'any'}
- Cook skill: ${profile.cook_skill}, Time available: ${profile.cook_time_min} min/meal
- Weekly budget: $${profile.budget_weekly}
- Primary goal: ${profile.goal_primary}

Provide personalized, actionable advice tailored to this profile. Be concise and practical.`;
}

// Stream chat response via SSE
router.post('/chat', async (req, res) => {
  const { messages, profile } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const systemMsg = { role: 'system', content: buildNutritionistSystem(profile) };
  const fullMessages = [systemMsg, ...messages.slice(-20)]; // keep last 20 messages for context

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    await stream(
      fullMessages,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      },
      () => {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    );
  } catch (err) {
    console.error('Chat stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Parse free-text food into macros
router.post('/parse-food', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const result = await complete([
      {
        role: 'system',
        content: 'You are a nutrition database. Parse food descriptions into structured nutrition data. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Parse this food entry and estimate nutrition: "${text}"
Return JSON with this exact structure:
{
  "food_name": "...",
  "serving_size": "...",
  "servings": 1,
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fiber": 0,
  "confidence": "high|medium|low"
}`,
      },
    ], { json: true, max_tokens: 512 });

    const parsed = JSON.parse(result);
    res.json(parsed);
  } catch (err) {
    console.error('Parse food error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate AI weekly summary
router.post('/weekly-summary', async (req, res) => {
  const { logs, profile } = req.body;
  if (!logs || !profile) return res.status(400).json({ error: 'logs and profile required' });

  try {
    const result = await complete([
      { role: 'system', content: buildNutritionistSystem(profile) },
      {
        role: 'user',
        content: `Review this week's nutrition data and provide a brief, encouraging, personalized summary with 3 specific actionable tips:
${JSON.stringify(logs, null, 2)}

Format your response as:
## Weekly Summary
[2-3 sentence overview]

## What Went Well
- [specific positive]
- [specific positive]

## Areas to Improve
- [specific actionable tip]
- [specific actionable tip]
- [specific actionable tip]

## This Week's Focus
[one key nutrition goal for next week]`,
      },
    ], { max_tokens: 600 });

    res.json({ summary: result });
  } catch (err) {
    console.error('Weekly summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
