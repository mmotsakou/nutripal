import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { generateRecipe } from '../services/api';
import { saveRecipe } from '../services/supabase';

const CUISINES = ['Any','Italian','Mexican','Asian','American','Mediterranean','Indian','Japanese','Thai'];
const TIMES = ['15 min','30 min','45 min','60 min'];

export default function RecipeGeneratorScreen() {
  const { theme, profile, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);

  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('Any');
  const [time, setTime] = useState('30 min');
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleGenerate() {
    if (!ingredients.trim()) { Alert.alert('Error', 'Please enter some ingredients'); return; }
    setGenerating(true);
    setSaved(false);
    try {
      const timeMin = parseInt(time, 10);
      const { recipe: r } = await generateRecipe({
        profile,
        ingredients: ingredients.trim(),
        cuisine: cuisine === 'Any' ? null : cuisine,
        time_available: timeMin,
      });
      setRecipe(r);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!recipe) return;
    try {
      await saveRecipe(session.user.id, {
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        macros: recipe.macros,
        cuisine: recipe.cuisine,
        difficulty: recipe.difficulty,
        prep_time: recipe.prep_time_min,
        cook_time: recipe.cook_time_min,
        servings: recipe.servings || 1,
        source: 'ai_chef',
      });
      setSaved(true);
      Alert.alert('Saved!', 'Recipe added to your collection.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <Text style={s.title}>👨‍🍳 AI Chef</Text>
      <Text style={s.subtitle}>Tell me what ingredients you have and I'll create a recipe for you</Text>

      <Text style={s.label}>Ingredients you have</Text>
      <TextInput
        style={s.textArea}
        value={ingredients}
        onChangeText={setIngredients}
        placeholder="e.g. chicken breast, garlic, lemon, spinach, olive oil..."
        placeholderTextColor={theme.textMuted}
        multiline
        numberOfLines={4}
      />

      <Text style={s.label}>Cuisine preference</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
          {CUISINES.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.chip, cuisine === c && s.chipActive]}
              onPress={() => setCuisine(c)}
            >
              <Text style={[s.chipText, cuisine === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={s.label}>Time available</Text>
      <View style={s.timeRow}>
        {TIMES.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.timeBtn, time === t && s.timeBtnActive]}
            onPress={() => setTime(t)}
          >
            <Text style={[s.timeBtnText, time === t && s.timeBtnTextActive]}>⏱ {t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.generateBtn} onPress={handleGenerate} disabled={generating}>
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.generateBtnText}>✨ Create Recipe</Text>}
      </TouchableOpacity>

      {recipe && (
        <View style={s.recipeResult}>
          <Text style={s.recipeName}>{recipe.name}</Text>
          {recipe.description && <Text style={s.recipeDesc}>{recipe.description}</Text>}

          <View style={s.macrosRow}>
            {[
              { label: 'Kcal', value: recipe.macros?.calories, color: theme.primary },
              { label: 'Protein', value: `${recipe.macros?.protein_g}g`, color: '#3b82f6' },
              { label: 'Carbs', value: `${recipe.macros?.carbs_g}g`, color: '#f59e0b' },
              { label: 'Fat', value: `${recipe.macros?.fat_g}g`, color: '#ec4899' },
            ].map(m => (
              <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: m.color, fontSize: 16, fontWeight: '700' }}>{m.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionLabel}>🛒 Ingredients</Text>
          {(recipe.ingredients || []).map((ing, i) => (
            <Text key={i} style={s.ingredient}>• {ing.name} — {ing.amount_household || `${ing.amount_g}g`}</Text>
          ))}

          <Text style={s.sectionLabel}>👨‍🍳 Instructions</Text>
          {(recipe.instructions || []).map((step, i) => (
            <View key={i} style={s.stepRow}>
              <Text style={s.stepNum}>{i + 1}</Text>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          {recipe.tips?.length > 0 && (
            <>
              <Text style={s.sectionLabel}>💡 Chef Tips</Text>
              {recipe.tips.map((tip, i) => (
                <Text key={i} style={s.tip}>• {tip}</Text>
              ))}
            </>
          )}

          <TouchableOpacity
            style={[s.saveBtn, saved && { backgroundColor: '#22c55e40', borderWidth: 1, borderColor: '#22c55e' }]}
            onPress={handleSave}
            disabled={saved}
          >
            <Text style={s.saveBtnText}>{saved ? '✅ Saved!' : '💾 Save to My Recipes'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, marginBottom: 24 },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textArea: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14,
    padding: 14, color: theme.text, fontSize: 15, minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  timeBtn: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center',
  },
  timeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  timeBtnText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  timeBtnTextActive: { color: '#fff' },
  generateBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recipeResult: { backgroundColor: theme.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.border },
  recipeName: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  recipeDesc: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  macrosRow: { flexDirection: 'row', marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  sectionLabel: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 6 },
  ingredient: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  stepRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  stepNum: { color: theme.primary, fontWeight: '800', fontSize: 15, marginRight: 10, minWidth: 20 },
  stepText: { flex: 1, color: theme.text, fontSize: 14, lineHeight: 22 },
  tip: { color: theme.textSecondary, fontSize: 14, lineHeight: 22 },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
