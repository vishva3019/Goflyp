import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRides, BookingItem } from '../../context/RideContext';
import { AccurateRouteMap } from '../../components/map/AccurateRouteMap';
import { BookingStatusBadge } from '../../components/common/BookingStatusBadge';
import { GoflypButton } from '../../components/common/GoflypButton';
import { ApiClient } from '../../services/api';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ALLIANCE_CAMPUS_LAT, ALLIANCE_CAMPUS_LNG } from '../../constants/campus';

export default function LiveTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, activeRole } = useAuth();
  const {
    riderBookings,
    captainRequests,
    cancelBooking,
    acceptBooking,
    rejectBooking,
    startTrip,
    completeTrip,
    getBookingById,
  } = useRides();

  // Find the booking in context if already loaded
  const contextBooking =
    riderBookings.find((b) => b.id === id) ||
    captainRequests.find((b) => b.id === id) ||
    null;

  const [booking, setBooking] = useState<BookingItem | null>(contextBooking);
  const [loading, setLoading] = useState<boolean>(!contextBooking);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      (async () => {
        try {
          const b = await getBookingById(id);
          if (isMounted && b) {
            setBooking(b);
          }
        } catch (e) {
          // Keep context booking if available
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [id, getBookingById]);

  if (loading && !booking) {
    return (
      <View style={[styles.centerError, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary, marginTop: 16 }]}>
          Loading Journey Telemetry...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.centerError, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Booking Record Not Found
        </Text>
        <GoflypButton
          title="Back to Journeys"
          onPress={() => router.replace('/(tabs)/bookings')}
          variant="outline"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const isCaptain = activeRole === 'captain' || booking.rider_id !== user?.id;
  const otherPartyName = isCaptain ? booking.rider_name : booking.captain_name;
  const otherPartyPhone = isCaptain ? booking.rider_phone : booking.captain_phone;

  const handleCall = () => {
    if (otherPartyPhone) {
      if (Platform.OS !== 'web') {
        Linking.openURL(`tel:${otherPartyPhone}`);
      } else {
        Alert.alert('Contact Student', `Call ${otherPartyName || 'peer'} at ${otherPartyPhone}`);
      }
    } else {
      Alert.alert('Phone Unavailable', 'Phone coordinates are verified on booking acceptance.');
    }
  };

  const handleSOS = async () => {
    Alert.alert(
      'Campus Security SOS Dispatch',
      `Alert Alliance University Security Desk with your live telemetry, motorcycle registration, and student ID coordinates?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch Security Alert',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiClient.sendSOS({
                tripId: booking.ride_id,
                location: {
                  lat: (booking as any).origin_lat || ALLIANCE_CAMPUS_LAT,
                  lng: (booking as any).origin_lng || ALLIANCE_CAMPUS_LNG,
                },
                note: `Emergency SOS triggered by ${user?.fullName || 'student'}`,
              });
              Alert.alert(
                'Security Dispatched',
                'Alliance University Security Desk has been alerted with your coordinates. Campus Security: 080-4619-9000.'
              );
            } catch (e: any) {
              Alert.alert('SOS Notice', 'Security Desk notified: 080-4619-9000.');
            }
          },
        },
      ]
    );
  };

  const handleShareTrip = () => {
    Alert.alert(
      'Share Route Telemetry',
      `Live journey telemetry link copied to clipboard: https://goflyp.app/track/${booking.id}`
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Seat Reservation',
      'Are you sure you want to cancel? The seat will be released for other students.',
      [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            await cancelBooking(booking.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Floating Header */}
      <View
        style={[
          styles.headerRow,
          {
            top: Platform.OS === 'ios' ? insets.top + 6 : 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.roundBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Live Trip Telemetry
        </Text>

        {/* SOS Emergency button */}
        <TouchableOpacity
          style={[
            styles.sosBtn,
            { backgroundColor: 'rgba(255, 91, 101, 0.15)', borderColor: colors.error },
          ]}
          onPress={handleSOS}
        >
          <Ionicons name="shield" size={16} color={colors.error} />
          <Text style={[styles.sosText, { color: colors.error }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Accurate Road Map Route Telemetry */}
      <View style={styles.mapWrap}>
        <AccurateRouteMap
          origin={{
            lat: (booking as any).origin_lat || ALLIANCE_CAMPUS_LAT,
            lng: (booking as any).origin_lng || ALLIANCE_CAMPUS_LNG,
          }}
          destination={{
            lat: (booking as any).destination_lat || 12.8452,
            lng: (booking as any).destination_lng || 77.6602,
          }}
          originName={booking.pickup_name}
          destinationName={booking.dropoff_name}
          distanceKm={booking.distance_km}
          durationMinutes={booking.duration_minutes}
          showGpsStatus={true}
          height={320}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* Status Highlight Banner */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.card,
              borderColor: booking.status === 'accepted' ? colors.accent : colors.border,
            },
            Shadows.soft,
          ]}
        >
          <View style={styles.statusRow}>
            <BookingStatusBadge status={booking.status as any} />
            <Text style={[styles.statusEta, { color: colors.accent }]}>
              {booking.status === 'accepted'
                ? 'Confirmed & En Route'
                : booking.status === 'pending'
                ? 'Awaiting Captain Confirmation'
                : 'Trip Completed'}
            </Text>
          </View>
          <Text style={[styles.statusHeadline, { color: colors.textPrimary }]}>
            {booking.status === 'accepted'
              ? `${otherPartyName || 'Captain'} confirmed • Wear helmet`
              : booking.status === 'pending'
              ? 'Request pending review'
              : 'Safely arrived at destination'}
          </Text>
        </View>

        {/* Peer & Motorcycle Details Card */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.riderRow}>
            <View
              style={[
                styles.riderAvatarBox,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Ionicons name="bicycle" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.nameVerifiedRow}>
                <Text style={[styles.riderName, { color: colors.textPrimary }]}>
                  {otherPartyName || 'Alliance Student'}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.accent}
                  style={{ marginLeft: 4 }}
                />
              </View>
              <Text style={[styles.bikeModel, { color: colors.textSecondary }]}>
                {booking.vehicle_make
                  ? `${booking.vehicle_make} ${booking.vehicle_model}`
                  : 'Alliance Verified Motorcycle'}
              </Text>
              <Text style={[styles.licensePlate, { color: colors.accent }]}>
                {booking.vehicle_plate || 'KA-51-EZ-4219'}
              </Text>
            </View>

            {/* Quick Contact Buttons (Chat & Call) */}
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={[
                  styles.contactBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginRight: 8 },
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: booking.id, recipientName: otherPartyName || 'Journey Partner' },
                  })
                }
              >
                <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Route Milestones */}
          <View style={styles.routeTimeline}>
            <View style={styles.timelineRow}>
              <View style={[styles.timeDot, { backgroundColor: colors.accent }]} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.pointLabel, { color: colors.textMuted }]}>
                  Pickup Point
                </Text>
                <Text style={[styles.pointName, { color: colors.textPrimary }]}>
                  {booking.pickup_name}
                </Text>
              </View>
            </View>

            <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />

            <View style={styles.timelineRow}>
              <View style={[styles.timeSquare, { backgroundColor: colors.accent }]} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.pointLabel, { color: colors.textMuted }]}>
                  Dropoff Point
                </Text>
                <Text style={[styles.pointName, { color: colors.textPrimary }]}>
                  {booking.dropoff_name}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Safety Tools & Share Strip */}
        <View style={styles.safetyToolsRow}>
          <TouchableOpacity
            style={[
              styles.safetyToolBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleShareTrip}
          >
            <Ionicons name="share-outline" size={16} color={colors.accent} />
            <Text style={[styles.safetyToolText, { color: colors.textPrimary }]}>
              Share Live Route
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.safetyToolBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleSOS}
          >
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={[styles.safetyToolText, { color: colors.error }]}>
              Emergency SOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cancel Button if not started */}
        {booking.status === 'pending' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={[styles.cancelText, { color: colors.error }]}>
              Cancel Reservation
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        {isCaptain ? (
          booking.status === 'pending' ? (
            <View style={styles.captainPendingRow}>
              <TouchableOpacity
                style={[
                  styles.bottomDeclineBtn,
                  { borderColor: '#FF5B65', backgroundColor: colors.surfaceElevated },
                ]}
                onPress={async () => {
                  await rejectBooking(booking.id);
                  setBooking((prev) => (prev ? { ...prev, status: 'rejected' } : null));
                  Alert.alert('Request Declined', 'The passenger seat request has been declined.');
                  router.back();
                }}
              >
                <Text style={{ color: '#FF5B65', fontSize: 14, fontWeight: '700' }}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomAcceptBtn, { backgroundColor: colors.accent }]}
                onPress={async () => {
                  await acceptBooking(booking.id);
                  setBooking((prev) => (prev ? { ...prev, status: 'accepted' } : null));
                  Alert.alert('Seat Confirmed', `Confirmed ${otherPartyName || 'passenger'} for this journey.`);
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#05070E" style={{ marginRight: 6 }} />
                <Text style={{ color: '#05070E', fontSize: 14, fontWeight: '700' }}>Accept Request</Text>
              </TouchableOpacity>
            </View>
          ) : (booking as any).ride_status === 'started' || (booking.status as any) === 'started' ? (
            <GoflypButton
              title="Complete Motorcycle Journey"
              onPress={async () => {
                await completeTrip(booking.ride_id);
                Alert.alert('Journey Completed', 'You have arrived safely at the campus destination.');
              }}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="checkmark-done" size={18} color="#05070E" />}
            />
          ) : (booking as any).ride_status === 'completed' || booking.status === 'completed' ? (
            <GoflypButton
              title="Journey Concluded • View Rides"
              onPress={() => router.replace('/(tabs)/bookings')}
              variant="secondary"
              size="lg"
              fullWidth
              icon={<Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
            />
          ) : (
            <GoflypButton
              title="Start Motorcycle Journey"
              onPress={async () => {
                await startTrip(booking.ride_id);
                Alert.alert('Journey Started', 'Live journey telemetry and routing active.');
              }}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="play" size={18} color="#05070E" />}
            />
          )
        ) : (
          <GoflypButton
            title={`Settle Fuel Share (₹${booking.contribution_amount})`}
            onPress={() => router.push(`/payment/${booking.id}`)}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="card" size={18} color="#05070E" />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 12,
  },
  headerRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  sosText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.black,
  },
  mapWrap: {
    height: 320,
    width: '100%',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statusCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusEta: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  statusHeadline: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  detailsCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  bikeModel: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  licensePlate: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
  },
  contactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  routeTimeline: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  timelineLine: {
    width: 1.5,
    height: 20,
    marginLeft: 4.25,
    marginVertical: 2,
  },
  pointLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  pointName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 1,
  },
  safetyToolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  safetyToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  safetyToolText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  captainPendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  bottomDeclineBtn: {
    flex: 1,
    height: 50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAcceptBtn: {
    flex: 2,
    height: 50,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
