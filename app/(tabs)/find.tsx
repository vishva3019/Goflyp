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
import { useRides } from '../../context/RideContext';
import { Header } from '../../components/layout/Header';
import { AccurateRouteMap } from '../../components/map/AccurateRouteMap';
import { RideCard } from '../../components/ride/RideCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ALLIANCE_CAMPUS_LAT, ALLIANCE_CAMPUS_LNG } from '../../constants/campus';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function FindRideScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    rides,
    searchFilter,
    setSearchFilter,
    fetchRides,
    isLoadingRides,
    requestSeat,
  } = useRides();

  const [selectedRideId, setSelectedRideId] = useState<string | null>(
    rides.length > 0 ? rides[0].id : null
  );
  const [activeFilter, setActiveFilter] = useState<'all' | 'high_match' | 'helmet'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedRide =
    rides.find((r) => r.id === selectedRideId) || (rides.length > 0 ? rides[0] : null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRides();
    } catch (err) {
      console.warn('[FindScreen] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    if (activeFilter === 'high_match') {
      return (ride.routeCompatibility || 0) >= 80;
    }
    if (activeFilter === 'helmet') {
      return ride.vehicle?.helmetProvided;
    }
    return true;
  });

  const originCoords = selectedRide?.pickupCoords || {
    lat: searchFilter.pickupLat || 12.8256,
    lng: searchFilter.pickupLng || 77.7123,
  };
  const destinationCoords = selectedRide?.destinationCoords || {
    lat: searchFilter.destLat || 12.8452,
    lng: searchFilter.destLng || 77.6602,
  };

  const handleRequestSeat = async (ride: any) => {
    try {
      const res = await requestSeat({
        rideId: ride.id,
        pickupName: searchFilter.pickup,
        dropoffName: searchFilter.destination,
      });
      Alert.alert(
        'Seat Requested',
        `Your request was sent to ${ride.captain?.name || 'the Captain'}. You can track status in your bookings.`
      );
      router.push(`/trip/${res.booking.id}`);
    } catch (e: any) {
      Alert.alert('Notice', e.message || 'Unable to request seat.');
    }
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
      {/* Header */}
      <Header title="Find a Journey" showBack={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 110,
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
        {/* Search Corridor Summary Card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            Shadows.soft,
          ]}
        >
          <View style={styles.summaryRouteRow}>
            <View style={styles.routeDotsCol}>
              <View style={[styles.dotGreen, { backgroundColor: colors.accent }]} />
              <View style={[styles.lineBetween, { backgroundColor: colors.border }]} />
              <View style={[styles.dotFlag, { backgroundColor: colors.accent }]} />
            </View>
            <View style={styles.locationsCol}>
              <Text
                style={[styles.locationText, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {searchFilter.pickup}
              </Text>
              <Text
                style={[styles.locationText, { color: colors.textSecondary, marginTop: 10 }]}
                numberOfLines={1}
              >
                {searchFilter.destination}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="options-outline" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Date & Departure Time selector row */}
          <View style={styles.departureBar}>
            <View style={styles.barItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.accent} />
              <Text style={[styles.barText, { color: colors.textPrimary }]}>
                {searchFilter.date}
              </Text>
            </View>
            <View style={[styles.barDivider, { backgroundColor: colors.border }]} />
            <View style={styles.barItem}>
              <Ionicons name="time-outline" size={14} color={colors.accent} />
              <Text style={[styles.barText, { color: colors.textPrimary }]}>
                {searchFilter.time}
              </Text>
            </View>
            <View style={[styles.barDivider, { backgroundColor: colors.border }]} />
            <View style={styles.barItem}>
              <Ionicons name="bicycle" size={14} color={colors.accent} />
              <Text style={[styles.barText, { color: colors.textSecondary }]}>
                1 Seat (Bike)
              </Text>
            </View>
          </View>
        </View>

        {/* Real Road-Following Map with OSRM Polyline */}
        <View style={styles.mapContainer}>
          <AccurateRouteMap
            origin={originCoords}
            destination={destinationCoords}
            originName={selectedRide?.pickupLocation || searchFilter.pickup}
            destinationName={selectedRide?.destinationLocation || searchFilter.destination}
            routePolyline={selectedRide?.routePolyline || []}
            distanceKm={selectedRide?.distanceKm}
            durationMinutes={selectedRide?.durationMinutes}
            height={210}
            style={{ borderRadius: BorderRadius.xl }}
          />
        </View>

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === 'all' ? colors.accent : colors.surfaceElevated,
                borderColor: activeFilter === 'all' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'all' ? '#05070E' : colors.textSecondary },
              ]}
            >
              All Journeys ({rides.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === 'high_match' ? colors.accent : colors.surfaceElevated,
                borderColor:
                  activeFilter === 'high_match' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setActiveFilter('high_match')}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={activeFilter === 'high_match' ? '#05070E' : colors.accent}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'high_match' ? '#05070E' : colors.textSecondary },
              ]}
            >
              High Route Compatibility (80%+)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === 'helmet' ? colors.accent : colors.surfaceElevated,
                borderColor: activeFilter === 'helmet' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setActiveFilter('helmet')}
          >
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={activeFilter === 'helmet' ? '#05070E' : colors.accent}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === 'helmet' ? '#05070E' : colors.textSecondary },
              ]}
            >
              Helmet Provided
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Results Count Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textPrimary }]}>
            Available Rides ({filteredRides.length})
          </Text>
          <Text style={[styles.resultsMeta, { color: colors.textMuted }]}>
            Real road routing via OSRM
          </Text>
        </View>

        {/* Real Rides List */}
        {filteredRides.length === 0 ? (
          <EmptyState
            title="No Scheduled Journeys Found"
            description="No Captains have published a journey matching this exact route. Change your search or publish as Captain."
            actionTitle="Refresh Rides"
            onAction={fetchRides}
          />
        ) : (
          filteredRides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride as any}
              isSelected={selectedRideId === ride.id}
              onSelect={() => {
                setSelectedRideId(ride.id);
                router.push(`/ride/${ride.id}`);
              }}
              onRequestSeat={() => handleRequestSeat(ride)}
            />
          ))
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
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  summaryCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: Spacing.md,
  },
  summaryRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDotsCol: {
    alignItems: 'center',
    marginRight: 12,
    height: 48,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineBetween: {
    width: 1.5,
    flex: 1,
    marginVertical: 2,
  },
  dotFlag: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  locationsCol: {
    flex: 1,
  },
  locationText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  departureBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  barText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  barDivider: {
    width: 1,
    height: 14,
  },
  mapContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  resultsCount: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  resultsMeta: {
    fontSize: Typography.fontSize.xs,
  },
});
