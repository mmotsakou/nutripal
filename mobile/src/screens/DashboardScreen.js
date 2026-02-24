import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getFoodLogs, getWaterLogs, addWaterLog } from '../services/supabase';
import { getStreak, updateStreak } from '../services/storage';
import { sumMacros, todayStr, formatDate } from '../utils/helpers';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';

const WATER_AMOUNT_ML = 250; // one glass

export default function DashboardScreen() {
  const { theme, profile, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const today = todayStr();

  const [foodLogs, setFoodLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [fl, wl, st] = await Promise.all([
        getFoodLogs(session.user.id, today),
        getWaterLogs(session.user.id, today),
        getStreak(),
      ]);
      setFoodLogs(fl);
      setWaterLogs(wl);
      setStreak(st);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addWater() {
    try {
      await addWaterLog(session.user.id, today, WATER_AMOUNT_ML);
      const newStreak = await updateStreak();
      setStreak(newStreak);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  const macros = sumMacros(foodLogs);
  const waterTotal = waterLogs.reduce((sum, w) => sum + w.amount_ml, 0);
  const waterGlasses = Math.round(waterTotal / WATER_AMOUNT_ML);
  const waterTarget = 8;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting()}, {profile?.name || 'friend'} 👋</Text>
          <Text style={s.date}>{formatDate(new Date())}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={s.settingsBtn}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Streak banner */}
      {streak > 0 && (
        <View style={s.streakBanner}>
          <Text style={s.streakText}>🔥 {streak} day streak! Keep it up!</Text>
        </View>
      )}

      {/* Calorie ring + macros */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Today's Nutrition</Text>
        <View style={s.ringRow}>
          <CalorieRing
            consumed={macros.calories}
            target={profile?.tdee || 2000}
            theme={theme}
            size={160}
          />
          <View style={{ flex: 1, marginLeft: 20 }}>
            <MacroBar label="Protein" consumed={macros.protein} target={profile?.macro_protein || 150} color="#3b82f6" unit="g" theme={theme} />
            <MacroBar label="Carbs" consumed={macros.carbs} target={profile?.macro_carbs || 250} color="#f59e0b" unit="g" theme={theme} />
            <MacroBar label="Fat" consumed={macros.fat} target={profile?.macro_fat || 65} color="#ec4899" unit="g" theme={theme} />
            <MacroBar label="Fiber" consumed={macros.fiber} target={profile?.macro_fiber || 30} color="#8b5cf6" unit="g" theme={theme} />
          </View>
        </View>
      </View>

      {/* Water tracker */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>💧 Water Intake</Text>
          <Text style={s.cardMeta}>{waterTotal}ml / {waterTarget * WATER_AMOUNT_ML}ml</Text>
        </View>
        <View style={s.waterGlasses}>
          {Array.from({ length: waterTarget }).map((_, i) => (
            <Text key={i} style={{ fontSize: 22, opacity: i < waterGlasses ? 1 : 0.25 }}>💧</Text>
          ))}
        </View>
        <TouchableOpacity style={s.addWaterBtn} onPress={addWater}>
          <Text style={s.addWaterBtnText}>+ Add Glass (250ml)</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.quickActions}>
        <QuickAction emoji="📝" label="Log Food" onPress={() => navigation.navigate('Log')} theme={theme} />
        <QuickAction emoji="🍽️" label="Meal Plan" onPress={() => navigation.navigate('Meals')} theme={theme} />
        <QuickAction emoji="💬" label="Ask AI" onPress={() => navigation.navigate('Chat')} theme={theme} />
        <QuickAction emoji="📊" label="Progress" onPress={() => navigation.navigate('Progress')} theme={theme} />
      </View>

      {/* Today's meals preview */}
      {foodLogs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Today's Log</Text>
          <View style={s.card}>
            {foodLogs.slice(0, 5).map((log, i) => (
              <View key={log.id || i} style={[s.logRow, i < foodLogs.length - 1 && s.logRowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.logName} numberOfLines={1}>{log.food_name}</Text>
                  <Text style={s.logMeta}>{log.meal_type} · {Math.round(log.protein || 0)}g P · {Math.round(log.carbs || 0)}g C</Text>
                </View>
                <Text style={s.logCal}>{Math.round(log.calories || 0)} kcal</Text>
              </View>
            ))}
            {foodLogs.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate('Log')} style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{ color: theme.accent, fontSize: 14 }}>View all {foodLogs.length} entries →</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {foodLogs.length === 0 && (
        <View style={s.emptyLog}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🍴</Text>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Nothing logged yet today</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
            Tap "Log Food" to start tracking your meals
          </Text>
          <TouchableOpacity style={[s.addWaterBtn, { marginTop: 16 }]} onPress={() => navigation.navigate('Log')}>
            <Text style={s.addWaterBtnText}>Log My First Meal</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function QuickAction({ emoji, label, onPress, theme }) {
  return (
    <TouchableOpacity
      style={{
        flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 16,
        alignItems: 'center', borderWidth: 1, borderColor: theme.border,
      }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: theme.text },
  date: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
  settingsBtn: { padding: 8 },
  streakBanner: {
    backgroundColor: theme.card, borderRadius: 12, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center',
  },
  streakText: { color: theme.text, fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: theme.card, borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 12 },
  cardMeta: { fontSize: 13, color: theme.textSecondary },
  ringRow: { flexDirection: 'row', alignItems: 'center' },
  waterGlasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  addWaterBtn: {
    backgroundColor: theme.primary + '20', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  addWaterBtnText: { color: theme.primary, fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 10, marginTop: 4 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  logName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  logMeta: { color: theme.textMuted, fontSize: 12, marginTop: 1, textTransform: 'capitalize' },
  logCal: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyLog: { alignItems: 'center', padding: 32 },
});
