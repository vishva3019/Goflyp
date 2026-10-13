import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRides } from '../../context/RideContext';
import { Header } from '../../components/layout/Header';
import { BookingStatusBadge } from '../../components/common/BookingStatusBadge';
import { GoflypButton } from '../../components/common/GoflypButton';
import { EmptyState } from '../../components/common/EmptyState';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function BookingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, activeRole, setActiveRole } = useAuth();
  const {
    riderBookings,
    captainRides,
    fetchBookings,
    fetchCaptainData,
    cancelBooking,
    startTrip,
    completeTrip,
  } = useRides();

  const [activeTab, setActiveTab] = useState<'passenger' | 'captain'>(
    activeRole === 'captain' ? 'captain' : 'passenger'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'captain' && activeRole === 'captain') {
        await fetchCaptainData();
      } else if (activeTab === 'passenger' && activeRole === 'rider') {
        await fetchBookings();
      } else if (activeRole === 'captain') {
        await fetchCaptainData();
      } else {
        await fetchBookings();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeRiderBookings = riderBookings.filter(
    (b) => b.status === 'accepted' || b.status === 'pending'
  );
  const pastRiderBookings = riderBookings.filter(
    (b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected'
  );

  const handleCall = (phone?: string, name?: string) => {
    if (!phone) {
      Alert.alert('Phone Unavailable', 'Phone coordinate is available once booking is accepted.');
      return;
    }
    Alert.alert('Call Contact', `Calling ${name || 'Student'} at ${phone}...`);
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel your seat reservation?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(bookingId);
              Alert.alert('Cancelled', 'Your seat request has been cancelled.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to cancel booking.');
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 8,
        },
      ]}
    >
      <Header title="My Journeys & Requests" showBack={false} />

      {/* Segment Switcher: Passenger Bookings vs Captain Rides */}
      <View style={styles.segmentContainer}>
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'passenger' && {
                backgroundColor: colors.surfaceElevated,
                borderColor: '#38BDF8',
                borderWidth: 1,
              },
            ]}
            onPress={() => setActiveTab('passenger')}
          >
            <Ionicons
              name="person"
              size={14}
              color={activeTab === 'passenger' ? '#38BDF8' : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'passenger' ? colors.textPrimary : colors.textMuted,
                  fontWeight: activeTab === 'passenger' ? 'bold' : 'normal',
                },
              ]}
            >
              As Rider ({riderBookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'captain' && {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.accent,
                borderWidth: 1,
              },
            ]}
            onPress={() => setActiveTab('captain')}
          >
            <Ionicons
              name="bicycle"
              size={14}
              color={activeTab === 'captain' ? colors.accent : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                {
                  color: activeTab === 'captain' ? colors.textPrimary : colors.textMuted,
                  fontWeight: activeTab === 'captain' ? 'bold' : 'normal',
                },
              ]}
            >
              As Captain ({captainRides.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {activeTab === 'passenger' ? (
          <>
            {/* Active Rider Bookings */}
            {activeRiderBookings.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Active Bookings
                  </Text>
                  <View style={[styles.liveIndicator, { backgroundColor: colors.accent }]} />
                </View>

                {activeRiderBookings.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.bookingCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: b.status === 'accepted' ? colors.accent : colors.border,
                      },
                      b.status === 'accepted' && isDark ? Shadows.glowGreen : Shadows.soft,
                    ]}
                  >
                    {/* Status & Price Row */}
                    <View style={styles.cardTopRow}>
                      <BookingStatusBadge status={b.status as any} />
                      <Text style={[styles.priceTag, { color: colors.accent }]}>
                        ₹{b.contribution_amount}
                      </Text>
                    </View>

                    {/* Route Details */}
                    <View style={styles.routeSection}>
                      <View style={styles.routePoint}>
                        <View style={[styles.dotPickup, { backgroundColor: colors.accent }]} />
                        <Text
                          style={[styles.locationName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {b.pickup_name}
                        </Text>
                      </View>
                      <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />
                      <View style={styles.routePoint}>
                        <View style={[styles.dotDrop, { backgroundColor: '#38BDF8' }]} />
                        <Text
                          style={[styles.locationName, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {b.dropoff_name}
                        </Text>
                      </View>
                    </View>

                    {/* Captain info & vehicle */}
                    <View
                      style={[
                        styles.riderBar,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.riderBarLeft}>
                        <Ionicons name="person-circle" size={32} color={colors.accent} />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={[styles.riderName, { color: colors.textPrimary }]}>
                            {b.captain_name || 'Alliance Captain'}
                          </Text>
                          <Text style={[styles.riderVehicle, { color: colors.textMuted }]}>
                            {b.vehicle_make ? `${b.vehicle_make} ${b.vehicle_model} • ${b.vehicle_plate}` : 'Motorcycle'}
                          </Text>
                        </View>
                      </View>

                      {/* Contact Action buttons */}
                      <View style={styles.contactActions}>
                        <TouchableOpacity
                          style={[
                            styles.iconActionBtn,
                            { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: '/chat/[id]',
                              params: { id: b.id, recipientName: b.captain_name || 'Captain' },
                            })
                          }
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.iconActionBtn,
                            { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                          onPress={() => handleCall(b.captain_phone, b.captain_name)}
                        >
                          <Ionicons name="call-outline" size={16} color={colors.accent} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.iconActionBtn,
                            { backgroundColor: 'rgba(255, 91, 101, 0.12)', borderColor: colors.error },
                          ]}
                          onPress={() => handleCancelBooking(b.id)}
                        >
                          <Ionicons name="close" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Main Actions */}
                    <View style={styles.actionBtnRow}>
                      <GoflypButton
                        title="Live Route & Security"
                        onPress={() => router.push(`/trip/${b.id}`)}
                        variant="primary"
                        size="sm"
                        style={{ flex: 1.2 }}
                      />
                      <GoflypButton
                        title="Split Fuel (UPI/Cash)"
                        onPress={() => router.push(`/payment/${b.id}`)}
                        variant="secondary"
                        size="sm"
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Past Bookings Section */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                Past & Resolved Bookings ({pastRiderBookings.length})
              </Text>

              {pastRiderBookings.length === 0 && activeRiderBookings.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="No Bookings Yet"
                  description="Find an on-campus or commute motorcycle ride to share fuel with peers."
                  actionTitle="Find a Ride"
                  onAction={() => router.push('/(tabs)/find')}
                />
              ) : (
                pastRiderBookings.map((b) => (
                  <View
                    key={b.id}
                    style={[
                      styles.pastCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <BookingStatusBadge status={b.status as any} />
                      <Text style={[styles.pastDate, { color: colors.textMuted }]}>
                        {new Date(b.booked_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text
                      style={[styles.pastRouteText, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {b.pickup_name} → {b.dropoff_name}
                    </Text>
                    <Text style={[styles.pastRiderSub, { color: colors.textSecondary }]}>
                      Captain: {b.captain_name || 'Captain'} • ₹{b.contribution_amount} contribution
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : (
          /* Captain Offered Journeys */
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Published Motorcycle Journeys
              </Text>
              <TouchableOpacity onPress={() => router.push('/offer-ride')}>
                <Text style={[styles.offerNewText, { color: colors.accent }]}>+ Publish New</Text>
              </TouchableOpacity>
            </View>

            {captainRides.length === 0 ? (
              <EmptyState
                icon="bicycle"
                title="No Journeys Published"
                description="Publish an empty seat on your motorcycle to split fuel costs on your commute."
                actionTitle="Publish a Journey"
                onAction={() => router.push('/offer-ride')}
              />
            ) : (
              captainRides.map((ride) => (
                <View
                  key={ride.id}
                  style={[
                    styles.bookingCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: ride.status === 'started' ? colors.accent : colors.border,
                    },
                    Shadows.soft,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.openBadge, { backgroundColor: 'rgba(32, 232, 90, 0.12)' }]}>
                      <Ionicons name="radio-button-on" size={12} color={colors.accent} />
                      <Text style={[styles.openBadgeText, { color: colors.accent }]}>
                        {ride.status.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.priceTag, { color: colors.accent }]}>
                      ₹{ride.contribution_amount}/seat
                    </Text>
                  </View>

                  <Text style={[styles.offeredRoute, { color: colors.textPrimary }]}>
                    {ride.origin_name} → {ride.destination_name}
                  </Text>
                  <Text style={[styles.offeredMeta, { color: colors.textMuted }]}>
                    {ride.departure_date} at {ride.departure_time} • {ride.available_seats} seat left
                  </Text>

                  <View style={styles.actionBtnRow}>
                    <GoflypButton
                      title="View Details"
                      onPress={() => router.push(`/ride/${ride.id}`)}
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                    />
                    {ride.status === 'published' && (
                      <GoflypButton
                        title="Start Trip"
                        onPress={async () => {
                          await startTrip(ride.id);
                          Alert.alert('Trip Started', 'Trip is now active with live telemetry.');
                        }}
                        variant="primary"
                        size="sm"
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    )}
                    {ride.status === 'started' && (
                      <GoflypButton
                        title="Complete Trip"
                        onPress={async () => {
                          await completeTrip(ride.id);
                          Alert.alert('Trip Completed', 'Journey successfully concluded.');
                        }}
                        variant="primary"
                        size="sm"
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: BorderRadius.lg,
  },
  segmentText: {
    fontSize: Typography.fontSize.xs,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionBlock: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookingCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceTag: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  routeSection: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  dotDrop: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 10,
  },
  verticalLine: {
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
  riderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  riderBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riderName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  riderVehicle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  pastDate: {
    fontSize: 10,
  },
  pastRouteText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  pastRiderSub: {
    fontSize: Typography.fontSize.xs,
  },
  offerNewText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  offeredRoute: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  offeredMeta: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 12,
  },
});
