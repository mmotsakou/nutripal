import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal,
  TextInput,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { lookupBarcode } from '../services/api';
import { addFoodLog } from '../services/supabase';
import { updateStreak } from '../services/storage';
import { todayStr } from '../utils/helpers';

const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];

export default function BarcodeScreen() {
  const { theme, session } = useApp();
  const navigation = useNavigation();
  const s = styles(theme);
  const today = todayStr();

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [product, setProduct] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [servings, setServings] = useState('1');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  async function handleBarCodeScanned({ type, data }) {
    if (scanned || scanning) return;
    setScanned(true);
    setScanning(true);
    try {
      const { product: p } = await lookupBarcode(data);
      setProduct(p);
    } catch (err) {
      Alert.alert('Not Found', 'Product not found in database. Try searching manually.', [
        { text: 'OK', onPress: () => navigation.navigate('FoodSearch') },
        { text: 'Scan Again', onPress: () => setScanned(false) },
      ]);
    } finally {
      setScanning(false);
    }
  }

  async function handleAdd() {
    if (!product) return;
    const sv = parseFloat(servings) || 1;
    setAdding(true);
    try {
      await addFoodLog(session.user.id, {
        date: today,
        meal_type: mealType,
        food_name: product.name,
        brand: product.brand || '',
        serving_size: product.serving_size || '100g',
        servings: sv,
        calories: (product.calories || 0) * sv,
        protein: (product.protein || 0) * sv,
        carbs: (product.carbs || 0) * sv,
        fat: (product.fat || 0) * sv,
        fiber: (product.fiber || 0) * sv,
        source: 'barcode',
        barcode: product.barcode || '',
      });
      await updateStreak();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  }

  if (hasPermission === null) {
    return <View style={s.center}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📷</Text>
        <Text style={s.noPermText}>Camera permission required</Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          Enable camera access in your device settings to scan barcodes
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {!product ? (
        <View style={{ flex: 1 }}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Overlay */}
          <View style={s.overlay}>
            <View style={s.scanFrame} />
            <Text style={s.scanHint}>
              {scanning ? 'Looking up product...' : 'Point camera at barcode'}
            </Text>
            {scanning && <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />}
            {scanned && !scanning && (
              <TouchableOpacity style={s.rescanBtn} onPress={() => setScanned(false)}>
                <Text style={s.rescanBtnText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={s.productCard}>
          <Text style={s.productName}>{product.name}</Text>
          {product.brand && <Text style={s.productBrand}>{product.brand}</Text>}

          <View style={s.macroRow}>
            {[
              { label: 'Calories', value: Math.round((product.calories || 0) * (parseFloat(servings) || 1)) },
              { label: 'Protein', value: `${Math.round((product.protein || 0) * (parseFloat(servings) || 1))}g` },
              { label: 'Carbs', value: `${Math.round((product.carbs || 0) * (parseFloat(servings) || 1))}g` },
              { label: 'Fat', value: `${Math.round((product.fat || 0) * (parseFloat(servings) || 1))}g` },
            ].map(m => (
              <View key={m.label} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{m.value}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.label}>Servings (per {product.serving_size || '100g'})</Text>
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

          <View style={s.actions}>
            <TouchableOpacity style={s.scanAgainBtn} onPress={() => { setProduct(null); setScanned(false); }}>
              <Text style={s.scanAgainBtnText}>📷 Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.addButton} onPress={handleAdd} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.addButtonText}>✓ Add to Log</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg, padding: 32 },
  noPermText: { color: theme.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: '#22c55e',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  scanHint: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 24, textAlign: 'center' },
  rescanBtn: { backgroundColor: '#22c55e', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  rescanBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  productCard: {
    flex: 1, backgroundColor: theme.bg, padding: 20,
  },
  productName: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4 },
  productBrand: { color: theme.textMuted, fontSize: 15, marginBottom: 20 },
  macroRow: {
    flexDirection: 'row', backgroundColor: theme.card, borderRadius: 14,
    padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border,
  },
  label: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  servingInput: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    padding: 14, color: theme.text, fontSize: 18, fontWeight: '700',
    marginBottom: 16, textAlign: 'center',
  },
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  mealTypeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center' },
  mealTypeBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  mealTypeBtnText: { color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 10 },
  scanAgainBtn: {
    flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  scanAgainBtnText: { color: theme.text, fontSize: 15, fontWeight: '600' },
  addButton: { flex: 2, backgroundColor: theme.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
