import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { calculateTargets } from '../utils/tdee';
import { setOnboardingDone } from '../services/storage';

const TOTAL_STEPS = 6;

const DIET_STYLES = ['omnivore','vegan','vegetarian','pescatarian','keto','paleo','low_carb','mediterranean','gluten_free','dairy_free'];
const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'lightly_active', label: 'Lightly Active', desc: '1-3 days/week' },
  { key: 'moderately_active', label: 'Moderately Active', desc: '3-5 days/week' },
  { key: 'very_active', label: 'Very Active', desc: '6-7 days/week' },
  { key: 'extra_active', label: 'Extra Active', desc: 'Very hard exercise + physical job' },
];
const GOALS = [
  { key: 'lose_weight_fast', label: '⚡ Lose weight fast', desc: '-500 kcal/day deficit' },
  { key: 'lose_weight', label: '📉 Lose weight', desc: '-300 kcal/day deficit' },
  { key: 'maintain', label: '⚖️ Maintain weight', desc: 'Stay at current weight' },
  { key: 'build_muscle', label: '💪 Build muscle', desc: '+300 kcal/day surplus' },
  { key: 'build_muscle_fast', label: '🔥 Build muscle fast', desc: '+500 kcal/day surplus' },
];
const COOK_SKILLS = ['beginner','intermediate','advanced'];
const ALLERGIES = ['Gluten','Dairy','Eggs','Nuts','Peanuts','Shellfish','Fish','Soy','Sesame','Sulfites'];
const CUISINES = ['American','Italian','Mexican','Asian','Indian','Mediterranean','Middle Eastern','Japanese','Thai','French'];

