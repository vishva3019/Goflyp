import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius } from '../../constants/theme';

interface VerificationBadgeProps {
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  label = 'Student Verified',
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: 'rgba(32, 232, 90, 0.12)',
          borderColor: 'rgba(32, 232, 90, 0.35)',
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 10,
        },
        style,
      ]}
    >
      <Ionicons
        name="checkmark-circle"
        size={isSmall ? 12 : 14}
        color={colors.accent}
        style={{ marginRight: 4 }}
      />
      <Text
        style={[
          styles.text,
          {
            color: colors.accent,
            fontSize: isSmall ? Typography.fontSize.xs : Typography.fontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
