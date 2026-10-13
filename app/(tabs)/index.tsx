import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRides } from '../../context/RideContext';
import { Header } from '../../components/layout/Header';
import { LocationSearchField, LocationCoordinates } from '../../components/ride/LocationSearchField';
import { GoflypButton } from '../../components/common/GoflypButton';
import { RideCard } from '../../components/ride/RideCard';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { VERIFIED_CAMPUS_HUBS } from '../../constants/campusHubs';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, activeRole, setActiveRole } = useAuth();
  const {
    rides,
    riderBookings,
    captainRides,
    captainRequests,
    activeBooking,
    activeCaptainTrip,
    searchFilter,
    setSearchFilter,
    ridesError: contextRidesError,
    fetchRides,
    fetchCaptainData,
    fetchBookings,
    requestSeat,
    acceptBooking,
    rejectBooking,
    startTrip,
    completeTrip,
  } = useRides();

  const [ridesError, setRidesError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync context rides error state when context updates
  useEffect(() => {
    if (contextRidesError) {
      setRidesError(contextRidesError);
    } else {
      setRidesError(null);
    }
  }, [contextRidesError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRidesError(null);
    try {
      if (activeRole === 'captain') {
        await Promise.allSettled([fetchRides(), fetchCaptainData()]);
      } else {
        await Promise.allSettled([fetchRides(), fetchBookings()]);
      }
      if (contextRidesError) {
        setRidesError(contextRidesError);
      } else {
        setRidesError(null);
      }
    } catch (err: any) {
      console.warn('[HomeScreen] Refresh error:', err);
      setRidesError(err.message || 'Ride service temporarily unavailable');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwapLocations = () => {
    setSearchFilter((prev) => ({
      ...prev,
      pickup: prev.destination,
      destination: prev.pickup,
      pickupLat: prev.destLat,
      pickupLng: prev.destLng,
      destLat: prev.pickupLat,
      destLng: prev.pickupLng,
    }));
  };

  const handleSelectHub = (hubName: string, target: 'pickup' | 'destination') => {
    const matched = VERIFIED_CAMPUS_HUBS.find((h) => h.name === hubName);
    setSearchFilter((prev) => ({
      ...prev,
      [target]: hubName,
      ...(matched
        ? target === 'pickup'
          ? { pickupLat: matched.lat, pickupLng: matched.lng }
          : { destLat: matched.lat, destLng: matched.lng }
        : {}),
    }));
  };

  const handleFindRide = () => {
    router.push('/(tabs)/find');
  };

  const handleOfferRide = () => {
    if (activeRole !== 'captain') {
      setActiveRole('captain');
    }
    router.push('/offer-ride');
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
      {/* Top Header with Logo, Notifications, Avatar */}
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 90,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Role Toggle Switch Bar */}
        <View
          style={[
            styles.roleToggleBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.roleToggleButton,
              activeRole === 'rider' && [
                styles.roleToggleActive,
                { backgroundColor: colors.card, borderColor: '#38BDF8' },
              ],
            ]}
            onPress={() => setActiveRole('rider')}
          >
            <Ionicons
              name="person"
              size={14}
              color={activeRole === 'rider' ? '#38BDF8' : colors.textMuted}
            />
            <Text
              style={[
                styles.roleToggleText,
                { color: activeRole === 'rider' ? colors.textPrimary : colors.textMuted },
              ]}
            >
              Rider Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleToggleButton,
              activeRole === 'captain' && [
                styles.roleToggleActive,
                { backgroundColor: colors.card, borderColor: colors.accent },
              ],
            ]}
            onPress={() => setActiveRole('captain')}
          >
            <Ionicons
              name="bicycle"
              size={15}
              color={activeRole === 'captain' ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.roleToggleText,
                { color: activeRole === 'captain' ? colors.textPrimary : colors.textMuted },
              ]}
            >
              Captain Mode
            </Text>
          </TouchableOpacity>
        </View>

        {/* ----------------- RIDER DASHBOARD ----------------- */}
        {activeRole === 'rider' ? (
          <>
            {/* Student Verification Indicator pill */}
            <View style={styles.verificationRow}>
              <VerificationBadge
                label={
                  user?.university
                    ? `${user.university.split(' ')[0]} Verified Student`
                    : 'Alliance University Student'
                }
                size="sm"
              />
              <View style={styles.co2Tag}>
                <Ionicons name="leaf-outline" size={13} color={colors.accent} />
                <Text style={[styles.co2Text, { color: colors.textSecondary }]}>
                  {user?.co2SavedKg || 0}kg CO₂ saved
                </Text>
              </View>
            </View>

            {/* Main Heading */}
            <View style={styles.headingSection}>
              <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>
                Where do you{'\n'}want to go?
              </Text>
            </View>

            {/* Active Booking Banner if present */}
            {activeBooking && (
              <TouchableOpacity
                style={[
                  styles.activeTripBanner,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.accent,
                  },
                  Shadows.glowGreen,
                ]}
                onPress={() => router.push(`/trip/${activeBooking.id}`)}
              >
                <View style={styles.activeBannerLeft}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.activeBannerTitle, { color: colors.accent }]}>
                      BOOKING {activeBooking.status.toUpperCase()}
                    </Text>
                    <Text
                      style={[styles.activeBannerSubtitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {activeBooking.captain_name || 'Captain'} • {activeBooking.dropoff_name}
                    </Text>
                    <Text style={[styles.activeBannerMeta, { color: colors.textSecondary }]}>
                      Contribution: ₹{activeBooking.contribution_amount} (Direct P2P)
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
            )}

            {/* Travel Mode Indicator */}
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.modeLeft}>
                <View
                  style={[
                    styles.modeIconCircle,
                    { backgroundColor: 'rgba(32, 232, 90, 0.12)' },
                  ]}
                >
                  <Ionicons name="bicycle" size={18} color={colors.accent} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>
                    Student Bike Sharing
                  </Text>
                  <Text style={[styles.modeSubtitle, { color: colors.textMuted }]}>
                    Motorcycle Pool • 1 Seat per bike • Zero commission
                  </Text>
                </View>
              </View>
              <View style={[styles.modeActivePill, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.modeActiveText, { color: colors.accent }]}>Active</Text>
              </View>
            </View>

            {/* Pickup & Destination Input Cards with Swap Button & Apple Core Location */}
            <LocationSearchField
              pickup={searchFilter.pickup}
              destination={searchFilter.destination}
              onPickupChange={(val) => setSearchFilter((p) => ({ ...p, pickup: val }))}
              onDestinationChange={(val) =>
                setSearchFilter((p) => ({ ...p, destination: val }))
              }
              onSwap={handleSwapLocations}
              onSelectHub={handleSelectHub}
              onSelectCoordinates={(coords: LocationCoordinates, target: 'pickup' | 'destination') => {
                if (target === 'pickup') {
                  setSearchFilter((p) => ({
                    ...p,
                    pickup: coords.name,
                    pickupLat: coords.lat,
                    pickupLng: coords.lng,
                  }));
                } else {
                  setSearchFilter((p) => ({
                    ...p,
                    destination: coords.name,
                    destLat: coords.lat,
                    destLng: coords.lng,
                  }));
                }
              }}
              pickupCoords={
                searchFilter.pickupLat && searchFilter.pickupLng
                  ? { lat: searchFilter.pickupLat, lng: searchFilter.pickupLng }
                  : undefined
              }
              destCoords={
                searchFilter.destLat && searchFilter.destLng
                  ? { lat: searchFilter.destLat, lng: searchFilter.destLng }
                  : undefined
              }
            />

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <GoflypButton
                title="Find a Ride"
                onPress={handleFindRide}
                variant="primary"
                size="lg"
                icon={<Ionicons name="search" size={18} color="#05070E" />}
                style={styles.actionBtnPrimary}
              />
              <GoflypButton
                title="Offer a Ride"
                onPress={handleOfferRide}
                variant="secondary"
                size="lg"
                icon={<Ionicons name="add-circle-outline" size={18} color={colors.accent} />}
                style={styles.actionBtnSecondary}
              />
            </View>

            {/* Nearby Available Rides Section */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Available Campus Journeys
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  Verified peers departing along this corridor
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/find')}>
                <Text style={[styles.seeAllText, { color: colors.accent }]}>See all</Text>
              </TouchableOpacity>
            </View>

            {/* Non-blocking Backend Unavailable Banner */}
            {ridesError && (
              <View
                style={[
                  styles.backendErrorCard,
                  { backgroundColor: colors.card, borderColor: colors.warning },
                ]}
              >
                <View style={styles.backendErrorRow}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.backendErrorTitle, { color: colors.textPrimary }]}>
                      Ride service temporarily unavailable
                    </Text>
                    <Text style={[styles.backendErrorDesc, { color: colors.textMuted }]}>
                      {ridesError}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={handleRefresh}
                  >
                    <Ionicons name="refresh" size={13} color={colors.accent} />
                    <Text style={[styles.retryBtnText, { color: colors.accent }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Real Rides List */}
            {rides.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="bicycle-outline" size={42} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Rides Currently Scheduled
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  No student has published a journey matching this route today. Switch to Captain Mode to offer a ride, or check back shortly.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  onPress={handleOfferRide}
                >
                  <Text style={[styles.emptyActionText, { color: colors.accent }]}>
                    Publish This Journey as Captain
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              rides.slice(0, 5).map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride as any}
                  onSelect={() => router.push(`/ride/${ride.id}`)}
                  onRequestSeat={async () => {
                    try {
                      const res = await requestSeat({
                        rideId: ride.id,
                        pickupName: searchFilter.pickup,
                        dropoffName: searchFilter.destination,
                      });
                      Alert.alert(
                        'Seat Requested',
                        'Your booking request has been sent to the Captain. You will be notified when accepted.'
                      );
                      router.push(`/trip/${res.booking.id}`);
                    } catch (e: any) {
                      Alert.alert('Booking Notice', e.message || 'Unable to request seat');
                    }
                  }}
                />
              ))
            )}
          </>
        ) : (
          /* ----------------- CAPTAIN DASHBOARD ----------------- */
          <>
            {/* Captain Vehicle & Verification Banner */}
            <View
              style={[
                styles.captainProfileCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.captainCardTop}>
                <View style={[styles.captainAvatarCircle, { backgroundColor: 'rgba(32, 232, 90, 0.15)' }]}>
                  <Ionicons name="bicycle" size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.captainCardName, { color: colors.textPrimary }]}>
                    {user?.fullName || 'Alliance Captain'}
                  </Text>
                  <Text style={[styles.captainCardVehicle, { color: colors.textSecondary }]}>
                    {user?.vehicle?.make
                      ? `${user.vehicle.make} ${user.vehicle.model} • ${user.vehicle.registrationNumber}`
                      : 'Motorcycle Details Registered'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.verifiedStatusPill,
                    {
                      backgroundColor: user?.isVerified ? 'rgba(32, 232, 90, 0.15)' : 'rgba(245, 185, 66, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.verifiedStatusText,
                      { color: user?.isVerified ? colors.accent : '#F5B942' },
                    ]}
                  >
                    {user?.isVerified ? 'Verified' : 'Pending Verification'}
                  </Text>
                </View>
              </View>

              {/* Captain Stats Grid */}
              <View style={styles.captainStatsRow}>
                <View style={styles.captainStatItem}>
                  <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                    {user?.tripsCompleted || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trips Done</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.captainStatItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="star" size={13} color="#F5B942" />
                    <Text style={[styles.statNum, { color: colors.textPrimary }]}>
                      {(user?.rating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.captainStatItem}>
                  <Text style={[styles.statNum, { color: colors.accent }]}>
                    {user?.co2SavedKg || 0} kg
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>CO₂ Offset</Text>
                </View>
              </View>
            </View>

            {/* Quick Publish CTA Button */}
            <TouchableOpacity
              style={[
                styles.publishCtaButton,
                { backgroundColor: colors.accent },
                Shadows.button,
              ]}
              onPress={() => router.push('/offer-ride')}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={22} color="#05070E" />
              <Text style={styles.publishCtaText}>Publish a New Journey</Text>
            </TouchableOpacity>

            {/* Active Published Journey if any */}
            {activeCaptainTrip && (
              <View style={styles.activeCaptainSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Live Published Journey
                  </Text>
                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor:
                          activeCaptainTrip.status === 'started'
                            ? 'rgba(32, 232, 90, 0.15)'
                            : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text style={[styles.liveBadgeText, { color: colors.accent }]}>
                      {activeCaptainTrip.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.captainTripCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.tripCardRoute}>
                    <View style={styles.routePoint}>
                      <View style={[styles.pointDot, { backgroundColor: colors.accent }]} />
                      <Text
                        style={[styles.pointText, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {activeCaptainTrip.origin_name || activeCaptainTrip.pickupLocation}
                      </Text>
                    </View>
                    <View style={[styles.pointLine, { backgroundColor: colors.border }]} />
                    <View style={styles.routePoint}>
                      <View style={[styles.pointDot, { backgroundColor: '#38BDF8' }]} />
                      <Text
                        style={[styles.pointText, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {activeCaptainTrip.destination_name || activeCaptainTrip.destinationLocation}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripMetaRow}>
                    <Text style={[styles.tripMetaText, { color: colors.textMuted }]}>
                      Seats: {activeCaptainTrip.available_seats || activeCaptainTrip.availableSeats} /{' '}
                      {activeCaptainTrip.total_seats || activeCaptainTrip.totalSeats || 1}
                    </Text>
                    <Text style={[styles.tripMetaText, { color: colors.accent }]}>
                      ₹{activeCaptainTrip.contribution_amount || activeCaptainTrip.contributionAmount} fuel split
                    </Text>
                  </View>

                  <View style={styles.captainActionsRow}>
                    {activeCaptainTrip.status === 'published' ? (
                      <TouchableOpacity
                        style={[styles.startBtn, { backgroundColor: colors.accent }]}
                        onPress={async () => {
                          await startTrip(activeCaptainTrip.id);
                          Alert.alert('Trip Started', 'Your journey has officially started.');
                        }}
                      >
                        <Ionicons name="play" size={16} color="#05070E" />
                        <Text style={styles.startBtnText}>Start Journey</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#38BDF8' }]}
                        onPress={async () => {
                          await completeTrip(activeCaptainTrip.id);
                          Alert.alert('Trip Completed', 'Journey marked completed. Great job!');
                        }}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#05070E" />
                        <Text style={styles.completeBtnText}>Complete Journey</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Incoming Booking Requests */}
            {(() => {
              const pendingRequests = captainRequests.filter((r) => r.status === 'pending');
              const acceptedPassengers = captainRequests.filter((r) => r.status === 'accepted');

              return (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Incoming Rider Requests ({pendingRequests.length})
                      </Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                        Verified peers wanting to join your route
                      </Text>
                    </View>
                  </View>

                  {pendingRequests.length === 0 ? (
                    <View
                      style={[
                        styles.emptyStateCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="mail-open-outline" size={38} color={colors.textMuted} />
                      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                        No Pending Booking Requests
                      </Text>
                      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                        When students along your published corridor request a seat, their requests will appear here for your review and approval.
                      </Text>
                    </View>
                  ) : (
                    pendingRequests.map((req) => (
                      <View
                        key={req.id}
                        style={[
                          styles.requestCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => router.push(`/trip/${req.id}`)}
                        >
                          <View style={styles.reqTop}>
                            <View>
                              <Text style={[styles.reqRiderName, { color: colors.textPrimary }]}>
                                {req.rider_name}
                              </Text>
                              <Text style={[styles.reqRiderDept, { color: colors.textMuted }]}>
                                {req.rider_department} {req.rider_verified ? '• Verified Student' : ''}
                              </Text>
                            </View>
                            <Text style={[styles.reqAmount, { color: colors.accent }]}>
                              ₹{req.contribution_amount}
                            </Text>
                          </View>

                          <View style={styles.reqLocations}>
                            <Text style={[styles.reqLocText, { color: colors.textSecondary }]}>
                              Pickup: {req.pickup_name}
                            </Text>
                            <Text style={[styles.reqLocText, { color: colors.textSecondary }]}>
                              Drop: {req.dropoff_name}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.reqActionRow}>
                          <TouchableOpacity
                            style={[styles.rejectBtn, { borderColor: '#FF5B65' }]}
                            onPress={async () => {
                              await rejectBooking(req.id);
                              Alert.alert('Request Declined', 'The seat request was rejected.');
                            }}
                          >
                            <Text style={{ color: '#FF5B65', fontSize: 12, fontWeight: '700' }}>
                              Decline
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.detailsBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                            onPress={() => router.push(`/trip/${req.id}`)}
                          >
                            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                              View Details
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: colors.accent }]}
                            onPress={async () => {
                              await acceptBooking(req.id);
                              Alert.alert(
                                'Seat Confirmed',
                                `Accepted ${req.rider_name}'s booking. Coordinate via phone or meet at campus pickup.`
                              );
                            }}
                          >
                            <Text style={{ color: '#05070E', fontSize: 12, fontWeight: '700' }}>
                              Accept Request
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {/* Confirmed Passengers Section */}
                  {acceptedPassengers.length > 0 && (
                    <>
                      <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                        <View>
                          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Confirmed Passengers ({acceptedPassengers.length})
                          </Text>
                          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                            Students traveling with you on this journey
                          </Text>
                        </View>
                      </View>

                      {acceptedPassengers.map((pass) => (
                        <View
                          key={pass.id}
                          style={[
                            styles.requestCard,
                            { backgroundColor: colors.card, borderColor: colors.accent },
                          ]}
                        >
                          <View style={styles.reqTop}>
                            <View>
                              <Text style={[styles.reqRiderName, { color: colors.textPrimary }]}>
                                {pass.rider_name}
                              </Text>
                              <Text style={[styles.reqRiderDept, { color: colors.accent }]}>
                                Confirmed Passenger {pass.rider_verified ? '• Verified Student' : ''}
                              </Text>
                            </View>
                            <Text style={[styles.reqAmount, { color: colors.accent }]}>
                              ₹{pass.contribution_amount}
                            </Text>
                          </View>

                          <View style={styles.reqLocations}>
                            <Text style={[styles.reqLocText, { color: colors.textSecondary }]}>
                              Pickup: {pass.pickup_name}
                            </Text>
                            <Text style={[styles.reqLocText, { color: colors.textSecondary }]}>
                              Drop: {pass.dropoff_name}
                            </Text>
                          </View>

                          <View style={styles.reqActionRow}>
                            <TouchableOpacity
                              style={[
                                styles.detailsBtn,
                                {
                                  flex: 1,
                                  borderColor: colors.border,
                                  backgroundColor: colors.surfaceElevated,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4,
                                },
                              ]}
                              onPress={() =>
                                router.push({
                                  pathname: '/chat/[id]',
                                  params: { id: pass.id, recipientName: pass.rider_name },
                                })
                              }
                            >
                              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.accent} />
                              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                                Chat
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.acceptBtn,
                                {
                                  flex: 1.3,
                                  backgroundColor: colors.accent,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 4,
                                },
                              ]}
                              onPress={() => router.push(`/trip/${pass.id}`)}
                            >
                              <Ionicons name="navigate-outline" size={14} color="#05070E" />
                              <Text style={{ color: '#05070E', fontSize: 12, fontWeight: '700' }}>
                                View Details
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  roleToggleBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 3,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  roleToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  roleToggleActive: {
    borderWidth: 1,
  },
  roleToggleText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  co2Tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  co2Text: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  headingSection: {
    marginBottom: Spacing.lg,
  },
  mainHeading: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.black,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  activeTripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: Spacing.md,
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeBannerTitle: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 0.5,
  },
  activeBannerSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  activeBannerMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.sm,
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  modeSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  modeActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  modeActiveText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  actionBtnPrimary: {
    flex: 1.3,
  },
  actionBtnSecondary: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  emptyActionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  captainProfileCard: {
    padding: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: 16,
  },
  captainCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  captainAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainCardName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  captainCardVehicle: {
    fontSize: 11,
    marginTop: 2,
  },
  verifiedStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  verifiedStatusText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  captainStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222839',
  },
  captainStatItem: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.black,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  publishCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.xl,
    gap: 8,
    marginBottom: 20,
  },
  publishCtaText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  activeCaptainSection: {
    marginBottom: 20,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  captainTripCard: {
    padding: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  tripCardRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointLine: {
    width: 1.5,
    height: 12,
    marginLeft: 3.25,
    marginVertical: 2,
  },
  pointText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222839',
    marginBottom: 12,
  },
  tripMetaText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
  },
  captainActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  startBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  completeBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  requestCard: {
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: 10,
  },
  reqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reqRiderName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  reqRiderDept: {
    fontSize: 10,
    marginTop: 1,
  },
  reqAmount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  reqLocations: {
    marginBottom: 12,
    gap: 2,
  },
  reqLocText: {
    fontSize: 11,
  },
  reqActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  detailsBtn: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  acceptBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  backendErrorCard: {
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  backendErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backendErrorTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  backendErrorDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
    marginLeft: 8,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
});
