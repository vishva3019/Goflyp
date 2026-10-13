import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius } from '../../constants/theme';

interface ContributionBadgeProps {
  amount: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const ContributionBadge: React.FC<ContributionBadgeProps> = ({
  amount,
  label = 'Fuel share',
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.amount,
          {
            color: colors.textPrimary,
            fontSize: isLg
              ? Typography.fontSize.xxl
              : isSm
              ? Typography.fontSize.base
              : Typography.fontSize.lg,
          },
        ]}
      >
        ₹{amount}
      </Text>
      {label ? (
        <Text
          style={[
            styles.sublabel,
            {
              color: colors.textMuted,
              fontSize: isSm ? 10 : Typography.fontSize.xs,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  sublabel: {
    fontWeight: Typography.fontWeight.regular,
    marginTop: 1,
    letterSpacing: 0.1,
  },
});
