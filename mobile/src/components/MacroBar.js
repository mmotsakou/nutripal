import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MacroBar({ label, consumed, target, color, unit = 'g', theme }) {
  const pct = Math.min(1, consumed / (target || 1));
  const over = consumed > target;

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: over ? theme.danger : theme.text, fontSize: 13 }}>
          {Math.round(consumed)}/{target}{unit}
        </Text>
      </View>
      <View style={[s.track, { backgroundColor: theme.border }]}>
        <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: over ? theme.danger : color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
