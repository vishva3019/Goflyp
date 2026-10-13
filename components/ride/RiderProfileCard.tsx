import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StudentUser, Vehicle } from '../../types';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { VerificationBadge } from '../common/VerificationBadge';

interface RiderProfileCardProps {
  rider: StudentUser;
  vehicle?: Vehicle;
  style?: ViewStyle;
}

export const RiderProfileCard: React.FC<RiderProfileCardProps> = ({
  rider,
  vehicle,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        Shadows.soft,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Image source={{ uri: rider.avatar }} style={styles.avatar} />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{rider.name}</Text>
            {rider.isStudentVerified && (
              <VerificationBadge label="Verified" size="sm" style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={[styles.dept, { color: colors.textSecondary }]}>
            {rider.department} • {rider.graduationYear}
          </Text>
          <Text style={[styles.university, { color: colors.textMuted }]}>
            {rider.university}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.statItem}>
          <View style={styles.ratingValRow}>
            <Ionicons name="star" size={14} color="#F5B942" />
            <Text style={[styles.statVal, { color: colors.textPrimary, marginLeft: 4 }]}>
              {rider.rating.toFixed(1)}
            </Text>
          </View>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Rating</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>
            {rider.completedTrips}
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Trips Done</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.accent }]}>
            {rider.co2SavedKg} kg
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>CO₂ Saved</Text>
        </View>
      </View>

      {/* Vehicle Info */}
      {vehicle && (
        <View style={styles.vehicleSection}>
          <View style={styles.vehicleRow}>
            <View
              style={[
                styles.vehicleIconCircle,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Ionicons name="bicycle" size={16} color={colors.accent} />
            </View>
            <View style={styles.vehicleMeta}>
              <Text style={[styles.vehicleModel, { color: colors.textPrimary }]}>
                {vehicle.make} {vehicle.model}
              </Text>
              <Text style={[styles.vehiclePlate, { color: colors.textMuted }]}>
                {vehicle.registrationNumber} • {vehicle.color}
              </Text>
            </View>
            {vehicle.verified && (
              <View
                style={[
                  styles.verifiedVehiclePill,
                  { backgroundColor: 'rgba(32, 232, 90, 0.1)' },
                ]}
              >
                <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
                <Text style={[styles.verifiedVehicleText, { color: colors.accent }]}>
                  RC Verified
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  dept: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  university: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  ratingValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statVal: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  statLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  vehicleSection: {
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vehicleMeta: {
    flex: 1,
  },
  vehicleModel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  vehiclePlate: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  verifiedVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  verifiedVehicleText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
});
