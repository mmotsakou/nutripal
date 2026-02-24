/**
 * Local AsyncStorage cache — offline fallback for key data
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROFILE: '@nutricoach_profile',
  MEAL_PLAN: '@nutricoach_meal_plan',
  GROCERY_LIST: '@nutricoach_grocery_list',
  FOOD_LOG_PREFIX: '@nutricoach_food_log_',
  WATER_LOG_PREFIX: '@nutricoach_water_log_',
  ONBOARDING_DONE: '@nutricoach_onboarding_done',
  STREAK: '@nutricoach_streak',
  LAST_LOG_DATE: '@nutricoach_last_log_date',
};

export async function cacheProfile(profile) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function getCachedProfile() {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function cacheMealPlan(plan) {
  await AsyncStorage.setItem(KEYS.MEAL_PLAN, JSON.stringify(plan));
}

export async function getCachedMealPlan() {
  const raw = await AsyncStorage.getItem(KEYS.MEAL_PLAN);
  return raw ? JSON.parse(raw) : null;
}

export async function cacheGroceryList(list) {
  await AsyncStorage.setItem(KEYS.GROCERY_LIST, JSON.stringify(list));
}

export async function getCachedGroceryList() {
  const raw = await AsyncStorage.getItem(KEYS.GROCERY_LIST);
  return raw ? JSON.parse(raw) : null;
}

export async function cacheFoodLog(date, logs) {
  await AsyncStorage.setItem(KEYS.FOOD_LOG_PREFIX + date, JSON.stringify(logs));
}

export async function getCachedFoodLog(date) {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_LOG_PREFIX + date);
  return raw ? JSON.parse(raw) : null;
}

export async function setOnboardingDone() {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
}

export async function isOnboardingDone() {
  return (await AsyncStorage.getItem(KEYS.ONBOARDING_DONE)) === 'true';
}

export async function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = await AsyncStorage.getItem(KEYS.LAST_LOG_DATE);
  const streakRaw = await AsyncStorage.getItem(KEYS.STREAK);
  let streak = parseInt(streakRaw || '0', 10);

  if (lastDate === today) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yesterdayStr) {
    streak += 1;
  } else {
    streak = 1;
  }

  await AsyncStorage.setItem(KEYS.STREAK, String(streak));
  await AsyncStorage.setItem(KEYS.LAST_LOG_DATE, today);
  return streak;
}

export async function getStreak() {
  const raw = await AsyncStorage.getItem(KEYS.STREAK);
  return parseInt(raw || '0', 10);
}

export async function clearAll() {
  await AsyncStorage.clear();
}
