/**
 * Utility helpers
 */

export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function formatTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function round1(val) {
  return Math.round((val || 0) * 10) / 10;
}

export function round0(val) {
  return Math.round(val || 0);
}

/**
 * Sum an array of food log entries for each macro
 */
export function sumMacros(logs) {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
      fiber: acc.fiber + (log.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Group food logs by meal type
 */
export function groupByMealType(logs) {
  const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const log of logs) {
    const type = log.meal_type || 'snack';
    if (!groups[type]) groups[type] = [];
    groups[type].push(log);
  }
  return groups;
}

/**
 * Generate grocery list categories from ingredients
 */
const CATEGORY_KEYWORDS = {
  Produce: ['apple','banana','spinach','lettuce','tomato','carrot','broccoli','onion','garlic','pepper','cucumber','avocado','lemon','lime','orange','berry','strawberry','mushroom','zucchini','cabbage','celery','kale','grape','pear','peach','mango','pineapple','corn','potato','sweet potato','yam','beet','radish','asparagus','herb','cilantro','parsley','basil','mint','ginger','arugula','chard','leek','shallot'],
  Proteins: ['chicken','beef','pork','salmon','tuna','shrimp','egg','tofu','tempeh','lentil','bean','chickpea','turkey','lamb','cod','tilapia','sardine','bacon','sausage','ground','steak','tenderloin','fillet','thigh','breast','seitan','edamame'],
  'Dairy & Alternatives': ['milk','yogurt','cheese','butter','cream','ghee','kefir','mozzarella','cheddar','parmesan','ricotta','cottage','oat milk','almond milk','soy milk','coconut milk','brie','feta','gouda'],
  Grains: ['rice','pasta','bread','oat','quinoa','flour','tortilla','noodle','couscous','barley','bulgur','farro','millet','cornmeal','wrap','pita','bagel','cracker','cereal','granola'],
  Pantry: ['oil','olive oil','vinegar','soy sauce','salt','pepper','spice','cumin','paprika','turmeric','cinnamon','honey','maple','sugar','broth','stock','coconut','tomato paste','tomato sauce','canned','dried','nut','seed','almond','peanut','cashew','walnut','sunflower','tahini','mustard','ketchup','mayo','sauce','hot sauce','balsamic','lentil'],
  Frozen: ['frozen','ice cream'],
  Snacks: ['chip','protein bar','granola bar','nut butter','jerky','popcorn','dark chocolate','rice cake'],
};

export function categorizeIngredient(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return category;
  }
  return 'Other';
}

/**
 * Build grocery list from meal plan
 */
export function buildGroceryList(plan) {
  const ingredientMap = new Map();

  for (const day of plan.days || []) {
    for (const meal of day.meals || []) {
      for (const ing of meal.ingredients || []) {
        const key = ing.name.toLowerCase().trim();
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.amount_g = (existing.amount_g || 0) + (ing.amount_g || 0);
        } else {
          ingredientMap.set(key, {
            id: key + '_' + Math.random().toString(36).slice(2),
            name: ing.name,
            amount_g: ing.amount_g || 0,
            amount_household: ing.amount_household || '',
            category: categorizeIngredient(ing.name),
            checked: false,
            custom: false,
          });
        }
      }
    }
  }

  return Array.from(ingredientMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

/**
 * Generate last N days as YYYY-MM-DD strings
 */
export function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

/**
 * Get week start (Monday) for a given date
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
