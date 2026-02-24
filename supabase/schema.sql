-- NutriCoach Database Schema
-- Single-user personal app: no RLS complexity needed
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- USER PROFILE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text,
  age           int,
  sex           text CHECK (sex IN ('male','female','other')),
  height_cm     float,
  weight_kg     float,
  goal_weight_kg float,
  activity_level text CHECK (activity_level IN ('sedentary','lightly_active','moderately_active','very_active','extra_active')),
  exercise_type text,
  conditions    text[],
  allergies     text[],
  intolerances  text[],
  diet_style    text,
  food_likes    text[],
  food_dislikes text[],
  cuisine_prefs text[],
  cook_skill    text CHECK (cook_skill IN ('beginner','intermediate','advanced')),
  cook_time_min int,
  budget_weekly float,
  goal_primary  text,
  goal_secondary text[],
  units         text DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
  tdee          int,
  macro_protein int,
  macro_carbs   int,
  macro_fat     int,
  macro_fiber   int,
  ai_provider   text DEFAULT 'openai' CHECK (ai_provider IN ('openai','ollama')),
  theme         text DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  notifications_enabled boolean DEFAULT true,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- MEAL PLANS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  date,
  plan_json   jsonb NOT NULL,
  is_current  boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- SAVED RECIPES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  ingredients  jsonb,
  instructions text[],
  macros       jsonb,
  cuisine      text,
  difficulty   text CHECK (difficulty IN ('Easy','Medium','Advanced')),
  prep_time    int,
  cook_time    int,
  servings     int DEFAULT 1,
  is_favorite  boolean DEFAULT false,
  source       text DEFAULT 'ai_generated',
  created_at   timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- FOOD LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  meal_type  text CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name  text NOT NULL,
  brand      text,
  serving_size text,
  servings   float DEFAULT 1,
  calories   float,
  protein    float,
  carbs      float,
  fat        float,
  fiber      float,
  sodium     float,
  source     text DEFAULT 'manual',
  barcode    text,
  logged_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- WATER LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date       date NOT NULL,
  amount_ml  int NOT NULL,
  logged_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- GROCERY LISTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grocery_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  items        jsonb NOT NULL DEFAULT '[]',
  is_current   boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- CHAT MESSAGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user','assistant','system')),
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- PROGRESS LOGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date         date NOT NULL,
  weight_kg    float,
  measurements jsonb,
  energy       int CHECK (energy BETWEEN 1 AND 5),
  mood         int CHECK (mood BETWEEN 1 AND 5),
  notes        text,
  photo_url    text,
  created_at   timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_logs_date ON progress_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_meal_plans_current ON meal_plans(user_id, is_current);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY (single user, but good practice)
-- ─────────────────────────────────────────
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Policies: user can only access their own data
CREATE POLICY "profile_own" ON profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "meal_plans_own" ON meal_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "recipes_own" ON saved_recipes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "food_logs_own" ON food_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "water_logs_own" ON water_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "grocery_own" ON grocery_lists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "chat_own" ON chat_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "progress_own" ON progress_logs FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STORAGE BUCKET for progress photos
-- ─────────────────────────────────────────
-- Run in Supabase Storage dashboard or via API:
-- Create bucket named "progress-photos" with public: false
-- INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);
