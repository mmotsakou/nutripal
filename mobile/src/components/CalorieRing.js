import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function CalorieRing({ consumed, target, size = 160, theme }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, consumed / (target || 1));
  const strokeDashoffset = circumference * (1 - progress);
  const pct = Math.round(progress * 100);
  const remaining = Math.max(0, target - consumed);
  const overTarget = consumed > target;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={overTarget ? theme.danger : theme.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center text */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800', lineHeight: 32 }}>
          {Math.round(consumed)}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 2 }}>
          of {target} kcal
        </Text>
        <Text style={{ color: overTarget ? theme.danger : theme.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>
          {overTarget ? `+${Math.round(consumed - target)} over` : `${Math.round(remaining)} left`}
        </Text>
      </View>
    </View>
  );
}
