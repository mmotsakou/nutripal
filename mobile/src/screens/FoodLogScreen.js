import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getFoodLogs, addFoodLog, deleteFoodLog } from '../services/supabase';
import { parseFoodText } from '../services/api';
import { updateStreak } from '../services/storage';
import { sumMacros, groupByMealType, todayStr } from '../utils/helpers';

const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];
const MEAL_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function FoodLogScreen() {
  const { theme, profile, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const today = todayStr();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiMealType, setAiMealType] = useState('lunch');
  const [parsing, setParsing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [session]));

  async function load() {
    try {
      const data = await getFoodLogs(session.user.id, today);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Remove Entry', 'Delete this food log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteFoodLog(id);
          setLogs(prev => prev.filter(l => l.id !== id));
        },
      },
    ]);
  }

  async function handleAIParse() {
    if (!aiText.trim()) { Alert.alert('Error', 'Please describe what you ate'); return; }
    setParsing(true);
    try {
      const parsed = await parseFoodText(aiText.trim());
      await addFoodLog(session.user.id, {
        date: today,
        meal_type: aiMealType,
        food_name: parsed.food_name || aiText,
        serving_size: parsed.serving_size || '',
        servings: parsed.servings || 1,
        calories: parsed.calories || 0,
        protein: parsed.protein || 0,
        carbs: parsed.carbs || 0,
        fat: parsed.fat || 0,
        fiber: parsed.fiber || 0,
        source: 'ai_parsed',
      });
      await updateStreak();
      setShowAIModal(false);
      setAiText('');
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setParsing(false);
    }
  }

  const grouped = groupByMealType(logs);
  const sections = MEAL_TYPES
    .filter(type => grouped[type]?.length > 0)
    .map(type => ({ title: type, data: grouped[type] }));

  const totals = sumMacros(logs);

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} />
    </View>;
  }

  return (
    <View style={s.container}>
      {/* Daily summary */}
      <View style={s.summaryCard}>
        <Text style={s.summaryTitle}>📊 Today's Summary</Text>
        <View style={s.summaryRow}>
          <SummaryNum label="Calories" value={Math.round(totals.calories)} target={profile?.tdee} theme={theme} />
          <SummaryNum label="Protein" value={`${Math.round(totals.protein)}g`} target={`${profile?.macro_protein}g`} theme={theme} />
          <SummaryNum label="Carbs" value={`${Math.round(totals.carbs)}g`} target={`${profile?.macro_carbs}g`} theme={theme} />
          <SummaryNum label="Fat" value={`${Math.round(totals.fat)}g`} target={`${profile?.macro_fat}g`} theme={theme} />
        </View>
      </View>

      {/* Add food buttons */}
      <View style={s.addButtons}>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('FoodSearch')}>
          <Text style={s.addBtnText}>🔍 Search Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('Barcode')}>
          <Text style={s.addBtnText}>📷 Scan Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAIModal(true)}>
          <Text style={s.addBtnText}>🤖 AI Parse</Text>
        </TouchableOpacity>
      </View>

      {/* Log list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>
              {MEAL_EMOJIS[section.title]} {section.title.charAt(0).toUpperCase() + section.title.slice(1)}
            </Text>
            <Text style={s.sectionHeaderCal}>
              {Math.round(section.data.reduce((s, l) => s + (l.calories || 0), 0))} kcal
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={s.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.logName} numberOfLines={1}>{item.food_name}</Text>
              <Text style={s.logMeta}>
                {item.brand ? `${item.brand} · ` : ''}
                {item.serving_size ? `${item.serving_size} · ` : ''}
                P: {Math.round(item.protein || 0)}g · C: {Math.round(item.carbs || 0)}g · F: {Math.round(item.fat || 0)}g
              </Text>
            </View>
            <View style={s.logRight}>
              <Text style={s.logCal}>{Math.round(item.calories || 0)}</Text>
              <Text style={s.logCalUnit}>kcal</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
                <Text style={{ fontSize: 16, color: theme.danger }}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🍴</Text>
            <Text style={s.emptyTitle}>Nothing logged today</Text>
            <Text style={s.emptySub}>Start tracking your meals to see your progress</Text>
          </View>
        }
      />

      {/* AI Parse Modal */}
      <Modal visible={showAIModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAIModal(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>🤖 AI Food Parser</Text>
            <TouchableOpacity onPress={() => setShowAIModal(false)}>
              <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>What did you eat?</Text>
          <TextInput
            style={s.aiInput}
            value={aiText}
            onChangeText={setAiText}
            placeholder="e.g. 2 scrambled eggs with toast and butter, large glass of OJ"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={4}
            autoFocus
          />

          <Text style={s.label}>Meal type</Text>
          <View style={s.mealTypeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.mealTypeBtn, aiMealType === t && s.mealTypeBtnActive]}
                onPress={() => setAiMealType(t)}
              >
                <Text style={[s.mealTypeBtnText, aiMealType === t && s.mealTypeBtnTextActive]}>
                  {MEAL_EMOJIS[t]} {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.parseBtn} onPress={handleAIParse} disabled={parsing}>
            {parsing ? <ActivityIndicator color="#fff" /> : <Text style={s.parseBtnText}>Parse & Log</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function SummaryNum({ label, value, target, theme }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
      {target && <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 1 }}>/ {target}</Text>}
      <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  summaryCard: {
    backgroundColor: theme.card, margin: 12, marginBottom: 8, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: theme.border,
  },
  summaryTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  summaryRow: { flexDirection: 'row' },
  addButtons: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  addBtn: {
    flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  addBtnText: { color: theme.text, fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, backgroundColor: theme.bg,
  },
  sectionHeaderText: { color: theme.text, fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  sectionHeaderCal: { color: theme.textSecondary, fontSize: 14 },
  logItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: theme.border,
  },
  logName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  logMeta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  logRight: { alignItems: 'flex-end' },
  logCal: { color: theme.text, fontSize: 16, fontWeight: '700' },
  logCalUnit: { color: theme.textMuted, fontSize: 11 },
  deleteBtn: { marginTop: 4, padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: theme.textSecondary, fontSize: 14, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  aiInput: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14,
    padding: 14, color: theme.text, fontSize: 15, minHeight: 100,
    textAlignVertical: 'top', marginBottom: 16,
  },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  mealTypeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  mealTypeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  mealTypeBtnText: { color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  mealTypeBtnTextActive: { color: '#fff', fontWeight: '600' },
  parseBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  parseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
