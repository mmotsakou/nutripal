/**
 * TDEE and Macro Calculator — Mifflin-St Jeor formula
 */

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const GOAL_ADJUSTMENTS = {
  lose_weight_fast: -500,
  lose_weight: -300,
  maintain: 0,
  build_muscle: 300,
  build_muscle_fast: 500,
};

/**
 * Calculate BMR using Mifflin-St Jeor
 */
export function calcBMR(weight_kg, height_cm, age, sex) {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calcTDEE(weight_kg, height_cm, age, sex, activity_level, goal_primary) {
  const bmr = calcBMR(weight_kg, height_cm, age, sex);
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || 1.55;
  const tdee = Math.round(bmr * multiplier);
  const adjustment = GOAL_ADJUSTMENTS[goal_primary] || 0;
  return Math.max(1200, tdee + adjustment);
}

/**
 * Calculate macros from calorie target
 * Returns { protein_g, carbs_g, fat_g, fiber_g }
 */
export function calcMacros(tdee, weight_kg, diet_style, goal_primary) {
  let protein_pct, carbs_pct, fat_pct;

  // Adjust ratios based on diet style and goal
  switch (diet_style) {
    case 'keto':
      protein_pct = 0.25; carbs_pct = 0.05; fat_pct = 0.70; break;
    case 'low_carb':
      protein_pct = 0.30; carbs_pct = 0.20; fat_pct = 0.50; break;
    case 'high_protein':
      protein_pct = 0.35; carbs_pct = 0.40; fat_pct = 0.25; break;
    case 'vegan':
    case 'vegetarian':
      protein_pct = 0.20; carbs_pct = 0.55; fat_pct = 0.25; break;
    case 'mediterranean':
      protein_pct = 0.20; carbs_pct = 0.50; fat_pct = 0.30; break;
    default:
      protein_pct = 0.25; carbs_pct = 0.45; fat_pct = 0.30;
  }

  // Boost protein for muscle building
  if (goal_primary === 'build_muscle' || goal_primary === 'build_muscle_fast') {
    protein_pct = Math.max(protein_pct, 0.30);
    carbs_pct = carbs_pct - 0.05;
  }

  const protein_g = Math.round((tdee * protein_pct) / 4);
  const carbs_g = Math.round((tdee * carbs_pct) / 4);
  const fat_g = Math.round((tdee * fat_pct) / 9);
  // Fiber: 14g per 1000 kcal, capped at 45g
  const fiber_g = Math.min(45, Math.round((tdee / 1000) * 14));

  return { macro_protein: protein_g, macro_carbs: carbs_g, macro_fat: fat_g, macro_fiber: fiber_g };
}

/**
 * Calculate full profile targets from profile data
 */
export function calculateTargets(profile) {
  const tdee = calcTDEE(
    profile.weight_kg,
    profile.height_cm,
    profile.age,
    profile.sex,
    profile.activity_level,
    profile.goal_primary
  );
  const macros = calcMacros(tdee, profile.weight_kg, profile.diet_style, profile.goal_primary);
  return { tdee, ...macros };
}

/**
 * Convert height between metric and imperial
 */
export function cmToFtIn(cm) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function ftInToCm(feet, inches) {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function kgToLbs(kg) {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs) {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

/**
 * BMI calculation
 */
export function calcBMI(weight_kg, height_cm) {
  const heightM = height_cm / 100;
  return Math.round((weight_kg / (heightM * heightM)) * 10) / 10;
}

export function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}
