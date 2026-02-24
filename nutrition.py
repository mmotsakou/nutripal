"""
NutriPal - Nutrition calculation and meal plan generation logic.
"""

from __future__ import annotations
import math
from typing import Any


# ---------------------------------------------------------------------------
# BMR / TDEE / Macro calculations
# ---------------------------------------------------------------------------

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "lightly_active": 1.375,
    "moderately_active": 1.55,
    "very_active": 1.725,
}

GOAL_CALORIE_ADJUSTMENTS = {
    "fat_loss": -500,
    "muscle_gain": 350,
    "better_energy": 0,
    "manage_blood_sugar": -250,
    "general_health": 0,
}

# Macro ratios: (protein_pct, carb_pct, fat_pct) of total calories
GOAL_MACRO_RATIOS = {
    "fat_loss":           (0.40, 0.30, 0.30),
    "muscle_gain":        (0.30, 0.45, 0.25),
    "better_energy":      (0.25, 0.45, 0.30),
    "manage_blood_sugar": (0.30, 0.30, 0.40),
    "general_health":     (0.30, 0.40, 0.30),
}

# Keto overrides
KETO_MACRO_RATIOS = (0.30, 0.05, 0.65)


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """Mifflin-St Jeor equation."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if sex.lower() in ("m", "male"):
        return base + 5
    return base - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.375)
    return bmr * multiplier


def calculate_targets(
    weight_kg: float,
    height_cm: float,
    age: int,
    sex: str,
    activity_level: str,
    primary_goal: str,
    diet_style: str,
) -> dict[str, Any]:
    bmr = calculate_bmr(weight_kg, height_cm, age, sex)
    tdee = calculate_tdee(bmr, activity_level)

    cal_adj = GOAL_CALORIE_ADJUSTMENTS.get(primary_goal, 0)
    daily_calories = max(1200, round(tdee + cal_adj))

    if diet_style == "keto":
        p_pct, c_pct, f_pct = KETO_MACRO_RATIOS
    else:
        p_pct, c_pct, f_pct = GOAL_MACRO_RATIOS.get(
            primary_goal, (0.30, 0.40, 0.30)
        )

    protein_g = round((daily_calories * p_pct) / 4)
    carbs_g = round((daily_calories * c_pct) / 4)
    fat_g = round((daily_calories * f_pct) / 9)
    fiber_g = 25 if sex.lower() in ("f", "female", "other") else 38

    return {
        "bmr": round(bmr),
        "tdee": round(tdee),
        "daily_calories": daily_calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
        "fiber_g": fiber_g,
    }


# ---------------------------------------------------------------------------
# Meal database
# ---------------------------------------------------------------------------
# Each meal: {name, ingredients (list of str), cal, protein, carbs, fat,
#             prep_min, tags (set of str)}

MEALS: dict[str, list[dict]] = {
    "breakfast": [
        {
            "name": "Greek Yogurt Parfait",
            "ingredients": [
                "1 cup plain Greek yogurt (0% fat)",
                "½ cup mixed berries",
                "2 tbsp granola",
                "1 tsp honey",
            ],
            "cal": 320, "protein": 22, "carbs": 44, "fat": 5, "fiber": 4,
            "prep_min": 5,
            "tags": {"vegetarian", "vegan_adapt", "gluten_free", "low_fat", "quick"},
        },
        {
            "name": "Oatmeal with Banana & Almond Butter",
            "ingredients": [
                "½ cup rolled oats",
                "1 medium banana (sliced)",
                "1 tbsp almond butter",
                "1 cup water or oat milk",
                "Pinch of cinnamon",
            ],
            "cal": 390, "protein": 10, "carbs": 60, "fat": 12, "fiber": 7,
            "prep_min": 10,
            "tags": {"vegan", "vegetarian", "dairy_free", "high_fiber"},
        },
        {
            "name": "Scrambled Eggs with Whole-Grain Toast",
            "ingredients": [
                "3 large eggs",
                "2 slices whole-grain bread",
                "1 tsp olive oil",
                "Salt & pepper to taste",
                "Handful of spinach",
            ],
            "cal": 420, "protein": 28, "carbs": 34, "fat": 18, "fiber": 5,
            "prep_min": 10,
            "tags": {"omnivore", "vegetarian", "high_protein", "quick"},
        },
        {
            "name": "Avocado Toast with Poached Egg",
            "ingredients": [
                "2 slices whole-grain bread",
                "½ ripe avocado",
                "2 poached eggs",
                "Lemon juice, red pepper flakes",
            ],
            "cal": 430, "protein": 21, "carbs": 36, "fat": 24, "fiber": 8,
            "prep_min": 15,
            "tags": {"omnivore", "vegetarian", "high_fiber", "mediterranean"},
        },
        {
            "name": "Smoothie Bowl",
            "ingredients": [
                "1 cup frozen mixed berries",
                "½ banana",
                "½ cup unsweetened almond milk",
                "1 scoop vanilla protein powder",
                "Toppings: 1 tbsp chia seeds, 2 tbsp granola, sliced kiwi",
            ],
            "cal": 380, "protein": 28, "carbs": 46, "fat": 8, "fiber": 10,
            "prep_min": 10,
            "tags": {"vegan", "vegetarian", "dairy_free", "high_protein", "high_fiber"},
        },
        {
            "name": "Veggie Omelette",
            "ingredients": [
                "3 eggs",
                "¼ cup diced bell peppers",
                "¼ cup diced mushrooms",
                "2 tbsp diced onion",
                "1 tsp olive oil",
                "Salt, pepper, herbs",
            ],
            "cal": 280, "protein": 22, "carbs": 8, "fat": 18, "fiber": 2,
            "prep_min": 12,
            "tags": {"omnivore", "vegetarian", "keto", "low_carb", "gluten_free", "high_protein"},
        },
        {
            "name": "Chia Seed Pudding",
            "ingredients": [
                "3 tbsp chia seeds",
                "1 cup unsweetened coconut milk",
                "½ tsp vanilla extract",
                "½ cup mango chunks",
                "1 tsp maple syrup",
            ],
            "cal": 330, "protein": 8, "carbs": 32, "fat": 20, "fiber": 14,
            "prep_min": 5,
            "tags": {"vegan", "vegetarian", "dairy_free", "gluten_free", "high_fiber", "prep_ahead"},
        },
        {
            "name": "Cottage Cheese & Fruit Bowl",
            "ingredients": [
                "1 cup low-fat cottage cheese",
                "½ cup pineapple chunks",
                "½ cup blueberries",
                "1 tsp flaxseeds",
            ],
            "cal": 290, "protein": 26, "carbs": 34, "fat": 4, "fiber": 3,
            "prep_min": 5,
            "tags": {"vegetarian", "high_protein", "low_fat", "gluten_free", "quick"},
        },
    ],

    "lunch": [
        {
            "name": "Grilled Chicken & Quinoa Bowl",
            "ingredients": [
                "150g grilled chicken breast",
                "½ cup cooked quinoa",
                "1 cup mixed greens",
                "½ cup cherry tomatoes",
                "¼ cucumber, sliced",
                "2 tbsp lemon-tahini dressing",
            ],
            "cal": 480, "protein": 45, "carbs": 38, "fat": 14, "fiber": 6,
            "prep_min": 20,
            "tags": {"omnivore", "gluten_free", "high_protein", "mediterranean"},
        },
        {
            "name": "Lentil & Vegetable Soup",
            "ingredients": [
                "1 cup cooked red lentils",
                "1 carrot, diced",
                "2 celery stalks, diced",
                "1 can diced tomatoes (no salt added)",
                "2 cups vegetable broth",
                "1 tsp cumin, 1 tsp turmeric",
                "1 slice whole-grain bread",
            ],
            "cal": 420, "protein": 22, "carbs": 70, "fat": 4, "fiber": 18,
            "prep_min": 30,
            "tags": {"vegan", "vegetarian", "dairy_free", "high_fiber", "anti_inflammatory"},
        },
        {
            "name": "Turkey & Avocado Wrap",
            "ingredients": [
                "1 large whole-grain tortilla",
                "100g sliced turkey breast",
                "½ avocado, sliced",
                "Romaine lettuce, tomato, mustard",
                "1 tbsp hummus",
            ],
            "cal": 450, "protein": 35, "carbs": 40, "fat": 17, "fiber": 8,
            "prep_min": 10,
            "tags": {"omnivore", "high_protein", "quick"},
        },
        {
            "name": "Mediterranean Chickpea Salad",
            "ingredients": [
                "1 can chickpeas, drained & rinsed",
                "1 cup cherry tomatoes",
                "½ cucumber, diced",
                "¼ red onion, diced",
                "30g feta cheese (optional)",
                "2 tbsp olive oil, lemon juice, oregano",
            ],
            "cal": 440, "protein": 18, "carbs": 52, "fat": 18, "fiber": 12,
            "prep_min": 10,
            "tags": {"vegan", "vegetarian", "gluten_free", "mediterranean", "high_fiber", "quick"},
        },
        {
            "name": "Salmon & Brown Rice Bowl",
            "ingredients": [
                "150g baked salmon fillet",
                "½ cup cooked brown rice",
                "1 cup steamed broccoli",
                "1 tbsp soy sauce (low-sodium)",
                "1 tsp sesame oil",
                "½ tsp grated ginger",
            ],
            "cal": 510, "protein": 42, "carbs": 38, "fat": 20, "fiber": 5,
            "prep_min": 25,
            "tags": {"omnivore", "gluten_free", "high_protein", "omega3"},
        },
        {
            "name": "Black Bean Taco Bowl",
            "ingredients": [
                "1 cup black beans, cooked",
                "½ cup cooked brown rice",
                "¼ cup salsa",
                "¼ avocado",
                "2 tbsp Greek yogurt (as sour cream)",
                "Shredded lettuce, lime juice",
            ],
            "cal": 460, "protein": 20, "carbs": 68, "fat": 12, "fiber": 16,
            "prep_min": 15,
            "tags": {"vegan", "vegetarian", "gluten_free", "high_fiber", "quick"},
        },
        {
            "name": "Egg Salad Lettuce Wraps",
            "ingredients": [
                "4 hard-boiled eggs",
                "1 tbsp light mayo",
                "1 tsp Dijon mustard",
                "Celery, chives, salt & pepper",
                "4 large romaine lettuce leaves",
            ],
            "cal": 280, "protein": 24, "carbs": 4, "fat": 18, "fiber": 1,
            "prep_min": 10,
            "tags": {"omnivore", "vegetarian", "keto", "low_carb", "gluten_free", "quick"},
        },
        {
            "name": "Whole-Grain Pasta Primavera",
            "ingredients": [
                "80g whole-grain penne",
                "1 cup mixed vegetables (zucchini, bell pepper, cherry tomatoes)",
                "2 tbsp olive oil",
                "2 garlic cloves",
                "2 tbsp Parmesan",
                "Fresh basil",
            ],
            "cal": 470, "protein": 16, "carbs": 68, "fat": 16, "fiber": 9,
            "prep_min": 20,
            "tags": {"vegetarian", "mediterranean", "high_fiber"},
        },
    ],

    "dinner": [
        {
            "name": "Baked Salmon with Roasted Vegetables",
            "ingredients": [
                "180g salmon fillet",
                "1 cup broccoli florets",
                "1 cup cauliflower florets",
                "1 cup cherry tomatoes",
                "2 tbsp olive oil",
                "Garlic, lemon, dill",
            ],
            "cal": 520, "protein": 46, "carbs": 18, "fat": 30, "fiber": 7,
            "prep_min": 30,
            "tags": {"omnivore", "keto", "low_carb", "gluten_free", "high_protein", "omega3", "mediterranean"},
        },
        {
            "name": "Chicken Stir-Fry with Brown Rice",
            "ingredients": [
                "150g chicken breast, sliced",
                "2 cups mixed stir-fry vegetables",
                "½ cup cooked brown rice",
                "2 tbsp low-sodium soy sauce",
                "1 tsp sesame oil, garlic, ginger",
            ],
            "cal": 490, "protein": 40, "carbs": 45, "fat": 14, "fiber": 6,
            "prep_min": 25,
            "tags": {"omnivore", "dairy_free", "high_protein"},
        },
        {
            "name": "Beef & Vegetable Stew",
            "ingredients": [
                "150g lean beef chuck, cubed",
                "1 cup potatoes, diced",
                "1 carrot, 2 celery stalks",
                "1 can diced tomatoes",
                "2 cups beef broth (low-sodium)",
                "Rosemary, thyme, bay leaf",
            ],
            "cal": 530, "protein": 38, "carbs": 42, "fat": 16, "fiber": 7,
            "prep_min": 60,
            "tags": {"omnivore", "gluten_free", "high_protein"},
        },
        {
            "name": "Tofu & Vegetable Curry",
            "ingredients": [
                "200g firm tofu, cubed",
                "1 cup light coconut milk",
                "1 cup mixed vegetables (spinach, peas, zucchini)",
                "½ cup cooked basmati rice",
                "2 tbsp red curry paste",
                "1 tsp coconut oil",
            ],
            "cal": 480, "protein": 22, "carbs": 48, "fat": 22, "fiber": 8,
            "prep_min": 30,
            "tags": {"vegan", "vegetarian", "dairy_free", "gluten_free", "anti_inflammatory"},
        },
        {
            "name": "Grilled Chicken Mediterranean Plate",
            "ingredients": [
                "180g grilled chicken breast",
                "½ cup hummus",
                "1 cup Greek salad (tomato, cucumber, olives, feta)",
                "1 small whole-wheat pita",
                "Tzatziki (3 tbsp)",
            ],
            "cal": 560, "protein": 52, "carbs": 32, "fat": 22, "fiber": 6,
            "prep_min": 20,
            "tags": {"omnivore", "high_protein", "mediterranean"},
        },
        {
            "name": "Shrimp Zoodle Bowl",
            "ingredients": [
                "200g shrimp, peeled",
                "2 medium zucchini (spiralized)",
                "1 cup cherry tomatoes",
                "3 garlic cloves",
                "2 tbsp olive oil",
                "Fresh basil, lemon",
            ],
            "cal": 340, "protein": 36, "carbs": 16, "fat": 16, "fiber": 4,
            "prep_min": 20,
            "tags": {"omnivore", "keto", "low_carb", "gluten_free", "high_protein", "dairy_free"},
        },
        {
            "name": "Lentil Bolognese with Pasta",
            "ingredients": [
                "1 cup cooked green lentils",
                "80g whole-grain spaghetti",
                "1 can crushed tomatoes",
                "½ onion, 2 garlic cloves, 1 carrot",
                "1 tbsp olive oil",
                "Basil, oregano, salt & pepper",
            ],
            "cal": 490, "protein": 24, "carbs": 80, "fat": 8, "fiber": 16,
            "prep_min": 35,
            "tags": {"vegan", "vegetarian", "dairy_free", "high_fiber", "anti_inflammatory"},
        },
        {
            "name": "Turkey Meatballs with Marinara",
            "ingredients": [
                "200g lean ground turkey",
                "80g whole-grain spaghetti",
                "1 cup marinara sauce (no sugar added)",
                "1 egg, ¼ cup breadcrumbs",
                "Garlic, parsley, 2 tbsp Parmesan",
            ],
            "cal": 540, "protein": 44, "carbs": 52, "fat": 16, "fiber": 6,
            "prep_min": 35,
            "tags": {"omnivore", "high_protein"},
        },
    ],

    "snack": [
        {
            "name": "Apple with Almond Butter",
            "ingredients": ["1 medium apple", "1 tbsp almond butter"],
            "cal": 190, "protein": 4, "carbs": 28, "fat": 9, "fiber": 4,
            "prep_min": 2,
            "tags": {"vegan", "vegetarian", "dairy_free", "gluten_free", "quick"},
        },
        {
            "name": "Hummus & Veggie Sticks",
            "ingredients": [
                "3 tbsp hummus",
                "1 cup raw veggie sticks (carrots, celery, bell pepper)",
            ],
            "cal": 150, "protein": 6, "carbs": 18, "fat": 7, "fiber": 5,
            "prep_min": 5,
            "tags": {"vegan", "vegetarian", "gluten_free", "high_fiber", "quick"},
        },
        {
            "name": "Mixed Nuts",
            "ingredients": ["30g mixed unsalted nuts (almonds, walnuts, cashews)"],
            "cal": 180, "protein": 5, "carbs": 7, "fat": 16, "fiber": 2,
            "prep_min": 0,
            "tags": {"vegan", "vegetarian", "keto", "gluten_free", "quick"},
        },
        {
            "name": "Greek Yogurt with Berries",
            "ingredients": [
                "¾ cup plain Greek yogurt",
                "½ cup mixed berries",
            ],
            "cal": 160, "protein": 14, "carbs": 18, "fat": 2, "fiber": 3,
            "prep_min": 2,
            "tags": {"vegetarian", "gluten_free", "high_protein", "quick"},
        },
        {
            "name": "Hard-Boiled Eggs",
            "ingredients": ["2 hard-boiled eggs", "Salt, pepper, paprika"],
            "cal": 140, "protein": 12, "carbs": 1, "fat": 10, "fiber": 0,
            "prep_min": 10,
            "tags": {"omnivore", "vegetarian", "keto", "gluten_free", "high_protein", "prep_ahead"},
        },
        {
            "name": "Protein Shake",
            "ingredients": [
                "1 scoop vanilla whey protein",
                "1 cup unsweetened almond milk",
                "½ banana",
            ],
            "cal": 220, "protein": 26, "carbs": 20, "fat": 4, "fiber": 2,
            "prep_min": 3,
            "tags": {"vegetarian", "gluten_free", "high_protein", "quick"},
        },
        {
            "name": "Edamame",
            "ingredients": ["1 cup shelled edamame", "Sea salt"],
            "cal": 190, "protein": 17, "carbs": 14, "fat": 8, "fiber": 8,
            "prep_min": 5,
            "tags": {"vegan", "vegetarian", "dairy_free", "gluten_free", "high_protein", "high_fiber"},
        },
        {
            "name": "Rice Cakes with Avocado",
            "ingredients": [
                "2 plain rice cakes",
                "¼ avocado, mashed",
                "Lemon juice, chili flakes",
            ],
            "cal": 160, "protein": 3, "carbs": 22, "fat": 8, "fiber": 3,
            "prep_min": 5,
            "tags": {"vegan", "vegetarian", "dairy_free", "gluten_free", "quick"},
        },
    ],
}

DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]


# ---------------------------------------------------------------------------
# Meal filtering
# ---------------------------------------------------------------------------

def _get_required_tags(
    diet_style: str,
    allergies: list[str],
) -> set[str]:
    """Return tags that MUST appear on a meal for it to be included."""
    required: set[str] = set()
    if diet_style in ("vegan",):
        required.add("vegan")
    elif diet_style in ("vegetarian",):
        required.add("vegetarian")
    return required


def _get_forbidden_tags(
    diet_style: str,
    allergies: list[str],
) -> set[str]:
    """Return tags that must NOT appear on a meal."""
    forbidden: set[str] = set()
    allergy_map = {
        "gluten": set(),        # meals without gluten_free tag should be avoided
        "dairy": set(),
        "nuts": {"nuts"},
    }
    for a in allergies:
        a = a.strip().lower()
        if a in ("lactose", "dairy"):
            forbidden.add("has_dairy")
    return forbidden


def _filter_meals(
    meals: list[dict],
    diet_style: str,
    allergies: list[str],
    dislikes: list[str],
) -> list[dict]:
    required = _get_required_tags(diet_style, allergies)
    result = []
    dislike_lower = {d.strip().lower() for d in dislikes}

    for meal in meals:
        # Check required tags
        if required and not required.intersection(meal["tags"]):
            # For vegan/vegetarian also accept meals tagged with both
            skip = True
            for r in required:
                if r in meal["tags"]:
                    skip = False
                    break
            if skip:
                continue

        # Gluten allergy
        if any(a.strip().lower() in ("gluten", "celiac") for a in allergies):
            if "gluten_free" not in meal["tags"]:
                continue

        # Dairy allergy
        if any(a.strip().lower() in ("dairy", "lactose") for a in allergies):
            dairy_keywords = {"yogurt", "cheese", "milk", "feta", "parmesan", "cottage"}
            ingredient_text = " ".join(meal["ingredients"]).lower()
            if any(kw in ingredient_text for kw in dairy_keywords):
                continue

        # Nut allergy
        if any(a.strip().lower() in ("nuts", "tree nuts", "peanuts") for a in allergies):
            nut_keywords = {"almond", "walnut", "cashew", "peanut", "nut butter", "almond butter"}
            ingredient_text = " ".join(meal["ingredients"]).lower()
            if any(kw in ingredient_text for kw in nut_keywords):
                continue

        # Dislikes check (simple name match)
        if any(d in meal["name"].lower() for d in dislike_lower):
            continue

        # Keto diet: skip high-carb meals
        if diet_style == "keto" and meal["carbs"] > 20:
            continue

        result.append(meal)

    return result if result else meals  # fallback to all meals if nothing passes filter


# ---------------------------------------------------------------------------
# 7-Day meal plan generator
# ---------------------------------------------------------------------------

def _rotate(items: list, offset: int) -> list:
    """Rotate a list by offset positions."""
    n = len(items)
    if n == 0:
        return items
    return [items[(i + offset) % n] for i in range(n)]


def generate_meal_plan(
    targets: dict[str, Any],
    diet_style: str,
    allergies: list[str],
    dislikes: list[str],
    include_snacks: bool,
    meals_per_day: int,
) -> list[dict]:
    """Return a 7-day meal plan as a list of daily dicts."""
    filtered = {
        meal_type: _filter_meals(MEALS[meal_type], diet_style, allergies, dislikes)
        for meal_type in MEALS
    }

    plan: list[dict] = []
    for day_idx in range(7):
        day: dict[str, Any] = {"day": DAY_NAMES[day_idx], "meals": {}}

        day["meals"]["breakfast"] = filtered["breakfast"][day_idx % len(filtered["breakfast"])]

        if meals_per_day >= 3:
            day["meals"]["lunch"] = filtered["lunch"][day_idx % len(filtered["lunch"])]
            day["meals"]["dinner"] = filtered["dinner"][day_idx % len(filtered["dinner"])]
        elif meals_per_day == 2:
            # Skip lunch; use a heartier dinner
            day["meals"]["lunch"] = filtered["lunch"][day_idx % len(filtered["lunch"])]
            day["meals"]["dinner"] = filtered["dinner"][(day_idx + 2) % len(filtered["dinner"])]
        else:
            day["meals"]["lunch"] = filtered["lunch"][day_idx % len(filtered["lunch"])]

        if include_snacks:
            snack1 = filtered["snack"][day_idx % len(filtered["snack"])]
            snack2 = filtered["snack"][(day_idx + 3) % len(filtered["snack"])]
            day["meals"]["snack_1"] = snack1
            day["meals"]["snack_2"] = snack2

        # Daily totals
        day_cal = sum(m["cal"] for m in day["meals"].values())
        day_protein = sum(m["protein"] for m in day["meals"].values())
        day_carbs = sum(m["carbs"] for m in day["meals"].values())
        day_fat = sum(m["fat"] for m in day["meals"].values())
        day_fiber = sum(m["fiber"] for m in day["meals"].values())

        day["totals"] = {
            "cal": day_cal,
            "protein": day_protein,
            "carbs": day_carbs,
            "fat": day_fat,
            "fiber": day_fiber,
        }

        plan.append(day)

    return plan


# ---------------------------------------------------------------------------
# Grocery list generator
# ---------------------------------------------------------------------------

_GROCERY_CATEGORIES = {
    "Produce & Vegetables": [
        "spinach", "broccoli", "cauliflower", "cherry tomatoes", "tomato",
        "cucumber", "zucchini", "bell pepper", "carrot", "celery", "onion",
        "garlic", "banana", "berries", "apple", "mango", "lemon", "lime",
        "kiwi", "pineapple", "avocado", "lettuce", "romaine", "mixed greens",
        "mushroom", "ginger", "peas", "edamame", "potatoes", "veggie sticks",
        "mixed vegetables",
    ],
    "Protein": [
        "chicken breast", "salmon", "turkey", "shrimp", "beef",
        "ground turkey", "eggs", "egg", "tofu",
        "protein powder", "whey protein",
    ],
    "Dairy & Alternatives": [
        "greek yogurt", "cottage cheese", "feta", "parmesan", "almond milk",
        "coconut milk", "oat milk",
    ],
    "Legumes & Grains": [
        "quinoa", "brown rice", "basmati rice", "oats", "rolled oats",
        "lentils", "chickpeas", "black beans", "whole-grain bread",
        "whole-grain tortilla", "whole-grain pasta", "whole-wheat pita",
        "rice cakes", "granola", "breadcrumbs", "penne", "spaghetti",
    ],
    "Pantry & Condiments": [
        "olive oil", "coconut oil", "sesame oil", "soy sauce", "tahini",
        "hummus", "red curry paste", "marinara sauce", "crushed tomatoes",
        "diced tomatoes", "vegetable broth", "beef broth", "lemon-tahini dressing",
        "almond butter", "honey", "maple syrup", "mayo", "dijon mustard",
        "salsa", "tzatziki", "chia seeds", "flaxseeds",
    ],
    "Nuts & Seeds": [
        "mixed nuts", "almonds", "walnuts", "cashews",
    ],
    "Herbs & Spices": [
        "cinnamon", "cumin", "turmeric", "curry", "basil", "oregano",
        "rosemary", "thyme", "bay leaf", "dill", "chives", "parsley",
        "red pepper flakes", "chili flakes", "paprika", "salt", "pepper",
    ],
}

_INGREDIENT_TO_CATEGORY: dict[str, str] = {}
for _cat, _items in _GROCERY_CATEGORIES.items():
    for _item in _items:
        _INGREDIENT_TO_CATEGORY[_item.lower()] = _cat


def _categorize_ingredient(ingredient: str) -> str:
    lower = ingredient.lower()
    for key, cat in _INGREDIENT_TO_CATEGORY.items():
        if key in lower:
            return cat
    return "Other"


def generate_grocery_list(plan: list[dict]) -> dict[str, list[str]]:
    """Derive a categorized grocery list from a 7-day plan."""
    seen: set[str] = set()
    by_category: dict[str, list[str]] = {cat: [] for cat in _GROCERY_CATEGORIES}
    by_category["Other"] = []

    for day in plan:
        for meal in day["meals"].values():
            for ingredient in meal["ingredients"]:
                # Strip quantities for de-duplication
                key = ingredient.lower().strip()
                # Remove quantity prefix (numbers, fractions, units)
                import re
                clean = re.sub(
                    r"^[\d½¼¾\s]+(cup|tbsp|tsp|g|kg|oz|lb|medium|large|small|scoop|can|slice|clove|stalk|bunch|handful|pinch|dash|whole)[s]?\s*",
                    "",
                    key,
                )
                clean = re.sub(r"^[\d½¼¾]+\s*", "", clean).strip()
                # Remove trailing notes
                clean = clean.split(",")[0].split("(")[0].strip()
                if clean and clean not in seen:
                    seen.add(clean)
                    cat = _categorize_ingredient(clean)
                    by_category[cat].append(clean.capitalize())

    # Remove empty categories
    return {cat: items for cat, items in by_category.items() if items}


# ---------------------------------------------------------------------------
# Advice generators
# ---------------------------------------------------------------------------

def get_foods_to_avoid(
    primary_goal: str,
    diet_style: str,
    medical_conditions: list[str],
    medications: list[str],
) -> list[dict[str, str]]:
    """Return a list of {food, reason} dicts."""
    avoid: list[dict[str, str]] = []

    # Goal-based
    if primary_goal in ("fat_loss", "manage_blood_sugar"):
        avoid += [
            {"food": "Sugary beverages (soda, juice, energy drinks)",
             "reason": "Rapidly spike blood sugar and provide empty calories with no satiety."},
            {"food": "Ultra-processed snacks (chips, cookies, crackers)",
             "reason": "High in refined carbs, sodium, and trans fats; trigger overeating."},
            {"food": "White bread, white rice, white pasta",
             "reason": "Low fiber; causes blood sugar spikes and rapid hunger return."},
            {"food": "Fried foods",
             "reason": "Very calorie-dense; excess saturated fat impairs insulin sensitivity."},
        ]
    if primary_goal == "manage_blood_sugar":
        avoid += [
            {"food": "Fruit juices and dried fruit",
             "reason": "Concentrated sugar without fiber slows; can spike blood glucose."},
            {"food": "Alcohol",
             "reason": "Interferes with glucose regulation and medication (e.g., metformin)."},
        ]
    if primary_goal == "muscle_gain":
        avoid += [
            {"food": "Excessive alcohol",
             "reason": "Suppresses protein synthesis and disrupts sleep quality—both critical for muscle growth."},
            {"food": "Very low-calorie or crash diets",
             "reason": "Muscle breakdown accelerates in a large calorie deficit."},
        ]
    if diet_style == "keto":
        avoid += [
            {"food": "Grains, legumes, most fruit",
             "reason": "High carb content will knock you out of ketosis."},
            {"food": "Starchy vegetables (potatoes, corn, peas)",
             "reason": "Carb load exceeds typical keto daily threshold (20-50g net carbs)."},
        ]

    # Medical conditions
    conditions_lower = {c.strip().lower() for c in medical_conditions}
    if "hypertension" in conditions_lower or "high blood pressure" in conditions_lower:
        avoid += [
            {"food": "High-sodium processed foods (canned soups, deli meats)",
             "reason": "Excess sodium raises blood pressure; aim for < 2,300 mg sodium/day."},
            {"food": "Liquorice root / licorice",
             "reason": "Contains glycyrrhizin which can raise blood pressure."},
        ]
    if "diabetes" in conditions_lower:
        avoid += [
            {"food": "Refined sugars and sweets",
             "reason": "Rapidly elevate blood glucose; choose low-GI alternatives instead."},
        ]
    if "pcos" in conditions_lower:
        avoid += [
            {"food": "Refined carbs and added sugars",
             "reason": "Worsen insulin resistance, which is a key driver of PCOS symptoms."},
            {"food": "Inflammatory oils (vegetable oil, soybean oil)",
             "reason": "May exacerbate hormonal imbalance and inflammation associated with PCOS."},
        ]

    # Medications
    meds_lower = {m.strip().lower() for m in medications}
    if any("statin" in m for m in meds_lower):
        avoid += [
            {"food": "Grapefruit and grapefruit juice",
             "reason": "Inhibits CYP3A4 enzyme, causing dangerously high statin blood levels."},
        ]
    if "metformin" in meds_lower:
        avoid += [
            {"food": "Alcohol",
             "reason": "Increases risk of lactic acidosis when combined with metformin."},
        ]

    # Universal recommendations
    avoid += [
        {"food": "Trans fats (partially hydrogenated oils)",
         "reason": "Raise LDL cholesterol, lower HDL; no safe level of consumption."},
        {"food": "Highly processed meats (bacon, hot dogs, deli cold cuts daily)",
         "reason": "Linked to increased cardiovascular disease and colorectal cancer risk."},
    ]

    # Deduplicate by food name
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for item in avoid:
        if item["food"] not in seen:
            seen.add(item["food"])
            unique.append(item)
    return unique


def get_meal_prep_tips(
    cooking_skill: str,
    budget: str,
    diet_style: str,
    primary_goal: str,
) -> list[str]:
    tips = [
        "Pick a dedicated prep day (e.g., Sunday) and batch-cook grains (quinoa, rice, oats) for the whole week.",
        "Pre-portion proteins: grill or bake a full batch of chicken breast or fish, refrigerate for 3-4 days.",
        "Wash, chop, and store all vegetables in airtight containers so they're grab-and-go ready.",
        "Make large-batch soups or stews and freeze individual portions for busy nights.",
        "Hard-boil a dozen eggs at once—they keep for up to 1 week refrigerated and are perfect quick snacks.",
        "Prepare overnight chia pudding or overnight oats the evening before for a no-effort breakfast.",
        "Use mason jars to pre-assemble salads (dressing at the bottom, greens on top) for 3 days.",
    ]
    if budget in ("tight", "low"):
        tips += [
            "Buy canned/dried legumes (chickpeas, lentils, black beans)—cheap, nutritious, and shelf-stable.",
            "Purchase whole chicken and break it down yourself for significant savings over boneless cuts.",
            "Shop seasonal produce and use frozen fruits/vegetables—just as nutritious and more affordable.",
        ]
    if cooking_skill in ("beginner", "novice"):
        tips += [
            "Start with one-pan sheet-pan meals: place protein and vegetables on a tray, roast at 200°C (400°F) for 25-30 min.",
            "Use a slow cooker or Instant Pot—add ingredients in the morning, come home to a finished meal.",
        ]
    if diet_style == "keto":
        tips += [
            "Pre-make fat bombs (coconut oil, nut butter, dark cocoa) for convenient high-fat snacks.",
            "Spiralize zucchini and freeze so 'zoodles' are always ready as a pasta substitute.",
        ]
    return tips


def get_plateau_strategies(
    primary_goal: str,
    diet_style: str,
) -> list[str]:
    strategies = [
        "Reassess calorie targets: re-calculate TDEE with your new (lower) body weight—calorie needs change as you lose weight.",
        "Track everything for 1 week with a food scale to rule out portion creep—this is the most common hidden cause of plateaus.",
        "Cycle calories: eat at your target for 5 days, then have 2 slightly higher days (maintenance) to reset leptin levels.",
        "Adjust macros: try temporarily increasing protein to 45% of calories to boost satiety and the thermic effect of food.",
        "Change your exercise routine: add resistance training or increase workout intensity to prevent metabolic adaptation.",
        "Check sleep quality: poor sleep elevates cortisol and ghrelin, both of which promote fat storage and increase hunger.",
        "Review sodium and water intake: high sodium causes water retention that can mask fat loss on the scale.",
        "Take a 1-2 week diet break at maintenance calories—this can 'reset' metabolic adaptation without gaining fat.",
    ]
    if primary_goal == "muscle_gain":
        strategies = [
            "Increase calorie surplus slightly (+100-200 kcal/day) and prioritize compound lifts with progressive overload.",
            "Ensure you are hitting protein targets every single day; distribute across meals (30-40g per meal).",
            "Review training volume—add 1-2 working sets per muscle group per week and ensure adequate recovery.",
            "Consider creatine monohydrate (3-5g/day)—the most evidence-backed supplement for strength and muscle gain.",
        ] + strategies
    if primary_goal == "manage_blood_sugar":
        strategies = [
            "Monitor blood glucose 1-2 hours after meals to identify and eliminate specific food triggers.",
            "Focus on meal timing and pairing: always combine carbohydrates with protein and fat to blunt glucose spikes.",
            "Add 10-minute post-meal walks—research shows this significantly lowers post-meal blood glucose.",
        ] + strategies
    return strategies


# ---------------------------------------------------------------------------
# High-level plan builder
# ---------------------------------------------------------------------------

def build_full_plan(form: dict) -> dict[str, Any]:
    """
    Accepts a cleaned form dict and returns the full nutrition plan as a dict.
    """
    # Parse inputs
    weight_kg = float(form.get("weight_kg", 70))
    height_cm = float(form.get("height_cm", 170))
    age = int(form.get("age", 30))
    sex = form.get("sex", "m")
    activity_level = form.get("activity_level", "moderately_active")
    primary_goal = form.get("primary_goal", "general_health")
    diet_style = form.get("diet_style", "omnivore")
    allergies = [a for a in form.get("allergies", "").split(",") if a.strip()]
    dislikes = [d for d in form.get("dislikes", "").split(",") if d.strip()]
    include_snacks = form.get("include_snacks", "yes") == "yes"
    meals_per_day = int(form.get("meals_per_day", 3))
    medical_conditions = [c for c in form.get("medical_conditions", "").split(",") if c.strip()]
    medications = [m for m in form.get("medications", "").split(",") if m.strip()]
    cooking_skill = form.get("cooking_skill", "intermediate")
    budget = form.get("budget", "moderate")

    targets = calculate_targets(
        weight_kg, height_cm, age, sex,
        activity_level, primary_goal, diet_style,
    )

    meal_plan = generate_meal_plan(
        targets, diet_style, allergies, dislikes,
        include_snacks, meals_per_day,
    )

    grocery_list = generate_grocery_list(meal_plan)

    foods_to_avoid = get_foods_to_avoid(
        primary_goal, diet_style, medical_conditions, medications
    )

    meal_prep_tips = get_meal_prep_tips(
        cooking_skill, budget, diet_style, primary_goal
    )

    plateau_strategies = get_plateau_strategies(primary_goal, diet_style)

    return {
        "targets": targets,
        "meal_plan": meal_plan,
        "grocery_list": grocery_list,
        "foods_to_avoid": foods_to_avoid,
        "meal_prep_tips": meal_prep_tips,
        "plateau_strategies": plateau_strategies,
        "form": form,
    }
