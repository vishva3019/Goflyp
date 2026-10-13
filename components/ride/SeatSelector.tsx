import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Spacing } from '../../constants/theme';

interface SeatSelectorProps {
  selectedSeats: number;
  maxSeats?: number;
  onSeatChange: (seats: number) => void;
  helmetProvided: boolean;
  onHelmetToggle?: (provided: boolean) => void;
  style?: ViewStyle;
}

export const SeatSelector: React.FC<SeatSelectorProps> = ({
  selectedSeats,
  maxSeats = 1,
  onSeatChange,
  helmetProvided,
  onHelmetToggle,
  style,
}) => {
  const { colors } = useTheme();

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
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Motorcycle Seating
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Student Bike Sharing • 1 Pillion Seat Available
          </Text>
        </View>
        <View
          style={[
            styles.modeBadge,
            { backgroundColor: 'rgba(32, 232, 90, 0.12)' },
          ]}
        >
          <Ionicons name="bicycle" size={14} color={colors.accent} />
          <Text style={[styles.modeText, { color: colors.accent }]}>Bike Pool</Text>
        </View>
      </View>

      {/* Visual Bike Seat Diagram */}
      <View
        style={[
          styles.diagramContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Front Rider Seat (Occupied by rider) */}
        <View style={styles.seatColumn}>
          <View
            style={[
              styles.seatNode,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="person" size={18} color={colors.textMuted} />
          </View>
          <Text style={[styles.seatRole, { color: colors.textMuted }]}>Rider (Front)</Text>
          <Text style={[styles.seatStatus, { color: colors.textMuted }]}>Occupied</Text>
        </View>

        {/* Motorcycle Chasis Connector */}
        <View style={[styles.chasisLine, { backgroundColor: colors.accent }]} />

        {/* Rear Pillion Seat (Selectable) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSeatChange(selectedSeats > 0 ? 0 : 1)}
          style={styles.seatColumn}
        >
          <View
            style={[
              styles.seatNode,
              {
                backgroundColor: selectedSeats > 0 ? colors.accent : colors.background,
                borderColor: selectedSeats > 0 ? colors.accent : colors.border,
              },
            ]}
          >
            <Ionicons
              name="person"
              size={18}
              color={selectedSeats > 0 ? '#000000' : colors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.seatRole,
              {
                color: selectedSeats > 0 ? colors.accent : colors.textSecondary,
                fontWeight: selectedSeats > 0 ? Typography.fontWeight.bold : Typography.fontWeight.medium,
              },
            ]}
          >
            Passenger Pillion
          </Text>
          <Text
            style={[
              styles.seatStatus,
              { color: selectedSeats > 0 ? colors.accent : colors.textMuted },
            ]}
          >
            {selectedSeats > 0 ? 'Selected (1 Seat)' : 'Tap to Select'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helmet Info / Toggle */}
      {onHelmetToggle && (
        <TouchableOpacity
          style={[
            styles.helmetToggleRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onHelmetToggle(!helmetProvided)}
        >
          <View style={styles.helmetLeft}>
            <Ionicons
              name={helmetProvided ? 'shield-checkmark' : 'shield-outline'}
              size={20}
              color={helmetProvided ? colors.accent : colors.textMuted}
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.helmetTitle, { color: colors.textPrimary }]}>
                Provide Sanitized Helmet
              </Text>
              <Text style={[styles.helmetSubtitle, { color: colors.textMuted }]}>
                Recommended for rider safety & campus compliance
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.switchTrack,
              {
                backgroundColor: helmetProvided ? colors.accent : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                {
                  transform: [{ translateX: helmetProvided ? 18 : 2 }],
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  modeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  diagramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  seatColumn: {
    alignItems: 'center',
  },
  seatNode: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  seatRole: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  seatStatus: {
    fontSize: 10,
    marginTop: 2,
  },
  chasisLine: {
    height: 3,
    width: 50,
    borderRadius: 1.5,
    marginTop: -20,
  },
  helmetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginTop: Spacing.md,
  },
  helmetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  helmetTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  helmetSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
});
