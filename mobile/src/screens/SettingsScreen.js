import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, ActivityIndicator, Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getFoodLogs, getProgressLogs, getRecipes, getCurrentMealPlan } from '../services/supabase';
import { clearAll } from '../services/storage';
import { supabase } from '../services/supabase';
import { calcBMI, bmiCategory, kgToLbs, cmToFtIn } from '../utils/tdee';

export default function SettingsScreen() {
  const { theme, themeName, setThemeName, profile, updateProfile, signOut, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleToggleTheme() {
    const newTheme = themeName === 'dark' ? 'light' : 'dark';
    setThemeName(newTheme);
  }

  async function handleToggleUnits() {
    const newUnits = profile?.units === 'metric' ? 'imperial' : 'metric';
    try { await updateProfile({ units: newUnits }); } catch {}
  }

  async function handleToggleAI() {
    const newProvider = profile?.ai_provider === 'openai' ? 'ollama' : 'openai';
    try { await updateProfile({ ai_provider: newProvider }); } catch {}
  }

  async function handleExportData() {
    if (!session?.user) return;
    setExporting(true);
    try {
      const [logs, progress, recipes, plan] = await Promise.all([
        getFoodLogs(session.user.id, new Date().toISOString().split('T')[0]),
        getProgressLogs(session.user.id, 365),
        getRecipes(session.user.id),
        getCurrentMealPlan(session.user.id),
      ]);
      const exportData = {
        exported_at: new Date().toISOString(),
        profile,
        recent_food_logs: logs,
        progress_logs: progress,
        saved_recipes: recipes,
        current_meal_plan: plan?.plan_json,
      };
      await Share.share({
        title: 'NutriCoach Data Export',
        message: JSON.stringify(exportData, null, 2),
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setExporting(false);
    }
  }

  function handleClearData() {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will permanently delete ALL your data including food logs, meal plans, progress, and recipes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              if (session?.user) {
                // Delete all user data from Supabase
                await Promise.all([
                  supabase.from('food_logs').delete().eq('user_id', session.user.id),
                  supabase.from('water_logs').delete().eq('user_id', session.user.id),
                  supabase.from('meal_plans').delete().eq('user_id', session.user.id),
                  supabase.from('saved_recipes').delete().eq('user_id', session.user.id),
                  supabase.from('grocery_lists').delete().eq('user_id', session.user.id),
                  supabase.from('chat_messages').delete().eq('user_id', session.user.id),
                  supabase.from('progress_logs').delete().eq('user_id', session.user.id),
                ]);
              }
              await clearAll();
              Alert.alert('Done', 'All data cleared. Please restart the app.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  const bmi = profile ? calcBMI(profile.weight_kg, profile.height_cm) : null;
  const isImperial = profile?.units === 'imperial';
  const heightDisplay = isImperial && profile
    ? `${cmToFtIn(profile.height_cm).feet}'${cmToFtIn(profile.height_cm).inches}"`
    : `${profile?.height_cm}cm`;
  const weightDisplay = isImperial && profile
    ? `${kgToLbs(profile.weight_kg)} lbs`
    : `${profile?.weight_kg} kg`;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Profile Summary */}
      <View style={s.card}>
        <Text style={s.cardTitle}>👤 Profile</Text>
        <View style={s.profileGrid}>
          <ProfileRow label="Name" value={profile?.name || '—'} theme={theme} />
          <ProfileRow label="Age" value={profile?.age ? `${profile.age} years` : '—'} theme={theme} />
          <ProfileRow label="Height" value={heightDisplay || '—'} theme={theme} />
          <ProfileRow label="Weight" value={weightDisplay || '—'} theme={theme} />
          <ProfileRow label="Goal Weight" value={isImperial ? `${kgToLbs(profile?.goal_weight_kg)} lbs` : `${profile?.goal_weight_kg} kg`} theme={theme} />
          <ProfileRow label="Goal" value={profile?.goal_primary?.replace(/_/g, ' ') || '—'} theme={theme} />
          <ProfileRow label="Diet Style" value={profile?.diet_style || '—'} theme={theme} />
          {bmi && <ProfileRow label="BMI" value={`${bmi} (${bmiCategory(bmi)})`} theme={theme} />}
        </View>

        <View style={s.targetsRow}>
          <TargetChip label="Calories" value={`${profile?.tdee || 0} kcal`} theme={theme} />
          <TargetChip label="Protein" value={`${profile?.macro_protein || 0}g`} theme={theme} />
          <TargetChip label="Carbs" value={`${profile?.macro_carbs || 0}g`} theme={theme} />
          <TargetChip label="Fat" value={`${profile?.macro_fat || 0}g`} theme={theme} />
        </View>

        <TouchableOpacity
          style={s.editProfileBtn}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={s.editProfileBtnText}>✏️ Edit Profile & Goals</Text>
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <View style={s.card}>
        <Text style={s.cardTitle}>⚙️ App Settings</Text>

        <SettingRow
          label="Dark Mode"
          value={themeName === 'dark'}
          onToggle={handleToggleTheme}
          theme={theme}
        />
        <SettingRow
          label="Imperial Units (lbs/ft)"
          value={profile?.units === 'imperial'}
          onToggle={handleToggleUnits}
          theme={theme}
        />
      </View>

      {/* AI Settings */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🤖 AI Settings</Text>
        <SettingRow
          label="Use Ollama (local, free)"
          description="If off, uses OpenAI API. Toggle based on your .env setup."
          value={profile?.ai_provider === 'ollama'}
          onToggle={handleToggleAI}
          theme={theme}
        />
        <View style={s.aiInfo}>
          <Text style={s.aiInfoText}>
            Current: <Text style={{ fontWeight: '700', color: theme.primary }}>{profile?.ai_provider || 'openai'}</Text>
            {profile?.ai_provider === 'openai'
              ? '\nUsing OpenAI GPT-4o-mini. Cost: ~$0.001/message'
              : '\nUsing local Ollama model. Free, runs on your machine.'}
          </Text>
        </View>
      </View>

      {/* Data Management */}
      <View style={s.card}>
        <Text style={s.cardTitle}>💾 Data</Text>
        <TouchableOpacity style={s.actionBtn} onPress={handleExportData} disabled={exporting}>
          {exporting
            ? <ActivityIndicator color={theme.primary} />
            : <Text style={s.actionBtnText}>📤 Export All Data (JSON)</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.dangerBtn]} onPress={handleClearData}>
          <Text style={s.dangerBtnText}>🗑 Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🔐 Account</Text>
        <Text style={s.emailText}>{session?.user?.email}</Text>
        <TouchableOpacity style={[s.actionBtn, s.dangerBtn]} onPress={handleSignOut}>
          <Text style={s.dangerBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={s.card}>
        <Text style={s.cardTitle}>ℹ️ About NutriCoach</Text>
        <Text style={s.aboutText}>
          Version 1.0.0 — Personal Use{'\n\n'}
          Built with React Native (Expo), Node.js, Supabase, and GPT-4o-mini.{'\n\n'}
          Food data from Open Food Facts (openfoodfacts.org){'\n'}
          — free, open, community-maintained.{'\n\n'}
          TDEE calculated using Mifflin-St Jeor formula.
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ProfileRow({ label, value, theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', textTransform: 'capitalize' }}>{value}</Text>
    </View>
  );
}

function TargetChip({ label, value, theme }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 10, padding: 8, margin: 2 }}>
      <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function SettingRow({ label, description, value, onToggle, theme }) {
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.primary + '80' }}
          thumbColor={value ? theme.primary : theme.textMuted}
        />
      </View>
      {description && (
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{description}</Text>
      )}
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  card: { backgroundColor: theme.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  profileGrid: { marginBottom: 12 },
  targetsRow: { flexDirection: 'row', marginBottom: 14 },
  editProfileBtn: {
    backgroundColor: theme.primary + '20', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: theme.primary,
  },
  editProfileBtnText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  aiInfo: { backgroundColor: theme.cardAlt, borderRadius: 10, padding: 12, marginTop: 10 },
  aiInfoText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  actionBtn: {
    backgroundColor: theme.cardAlt, borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: theme.border,
  },
  actionBtnText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  dangerBtn: { backgroundColor: theme.danger + '15', borderColor: theme.danger },
  dangerBtnText: { color: theme.danger, fontSize: 14, fontWeight: '700' },
  emailText: { color: theme.textSecondary, fontSize: 14, marginBottom: 12 },
  aboutText: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
});
