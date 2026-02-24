/**
 * Recipe generation from available ingredients
 * POST /api/recipe/generate  { profile, ingredients, cuisine, time_available, target_calories }
 */
const express = require('express');
const router = express.Router();
const { complete } = require('../lib/ai');

router.post('/generate', async (req, res) => {
  const { profile, ingredients, cuisine, time_available, target_calories } = req.body;
  if (!ingredients) return res.status(400).json({ error: 'ingredients required' });

  const system = `You are an expert chef and nutritionist. Generate complete recipes as valid JSON only. No markdown, no explanation.`;
  const user = `Create a recipe using these ingredients: ${ingredients}
Requirements:
- Cuisine: ${cuisine || 'any'}
- Max total time: ${time_available || 30} minutes
- Target calories: ~${target_calories || profile?.tdee ? Math.round(profile.tdee / 3) : 500} kcal per serving
- Diet style: ${profile?.diet_style || 'omnivore'}
- Allergies: ${(profile?.allergies || []).join(', ') || 'none'}
- Restrictions: ${(profile?.intolerances || []).join(', ') || 'none'}
- Cook skill: ${profile?.cook_skill || 'intermediate'}

Return ONLY this JSON:
{
  "name": "...",
  "description": "...",
  "servings": 2,
  "ingredients": [
    {"name": "...", "amount_g": 100, "amount_household": "1 cup"}
  ],
  "instructions": ["Step 1: ...", "Step 2: ..."],
  "prep_time_min": 10,
  "cook_time_min": 20,
  "macros": {
    "calories": 450,
    "protein_g": 35,
    "carbs_g": 40,
    "fat_g": 15,
    "fiber_g": 6
  },
  "cuisine": "...",
  "difficulty": "Easy",
  "tips": ["Chef tip..."]
}`;

  try {
    const raw = await complete(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { json: true, max_tokens: 2048, temperature: 0.8 }
    );

    let recipe;
    try {
      recipe = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return valid JSON');
      recipe = JSON.parse(match[0]);
    }

    res.json({ recipe });
  } catch (err) {
    console.error('Recipe generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
