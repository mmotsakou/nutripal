import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, FlatList, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getCurrentMealPlan, saveMealPlan, updateMealPlan, saveGroceryList } from '../services/supabase';
import { generateMealPlan, regenerateMeal } from '../services/api';
import { cacheMealPlan, getCachedMealPlan } from '../services/storage';
import { buildGroceryList } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEAL_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const DIFFICULTY_COLOR = { Easy: '#22c55e', Medium: '#f59e0b', Advanced: '#ef4444' };

export default function MealPlanScreen() {
  const { theme, profile, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);

  const [plan, setPlan] = useState(null);
  const [planRecord, setPlanRecord] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingMeal, setRegeneratingMeal] = useState(null);
  const dayScrollRef = useRef(null);

  useEffect(() => { loadPlan(); }, []);

  async function loadPlan() {
    try {
      const cached = await getCachedMealPlan();
      if (cached) setPlan(cached);

      const record = await getCurrentMealPlan(session.user.id);
      if (record) {
        setPlanRecord(record);
        setPlan(record.plan_json);
        await cacheMealPlan(record.plan_json);
      }
    } catch (err) {
      console.error('Load meal plan:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!profile) { Alert.alert('Error', 'Profile not loaded'); return; }
    Alert.alert('Generate 7-Day Meal Plan', 'This will replace your current plan. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Generate', onPress: async () => {
          setGenerating(true);
          try {
            const { plan: newPlan } = await generateMealPlan(profile);
            const record = await saveMealPlan(session.user.id, newPlan);
            setPlanRecord(record);
            setPlan(newPlan);
            await cacheMealPlan(newPlan);

            // Auto-generate grocery list
            const groceryItems = buildGroceryList(newPlan);
            await saveGroceryList(session.user.id, record.id, groceryItems);

            Alert.alert('✅ Meal Plan Ready!', 'Your 7-day plan and grocery list have been generated.');
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setGenerating(false);
          }
        },
      },
    ]);
  }

  async function handleRegenerateMeal(dayIndex, meal) {
    const day = plan.days[dayIndex];
    const key = `${dayIndex}_${meal.meal_type}`;
    setRegeneratingMeal(key);
    try {
      const existingMeals = plan.days.flatMap(d => d.meals || []);
      const { meal: newMeal } = await regenerateMeal(profile, day.day, meal.meal_type, existingMeals);

      const updatedPlan = {
        ...plan,
        days: plan.days.map((d, i) =>
          i === dayIndex
            ? { ...d, meals: d.meals.map(m => m.meal_type === meal.meal_type ? newMeal : m) }
            : d
        ),
      };
      setPlan(updatedPlan);
      await cacheMealPlan(updatedPlan);
      if (planRecord) await updateMealPlan(planRecord.id, updatedPlan);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setRegeneratingMeal(null);
    }
  }

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>;
  }

  if (!plan) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>🍽️</Text>
        <Text style={s.noplanTitle}>No Meal Plan Yet</Text>
        <Text style={s.noplanSub}>
          Generate a personalized 7-day meal plan based on your nutritional goals and preferences.
        </Text>
        <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} disabled={generating}>
          {generating
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.generateBtnText}>✨ Generate My Meal Plan</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.recipeBtn} onPress={() => navigation.navigate('RecipeGenerator')}>
          <Text style={s.recipeBtnText}>👨‍🍳 AI Chef — Make a Recipe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentDay = plan.days?.[selectedDay];
  const totals = currentDay?.daily_totals;

  return (
    <View style={s.container}>
      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.dayScroll}
        contentContainerStyle={s.dayScrollContent}
      >
        {(plan.days || []).map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dayTab, selectedDay === i && s.dayTabActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[s.dayTabText, selectedDay === i && s.dayTabTextActive]}>
              {day.day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Day totals */}
        {totals && (
          <View style={s.totalsCard}>
            <Text style={s.totalsTitle}>📊 {currentDay.day}'s Totals</Text>
            <View style={s.totalsRow}>
              <MacroChip label="Kcal" value={totals.calories} color={theme.primary} theme={theme} />
              <MacroChip label="Protein" value={`${totals.protein_g}g`} color="#3b82f6" theme={theme} />
              <MacroChip label="Carbs" value={`${totals.carbs_g}g`} color="#f59e0b" theme={theme} />
              <MacroChip label="Fat" value={`${totals.fat_g}g`} color="#ec4899" theme={theme} />
            </View>
          </View>
        )}

        {/* Meals */}
        {(currentDay?.meals || []).map((meal, mi) => {
          const key = `${selectedDay}_${meal.meal_type}`;
          const isRegen = regeneratingMeal === key;
          return (
            <View key={mi} style={s.mealCard}>
              <View style={s.mealHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>{MEAL_EMOJIS[meal.meal_type] || '🍴'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mealType}>{meal.meal_type?.toUpperCase()}</Text>
                    <Text style={s.mealName} numberOfLines={1}>{meal.name}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.regenBtn}
                  onPress={() => handleRegenerateMeal(selectedDay, meal)}
                  disabled={isRegen || !!regeneratingMeal}
                >
                  {isRegen ? <ActivityIndicator size="small" color={theme.accent} />
                    : <Text style={s.regenBtnText}>🔄</Text>}
                </TouchableOpacity>
              </View>

              <Text style={s.mealDesc} numberOfLines={2}>{meal.description}</Text>

              <View style={s.mealMeta}>
                <MetaChip label={`${meal.macros?.calories || 0} kcal`} theme={theme} />
                <MetaChip label={`${meal.macros?.protein_g || 0}g protein`} theme={theme} />
                <MetaChip label={`⏱ ${(meal.prep_time_min || 0) + (meal.cook_time_min || 0)} min`} theme={theme} />
                <MetaChip
                  label={meal.difficulty || 'Easy'}
                  color={DIFFICULTY_COLOR[meal.difficulty] || theme.primary}
                  theme={theme}
                />
              </View>

              <TouchableOpacity
                style={s.viewRecipeBtn}
                onPress={() => navigation.navigate('RecipeDetail', { meal, day: currentDay.day })}
              >
                <Text style={s.viewRecipeBtnText}>View Full Recipe →</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Action buttons */}
        <View style={s.bottomActions}>
          <TouchableOpacity style={s.regenerateFullBtn} onPress={handleGenerate} disabled={generating}>
            {generating
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.generateBtnText}>✨ Regenerate Whole Plan</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.recipeBtn} onPress={() => navigation.navigate('RecipeGenerator')}>
            <Text style={s.recipeBtnText}>👨‍🍳 AI Chef</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.recipeBtn} onPress={() => navigation.navigate('SavedRecipes')}>
            <Text style={s.recipeBtnText}>📚 My Recipes</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function MacroChip({ label, value, color, theme }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: color || theme.primary, fontSize: 16, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function MetaChip({ label, color, theme }) {
  return (
    <View style={{
      backgroundColor: theme.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: theme.border,
    }}>
      <Text style={{ color: color || theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  dayScroll: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, maxHeight: 52 },
  dayScrollContent: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  dayTab: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
  },
  dayTabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayTabText: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
  dayTabTextActive: { color: '#fff' },
  content: { flex: 1, padding: 16 },
  totalsCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  totalsTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  totalsRow: { flexDirection: 'row' },
  mealCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  mealType: { color: theme.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName: { color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  regenBtn: { padding: 8 },
  regenBtnText: { fontSize: 18 },
  mealDesc: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  mealMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  viewRecipeBtn: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  viewRecipeBtnText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
  noplanTitle: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  noplanSub: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  generateBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recipeBtn: {
    backgroundColor: theme.card, borderRadius: 14, padding: 14, width: '100%',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 10,
  },
  recipeBtnText: { color: theme.text, fontSize: 15, fontWeight: '600' },
  bottomActions: { gap: 10, marginTop: 12 },
  regenerateFullBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
});
