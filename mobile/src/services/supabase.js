import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profile')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertProfile(userId, profile) {
  const { data, error } = await supabase
    .from('profile')
    .upsert({ ...profile, user_id: userId, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Meal Plans ───────────────────────────────────────────────────────────────
export async function getCurrentMealPlan(userId) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveMealPlan(userId, plan) {
  // Mark all existing as not current
  await supabase.from('meal_plans').update({ is_current: false }).eq('user_id', userId);
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({ user_id: userId, week_start: plan.week_start, plan_json: plan, is_current: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMealPlan(id, plan) {
  const { data, error } = await supabase
    .from('meal_plans')
    .update({ plan_json: plan })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Recipes ──────────────────────────────────────────────────────────────────
export async function getRecipes(userId) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveRecipe(userId, recipe) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .insert({ ...recipe, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleRecipeFavorite(id, isFavorite) {
  const { error } = await supabase
    .from('saved_recipes')
    .update({ is_favorite: isFavorite })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('saved_recipes').delete().eq('id', id);
  if (error) throw error;
}

// ── Food Logs ────────────────────────────────────────────────────────────────
export async function getFoodLogs(userId, date) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFoodLog(userId, entry) {
  const { data, error } = await supabase
    .from('food_logs')
    .insert({ ...entry, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodLog(id) {
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function getFoodLogRange(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('date, calories, protein, carbs, fat, fiber')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');
  if (error) throw error;
  return data || [];
}

// ── Water Logs ───────────────────────────────────────────────────────────────
export async function getWaterLogs(userId, date) {
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('logged_at');
  if (error) throw error;
  return data || [];
}

export async function addWaterLog(userId, date, amount_ml) {
  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, date, amount_ml })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Grocery Lists ─────────────────────────────────────────────────────────────
export async function getCurrentGroceryList(userId) {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveGroceryList(userId, mealPlanId, items) {
  await supabase.from('grocery_lists').update({ is_current: false }).eq('user_id', userId);
  const { data, error } = await supabase
    .from('grocery_lists')
    .insert({ user_id: userId, meal_plan_id: mealPlanId, items, is_current: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGroceryList(id, items) {
  const { error } = await supabase.from('grocery_lists').update({ items }).eq('id', id);
  if (error) throw error;
}

// ── Chat Messages ─────────────────────────────────────────────────────────────
export async function getChatHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function saveChatMessage(userId, role, content) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, role, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clearChatHistory(userId) {
  const { error } = await supabase.from('chat_messages').delete().eq('user_id', userId);
  if (error) throw error;
}

// ── Progress Logs ─────────────────────────────────────────────────────────────
export async function getProgressLogs(userId, limit = 60) {
  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export async function addProgressLog(userId, log) {
  const { data, error } = await supabase
    .from('progress_logs')
    .upsert({ ...log, user_id: userId }, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Storage (progress photos) ─────────────────────────────────────────────────
export async function uploadProgressPhoto(userId, uri, date) {
  const ext = uri.split('.').pop();
  const path = `${userId}/${date}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from('progress-photos').upload(path, blob, {
    upsert: true,
    contentType: `image/${ext}`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('progress-photos').getPublicUrl(path);
  return data.publicUrl;
}
