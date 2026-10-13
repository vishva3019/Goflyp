import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRides } from '../context/RideContext';
import { GoflypButton } from '../components/common/GoflypButton';
import { GoflypInput } from '../components/common/GoflypInput';
import { SeatSelector } from '../components/ride/SeatSelector';
import { AccurateRouteMap } from '../components/map/AccurateRouteMap';
import { LocationPickerModal } from '../components/map/LocationPickerModal';
import { Typography, BorderRadius, Shadows, Spacing } from '../constants/theme';
import { VERIFIED_CAMPUS_HUBS, CampusHub } from '../constants/campusHubs';
import {
  ALLIANCE_CAMPUS_NAME,
  ALLIANCE_CAMPUS_ADDRESS,
  ALLIANCE_CAMPUS_LAT,
  ALLIANCE_CAMPUS_LNG,
} from '../constants/campus';
import { Waypoint, LatLng, RouteResult } from '../types';
import { ApiClient } from '../services/api';

// Resolves geographic coordinates for a given location name
function resolveCoordinatesForLocation(name: string): LatLng | null {
  if (!name.trim()) return null;
  const lower = name.toLowerCase().trim();

  // 1. Direct or partial match with verified campus hubs
  const hub = VERIFIED_CAMPUS_HUBS.find(
    (h) =>
      h.name.toLowerCase() === lower ||
      h.name.toLowerCase().includes(lower) ||
      lower.includes(h.name.toLowerCase())
  );
  if (hub) {
    return { lat: hub.lat, lng: hub.lng };
  }

  // 2. Keyword fallback for common campus landmarks
  if (lower.includes('alliance') || lower.includes('main gate') || lower.includes('campus')) {
    return { lat: ALLIANCE_CAMPUS_LAT, lng: ALLIANCE_CAMPUS_LNG };
  }
  if (lower.includes('electronic city') || lower.includes('ecity')) {
    return { lat: 12.8452, lng: 77.6602 };
  }
  if (lower.includes('chandapura')) {
    return { lat: 12.7954, lng: 77.6989 };
  }
  if (lower.includes('bommasandra')) {
    return { lat: 12.8184, lng: 77.6872 };
  }
  if (lower.includes('kudlu')) {
    return { lat: 12.8876, lng: 77.6441 };
  }
  if (lower.includes('silk board')) {
    return { lat: 12.9172, lng: 77.6227 };
  }
  if (lower.includes('koramangala')) {
    return { lat: 12.9352, lng: 77.6245 };
  }

  return null;
}

