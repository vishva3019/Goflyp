import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Ride } from '../../types';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { VerificationBadge } from '../common/VerificationBadge';
import { ContributionBadge } from '../common/ContributionBadge';
import { GoflypButton } from '../common/GoflypButton';

interface RideCardProps {
  ride: Ride;
  isSelected?: boolean;
  onSelect?: () => void;
  onRequestSeat?: () => void;
  showRequestButton?: boolean;
  style?: ViewStyle;
}

export const RideCard: React.FC<RideCardProps> = ({
  ride,
  isSelected = false,
  onSelect,
  onRequestSeat,
  showRequestButton = true,
  style,
}) => {
  const { colors, isDark } = useTheme();

  const captain = (ride as any).captain || (ride as any).rider || {
    name: 'Verified Captain',
    rating: 0,
    totalRatings: 0,
    isStudentVerified: true,
    isVerified: true,
  };
  const vehicle = ride.vehicle || {
    make: 'Motorcycle',
    model: 'Bike',
    helmetProvided: true,
  };
  const durationText = (ride as any).durationMinutes
    ? `${(ride as any).durationMinutes} min`
    : (ride as any).estimatedDuration || '25 min';
  const distanceText = (ride as any).distanceKm
    ? `${(ride as any).distanceKm} km`
    : (ride as any).distance || '12 km';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onSelect}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.accent : colors.border,
          borderWidth: isSelected ? 1.5 : 1,
        },
        isSelected && isDark ? Shadows.glowGreen : Shadows.soft,
        style,
      ]}
    >
      {/* Top Bar: Rider Quick Profile & Route Match */}
      <View style={styles.topRow}>
        <View style={styles.riderInfo}>
          {captain.avatar ? (
            <Image source={{ uri: captain.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarInitial}>
                {captain.name ? captain.name.charAt(0).toUpperCase() : 'C'}
              </Text>
            </View>
          )}
          <View style={styles.riderMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.riderName, { color: colors.textPrimary }]}>
                {captain.name}
              </Text>
              {(captain.isStudentVerified ?? captain.isVerified) && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.accent}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <View style={styles.subMetaRow}>
              {captain.totalRatings && captain.totalRatings > 0 ? (
                <>
                  <Ionicons name="star" size={12} color="#F5B942" />
                  <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                    {(captain.rating || 5.0).toFixed(1)} ({captain.totalRatings})
                  </Text>
                </>
              ) : (
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  New Captain
                </Text>
              )}
              {vehicle.make && (
                <>
                  <Text style={[styles.dotDivider, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.vehicleText, { color: colors.textMuted }]}>
                    {vehicle.make} {vehicle.model ? vehicle.model.split(' ')[0] : ''}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Route Compatibility & Price */}
        <View style={styles.topRight}>
          <ContributionBadge amount={ride.contributionAmount} size="md" />
        </View>
      </View>

      {/* Middle: Route & Times */}
      <View
        style={[
          styles.routeContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Departure info */}
        <View style={styles.departureHeader}>
          <View style={styles.departureTimeBadge}>
            <Ionicons name="time-outline" size={13} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.departureTime, { color: colors.accent }]}>
              {ride.departureTime}
            </Text>
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              ({durationText} • {distanceText})
            </Text>
          </View>

          {ride.routeCompatibility && (
            <View style={[styles.matchBadge, { backgroundColor: 'rgba(32, 232, 90, 0.12)' }]}>
              <Text style={[styles.matchText, { color: colors.accent }]}>
                {ride.routeCompatibility}% Match
              </Text>
            </View>
          )}
        </View>

        {/* Locations */}
        <View style={styles.locationsBlock}>
          <View style={styles.locationRow}>
            <View style={[styles.pinDot, { backgroundColor: colors.accent }]} />
            <Text
              style={[styles.locationName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {ride.pickupLocation}
            </Text>
          </View>

          <View style={[styles.routeLine, { backgroundColor: colors.border }]} />

          <View style={styles.locationRow}>
            <View style={[styles.destDot, { backgroundColor: colors.accent }]} />
            <Text
              style={[styles.locationName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {ride.destinationLocation}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Bar: Seat Availability, Helmet Info, and Request Button */}
      <View style={styles.bottomBar}>
        <View style={styles.safetyTags}>
          <View style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="person" size={11} color={colors.textSecondary} />
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              {ride.availableSeats > 0 ? `${ride.availableSeats} seat left` : 'Full'}
            </Text>
          </View>
          {ride.vehicle.helmetProvided && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceElevated, marginLeft: 6 }]}>
              <Ionicons name="shield-checkmark-outline" size={11} color={colors.accent} />
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                Helmet Ready
              </Text>
            </View>
          )}
        </View>

        {showRequestButton && onRequestSeat && (
          <GoflypButton
            title="Request Seat"
            onPress={onRequestSeat}
            size="sm"
            disabled={ride.availableSeats <= 0}
            style={styles.requestButton}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  riderMeta: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 3,
    fontWeight: Typography.fontWeight.semibold,
  },
  dotDivider: {
    marginHorizontal: 5,
    fontSize: Typography.fontSize.xs,
  },
  vehicleText: {
    fontSize: Typography.fontSize.xs,
  },
  topRight: {
    alignItems: 'flex-end',
  },
  routeContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.md,
  },
  departureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  departureTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departureTime: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 6,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  matchText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  locationsBlock: {
    paddingLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  destDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 10,
  },
  routeLine: {
    width: 1.5,
    height: 12,
    marginLeft: 3.25,
    marginVertical: 2,
  },
  locationName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safetyTags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  requestButton: {
    minWidth: 110,
  },
});
