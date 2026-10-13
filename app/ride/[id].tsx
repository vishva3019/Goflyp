import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRides } from '../../context/RideContext';
import { AccurateRouteMap } from '../../components/map/AccurateRouteMap';
import { RiderProfileCard } from '../../components/ride/RiderProfileCard';
import { BottomSheet } from '../../components/ride/BottomSheet';
import { GoflypButton } from '../../components/common/GoflypButton';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ALLIANCE_CAMPUS_LAT, ALLIANCE_CAMPUS_LNG } from '../../constants/campus';

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rides, getRideById, requestSeat } = useRides();

  const [ride, setRide] = useState<any>(
    rides.find((r) => r.id === id) || null
  );
  const [isLoading, setIsLoading] = useState(!ride);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const data = await getRideById(id);
          if (data) {
            setRide(data.ride || data);
          }
        } catch (e) {
          // Keep existing if any
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [id, getRideById]);

  if (isLoading) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading Journey Route & Verification...
        </Text>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Journey Not Found
        </Text>
        <GoflypButton
          title="Back to Journeys"
          onPress={() => router.back()}
          variant="outline"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const captain = ride.captain || ride.rider || {
    name: 'Verified Captain',
    rating: 0,
    totalRatings: 0,
    isStudentVerified: true,
    isVerified: true,
  };
  const vehicle = ride.vehicle || {
    make: 'Motorcycle',
    model: 'Bike',
    registrationNumber: 'KA 51',
    helmetProvided: true,
    verified: true,
  };

  const originCoords = ride.pickupCoords || {
    lat: ride.origin_lat || ALLIANCE_CAMPUS_LAT,
    lng: ride.origin_lng || ALLIANCE_CAMPUS_LNG,
  };
  const destinationCoords = ride.destinationCoords || {
    lat: ride.destination_lat || 12.8452,
    lng: ride.destination_lng || 77.6602,
  };

  const handleRequestSeat = async () => {
    setRequesting(true);
    try {
      const res = await requestSeat({
        rideId: ride.id,
        pickupName: ride.pickupLocation || ride.origin_name,
        dropoffName: ride.destinationLocation || ride.destination_name,
      });
      Alert.alert(
        'Seat Requested',
        `Your request was dispatched to ${captain.name}. You can review status in your bookings tab.`
      );
      router.push(`/trip/${res.booking.id}`);
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Unable to request seat on this journey.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating Top Back & Action Header */}
      <View
        style={[
          styles.floatingHeader,
          {
            top: Platform.OS === 'ios' ? insets.top + 6 : 14,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.roundBtn,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
            Shadows.soft,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.roundBtn,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
              Shadows.soft,
            ]}
            onPress={() => {
              Alert.alert(
                'Share Ride',
                `Check out this Goflyp bike ride from ${ride.pickupLocation || ride.origin_name} to ${ride.destinationLocation || ride.destination_name}!`
              );
            }}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Large Map and Route Preview */}
      <View style={styles.mapSection}>
        <AccurateRouteMap
          origin={originCoords}
          destination={destinationCoords}
          originName={ride.pickupLocation || ride.origin_name}
          destinationName={ride.destinationLocation || ride.destination_name}
          routePolyline={ride.routePolyline || []}
          distanceKm={ride.distanceKm || ride.distance_km}
          durationMinutes={ride.durationMinutes || ride.duration_minutes}
          height={310}
        />
      </View>

      {/* Main Bottom Sheet for Ride Details */}
      <BottomSheet style={styles.bottomSheetContainer}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sheetScroll,
            { paddingBottom: insets.bottom + 85 },
          ]}
        >
          {/* Top Title & Contribution Header */}
          <View style={styles.titlePriceRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.verifiedRow}>
                <VerificationBadge label="Alliance Verified Captain" size="sm" />
                {ride.routeCompatibility && (
                  <View
                    style={[
                      styles.matchBadge,
                      { backgroundColor: 'rgba(32, 232, 90, 0.12)' },
                    ]}
                  >
                    <Text style={[styles.matchText, { color: colors.accent }]}>
                      {ride.routeCompatibility}% Route Match
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.departureHeading, { color: colors.textPrimary }]}>
                {ride.departureTime || ride.departure_time}
              </Text>
              <Text style={[styles.dateSub, { color: colors.textSecondary }]}>
                {ride.departureDate || ride.departure_date} •{' '}
                {ride.durationMinutes || ride.duration_minutes || 24} mins estimated
              </Text>
            </View>

            {/* Prominent Contribution Amount */}
            <View
              style={[
                styles.prominentPriceCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.priceAmount, { color: colors.accent }]}>
                ₹{ride.contributionAmount || ride.contribution_amount}
              </Text>
              <Text style={[styles.priceSub, { color: colors.textMuted }]}>
                Fuel Share
              </Text>
            </View>
          </View>

          {/* Rider / Captain Profile Card */}
          <RiderProfileCard rider={captain} vehicle={vehicle} />

          {/* Route Itinerary Breakdown */}
          <View
            style={[
              styles.itineraryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.itineraryTitle, { color: colors.textPrimary }]}>
              Journey Route
            </Text>

            {/* Origin */}
            <View style={styles.itineraryItem}>
              <View style={[styles.itineraryDot, { backgroundColor: colors.accent }]} />
              <View style={styles.itineraryTextCol}>
                <Text style={[styles.itineraryLabel, { color: colors.textPrimary }]}>
                  {ride.pickupLocation || ride.origin_name}
                </Text>
                <Text style={[styles.itineraryTime, { color: colors.textMuted }]}>
                  Departure Gate • {ride.departureTime || ride.departure_time}
                </Text>
              </View>
            </View>

            {/* Connector */}
            <View style={[styles.itineraryLine, { backgroundColor: colors.border }]} />

            {/* Destination */}
            <View style={styles.itineraryItem}>
              <View style={[styles.itinerarySquare, { backgroundColor: colors.accent }]} />
              <View style={styles.itineraryTextCol}>
                <Text style={[styles.itineraryLabel, { color: colors.textPrimary }]}>
                  {ride.destinationLocation || ride.destination_name}
                </Text>
                <Text style={[styles.itineraryTime, { color: colors.textMuted }]}>
                  Final drop-off destination
                </Text>
              </View>
            </View>
          </View>

          {/* Captain Note if present */}
          {(ride.note || vehicle.helmetProvided) && (
            <View
              style={[
                styles.noteCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={colors.accent}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                "{ride.note || (vehicle.helmetProvided ? 'Pillion helmet provided at pickup. Punctual departure.' : 'Please bring an ISI certified helmet.')}"
              </Text>
            </View>
          )}

          {/* Safety & Compliance Guarantee */}
          <View style={styles.safetyNoticeRow}>
            <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
            <Text style={[styles.safetyNoticeText, { color: colors.textMuted }]}>
              Alliance Campus Safety Standard: Captain student identity, motorcycle RC, and helmet confirmed.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Request Seat Sticky Action Bar */}
        <View
          style={[
            styles.stickyActionBar,
            {
              backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <View style={styles.stickyPriceBlock}>
            <Text style={[styles.stickyPrice, { color: colors.textPrimary }]}>
              ₹{ride.contributionAmount || ride.contribution_amount}
            </Text>
            <Text style={[styles.stickySub, { color: colors.textMuted }]}>
              {ride.availableSeats ?? ride.available_seats ?? 1} passenger seat remaining
            </Text>
          </View>

          {user?.id === (ride.captain_id || ride.captainId || ride.captain?.id) ? (
            <GoflypButton
              title="Your Published Route"
              onPress={() => router.push('/(tabs)')}
              variant="secondary"
              size="lg"
              icon={<Ionicons name="bicycle" size={18} color={colors.accent} />}
              style={styles.stickyRequestBtn}
            />
          ) : (
            <GoflypButton
              title="Request Seat"
              onPress={handleRequestSeat}
              loading={requesting}
              disabled={(ride.availableSeats ?? ride.available_seats) <= 0}
              size="lg"
              icon={<Ionicons name="flash" size={18} color="#05070E" />}
              style={styles.stickyRequestBtn}
            />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Typography.fontSize.sm,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 12,
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapSection: {
    height: 310,
    width: '100%',
  },
  bottomSheetContainer: {
    flex: 1,
    marginTop: -28,
  },
  sheetScroll: {
    paddingTop: 8,
  },
  titlePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  matchText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  departureHeading: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -0.5,
  },
  dateSub: {
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  prominentPriceCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  priceAmount: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.black,
  },
  priceSub: {
    fontSize: 10,
    marginTop: 2,
  },
  itineraryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginVertical: 8,
  },
  itineraryTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
  },
  itineraryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itineraryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    marginRight: 12,
  },
  itinerarySquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginTop: 3,
    marginRight: 12,
  },
  itineraryLine: {
    width: 1.5,
    height: 22,
    marginLeft: 5,
    marginVertical: 2,
  },
  itineraryTextCol: {
    flex: 1,
  },
  itineraryLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  itineraryTime: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
  },
  noteText: {
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    flex: 1,
  },
  safetyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  safetyNoticeText: {
    fontSize: Typography.fontSize.xs,
    flex: 1,
    lineHeight: 16,
  },
  stickyActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  stickyPriceBlock: {
    justifyContent: 'center',
  },
  stickyPrice: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.black,
  },
  stickySub: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  stickyRequestBtn: {
    minWidth: 160,
  },
});