export default function OfferRideScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { publishRide } = useRides();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Step 1: Route with Dynamic Geographic Coordinates & Decoupled State
  const [pickupLocation, setPickupLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>({
    name: ALLIANCE_CAMPUS_NAME,
    address: ALLIANCE_CAMPUS_ADDRESS,
    lat: ALLIANCE_CAMPUS_LAT,
    lng: ALLIANCE_CAMPUS_LNG,
  });

  const [destLocation, setDestLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  }>({
    name: 'Electronic City Metro Station (Phase 1)',
    address: 'Yellow Line Elevated Corridor, Electronic City',
    lat: 12.8452,
    lng: 77.6602,
  });

  const [pickup, setPickup] = useState<string>(ALLIANCE_CAMPUS_NAME);
  const [destination, setDestination] = useState<string>('Electronic City Metro Station (Phase 1)');
  const [pickupCoords, setPickupCoords] = useState<LatLng>({
    lat: ALLIANCE_CAMPUS_LAT,
    lng: ALLIANCE_CAMPUS_LNG,
  });
  const [destCoords, setDestCoords] = useState<LatLng>({ lat: 12.8452, lng: 77.6602 });

  // Map Picker Modal State
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState<'pickup' | 'destination'>('pickup');

  // Route calculation lifecycle state
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeRequestIdRef = useRef<number>(0);

  // Step 2: Date & Time
  const [departureDate, setDepartureDate] = useState('Today');
  const [departureTime, setDepartureTime] = useState('5:30 PM');

  // Step 3: Waypoints
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    {
      id: 'wp_1',
      name: 'Chandapura Circle Flyover Junction',
      address: 'Chandapura Circle',
      eta: '5:45 PM',
      lat: 12.7954,
      lng: 77.6989,
    },
  ]);
  const [newWaypointText, setNewWaypointText] = useState('');

  // Step 4: Seats & Helmet
  const [seats, setSeats] = useState(1);
  const [helmetProvided, setHelmetProvided] = useState(true);

  // Step 5: Contribution
  const [contribution, setContribution] = useState(35);

  // Step 6: Review & Publishing state
  const [publishing, setPublishing] = useState(false);

  // Updates pickup text and resolves coordinates
  const handleUpdatePickup = async (text: string) => {
    setPickup(text);
    setPickupLocation((prev) => ({ ...prev, name: text }));
    const resolved = resolveCoordinatesForLocation(text);
    if (resolved) {
      setPickupCoords(resolved);
      setPickupLocation((prev) => ({ ...prev, lat: resolved.lat, lng: resolved.lng }));
    } else if (text.trim().length >= 4) {
      try {
        const res = await ApiClient.searchPlaces(text);
        if (res.places && res.places.length > 0) {
          const first = res.places[0];
          setPickupCoords({ lat: first.lat, lng: first.lng });
          setPickupLocation((prev) => ({
            ...prev,
            address: first.address || text,
            lat: first.lat,
            lng: first.lng,
          }));
        }
      } catch (e) {
        // Keep prior coordinates if search fails
      }
    }
  };

  // Updates destination text and resolves coordinates
  const handleUpdateDestination = async (text: string) => {
    setDestination(text);
    setDestLocation((prev) => ({ ...prev, name: text }));
    const resolved = resolveCoordinatesForLocation(text);
    if (resolved) {
      setDestCoords(resolved);
      setDestLocation((prev) => ({ ...prev, lat: resolved.lat, lng: resolved.lng }));
    } else if (text.trim().length >= 4) {
      try {
        const res = await ApiClient.searchPlaces(text);
        if (res.places && res.places.length > 0) {
          const first = res.places[0];
          setDestCoords({ lat: first.lat, lng: first.lng });
          setDestLocation((prev) => ({
            ...prev,
            address: first.address || text,
            lat: first.lat,
            lng: first.lng,
          }));
        }
      } catch (e) {
        // Keep prior coordinates if search fails
      }
    }
  };

  // When user taps a Campus Hub tag
  const handleSelectHub = (hub: CampusHub) => {
    if (!pickup.trim()) {
      setPickup(hub.name);
      setPickupCoords({ lat: hub.lat, lng: hub.lng });
      setPickupLocation({
        name: hub.name,
        address: hub.address,
        lat: hub.lat,
        lng: hub.lng,
      });
    } else {
      setDestination(hub.name);
      setDestCoords({ lat: hub.lat, lng: hub.lng });
      setDestLocation({
        name: hub.name,
        address: hub.address,
        lat: hub.lat,
        lng: hub.lng,
      });
    }
  };

  // Dynamic route calculation with race condition prevention and stale route invalidation
  const calculateRoute = useCallback(async () => {
    if (
      !pickupCoords ||
      !destCoords ||
      typeof pickupCoords.lat !== 'number' ||
      typeof destCoords.lat !== 'number'
    ) {
      return;
    }

    const currentRequestId = ++routeRequestIdRef.current;

    // Invalidate previous route immediately to prevent showing stale route
    setRouteResult(null);
    setRouteLoading(true);
    setRouteError(null);

    const validWaypoints = waypoints
      .filter((w) => typeof w.lat === 'number' && typeof w.lng === 'number')
      .map((w) => ({ name: w.name, lat: w.lat!, lng: w.lng! }));

    try {
      const res = await ApiClient.getRoadRoute(pickupCoords, destCoords, validWaypoints);
      if (currentRequestId !== routeRequestIdRef.current) return;

      setRouteLoading(false);
      if (res && res.polyline && res.polyline.length > 0) {
        setRouteResult({
          distanceMeters: res.distanceMeters || Math.round((res.distanceKm || 0) * 1000),
          durationSeconds: res.durationSeconds || Math.round((res.durationMinutes || 0) * 60),
          distanceKm: res.distanceKm,
          durationMinutes: res.durationMinutes,
          coordinates: res.polyline,
          polyline: res.polyline,
          provider: res.provider || 'osrm',
        });
        setRouteError(null);
      } else {
        setRouteResult(null);
        setRouteError(res.error || 'Road route unavailable for selected corridor.');
      }
    } catch (err: any) {
      if (currentRequestId !== routeRequestIdRef.current) return;
      setRouteLoading(false);
      setRouteResult(null);
      setRouteError('Road routing service unavailable. Tap to retry.');
    }
  }, [pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng, waypoints]);

  // Recalculate route whenever coordinates change
  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return pickup.trim().length > 0 && destination.trim().length > 0;
      case 2:
        return departureDate.trim().length > 0 && departureTime.trim().length > 0;
      case 3:
        return true;
      case 4:
        return seats >= 1;
      case 5:
        return contribution >= 10;
      case 6:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handlePublish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const addWaypoint = async () => {
    if (!newWaypointText.trim()) return;
    const resolved = resolveCoordinatesForLocation(newWaypointText.trim());
    const newWp: Waypoint = {
      id: `wp_${Date.now()}`,
      name: newWaypointText.trim(),
      address: 'Route Waypoint',
      eta: 'En route',
      lat: resolved?.lat,
      lng: resolved?.lng,
    };
    setWaypoints([...waypoints, newWp]);
    setNewWaypointText('');
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  // Real Captain Publish Journey Handler with validated road route metrics
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const payload = {
        originName: pickup,
        originLat: pickupCoords.lat,
        originLng: pickupCoords.lng,
        destinationName: destination,
        destinationLat: destCoords.lat,
        destinationLng: destCoords.lng,
        pickupLocation: pickup,
        destinationLocation: destination,
        departureDate,
        departureTime,
        availableSeats: seats,
        totalSeats: seats,
        contributionAmount: contribution,
        distanceKm: routeResult?.distanceKm,
        durationMinutes: routeResult?.durationMinutes,
        routePolyline: routeResult?.polyline,
        note: helmetProvided
          ? 'Sanitized helmet provided. Punctual departure.'
          : 'Please bring your helmet.',
        waypoints: waypoints.map((w) => ({
          name: w.name,
          lat: w.lat,
          lng: w.lng,
          eta: w.eta,
        })),
      };

      const res = await publishRide(payload);
      Alert.alert(
        'Journey Published',
        'Your motorcycle journey is published with real road navigation. You will be notified of rider seat requests.'
      );
      router.replace(`/ride/${res.rideId || res.ride?.id || ''}`);
    } catch (err: any) {
      Alert.alert('Publish Error', err.message || 'Unable to publish journey.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 12,
        },
      ]}
    >
      {/* Top Navigation & Step Indicator */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.roundBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={handleBack}
        >
          <Ionicons
            name={currentStep === 1 ? 'close' : 'arrow-back'}
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.stepIndicatorTextCol}>
          <Text style={[styles.stepText, { color: colors.textMuted }]}>
            STEP {currentStep} OF {totalSteps}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Green Progress Indicator Bar */}
      <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: colors.accent,
              width: `${(currentStep / totalSteps) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentScroll,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* STEP 1: Select Pickup and Destination */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              Where are you{'\n'}riding from & to?
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Set your departure point and final destination for fellow students.
            </Text>

            {/* Pickup Location with Pin on Map Trigger */}
            <View style={styles.inputLabelActionRow}>
              <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                PICKUP POINT
              </Text>
              <TouchableOpacity
                style={[
                  styles.pinMapPill,
                  {
                    backgroundColor: 'rgba(32, 232, 90, 0.12)',
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => {
                  setLocationPickerMode('pickup');
                  setIsLocationPickerOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={13} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.pinMapPillText, { color: colors.accent }]}>Pin on Map</Text>
              </TouchableOpacity>
            </View>

            <GoflypInput
              value={pickup}
              onChangeText={handleUpdatePickup}
              placeholder="e.g. Alliance University Main Entrance Gate"
              leftIcon={<Ionicons name="location" size={18} color={colors.accent} />}
              showClear
              onClear={() => handleUpdatePickup('')}
            />

            {/* Destination Location with Pin on Map Trigger */}
            <View style={styles.inputLabelActionRow}>
              <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                FINAL DESTINATION
              </Text>
              <TouchableOpacity
                style={[
                  styles.pinMapPill,
                  {
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    borderColor: '#38BDF8',
                  },
                ]}
                onPress={() => {
                  setLocationPickerMode('destination');
                  setIsLocationPickerOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
                <Text style={[styles.pinMapPillText, { color: '#38BDF8' }]}>Pin on Map</Text>
              </TouchableOpacity>
            </View>

            <GoflypInput
              value={destination}
              onChangeText={handleUpdateDestination}
              placeholder="e.g. Electronic City Metro Station"
              leftIcon={<Ionicons name="flag" size={18} color="#38BDF8" />}
              showClear
              onClear={() => handleUpdateDestination('')}
            />

            {/* Selected Coordinates Status Pill */}
            <View
              style={[
                styles.coordsStatusBanner,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.coordsCol}>
                <Text style={[styles.coordsLabel, { color: colors.accent }]}>FROM PIN</Text>
                <Text style={[styles.coordsValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              <View style={styles.coordsCol}>
                <Text style={[styles.coordsLabel, { color: '#38BDF8' }]}>TO PIN</Text>
                <Text style={[styles.coordsValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {destCoords.lat.toFixed(4)}, {destCoords.lng.toFixed(4)}
                </Text>
              </View>
            </View>

            {/* Quick Hub Suggestions */}
            <Text style={[styles.hubsLabel, { color: colors.textMuted }]}>
              Campus Hub Suggestions
            </Text>
            <View style={styles.hubsWrap}>
              {VERIFIED_CAMPUS_HUBS.map((hub) => {
                const isSelectedDest = destination === hub.name;
                const isSelectedPickup = pickup === hub.name;
                return (
                  <TouchableOpacity
                    key={hub.id}
                    style={[
                      styles.hubTag,
                      {
                        backgroundColor:
                          isSelectedDest || isSelectedPickup ? 'rgba(32, 232, 90, 0.15)' : colors.card,
                        borderColor:
                          isSelectedDest || isSelectedPickup ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectHub(hub)}
                  >
                    <Ionicons
                      name={isSelectedPickup ? 'location' : isSelectedDest ? 'flag' : 'navigate-outline'}
                      size={12}
                      color={isSelectedDest || isSelectedPickup ? colors.accent : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.hubTagText,
                        {
                          color:
                            isSelectedDest || isSelectedPickup
                              ? colors.accent
                              : colors.textSecondary,
                          fontWeight:
                            isSelectedDest || isSelectedPickup ? 'bold' : 'normal',
                        },
                      ]}
                    >
                      {hub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: Departure Date and Time */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              When are you{'\n'}departing?
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Choose departure date and time so passengers can reach on time.
            </Text>

            {/* Date Selection */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Select Date
            </Text>
            <View style={styles.chipRow}>
              {['Today', 'Tomorrow', 'Friday'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.selectableChip,
                    {
                      backgroundColor:
                        departureDate === d ? colors.accent : colors.card,
                      borderColor:
                        departureDate === d ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setDepartureDate(d)}
                >
                  <Text
                    style={[
                      styles.selectableChipText,
                      { color: departureDate === d ? '#05070E' : colors.textPrimary },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Slot Selection */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 18 }]}>
              Departure Time Slot
            </Text>
            <View style={styles.timeSlotsGrid}>
              {[
                '8:45 AM',
                '1:15 PM',
                '3:30 PM',
                '5:15 PM',
                '5:30 PM',
                '6:00 PM',
                '7:30 PM',
                '8:15 PM',
              ].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.timeSlotChip,
                    {
                      backgroundColor:
                        departureTime === t ? colors.accent : colors.card,
                      borderColor:
                        departureTime === t ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setDepartureTime(t)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      { color: departureTime === t ? '#05070E' : colors.textPrimary },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 3: Pickup Points & Waypoints */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              Add Pickup Points{'\n'}& Waypoints
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Allow students on your route to hop on at intermediate junctions.
            </Text>

            <View style={styles.addWaypointRow}>
              <View style={{ flex: 1 }}>
                <GoflypInput
                  value={newWaypointText}
                  onChangeText={setNewWaypointText}
                  placeholder="e.g. Chandapura Flyover, Bommasandra"
                  leftIcon={<Ionicons name="navigate-outline" size={18} color={colors.accent} />}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.addWpBtn,
                  { backgroundColor: colors.accent },
                  Shadows.glowGreen,
                ]}
                onPress={addWaypoint}
              >
                <Ionicons name="add" size={24} color="#05070E" />
              </TouchableOpacity>
            </View>

            {/* Current Waypoints List */}
            {waypoints.length === 0 ? (
              <View
                style={[
                  styles.emptyWpCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="git-commit-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.emptyWpText, { color: colors.textMuted }]}>
                  No intermediate stops added. Ride will be direct.
                </Text>
              </View>
            ) : (
              waypoints.map((wp, index) => (
                <View
                  key={wp.id}
                  style={[
                    styles.waypointItemCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.wpNumberCircle}>
                    <Text style={[styles.wpNumber, { color: colors.accent }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wpName, { color: colors.textPrimary }]}>
                      {wp.name}
                    </Text>
                    <Text style={[styles.wpEta, { color: colors.textMuted }]}>
                      Stop {index + 1} • {wp.eta}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeWaypoint(wp.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* STEP 4: Available Seats & Helmet Safety */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              Passenger Seat{'\n'}& Safety Controls
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Standard bike pool configuration is 1 passenger pillion seat.
            </Text>

            <SeatSelector
              selectedSeats={seats}
              onSeatChange={(s) => setSeats(Math.max(1, s))}
              helmetProvided={helmetProvided}
              onHelmetToggle={setHelmetProvided}
            />

            <View
              style={[
                styles.vehicleSummaryBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="bicycle" size={20} color={colors.accent} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.vTitle, { color: colors.textPrimary }]}>
                  {user?.vehicle?.make || 'Motorcycle'} {user?.vehicle?.model || ''}
                </Text>
                <Text style={[styles.vPlate, { color: colors.textMuted }]}>
                  {user?.vehicle?.registrationNumber || 'Alliance Campus Registered'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 5: Fuel Contribution Amount */}
        {currentStep === 5 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              Enter Fuel{'\n'}Contribution Amount
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Peer fuel split only. 100% goes directly to you from passenger.
            </Text>

            {/* Price Display Card */}
            <View
              style={[
                styles.priceDisplayCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                Shadows.soft,
              ]}
            >
              <Text style={[styles.currencySymbol, { color: colors.accent }]}>₹</Text>
              <Text style={[styles.largePriceText, { color: colors.textPrimary }]}>
                {contribution}
              </Text>
              <Text style={[styles.perSeatText, { color: colors.textMuted }]}>
                per passenger seat
              </Text>

              {/* Stepper Buttons */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                  onPress={() => setContribution((c) => Math.max(15, c - 5))}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                  ]}
                  onPress={() => setContribution((c) => Math.min(100, c + 5))}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Price Presets */}
            <View style={styles.presetPriceRow}>
              {[25, 35, 45, 55].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor:
                        contribution === preset ? colors.accent : colors.card,
                      borderColor:
                        contribution === preset ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setContribution(preset)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: contribution === preset ? '#05070E' : colors.textPrimary },
                    ]}
                  >
                    ₹{preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fuelNoticeBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={[styles.fuelNoticeText, { color: colors.textSecondary }]}>
                Average campus commute fuel split is ₹30–₹45 based on 6–10 km distance.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 6: Review Journey & Publish */}
        {currentStep === 6 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              Review Journey
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
              Verify your ride details before publishing to Alliance campus network.
            </Text>

            {/* Dynamic Apple Maps Route Preview with Maximize Button */}
            <AccurateRouteMap
              origin={pickupCoords}
              destination={destCoords}
              originName={pickup}
              destinationName={destination}
              waypoints={waypoints
                .filter((w) => typeof w.lat === 'number' && typeof w.lng === 'number')
                .map((w) => ({ name: w.name, lat: w.lat!, lng: w.lng! }))}
              routePolyline={routeResult?.polyline}
              distanceKm={routeResult?.distanceKm}
              durationMinutes={routeResult?.durationMinutes}
              height={200}
              allowFullscreen={true}
              showGpsStatus={false}
              style={{ borderRadius: BorderRadius.xl, marginBottom: Spacing.md }}
              onRouteCalculated={(res) => setRouteResult(res)}
            />

            {/* Route Loading / Error Banner */}
            {routeLoading && (
              <View
                style={[
                  styles.routeStatusBanner,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.routeStatusText, { color: colors.textSecondary }]}>
                  Calculating real road distance and travel time via OSRM...
                </Text>
              </View>
            )}

            {routeError && (
              <View
                style={[
                  styles.routeStatusBanner,
                  { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.error },
                ]}
              >
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.routeStatusText, { color: colors.error }]}>
                    {routeError}
                  </Text>
                  <Text style={[styles.routeStatusSub, { color: colors.textMuted }]}>
                    Unable to calculate road distance right now.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.retryBtn, { borderColor: colors.error }]}
                  onPress={calculateRoute}
                >
                  <Text style={[styles.retryBtnText, { color: colors.error }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Summary Review Card */}
            <View
              style={[
                styles.reviewCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.reviewRow}>
                <Ionicons name="navigate" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>
                    Origin & Destination
                  </Text>
                  <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                    {pickup} → {destination}
                  </Text>
                </View>
              </View>

              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

              {/* Dynamic Road Distance and Duration Metrics */}
              <View style={styles.reviewRow}>
                <Ionicons name="speedometer-outline" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>
                    Road Distance & Travel ETA
                  </Text>
                  <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                    {routeLoading
                      ? 'Calculating...'
                      : routeResult
                      ? `${routeResult.distanceKm} km • ~${routeResult.durationMinutes} mins`
                      : routeError
                      ? 'Route metrics unavailable'
                      : '--'}
                  </Text>
                </View>
              </View>

              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

              <View style={styles.reviewRow}>
                <Ionicons name="time" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>
                    Departure Time
                  </Text>
                  <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                    {departureDate} at {departureTime}
                  </Text>
                </View>
              </View>

              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

              <View style={styles.reviewRow}>
                <Ionicons name="cash" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>
                    Fuel Contribution
                  </Text>
                  <Text style={[styles.reviewValue, { color: colors.accent }]}>
                    ₹{contribution} per seat
                  </Text>
                </View>
              </View>

              <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />

              <View style={styles.reviewRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewLabel, { color: colors.textMuted }]}>
                    Safety & Vehicle
                  </Text>
                  <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                    {user?.vehicle?.make || 'Motorcycle'} {user?.vehicle?.model || ''} • Helmet{' '}
                    {helmetProvided ? 'Provided' : 'Required'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          {
            backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <GoflypButton
          title={currentStep === totalSteps ? 'Publish Journey' : 'Continue'}
          onPress={handleNext}
          loading={publishing}
          disabled={!canProceed()}
          size="lg"
          fullWidth
          icon={
            <Ionicons
              name={currentStep === totalSteps ? 'rocket' : 'arrow-forward'}
              size={18}
              color="#05070E"
            />
          }
        />
      </View>

      {/* Interactive Map Pin Location Picker Modal */}
      <LocationPickerModal
        visible={isLocationPickerOpen}
        mode={locationPickerMode}
        initialLocation={
          locationPickerMode === 'pickup'
            ? {
                name: pickupLocation.name,
                address: pickupLocation.address,
                lat: pickupLocation.lat,
                lng: pickupLocation.lng,
              }
            : {
                name: destLocation.name,
                address: destLocation.address,
                lat: destLocation.lat,
                lng: destLocation.lng,
              }
        }
        onConfirm={(loc) => {
          if (locationPickerMode === 'pickup') {
            setPickupLocation(loc);
            setPickup(loc.name);
            setPickupCoords({ lat: loc.lat, lng: loc.lng });
          } else {
            setDestLocation(loc);
            setDestination(loc.name);
            setDestCoords({ lat: loc.lat, lng: loc.lng });
          }
        }}
        onClose={() => setIsLocationPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorTextCol: {
    alignItems: 'center',
  },
  stepText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 1,
  },
  progressBarTrack: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stepContainer: {
    marginTop: 4,
  },
  stepTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.black,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.sm,
    marginTop: 6,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  inputLabelActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 4,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 0.8,
  },
  pinMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pinMapPillText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  coordsStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginVertical: 10,
  },
  coordsCol: {
    flex: 1,
  },
  coordsLabel: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coordsValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  hubsLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hubsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  hubTagText: {
    fontSize: Typography.fontSize.xs,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectableChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectableChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlotChip: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  addWaypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addWpBtn: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  emptyWpCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyWpText: {
    fontSize: Typography.fontSize.xs,
    marginTop: 8,
    textAlign: 'center',
  },
  waypointItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  wpNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#20E85A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  wpNumber: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  wpName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  wpEta: {
    fontSize: 10,
    marginTop: 2,
  },
  vehicleSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 14,
    marginTop: Spacing.md,
  },
  vTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  vPlate: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  priceDisplayCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  currencySymbol: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  largePriceText: {
    fontSize: 54,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -1,
  },
  perSeatText: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  presetBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  fuelNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  fuelNoticeText: {
    fontSize: Typography.fontSize.xs,
    flex: 1,
    lineHeight: 16,
  },
  reviewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  reviewDivider: {
    height: 1,
    marginVertical: 12,
  },
  routeStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: Spacing.md,
    gap: 8,
  },
  routeStatusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  routeStatusSub: {
    fontSize: 10,
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
