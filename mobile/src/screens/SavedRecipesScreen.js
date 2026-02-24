import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getRecipes, deleteRecipe, toggleRecipeFavorite } from '../services/supabase';

export default function SavedRecipesScreen() {
  const { theme, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFavs, setShowFavs] = useState(false);

  useFocusEffect(useCallback(() => {
    load();
  }, [session]));

  async function load() {
    try {
      const data = await getRecipes(session.user.id);
      setRecipes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Delete Recipe', 'Remove this recipe from your collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteRecipe(id);
          setRecipes(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  }

  async function handleFavorite(recipe) {
    await toggleRecipeFavorite(recipe.id, !recipe.is_favorite);
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r));
  }

  const filtered = recipes
    .filter(r => showFavs ? r.is_favorite : true)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={theme.primary} />
    </View>;
  }

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search recipes..."
          placeholderTextColor={theme.textMuted}
        />
        <TouchableOpacity
          style={[s.favBtn, showFavs && s.favBtnActive]}
          onPress={() => setShowFavs(f => !f)}
        >
          <Text>⭐</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📚</Text>
            <Text style={s.emptyTitle}>{recipes.length === 0 ? 'No saved recipes yet' : 'No matches'}</Text>
            <Text style={s.emptySub}>
              {recipes.length === 0
                ? 'Generate recipes with the AI Chef or save meals from your plan'
                : 'Try a different search term'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate('RecipeDetail', { meal: {
              name: item.name,
              description: item.description,
              ingredients: item.ingredients,
              instructions: item.instructions,
              macros: item.macros,
              cuisine: item.cuisine,
              difficulty: item.difficulty,
              prep_time_min: item.prep_time,
              cook_time_min: item.cook_time,
            }})}
          >
            <View style={s.cardHeader}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleFavorite(item)}>
                  <Text style={{ fontSize: 18 }}>{item.is_favorite ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={{ fontSize: 18, color: theme.danger }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.cardMeta}>
              {item.cuisine && <Chip label={`🌍 ${item.cuisine}`} theme={theme} />}
              {item.difficulty && <Chip label={`⭐ ${item.difficulty}`} theme={theme} />}
              {item.macros?.calories && <Chip label={`${item.macros.calories} kcal`} theme={theme} />}
              {item.prep_time && item.cook_time && (
                <Chip label={`⏱ ${item.prep_time + item.cook_time} min`} theme={theme} />
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Chip({ label, theme }) {
  return (
    <View style={{ backgroundColor: theme.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.border }}>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  toolbar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  search: {
    flex: 1, backgroundColor: theme.bg, borderRadius: 10, padding: 10,
    color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border,
  },
  favBtn: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg },
  favBtnActive: { backgroundColor: '#fef08a', borderColor: '#ca8a04' },
  card: {
    backgroundColor: theme.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
