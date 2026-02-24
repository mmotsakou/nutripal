/**
 * Meal Plan generation routes
 * POST /api/meal-plan/generate   { profile }
 * POST /api/meal-plan/regenerate-meal  { profile, day, meal_type, existing_plan }
 */
const express = require('express');
const router = express.Router();
const { complete } = require('../lib/ai');
const { format, addDays } = require('../lib/dateUtils');

function buildMealPlanPrompt(profile, weekStart) {
  return {
    system: `You are a professional nutritionist and chef. Generate personalized meal plans as valid JSON only.
No markdown, no explanation — just the JSON object.`,
    user: `Generate a 7-day meal plan starting ${weekStart} for:
- Age: ${profile.age}, Sex: ${profile.sex}
- Daily target: ${profile.tdee} kcal, ${profile.macro_protein}g protein, ${profile.macro_carbs}g carbs, ${profile.macro_fat}g fat, ${profile.macro_fiber}g fiber
- Diet style: ${profile.diet_style}
- Allergies/restrictions: ${(profile.allergies || []).concat(profile.intolerances || []).join(', ') || 'none'}
- Food dislikes: ${(profile.food_dislikes || []).join(', ') || 'none'}
- Cuisine preferences: ${(profile.cuisine_prefs || []).join(', ') || 'varied'}
- Cook skill: ${profile.cook_skill}, Max cook time: ${profile.cook_time_min} min per meal
- Medical conditions: ${(profile.conditions || []).join(', ') || 'none'}

Return ONLY this JSON structure (no other text):
{
  "week_start": "${weekStart}",
  "days": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "meal_type": "breakfast",
          "name": "...",
          "description": "...",
          "ingredients": [
            {"name": "...", "amount_g": 100, "amount_household": "1 cup"}
          ],
          "instructions": ["Step 1: ...", "Step 2: ..."],
          "prep_time_min": 10,
          "cook_time_min": 15,
          "servings": 1,
          "macros": {
            "calories": 400,
            "protein_g": 30,
            "carbs_g": 45,
            "fat_g": 15,
            "fiber_g": 5
          },
          "cuisine": "American",
          "difficulty": "Easy"
        }
      ],
      "daily_totals": {
        "calories": 2000,
        "protein_g": 150,
        "carbs_g": 200,
        "fat_g": 65,
        "fiber_g": 30
      }
    }
  ]
}
Include breakfast, lunch, dinner, and 1 snack per day.
Vary cuisines and meals across the week. Ensure macros match the daily targets closely.`,
  };
}

function buildRegenerateMealPrompt(profile, day, mealType, existingMeals) {
  const existingNames = existingMeals.map(m => m.name).join(', ');
  return {
    system: `You are a professional nutritionist and chef. Generate a single meal as valid JSON only. No markdown, no explanation.`,
    user: `Generate a single ${mealType} meal for ${day} for:
- Daily target: ${profile.tdee} kcal total (${mealType} should be ~${getMealCalorieTarget(mealType, profile.tdee)} kcal)
- Diet style: ${profile.diet_style}
- Allergies: ${(profile.allergies || []).join(', ') || 'none'}
- Restrictions: ${(profile.intolerances || []).join(', ') || 'none'}
- Max cook time: ${profile.cook_time_min} min
- DO NOT repeat these meals already in the plan: ${existingNames}

Return ONLY this JSON (no other text):
{
  "meal_type": "${mealType}",
  "name": "...",
  "description": "...",
  "ingredients": [{"name": "...", "amount_g": 100, "amount_household": "1 cup"}],
  "instructions": ["Step 1: ...", "Step 2: ..."],
  "prep_time_min": 10,
  "cook_time_min": 15,
  "servings": 1,
  "macros": {"calories": 400, "protein_g": 30, "carbs_g": 45, "fat_g": 15, "fiber_g": 5},
  "cuisine": "...",
  "difficulty": "Easy"
}`,
  };
}

function getMealCalorieTarget(mealType, tdee) {
  const ratios = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
  return Math.round((ratios[mealType] || 0.25) * tdee);
}

// Generate full 7-day meal plan
router.post('/generate', async (req, res) => {
  const { profile } = req.body;
  if (!profile) return res.status(400).json({ error: 'profile required' });

  const weekStart = new Date().toISOString().split('T')[0];

  try {
    const { system, user } = buildMealPlanPrompt(profile, weekStart);
    const raw = await complete(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { json: true, max_tokens: 8192, temperature: 0.8 }
    );

    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      // Try to extract JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return valid JSON');
      plan = JSON.parse(match[0]);
    }

    res.json({ plan });
  } catch (err) {
    console.error('Meal plan generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Regenerate a single meal
router.post('/regenerate-meal', async (req, res) => {
  const { profile, day, meal_type, existing_meals } = req.body;
  if (!profile || !day || !meal_type) {
    return res.status(400).json({ error: 'profile, day, meal_type required' });
  }

  try {
    const { system, user } = buildRegenerateMealPrompt(profile, day, meal_type, existing_meals || []);
    const raw = await complete(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      { json: true, max_tokens: 2048, temperature: 0.9 }
    );

    let meal;
    try {
      meal = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI did not return valid JSON');
      meal = JSON.parse(match[0]);
    }

    res.json({ meal });
  } catch (err) {
    console.error('Regenerate meal error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
