import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BookingStatus } from '../../types';
import { Typography, BorderRadius } from '../../constants/theme';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  style?: ViewStyle;
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, style }) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: 'checkmark-circle' as const,
          color: colors.success,
          bg: 'rgba(32, 232, 90, 0.15)',
          border: 'rgba(32, 232, 90, 0.4)',
        };
      case 'started':
        return {
          label: 'In Progress',
          icon: 'navigate' as const,
          color: '#38BDF8', // Cyan electric
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.4)',
        };
      case 'completed':
        return {
          label: 'Completed',
          icon: 'flag' as const,
          color: colors.success,
          bg: 'rgba(32, 232, 90, 0.12)',
          border: 'rgba(32, 232, 90, 0.3)',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: 'close-circle' as const,
          color: colors.error,
          bg: 'rgba(255, 91, 101, 0.15)',
          border: 'rgba(255, 91, 101, 0.35)',
        };
      case 'pending':
      default:
        return {
          label: 'Pending Approval',
          icon: 'time' as const,
          color: colors.warning,
          bg: 'rgba(245, 185, 66, 0.15)',
          border: 'rgba(245, 185, 66, 0.4)',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={12} color={config.color} style={{ marginRight: 5 }} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
});
