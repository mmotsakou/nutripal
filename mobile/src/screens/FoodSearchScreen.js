import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { searchFood } from '../services/api';
import { addFoodLog } from '../services/supabase';
import { updateStreak } from '../services/storage';
import { todayStr } from '../utils/helpers';

const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];

export default function FoodSearchScreen() {
  const { theme, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const today = todayStr();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [servings, setServings] = useState('1');
  const [adding, setAdding] = useState(false);

  async function handleSearch(text) {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const { products } = await searchFood(text);
      setResults(products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd() {
    if (!selected) return;
    const sv = parseFloat(servings) || 1;
    setAdding(true);
    try {
      await addFoodLog(session.user.id, {
        date: today,
        meal_type: mealType,
        food_name: selected.name,
        brand: selected.brand || '',
        serving_size: selected.serving_size || '100g',
        servings: sv,
        calories: (selected.calories || 0) * sv,
        protein: (selected.protein || 0) * sv,
        carbs: (selected.carbs || 0) * sv,
        fat: (selected.fat || 0) * sv,
        fiber: (selected.fiber || 0) * sv,
        source: 'open_food_facts',
        barcode: selected.barcode || '',
      });
      await updateStreak();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search 3M+ foods... e.g. banana, greek yogurt"
          placeholderTextColor={theme.textMuted}
          autoFocus
          returnKeyType="search"
        />
        {searching && <ActivityIndicator color={theme.primary} style={{ marginLeft: 8 }} />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.barcode || String(i)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>No results for "{query}"</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>
                Try the AI parser for home-cooked meals
              </Text>
            </View>
          ) : query.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={s.emptyText}>Search the Open Food Facts database</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 8 }}>
                Over 3 million products — free, no account needed
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.resultItem} onPress={() => setSelected(item)}>
            <View style={{ flex: 1 }}>
              <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
              {item.brand && <Text style={s.resultBrand} numberOfLines={1}>{item.brand}</Text>}
              <Text style={s.resultMacros}>
                {Math.round(item.calories)} kcal · P: {Math.round(item.protein)}g · C: {Math.round(item.carbs)}g · F: {Math.round(item.fat)}g
              </Text>
              {item.serving_size && (
                <Text style={s.resultServing}>per {item.serving_size}</Text>
              )}
            </View>
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>Add</Text>
          </TouchableOpacity>
        )}
      />

      {/* Add modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={2}>{selected?.name}</Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {selected?.brand && <Text style={{ color: theme.textMuted, marginBottom: 12 }}>{selected.brand}</Text>}

          <View style={s.macroRow}>
            {[
              { label: 'Calories', value: Math.round((selected?.calories || 0) * (parseFloat(servings) || 1)) },
              { label: 'Protein', value: `${Math.round((selected?.protein || 0) * (parseFloat(servings) || 1))}g` },
              { label: 'Carbs', value: `${Math.round((selected?.carbs || 0) * (parseFloat(servings) || 1))}g` },
              { label: 'Fat', value: `${Math.round((selected?.fat || 0) * (parseFloat(servings) || 1))}g` },
            ].map(m => (
              <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{m.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.label}>Servings (per {selected?.serving_size || '100g'})</Text>
          <TextInput
            style={s.servingInput}
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.label}>Meal type</Text>
          <View style={s.mealTypeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[s.mealTypeBtn, mealType === t && s.mealTypeBtnActive]}
                onPress={() => setMealType(t)}
              >
                <Text style={[s.mealTypeBtnText, mealType === t && { color: '#fff', fontWeight: '600' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.addButton} onPress={handleAdd} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.addButtonText}>✓ Add to Log</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderBottomWidth: 1, borderBottomColor: theme.border, padding: 12,
  },
  input: {
    flex: 1, backgroundColor: theme.bg, borderRadius: 12, padding: 10,
    color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border,
  },
  resultName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  resultBrand: { color: theme.textMuted, fontSize: 12, marginTop: 1 },
  resultMacros: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  resultServing: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700', flex: 1, marginRight: 12 },
  macroRow: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  servingInput: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14, color: theme.text, fontSize: 18, fontWeight: '700',
    marginBottom: 16, textAlign: 'center',
  },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  mealTypeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center' },
  mealTypeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  mealTypeBtnText: { color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  addButton: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
