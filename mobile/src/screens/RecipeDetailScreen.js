import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { saveRecipe, toggleRecipeFavorite } from '../services/supabase';

const SERVING_SCALES = [0.5, 1, 1.5, 2];

export default function RecipeDetailScreen({ route }) {
  const { meal, day } = route.params || {};
  const { theme, session } = useApp();
  const s = styles(theme);
  const [scale, setScale] = useState(1);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!meal) {
    return <View style={s.container}><Text style={s.noData}>No recipe data</Text></View>;
  }

  const scaleMacro = (val) => Math.round((val || 0) * scale);

  async function handleSave() {
    setSaving(true);
    try {
      await saveRecipe(session.user.id, {
        name: meal.name,
        description: meal.description,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        macros: meal.macros,
        cuisine: meal.cuisine,
        difficulty: meal.difficulty,
        prep_time: meal.prep_time_min,
        cook_time: meal.cook_time_min,
        servings: meal.servings || 1,
        source: 'meal_plan',
      });
      setSaved(true);
      Alert.alert('Saved!', 'Recipe added to your collection.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        {day && <Text style={s.dayLabel}>{day}</Text>}
        <Text style={s.title}>{meal.name}</Text>
        {meal.description && <Text style={s.desc}>{meal.description}</Text>}

        <View style={s.tagRow}>
          {meal.cuisine && <Tag label={`🌍 ${meal.cuisine}`} theme={theme} />}
          {meal.difficulty && <Tag label={`⭐ ${meal.difficulty}`} color={meal.difficulty === 'Easy' ? '#22c55e' : meal.difficulty === 'Medium' ? '#f59e0b' : '#ef4444'} theme={theme} />}
          {meal.prep_time_min && <Tag label={`⏱ Prep: ${meal.prep_time_min}min`} theme={theme} />}
          {meal.cook_time_min && <Tag label={`🔥 Cook: ${meal.cook_time_min}min`} theme={theme} />}
        </View>
      </View>

      {/* Macro summary */}
      <View style={s.macrosCard}>
        <Text style={s.sectionTitle}>Nutrition (per serving)</Text>
        <View style={s.macrosRow}>
          <MacroCell label="Calories" value={scaleMacro(meal.macros?.calories)} unit="kcal" color={theme.primary} theme={theme} />
          <MacroCell label="Protein" value={scaleMacro(meal.macros?.protein_g)} unit="g" color="#3b82f6" theme={theme} />
          <MacroCell label="Carbs" value={scaleMacro(meal.macros?.carbs_g)} unit="g" color="#f59e0b" theme={theme} />
          <MacroCell label="Fat" value={scaleMacro(meal.macros?.fat_g)} unit="g" color="#ec4899" theme={theme} />
          <MacroCell label="Fiber" value={scaleMacro(meal.macros?.fiber_g)} unit="g" color="#8b5cf6" theme={theme} />
        </View>

        {/* Serving scale */}
        <View style={s.scaleRow}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginRight: 12 }}>Servings:</Text>
          {SERVING_SCALES.map(sc => (
            <TouchableOpacity
              key={sc}
              style={[s.scaleBtn, scale === sc && s.scaleBtnActive]}
              onPress={() => setScale(sc)}
            >
              <Text style={[s.scaleBtnText, scale === sc && s.scaleBtnTextActive]}>{sc}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ingredients */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🛒 Ingredients</Text>
        {(meal.ingredients || []).map((ing, i) => (
          <View key={i} style={s.ingredientRow}>
            <View style={s.bullet} />
            <View style={{ flex: 1 }}>
              <Text style={s.ingredientName}>{ing.name}</Text>
            </View>
            <Text style={s.ingredientAmount}>
              {ing.amount_household
                ? ing.amount_household
                : `${Math.round((ing.amount_g || 0) * scale)}g`}
            </Text>
          </View>
        ))}
      </View>

      {/* Instructions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>👨‍🍳 Instructions</Text>
        {(meal.instructions || []).map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepNum}>
              <Text style={s.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={s.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[s.saveBtn, saved && s.saveBtnDone]}
        onPress={handleSave}
        disabled={saved || saving}
      >
        <Text style={s.saveBtnText}>{saved ? '✅ Saved to My Recipes' : '💾 Save to My Recipes'}</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Tag({ label, color, theme }) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: theme.border }}>
      <Text style={{ color: color || theme.textSecondary, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function MacroCell({ label, value, unit, color, theme }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 18, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 1 }}>{unit}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  noData: { color: theme.textSecondary, fontSize: 16, textAlign: 'center', marginTop: 40 },
  header: { marginBottom: 16 },
  dayLabel: { color: theme.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 8 },
  desc: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macrosCard: { backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  macrosRow: { flexDirection: 'row', marginBottom: 14 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  scaleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginRight: 8 },
  scaleBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  scaleBtnText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  scaleBtnTextActive: { color: '#fff' },
  section: { backgroundColor: theme.card, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginTop: 6, marginRight: 12 },
  ingredientName: { color: theme.text, fontSize: 14 },
  ingredientAmount: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, color: theme.text, fontSize: 14, lineHeight: 22 },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDone: { backgroundColor: theme.success + '40', borderWidth: 1, borderColor: theme.success },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
