import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  Region,
  EdgePadding,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ApiClient } from '../../services/api';
import { LatLng, RouteResult } from '../../types';

export interface AccurateRouteMapProps {
  origin: LatLng;
  destination: LatLng;
  originName?: string;
  destinationName?: string;
  waypoints?: { name: string; lat: number; lng: number }[];
  routePolyline?: LatLng[];
  distanceKm?: number;
  durationMinutes?: number;
  riderLocation?: LatLng | null;
  height?: number;
  style?: ViewStyle;
  interactive?: boolean;
  onExpand?: () => void;
  allowFullscreen?: boolean;
  showGpsStatus?: boolean; // Only shown when live GPS trip telemetry is active
  onRouteCalculated?: (result: RouteResult) => void;
}

const MAP_EDGE_PADDING: EdgePadding = {
  top: 70,
  right: 45,
  bottom: 60,
  left: 45,
};

const FULLSCREEN_EDGE_PADDING: EdgePadding = {
  top: 130,
  right: 45,
  bottom: 90,
  left: 45,
};

export const AccurateRouteMap: React.FC<AccurateRouteMapProps> = ({
  origin,
  destination,
  originName = 'Pickup',
  destinationName = 'Destination',
  waypoints = [],
  routePolyline,
  distanceKm: initialDistanceKm,
  durationMinutes: initialDurationMinutes,
  riderLocation,
  height = 300,
  style,
  interactive = true,
  onExpand,
  allowFullscreen = true,
  showGpsStatus = false,
  onRouteCalculated,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fullscreenMapRef = useRef<MapView>(null);

  // Fullscreen modal state
  const [isFullscreenVisible, setIsFullscreenVisible] = useState<boolean>(false);

  // Device GPS state - strictly for live telemetry/centering, never required for route calculation
  const [deviceLocation, setDeviceLocation] = useState<LatLng | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);

  // Dynamic route telemetry state
  const [activePolyline, setActivePolyline] = useState<LatLng[]>(routePolyline || []);
  const [distanceKm, setDistanceKm] = useState<number | undefined>(initialDistanceKm);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(initialDurationMinutes);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Sequence counter and AbortController to discard stale in-flight responses
  const requestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedKeyRef = useRef<string>('');

  // Keep a stable ref to onRouteCalculated to break circular update loops
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  // Optional foreground location permission check for live centering
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          if (isMounted) setHasLocationPermission(true);
          const locPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location timeout')), 3000)
          );
          const loc: any = await Promise.race([locPromise, timeoutPromise]);
          if (isMounted && loc && loc.coords) {
            setDeviceLocation({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
            });
          }
        }
      } catch (e) {
        // Fallback gracefully without blocking
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stable primitive coordinate keys
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destLat = destination?.lat;
  const destLng = destination?.lng;
  const waypointsKey = (waypoints || [])
    .filter((w) => typeof w?.lat === 'number' && typeof w?.lng === 'number')
    .map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`)
    .join('|');
  const currentKey = `${originLat},${originLng}->${destLat},${destLng}::${waypointsKey}`;

  // Execute road route calculation with strict deduplication and race protection
  const executeRouteCalculation = useCallback(
    async (force = false) => {
      // If parent already supplied a complete pre-calculated route, use it and never fetch
      if (!force && routePolyline && routePolyline.length >= 2 && initialDistanceKm !== undefined) {
        setActivePolyline(routePolyline);
        setDistanceKm(initialDistanceKm);
        setDurationMinutes(initialDurationMinutes);
        setRouteError(null);
        setIsRouting(false);
        lastFetchedKeyRef.current = currentKey;
        return;
      }

      if (
        typeof originLat !== 'number' ||
        typeof originLng !== 'number' ||
        typeof destLat !== 'number' ||
        typeof destLng !== 'number' ||
        isNaN(originLat) ||
        isNaN(originLng) ||
        isNaN(destLat) ||
        isNaN(destLng)
      ) {
        return;
      }

      // Strict Deduplication: Do not re-fetch if this exact coordinate corridor was already fetched
      if (!force && currentKey === lastFetchedKeyRef.current) {
        return;
      }
      lastFetchedKeyRef.current = currentKey;

      // Abort any prior in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setIsRouting(true);
      setRouteError(null);

      const wps = (waypoints || [])
        .filter((w) => typeof w?.lat === 'number' && typeof w?.lng === 'number')
        .map((w) => ({ name: w.name, lat: w.lat, lng: w.lng }));

      try {
        const res = await ApiClient.getRoadRoute(
          { lat: originLat, lng: originLng },
          { lat: destLat, lng: destLng },
          wps,
          controller.signal
        );

        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;
        setIsRouting(false);

        if (res && res.polyline && res.polyline.length > 0) {
          setActivePolyline(res.polyline);
          setDistanceKm(res.distanceKm);
          setDurationMinutes(res.durationMinutes);
          setRouteError(null);

          if (onRouteCalculatedRef.current) {
            onRouteCalculatedRef.current({
              distanceMeters: res.distanceMeters || Math.round((res.distanceKm || 0) * 1000),
              durationSeconds: res.durationSeconds || Math.round((res.durationMinutes || 0) * 60),
              distanceKm: res.distanceKm,
              durationMinutes: res.durationMinutes,
              coordinates: res.polyline,
              polyline: res.polyline,
              provider: res.provider || 'osrm',
            });
          }
        } else {
          setActivePolyline([]);
          setRouteError(res?.error || 'Road route unavailable for selected corridor.');
        }
      } catch (err: any) {
        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;
        setIsRouting(false);
        setActivePolyline([]);
        setRouteError('Road routing unavailable right now.');
      }
    },
    [
      originLat,
      originLng,
      destLat,
      destLng,
      waypointsKey,
      routePolyline,
      initialDistanceKm,
      initialDurationMinutes,
      currentKey,
    ]
  );

  // Trigger route calculation only when primitive coordinates change
  useEffect(() => {
    executeRouteCalculation(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeRouteCalculation]);

  // Fit camera bounds whenever polyline or coordinates change
  const fitMapBounds = useCallback(
    (targetRef: React.RefObject<MapView | null> = mapRef, edgePadding = MAP_EDGE_PADDING) => {
      const ref = targetRef.current;
      if (!ref) return;

      const coordinatesToFit: { latitude: number; longitude: number }[] = [];

      if (activePolyline.length >= 2) {
        activePolyline.forEach((p) => {
          coordinatesToFit.push({ latitude: p.lat, longitude: p.lng });
        });
      } else {
        if (origin && typeof origin.lat === 'number') {
          coordinatesToFit.push({ latitude: origin.lat, longitude: origin.lng });
        }
        if (destination && typeof destination.lat === 'number') {
          coordinatesToFit.push({ latitude: destination.lat, longitude: destination.lng });
        }
      }

      if (coordinatesToFit.length >= 2) {
        ref.fitToCoordinates(coordinatesToFit, {
          edgePadding,
          animated: true,
        });
      }
    },
    [activePolyline, origin.lat, origin.lng, destination.lat, destination.lng]
  );

  // Automatically fit map camera on route load
  useEffect(() => {
    const timer = setTimeout(() => {
      fitMapBounds(mapRef, MAP_EDGE_PADDING);
    }, 450);
    return () => clearTimeout(timer);
  }, [fitMapBounds]);

  // Automatically fit fullscreen map camera when modal opens
  useEffect(() => {
    if (isFullscreenVisible) {
      const timer = setTimeout(() => {
        fitMapBounds(fullscreenMapRef, FULLSCREEN_EDGE_PADDING);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isFullscreenVisible, fitMapBounds]);

  // Center region calculation
  const initialRegion: Region = {
    latitude: (origin.lat + destination.lat) / 2,
    longitude: (origin.lng + destination.lng) / 2,
    latitudeDelta: Math.max(0.04, Math.abs(origin.lat - destination.lat) * 1.5),
    longitudeDelta: Math.max(0.04, Math.abs(origin.lng - destination.lng) * 1.5),
  };

  // Convert polyline points for MapView Polyline
  const mapPolylineCoordinates = activePolyline.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const handleCenterOnUser = (targetRef: React.RefObject<MapView | null> = mapRef) => {
    if (deviceLocation && targetRef.current) {
      targetRef.current.animateToRegion(
        {
          latitude: deviceLocation.lat,
          longitude: deviceLocation.lng,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  };

  const handleToggleFullscreen = () => {
    if (onExpand) {
      onExpand();
    } else {
      setIsFullscreenVisible(true);
    }
  };

  // Shared Map Markers & Layers Renderer
  const renderMapLayers = () => (
    <>
      {/* Outer Glow Polyline Layer for Futuristic Mobility Aesthetic */}
      {mapPolylineCoordinates.length > 0 && (
        <Polyline
          coordinates={mapPolylineCoordinates}
          strokeColor="rgba(32, 232, 90, 0.35)"
          strokeWidth={9}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Core OSRM Road Polyline Layer */}
      {mapPolylineCoordinates.length > 0 && (
        <Polyline
          coordinates={mapPolylineCoordinates}
          strokeColor={colors.accent}
          strokeWidth={4.5}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Pickup Origin Marker */}
      <Marker
        coordinate={{ latitude: origin.lat, longitude: origin.lng }}
        title={originName}
        description="Pickup Location"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.originMarkerContainer}>
          <View style={[styles.originMarkerHalo, { backgroundColor: 'rgba(32, 232, 90, 0.25)' }]} />
          <View style={[styles.originMarkerDot, { backgroundColor: colors.accent }]}>
            <View style={[styles.originMarkerInner, { backgroundColor: '#05070E' }]} />
          </View>
        </View>
      </Marker>

      {/* Destination Dropoff Marker */}
      <Marker
        coordinate={{ latitude: destination.lat, longitude: destination.lng }}
        title={destinationName}
        description="Destination Point"
        anchor={{ x: 0.5, y: 1.0 }}
      >
        <View
          style={[
            styles.destMarkerBadge,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.accent,
            },
            Shadows.card,
          ]}
        >
          <Ionicons name="flag" size={13} color={colors.accent} />
          <Text style={[styles.destMarkerText, { color: colors.textPrimary }]} numberOfLines={1}>
            {destinationName.split(' ')[0]}
          </Text>
        </View>
      </Marker>

      {/* Intermediate Corridor Waypoints */}
      {waypoints.map((wp, index) => (
        <Marker
          key={`wp_${index}_${wp.lat}_${wp.lng}`}
          coordinate={{ latitude: wp.lat, longitude: wp.lng }}
          title={wp.name}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.waypointDot, { backgroundColor: '#8AFFA5' }]} />
        </Marker>
      ))}

      {/* Live Motorcycle Captain / Rider Location */}
      {riderLocation && (
        <Marker
          coordinate={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
          title="Captain on Route"
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={[
              styles.riderBadge,
              {
                backgroundColor: '#080B14',
                borderColor: colors.accent,
              },
              Shadows.glowGreen,
            ]}
          >
            <Text style={{ fontSize: 13 }}>🏍️</Text>
          </View>
        </Marker>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: isDark ? colors.background : colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Native Apple Maps (MKMapView) on iOS */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={false}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        onMapReady={() => fitMapBounds(mapRef, MAP_EDGE_PADDING)}
      >
        {renderMapLayers()}
      </MapView>

      {/* Floating Route Telemetry HUD */}
      <View
        style={[
          styles.routeHud,
          {
            backgroundColor: isDark ? 'rgba(16, 21, 34, 0.94)' : 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.border,
          },
          Shadows.soft,
        ]}
      >
        {isRouting ? (
          <View style={styles.routingLoadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.routingLoadingText, { color: colors.textSecondary }]}>
              Calculating real OSRM road geometry...
            </Text>
          </View>
        ) : routeError ? (
          <TouchableOpacity
            style={styles.routingLoadingRow}
            onPress={() => executeRouteCalculation(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-circle-outline" size={17} color={colors.warning} />
            <Text style={[styles.routingLoadingText, { color: colors.warning }]}>
              {routeError} (Tap to retry)
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.hudStat}>
              <Ionicons name="speedometer-outline" size={13} color={colors.accent} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Road Distance</Text>
              <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                {distanceKm !== undefined ? `${distanceKm} km` : '--'}
              </Text>
            </View>

            <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

            <View style={styles.hudStat}>
              <Ionicons name="time-outline" size={13} color={colors.accent} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Est. Duration</Text>
              <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                {durationMinutes !== undefined ? `${durationMinutes} mins` : '--'}
              </Text>
            </View>

            <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

            <View style={styles.hudStat}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Apple Maps</Text>
              <Text style={[styles.hudValue, { color: colors.success }]}>OSRM GPS</Text>
            </View>
          </>
        )}
      </View>

      {/* Floating Action Controls on Bottom Right */}
      {interactive && (
        <View style={styles.floatingControls}>
          {allowFullscreen && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                {
                  backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: colors.border,
                },
                Shadows.soft,
              ]}
              onPress={handleToggleFullscreen}
              activeOpacity={0.7}
              accessibilityLabel="Maximize Map"
            >
              <Ionicons name="expand" size={17} color={colors.accent} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.controlBtn,
              {
                backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: colors.border,
              },
              Shadows.soft,
            ]}
            onPress={() => fitMapBounds(mapRef, MAP_EDGE_PADDING)}
            activeOpacity={0.7}
            accessibilityLabel="Fit Route"
          >
            <Ionicons name="scan-outline" size={16} color={colors.accent} />
          </TouchableOpacity>

          {hasLocationPermission && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                {
                  backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: colors.border,
                },
                Shadows.soft,
              ]}
              onPress={() => handleCenterOnUser(mapRef)}
              activeOpacity={0.7}
              accessibilityLabel="Center on Location"
            >
              <Ionicons name="locate" size={16} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* GPS Status Indicator Badge - Only rendered if showGpsStatus is explicitly true (e.g. live trip telemetry) */}
      {showGpsStatus && (
        <View style={styles.gpsStatusBadge}>
          <View
            style={[
              styles.gpsPill,
              {
                backgroundColor: isDark ? 'rgba(8, 11, 20, 0.88)' : 'rgba(255, 255, 255, 0.92)',
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.gpsDot,
                {
                  backgroundColor: hasLocationPermission ? colors.accent : colors.warning,
                },
              ]}
            />
            <Text style={[styles.gpsText, { color: colors.textSecondary }]}>
              {hasLocationPermission ? 'Apple Core Location Active' : 'GPS Permission Needed'}
            </Text>
          </View>
        </View>
      )}

      {/* FULLSCREEN REAL APPLE MAPS MODAL */}
      <Modal
        visible={isFullscreenVisible}
        animationType="slide"
        onRequestClose={() => setIsFullscreenVisible(false)}
      >
        <View style={[styles.fullscreenContainer, { backgroundColor: colors.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          <MapView
            ref={fullscreenMapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={true}
            showsTraffic={true}
            onMapReady={() => fitMapBounds(fullscreenMapRef, FULLSCREEN_EDGE_PADDING)}
          >
            {renderMapLayers()}
          </MapView>

          {/* Fullscreen Top Header Overlay */}
          <View style={[styles.fullscreenHeaderOverlay, { top: insets.top + 8 }]}>
            <View
              style={[
                styles.fullscreenHeaderBar,
                {
                  backgroundColor: isDark ? 'rgba(16, 21, 34, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                  borderColor: colors.border,
                },
                Shadows.card,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.fullscreenCloseBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={() => setIsFullscreenVisible(false)}
                activeOpacity={0.7}
                accessibilityLabel="Close Fullscreen Map"
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.fullscreenTitleCol}>
                <Text style={[styles.fullscreenTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {originName} → {destinationName}
                </Text>
                <Text style={[styles.fullscreenSubtitle, { color: colors.accent }]}>
                  Apple MapKit Road Navigation
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.fullscreenCloseBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
                onPress={() => fitMapBounds(fullscreenMapRef, FULLSCREEN_EDGE_PADDING)}
                activeOpacity={0.7}
                accessibilityLabel="Fit Route Camera"
              >
                <Ionicons name="scan-outline" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Fullscreen Floating Telemetry HUD */}
            <View
              style={[
                styles.routeHud,
                styles.fullscreenHud,
                {
                  backgroundColor: isDark ? 'rgba(16, 21, 34, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                  borderColor: colors.border,
                },
                Shadows.card,
              ]}
            >
              {isRouting ? (
                <View style={styles.routingLoadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.routingLoadingText, { color: colors.textSecondary }]}>
                    Calculating real OSRM road geometry...
                  </Text>
                </View>
              ) : routeError ? (
                <TouchableOpacity
                  style={styles.routingLoadingRow}
                  onPress={() => executeRouteCalculation(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-circle-outline" size={17} color={colors.warning} />
                  <Text style={[styles.routingLoadingText, { color: colors.warning }]}>
                    {routeError} (Tap to retry)
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.hudStat}>
                    <Ionicons name="speedometer-outline" size={13} color={colors.accent} />
                    <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Road Distance</Text>
                    <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                      {distanceKm !== undefined ? `${distanceKm} km` : '--'}
                    </Text>
                  </View>

                  <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.hudStat}>
                    <Ionicons name="time-outline" size={13} color={colors.accent} />
                    <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Est. Duration</Text>
                    <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                      {durationMinutes !== undefined ? `${durationMinutes} mins` : '--'}
                    </Text>
                  </View>

                  <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.hudStat}>
                    <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Apple Maps</Text>
                    <Text style={[styles.hudValue, { color: colors.success }]}>OSRM GPS</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Fullscreen Floating Controls on Bottom Right */}
          {hasLocationPermission && (
            <View style={styles.fullscreenFloatingControls}>
              <TouchableOpacity
                style={[
                  styles.fullscreenControlBtn,
                  {
                    backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: colors.border,
                  },
                  Shadows.card,
                ]}
                onPress={() => handleCenterOnUser(fullscreenMapRef)}
                activeOpacity={0.7}
                accessibilityLabel="Center on Location"
              >
                <Ionicons name="locate" size={20} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  routeHud: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    zIndex: 100,
  },
  hudStat: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 9,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  hudValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 1,
  },
  hudDivider: {
    width: 1,
    height: 22,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routingLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  routingLoadingText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    gap: 8,
    zIndex: 100,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsStatusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    zIndex: 100,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.semibold,
  },
  originMarkerContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originMarkerHalo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  originMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originMarkerInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  destMarkerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  destMarkerText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#05070E',
  },
  riderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fullscreen Modal Styles
  fullscreenContainer: {
    flex: 1,
    position: 'relative',
  },
  fullscreenHeaderOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
    paddingHorizontal: 16,
  },
  fullscreenHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: 12,
  },
  fullscreenCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenTitleCol: {
    flex: 1,
  },
  fullscreenTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  fullscreenSubtitle: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  fullscreenHud: {
    position: 'relative',
    top: 10,
    left: 0,
    right: 0,
  },
  fullscreenFloatingControls: {
    position: 'absolute',
    bottom: 34,
    right: 18,
    gap: 12,
    zIndex: 200,
  },
  fullscreenControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
