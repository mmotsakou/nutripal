import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Share, Modal, ActivityIndicator,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getCurrentGroceryList, updateGroceryList } from '../services/supabase';
import { getCachedGroceryList, cacheGroceryList } from '../services/storage';
import { categorizeIngredient } from '../utils/helpers';

const CATEGORIES = ['Produce','Proteins','Dairy & Alternatives','Grains','Pantry','Frozen','Snacks','Other'];

export default function GroceryScreen() {
  const { theme, session } = useApp();
  const s = styles(theme);
  const [listId, setListId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Other');

  useFocusEffect(useCallback(() => { load(); }, [session]));

  async function load() {
    try {
      const cached = await getCachedGroceryList();
      if (cached?.items) setItems(cached.items);

      const list = await getCurrentGroceryList(session.user.id);
      if (list) {
        setListId(list.id);
        setItems(list.items || []);
        await cacheGroceryList(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveItems(newItems) {
    setItems(newItems);
    if (listId) {
      try {
        await updateGroceryList(listId, newItems);
        await cacheGroceryList({ id: listId, items: newItems });
      } catch (err) {
        console.error(err);
      }
    }
  }

  function toggleItem(id) {
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveItems(updated);
  }

  function deleteItem(id) {
    saveItems(items.filter(item => item.id !== id));
  }

  function addCustomItem() {
    if (!newItemName.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      amount_g: 0,
      amount_household: '',
      category: newItemCategory,
      checked: false,
      custom: true,
    };
    saveItems([...items, newItem]);
    setNewItemName('');
    setShowAddModal(false);
  }

  function resetChecked() {
    Alert.alert('Reset Shopping List', 'Uncheck all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => saveItems(items.map(i => ({ ...i, checked: false }))) },
    ]);
  }

  async function handleShare() {
    const text = CATEGORIES
      .map(cat => {
        const catItems = items.filter(i => i.category === cat && !i.checked);
        if (!catItems.length) return null;
        return `\n${cat}:\n` + catItems.map(i =>
          `• ${i.name}${i.amount_household ? ` — ${i.amount_household}` : i.amount_g ? ` — ${i.amount_g}g` : ''}`
        ).join('\n');
      })
      .filter(Boolean)
      .join('\n');

    await Share.share({
      title: 'NutriCoach Grocery List',
      message: `🥦 NutriCoach Grocery List\n${text}`,
    });
  }

  async function handleExportPDF() {
    const html = `
      <html><body style="font-family: sans-serif; padding: 20px;">
      <h1>🥦 NutriCoach Grocery List</h1>
      ${CATEGORIES.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        if (!catItems.length) return '';
        return `<h2>${cat}</h2><ul>${catItems.map(i =>
          `<li style="${i.checked ? 'text-decoration:line-through;color:#999;' : ''}">
            ${i.name}${i.amount_household ? ` — ${i.amount_household}` : i.amount_g ? ` — ${i.amount_g}g` : ''}
          </li>`
        ).join('')}</ul>`;
      }).join('')}
      </body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  // Build sections by category
  const sections = CATEGORIES
    .map(cat => ({
      title: cat,
      data: items.filter(i => (i.category || categorizeIngredient(i.name)) === cat),
    }))
    .filter(s => s.data.length > 0);

  const total = items.length;
  const checked = items.filter(i => i.checked).length;

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} />
    </View>;
  }

  if (items.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>🛒</Text>
        <Text style={s.noListTitle}>No Grocery List</Text>
        <Text style={s.noListSub}>
          Generate a meal plan first — your grocery list will be automatically created from the ingredients.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>🛒 Grocery List</Text>
          <Text style={s.headerProgress}>{checked}/{total} items done</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
            <Text>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleExportPDF}>
            <Text>📄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={resetChecked}>
            <Text>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: theme.primary }]} onPress={() => setShowAddModal(true)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: theme.border, marginHorizontal: 16 }}>
        <View style={{ height: 4, backgroundColor: theme.primary, width: `${(checked / total) * 100}%` }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeaderText}>{section.title}</Text>
            <Text style={s.sectionHeaderCount}>
              {section.data.filter(i => !i.checked).length} left
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => toggleItem(item.id)}>
            <View style={[s.checkbox, item.checked && s.checkboxChecked]}>
              {item.checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemName, item.checked && s.itemNameDone]}>{item.name}</Text>
              {(item.amount_household || item.amount_g > 0) && (
                <Text style={s.itemAmount}>
                  {item.amount_household || `${item.amount_g}g`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => deleteItem(item.id)} style={s.deleteBtn}>
              <Text style={{ color: theme.danger, fontSize: 16 }}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* Add item modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Custom Item</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={s.textInput}
            value={newItemName}
            onChangeText={setNewItemName}
            placeholder="Item name..."
            placeholderTextColor={theme.textMuted}
            autoFocus
          />

          <Text style={s.label}>Category</Text>
          <View style={s.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catBtn, newItemCategory === cat && s.catBtnActive]}
                onPress={() => setNewItemCategory(cat)}
              >
                <Text style={[s.catBtnText, newItemCategory === cat && { color: '#fff' }]} numberOfLines={1}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.addBtn} onPress={addCustomItem} disabled={!newItemName.trim()}>
            <Text style={s.addBtnText}>Add to List</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  headerProgress: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  sectionHeaderText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  sectionHeaderCount: { color: theme.textMuted, fontSize: 13 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: theme.border,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: theme.border, marginRight: 12, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  itemName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  itemNameDone: { color: theme.textMuted, textDecorationLine: 'line-through' },
  itemAmount: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  noListTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  noListSub: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modal: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: '700' },
  textInput: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 14, color: theme.text, fontSize: 16, marginBottom: 16,
  },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
  },
  catBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  catBtnText: { color: theme.textSecondary, fontSize: 12 },
  addBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
