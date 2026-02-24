import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getProgressLogs, addProgressLog, uploadProgressPhoto, getFoodLogRange } from '../services/supabase';
import { getWeeklySummary } from '../services/api';
import { todayStr, lastNDays, round1 } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

const MOOD_EMOJIS = ['😞','😕','😐','🙂','😄'];
const ENERGY_EMOJIS = ['😴','😩','😐','⚡','🔥'];

export default function ProgressScreen() {
  const { theme, profile, session } = useApp();
  const s = styles(theme);
  const today = todayStr();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState('');

  // Form state
  const [weight, setWeight] = useState('');
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState({
    waist_cm: '', hips_cm: '', chest_cm: '', arms_cm: '',
  });

  useFocusEffect(useCallback(() => { load(); }, [session]));

  async function load() {
    try {
      const data = await getProgressLogs(session.user.id, 90);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entry = {
        date: today,
        weight_kg: weight ? parseFloat(weight) : null,
        energy,
        mood,
        notes: notes.trim() || null,
        measurements: Object.fromEntries(
          Object.entries(measurements)
            .filter(([, v]) => v)
            .map(([k, v]) => [k, parseFloat(v)])
        ),
      };
      await addProgressLog(session.user.id, entry);
      setShowLogModal(false);
      setWeight(''); setNotes('');
      setMeasurements({ waist_cm: '', hips_cm: '', chest_cm: '', arms_cm: '' });
      load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await uploadProgressPhoto(session.user.id, result.assets[0].uri, today);
        Alert.alert('Photo saved!', 'Progress photo uploaded successfully.');
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    }
  }

  async function handleWeeklySummary() {
    if (!profile) return;
    setLoadingSummary(true);
    try {
      const sevenDaysAgo = lastNDays(7)[0];
      const foodLogs = await getFoodLogRange(session.user.id, sevenDaysAgo, today);
      const recentProgress = logs.slice(-7);
      const { summary } = await getWeeklySummary({ foodLogs, progressLogs: recentProgress }, profile);
      setWeeklySummary(summary);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingSummary(false);
    }
  }

  // Chart data
  const weightLogs = logs.filter(l => l.weight_kg).slice(-12);
  const hasWeightData = weightLogs.length >= 2;

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 1,
    color: () => theme.primary,
    labelColor: () => theme.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: theme.primary },
  };

  const latestLog = logs[logs.length - 1];
  const startWeight = profile?.weight_kg;
  const goalWeight = profile?.goal_weight_kg;
  const currentWeight = latestLog?.weight_kg;
  const weightLost = startWeight && currentWeight ? round1(startWeight - currentWeight) : null;

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} />
    </View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Stats cards */}
      <View style={s.statsRow}>
        {currentWeight && (
          <StatCard label="Current Weight" value={`${currentWeight}kg`} icon="⚖️" theme={theme} />
        )}
        {goalWeight && (
          <StatCard label="Goal Weight" value={`${goalWeight}kg`} icon="🎯" theme={theme} />
        )}
        {weightLost !== null && (
          <StatCard
            label={weightLost >= 0 ? 'Weight Lost' : 'Weight Gained'}
            value={`${Math.abs(weightLost)}kg`}
            icon={weightLost >= 0 ? '📉' : '📈'}
            theme={theme}
          />
        )}
      </View>

      {/* Weight chart */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📊 Weight Trend</Text>
        {hasWeightData ? (
          <LineChart
            data={{
              labels: weightLogs.map((l, i) => i % 2 === 0 ? l.date?.slice(5) || '' : ''),
              datasets: [{ data: weightLogs.map(l => l.weight_kg) }],
            }}
            width={CHART_WIDTH}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: 12, marginHorizontal: -8 }}
            withInnerLines={false}
          />
        ) : (
          <View style={s.noChart}>
            <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
              Log your weight to see the trend chart{'\n'}(need at least 2 entries)
            </Text>
          </View>
        )}
      </View>

      {/* Mood & Energy history */}
      {logs.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>😊 Recent Mood & Energy</Text>
          {logs.slice(-7).reverse().map((log, i) => (
            <View key={i} style={s.logRow}>
              <Text style={s.logDate}>{log.date?.slice(5)}</Text>
              {log.weight_kg && <Text style={s.logWeight}>{log.weight_kg}kg</Text>}
              <Text style={{ fontSize: 18 }}>{ENERGY_EMOJIS[(log.energy || 3) - 1]}</Text>
              <Text style={{ fontSize: 18 }}>{MOOD_EMOJIS[(log.mood || 3) - 1]}</Text>
            </View>
          ))}
        </View>
      )}

      {/* AI Weekly Summary */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🤖 AI Weekly Analysis</Text>
        {weeklySummary ? (
          <Text style={s.summaryText}>{weeklySummary}</Text>
        ) : (
          <View>
            <Text style={s.summaryHint}>
              Get personalized feedback on your week's nutrition and progress
            </Text>
            <TouchableOpacity style={s.summaryBtn} onPress={handleWeeklySummary} disabled={loadingSummary}>
              {loadingSummary
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.summaryBtnText}>✨ Generate Weekly Summary</Text>}
            </TouchableOpacity>
          </View>
        )}
        {weeklySummary && (
          <TouchableOpacity style={[s.summaryBtn, { marginTop: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            onPress={handleWeeklySummary} disabled={loadingSummary}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>🔄 Regenerate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Measurements section */}
      {latestLog?.measurements && Object.keys(latestLog.measurements).length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>📏 Latest Measurements</Text>
          {Object.entries(latestLog.measurements).map(([key, val]) => (
            <View key={key} style={s.measureRow}>
              <Text style={s.measureLabel}>{key.replace(/_cm/, '').replace(/_/g, ' ')}</Text>
              <Text style={s.measureVal}>{val} cm</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity style={s.logBtn} onPress={() => setShowLogModal(true)}>
          <Text style={s.logBtnText}>⚖️ Log Weight & Mood</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.photoBtn} onPress={handlePickPhoto}>
          <Text style={s.photoBtnText}>📸 Progress Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Log modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogModal(false)}>
        <ScrollView style={s.modal} contentContainerStyle={{ padding: 20 }}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>📊 Log Progress</Text>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Weight ({profile?.units === 'imperial' ? 'lbs' : 'kg'})</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="e.g. 75.5"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.label}>Energy level</Text>
          <View style={s.emojiRow}>
            {ENERGY_EMOJIS.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                style={[s.emojiBtn, energy === i + 1 && s.emojiBtnActive]}
                onPress={() => setEnergy(i + 1)}
              >
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Mood</Text>
          <View style={s.emojiRow}>
            {MOOD_EMOJIS.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                style={[s.emojiBtn, mood === i + 1 && s.emojiBtnActive]}
                onPress={() => setMood(i + 1)}
              >
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Measurements (optional, cm)</Text>
          {[['waist_cm','Waist'],['hips_cm','Hips'],['chest_cm','Chest'],['arms_cm','Arms']].map(([key, label]) => (
            <View key={key} style={s.measureInputRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, width: 50 }}>{label}</Text>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={measurements[key]}
                onChangeText={v => setMeasurements(m => ({ ...m, [key]: v }))}
                keyboardType="numeric"
                placeholder="cm"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          ))}

          <Text style={[s.label, { marginTop: 12 }]}>Notes (optional)</Text>
          <TextInput
            style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling? Any observations?"
            placeholderTextColor={theme.textMuted}
            multiline
          />

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Entry</Text>}
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </Modal>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, icon, theme }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border }}>
      <Text style={{ fontSize: 22, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  card: { backgroundColor: theme.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  noChart: { height: 120, justifyContent: 'center', alignItems: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  logDate: { color: theme.textMuted, fontSize: 13, width: 40 },
  logWeight: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
  summaryText: { color: theme.text, fontSize: 14, lineHeight: 22 },
  summaryHint: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  summaryBtn: { backgroundColor: theme.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  measureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  measureLabel: { color: theme.textSecondary, fontSize: 14, textTransform: 'capitalize' },
  measureVal: { color: theme.text, fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  logBtn: { flex: 2, backgroundColor: theme.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  photoBtn: { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  photoBtnText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: theme.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 14, color: theme.text, fontSize: 15, marginBottom: 16,
  },
  emojiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  emojiBtn: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  emojiBtnActive: { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
  measureInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
