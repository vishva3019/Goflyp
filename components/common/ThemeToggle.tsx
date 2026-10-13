import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ThemeMode } from '../../types';
import { Typography, BorderRadius } from '../../constants/theme';

interface ThemeToggleProps {
  style?: ViewStyle;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ style }) => {
  const { mode, setMode, colors } = useTheme();

  const options: { id: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'dark', label: 'Dark', icon: 'moon' },
    { id: 'light', label: 'Light', icon: 'sunny' },
    { id: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isSelected = mode === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setMode(opt.id)}
            style={[
              styles.option,
              isSelected && {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.accent,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={opt.icon}
              size={16}
              color={isSelected ? colors.accent : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? colors.textPrimary : colors.textMuted,
                  fontWeight: isSelected
                    ? Typography.fontWeight.bold
                    : Typography.fontWeight.medium,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
  },
});