export default function OnboardingScreen() {
  const { theme, updateProfile, session } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const s = styles(theme);

  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: 'male',
    height_cm: '',
    weight_kg: '',
    goal_weight_kg: '',
    activity_level: 'moderately_active',
    exercise_type: '',
    diet_style: 'omnivore',
    allergies: [],
    intolerances: [],
    conditions: [],
    food_dislikes: [],
    cuisine_prefs: [],
    cook_skill: 'intermediate',
    cook_time_min: '30',
    budget_weekly: '100',
    goal_primary: 'maintain',
    goal_secondary: [],
    units: 'metric',
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleArr = (key, val) => setForm(f => ({
    ...f,
    [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
  }));

  async function finish() {
    setLoading(true);
    try {
      const numForm = {
        ...form,
        age: parseInt(form.age, 10),
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
        goal_weight_kg: parseFloat(form.goal_weight_kg) || parseFloat(form.weight_kg),
        cook_time_min: parseInt(form.cook_time_min, 10) || 30,
        budget_weekly: parseFloat(form.budget_weekly) || 100,
      };
      const targets = calculateTargets(numForm);
      await updateProfile({ ...numForm, ...targets });
      await setOnboardingDone();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const OptionBtn = ({ label, selected, onPress, desc }) => (
    <TouchableOpacity
      style={[s.optionBtn, selected && s.optionBtnSelected]}
      onPress={onPress}
    >
      <Text style={[s.optionBtnText, selected && s.optionBtnTextSelected]}>{label}</Text>
      {desc && <Text style={[s.optionBtnDesc, selected && { color: '#fff' }]}>{desc}</Text>}
    </TouchableOpacity>
  );

  const TagBtn = ({ label, selected, onPress }) => (
    <TouchableOpacity
      style={[s.tag, selected && s.tagSelected]}
      onPress={onPress}
    >
      <Text style={[s.tagText, selected && s.tagTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  function renderStep() {
    switch (step) {
      // ── Step 1: Basic Info ─────────────────────────────────────────────────
      case 1:
        return (
          <View>
            <Text style={s.stepTitle}>👋 Let's get to know you</Text>
            <Text style={s.stepSubtitle}>Basic info for personalized nutrition</Text>

            <Text style={s.label}>Your name</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => update('name', v)}
              placeholder="e.g. Alex"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.label}>Age</Text>
            <TextInput
              style={s.input}
              value={form.age}
              onChangeText={v => update('age', v)}
              keyboardType="numeric"
              placeholder="e.g. 28"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.label}>Sex</Text>
            <View style={s.row}>
              {['male','female','other'].map(s2 => (
                <OptionBtn key={s2} label={s2.charAt(0).toUpperCase() + s2.slice(1)}
                  selected={form.sex === s2} onPress={() => update('sex', s2)} />
              ))}
            </View>

            <Text style={s.label}>Height (cm)</Text>
            <TextInput
              style={s.input}
              value={form.height_cm}
              onChangeText={v => update('height_cm', v)}
              keyboardType="numeric"
              placeholder="e.g. 175"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.label}>Current weight (kg)</Text>
            <TextInput
              style={s.input}
              value={form.weight_kg}
              onChangeText={v => update('weight_kg', v)}
              keyboardType="numeric"
              placeholder="e.g. 75"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={s.label}>Goal weight (kg)</Text>
            <TextInput
              style={s.input}
              value={form.goal_weight_kg}
              onChangeText={v => update('goal_weight_kg', v)}
              keyboardType="numeric"
              placeholder="e.g. 70"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        );

      // ── Step 2: Activity ──────────────────────────────────────────────────
      case 2:
        return (
          <View>
            <Text style={s.stepTitle}>🏃 Activity Level</Text>
            <Text style={s.stepSubtitle}>Used to calculate your daily calorie needs</Text>
            {ACTIVITY_LEVELS.map(a => (
              <OptionBtn key={a.key} label={a.label} desc={a.desc}
                selected={form.activity_level === a.key}
                onPress={() => update('activity_level', a.key)} />
            ))}
            <Text style={s.label}>Exercise type (optional)</Text>
            <TextInput
              style={s.input}
              value={form.exercise_type}
              onChangeText={v => update('exercise_type', v)}
              placeholder="e.g. Weight training, Running, Yoga"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        );

      // ── Step 3: Goal ──────────────────────────────────────────────────────
      case 3:
        return (
          <View>
            <Text style={s.stepTitle}>🎯 Your Goal</Text>
            <Text style={s.stepSubtitle}>What do you want to achieve?</Text>
            {GOALS.map(g => (
              <OptionBtn key={g.key} label={g.label} desc={g.desc}
                selected={form.goal_primary === g.key}
                onPress={() => update('goal_primary', g.key)} />
            ))}
          </View>
        );

      // ── Step 4: Diet Style ────────────────────────────────────────────────
      case 4:
        return (
          <View>
            <Text style={s.stepTitle}>🥗 Diet Style</Text>
            <Text style={s.stepSubtitle}>Select your eating style</Text>
            <View style={s.tagRow}>
              {DIET_STYLES.map(d => (
                <TagBtn key={d} label={d.replace(/_/g,' ')}
                  selected={form.diet_style === d}
                  onPress={() => update('diet_style', d)} />
              ))}
            </View>

            <Text style={[s.label, { marginTop: 20 }]}>Allergies / restrictions</Text>
            <View style={s.tagRow}>
              {ALLERGIES.map(a => (
                <TagBtn key={a} label={a}
                  selected={form.allergies.includes(a)}
                  onPress={() => toggleArr('allergies', a)} />
              ))}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>Medical conditions (optional)</Text>
            <TextInput
              style={s.input}
              value={form.conditions.join(', ')}
              onChangeText={v => update('conditions', v.split(',').map(x => x.trim()).filter(Boolean))}
              placeholder="e.g. Diabetes, Hypertension"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[s.label, { marginTop: 8 }]}>Foods you dislike (optional)</Text>
            <TextInput
              style={s.input}
              value={form.food_dislikes.join(', ')}
              onChangeText={v => update('food_dislikes', v.split(',').map(x => x.trim()).filter(Boolean))}
              placeholder="e.g. Broccoli, Mushrooms"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        );

      // ── Step 5: Cuisine & Cooking ─────────────────────────────────────────
      case 5:
        return (
          <View>
            <Text style={s.stepTitle}>👨‍🍳 Cooking Preferences</Text>
            <Text style={s.stepSubtitle}>Help us plan meals you'll actually enjoy making</Text>

            <Text style={s.label}>Favourite cuisines</Text>
            <View style={s.tagRow}>
              {CUISINES.map(c => (
                <TagBtn key={c} label={c}
                  selected={form.cuisine_prefs.includes(c)}
                  onPress={() => toggleArr('cuisine_prefs', c)} />
              ))}
            </View>

            <Text style={[s.label, { marginTop: 20 }]}>Cooking skill</Text>
            <View style={s.row}>
              {COOK_SKILLS.map(sk => (
                <OptionBtn key={sk} label={sk.charAt(0).toUpperCase() + sk.slice(1)}
                  selected={form.cook_skill === sk}
                  onPress={() => update('cook_skill', sk)} />
              ))}
            </View>

            <Text style={[s.label, { marginTop: 16 }]}>Max cooking time per meal (minutes)</Text>
            <TextInput
              style={s.input}
              value={form.cook_time_min}
              onChangeText={v => update('cook_time_min', v)}
              keyboardType="numeric"
              placeholder="e.g. 30"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[s.label, { marginTop: 8 }]}>Weekly food budget ($)</Text>
            <TextInput
              style={s.input}
              value={form.budget_weekly}
              onChangeText={v => update('budget_weekly', v)}
              keyboardType="numeric"
              placeholder="e.g. 100"
              placeholderTextColor={theme.textMuted}
            />
          </View>
        );

      // ── Step 6: Review ────────────────────────────────────────────────────
      case 6:
        const targets = calculateTargets({
          ...form,
          age: parseInt(form.age, 10),
          height_cm: parseFloat(form.height_cm),
          weight_kg: parseFloat(form.weight_kg),
        });
        return (
          <View>
            <Text style={s.stepTitle}>✅ All Set, {form.name || 'friend'}!</Text>
            <Text style={s.stepSubtitle}>Here are your calculated daily targets</Text>

            <View style={s.summaryCard}>
              <SummaryRow label="Daily Calories" value={`${targets.tdee} kcal`} theme={theme} />
              <SummaryRow label="Protein" value={`${targets.macro_protein}g`} theme={theme} />
              <SummaryRow label="Carbs" value={`${targets.macro_carbs}g`} theme={theme} />
              <SummaryRow label="Fat" value={`${targets.macro_fat}g`} theme={theme} />
              <SummaryRow label="Fiber" value={`${targets.macro_fiber}g`} theme={theme} />
              <SummaryRow label="Diet Style" value={form.diet_style} theme={theme} />
              <SummaryRow label="Goal" value={form.goal_primary.replace(/_/g,' ')} theme={theme} />
            </View>

            <Text style={[s.hint, { marginTop: 12 }]}>
              You can edit these anytime in Settings. Ready to start your nutrition journey?
            </Text>
          </View>
        );
    }
  }

  return (
    <View style={s.container}>
      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>
      <Text style={s.stepCount}>Step {step} of {TOTAL_STEPS}</Text>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={s.navRow}>
        {step > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(s2 => s2 - 1)}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, loading && s.btnDisabled, step === 1 && { flex: 1 }]}
          onPress={step < TOTAL_STEPS ? () => setStep(s2 => s2 + 1) : finish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.nextBtnText}>
              {step < TOTAL_STEPS ? 'Next →' : '🚀 Get Started'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Text style={{ color: theme.textSecondary, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  progressBar: { height: 4, backgroundColor: theme.border, margin: 0 },
  progressFill: { height: 4, backgroundColor: theme.primary },
  stepCount: { color: theme.textMuted, fontSize: 13, textAlign: 'center', paddingTop: 8 },
  scroll: { padding: 24, paddingBottom: 8 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: theme.textSecondary, marginBottom: 24 },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    color: theme.text,
    fontSize: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: theme.border,
    backgroundColor: theme.card,
  },
  tagSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  tagText: { color: theme.text, fontSize: 13 },
  tagTextSelected: { color: '#fff', fontWeight: '600' },
  optionBtn: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, backgroundColor: theme.card, marginBottom: 8,
  },
  optionBtnSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionBtnText: { color: theme.text, fontWeight: '600', fontSize: 14 },
  optionBtnTextSelected: { color: '#fff' },
  optionBtnDesc: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  summaryCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  hint: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  navRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.bg,
  },
  backBtn: {
    flex: 1, padding: 16, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, alignItems: 'center',
  },
  backBtnText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  nextBtn: {
    flex: 2, backgroundColor: theme.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
