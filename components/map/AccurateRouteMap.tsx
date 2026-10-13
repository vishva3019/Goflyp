import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows } from '../../constants/theme';

import { ApiClient } from '../../services/api';

import { LatLng, RouteResult } from '../../types';

export { LatLng };

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
  showGpsStatus?: boolean;
  onRouteCalculated?: (result: RouteResult) => void;
}

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
  const [deviceLocation, setDeviceLocation] = useState<LatLng | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const [activePolyline, setActivePolyline] = useState<LatLng[]>(routePolyline || []);
  const [distanceKm, setDistanceKm] = useState<number | undefined>(initialDistanceKm);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(initialDurationMinutes);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const iframeRef = useRef<any>(null);

  // Request real device GPS location when active
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setDeviceLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      } catch (err) {
        // Location service unavailable on some environments
      }
    })();
  }, []);

  const lastFetchedKeyRef = useRef<string>('');
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  useEffect(() => {
    onRouteCalculatedRef.current = onRouteCalculated;
  }, [onRouteCalculated]);

  const origLat = origin?.lat;
  const origLng = origin?.lng;
  const destLat = destination?.lat;
  const destLng = destination?.lng;
  const waypointsKey = (waypoints || [])
    .filter((w) => typeof w?.lat === 'number' && typeof w?.lng === 'number')
    .map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`)
    .join('|');
  const currentKey = `${origLat},${origLng}->${destLat},${destLng}::${waypointsKey}`;

  // Fetch real OSRM road route geometry dynamically if not pre-supplied
  useEffect(() => {
    if (routePolyline && routePolyline.length >= 2 && initialDistanceKm !== undefined) {
      setActivePolyline(routePolyline);
      setDistanceKm(initialDistanceKm);
      setDurationMinutes(initialDurationMinutes);
      setRouteError(null);
      setIsRouting(false);
      lastFetchedKeyRef.current = currentKey;
      return;
    }

    if (
      typeof origLat !== 'number' ||
      typeof origLng !== 'number' ||
      typeof destLat !== 'number' ||
      typeof destLng !== 'number' ||
      isNaN(origLat) ||
      isNaN(origLng) ||
      isNaN(destLat) ||
      isNaN(destLng)
    ) {
      return;
    }

    if (currentKey === lastFetchedKeyRef.current) {
      return;
    }
    lastFetchedKeyRef.current = currentKey;

    const controller = new AbortController();
    setIsRouting(true);
    setRouteError(null);

    const wps = (waypoints || [])
      .filter((w) => typeof w?.lat === 'number' && typeof w?.lng === 'number')
      .map((w) => ({ name: w.name, lat: w.lat, lng: w.lng }));

    ApiClient.getRoadRoute(
      { lat: origLat, lng: origLng },
      { lat: destLat, lng: destLng },
      wps,
      controller.signal
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setIsRouting(false);
        if (res.polyline && res.polyline.length > 0) {
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
          setRouteError(res.error || 'Road routing unavailable');
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setIsRouting(false);
        setActivePolyline([]);
        setRouteError('Road routing unavailable');
      });

    return () => {
      controller.abort();
    };
  }, [origLat, origLng, destLat, destLng, waypointsKey, routePolyline, initialDistanceKm, initialDurationMinutes, currentKey]);

  // Prepare points for Leaflet map - never draw straight line between origin and destination
  const polylineJson = JSON.stringify(activePolyline.map((p) => [p.lat, p.lng]));
  const waypointsJson = JSON.stringify(waypoints.map((w) => ({ name: w.name, lat: w.lat, lng: w.lng })));
  const riderPosJson = JSON.stringify(riderLocation || deviceLocation || null);

  // Leaflet Dark Matter tiles configuration
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${isDark ? '#080B14' : '#F4F6F9'}; overflow: hidden; }
        .origin-marker {
          width: 18px; height: 18px; background: #20E85A; border: 3px solid #000; border-radius: 50%;
          box-shadow: 0 0 14px #20E85A;
        }
        .dest-marker {
          width: 22px; height: 22px; background: #20E85A; border: 2px solid #fff; border-radius: 4px;
          display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;
          box-shadow: 0 0 14px #20E85A; color: #000;
        }
        .rider-marker {
          width: 26px; height: 26px; background: #000; border: 2px solid #20E85A; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 13px;
          box-shadow: 0 0 18px #20E85A;
        }
        .waypoint-marker {
          width: 10px; height: 10px; background: #8AFFA5; border: 2px solid #000; border-radius: 50%;
        }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-bar { border: 1px solid #303747 !important; background: #191D2B !important; }
        .leaflet-bar a { background: #191D2B !important; color: #20E85A !important; border-bottom: 1px solid #303747 !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${origin.lat}, ${origin.lng}], 13);

        L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

        var polylinePoints = ${polylineJson};
        if (polylinePoints && polylinePoints.length > 0) {
          var polyline = L.polyline(polylinePoints, {
            color: '#20E85A',
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round'
          }).addTo(map);

          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          var group = L.featureGroup([
            L.marker([${origin.lat}, ${origin.lng}]),
            L.marker([${destination.lat}, ${destination.lng}])
          ]);
          map.fitBounds(group.getBounds(), { padding: [40, 40] });
        }

        // Add Origin Pin
        var originIcon = L.divIcon({ className: 'custom-icon', html: '<div class="origin-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
        L.marker([${origin.lat}, ${origin.lng}], { icon: originIcon }).addTo(map);

        // Add Destination Pin
        var destIcon = L.divIcon({ className: 'custom-icon', html: '<div class="dest-marker">🏁</div>', iconSize: [22, 22], iconAnchor: [11, 11] });
        L.marker([${destination.lat}, ${destination.lng}], { icon: destIcon }).addTo(map);

        // Add Intermediate Waypoints
        var waypoints = ${waypointsJson};
        waypoints.forEach(function(wp) {
          var wpIcon = L.divIcon({ className: 'custom-icon', html: '<div class="waypoint-marker"></div>', iconSize: [10, 10], iconAnchor: [5, 5] });
          L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map).bindPopup(wp.name);
        });

        // Add Live Rider Marker if GPS available
        var riderPos = ${riderPosJson};
        if (riderPos && riderPos.lat) {
          var riderIcon = L.divIcon({ className: 'custom-icon', html: '<div class="rider-marker">🏍️</div>', iconSize: [26, 26], iconAnchor: [13, 13] });
          L.marker([riderPos.lat, riderPos.lng], { icon: riderIcon }).addTo(map);
        }
      </script>
    </body>
    </html>
  `;

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
      {/* Real Map Tiles & Polyline Engine (Web / Native WebView compatible) */}
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Goflyp Route Map"
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          {/* Native fallback representation */}
          <View style={[styles.nativeMapCanvas, { backgroundColor: isDark ? '#080B14' : '#E2E8F0' }]}>
            <View style={styles.nativeCenterPrompt}>
              <Ionicons name="map" size={32} color={colors.accent} />
              <Text style={[styles.nativePromptTitle, { color: colors.textPrimary }]}>
                Alliance University Campus Corridor
              </Text>
              <Text style={[styles.nativePromptSub, { color: colors.textMuted }]}>
                {originName} → {destinationName}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Real Route Metrics HUD */}
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
          <View style={styles.routingLoadingRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={[styles.routingLoadingText, { color: colors.warning }]}>
              {routeError}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hudStat}>
              <Ionicons name="speedometer-outline" size={13} color={colors.accent} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>True Road Distance</Text>
              <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                {distanceKm !== undefined ? `${distanceKm} km` : '--'}
              </Text>
            </View>

            <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

            <View style={styles.hudStat}>
              <Ionicons name="time-outline" size={13} color={colors.accent} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>OSRM Travel ETA</Text>
              <Text style={[styles.hudValue, { color: colors.textPrimary }]}>
                {durationMinutes !== undefined ? `${durationMinutes} mins` : '--'}
              </Text>
            </View>

            <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

            <View style={styles.hudStat}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.hudLabel, { color: colors.textMuted }]}>Routing Provider</Text>
              <Text style={[styles.hudValue, { color: colors.success }]}>OSRM Road GPS</Text>
            </View>
          </>
        )}
      </View>

      {/* Floating Action Controls on Bottom Right */}
      {interactive && allowFullscreen && onExpand && (
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              {
                backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: colors.border,
              },
              Shadows.soft,
            ]}
            onPress={onExpand}
            activeOpacity={0.7}
            accessibilityLabel="Maximize Map"
          >
            <Ionicons name="expand" size={17} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* GPS Location Status Indicator - Only shown when live GPS trip telemetry is active */}
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
                  backgroundColor:
                    locationPermission === 'granted' ? colors.accent : colors.warning,
                },
              ]}
            />
            <Text style={[styles.gpsText, { color: colors.textSecondary }]}>
              {locationPermission === 'granted' ? 'Device GPS Active' : 'GPS Permission Needed'}
            </Text>
          </View>
        </View>
      )}
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
  gpsStatusBadge: {
    position: 'absolute',
    bottom: 8,
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
  nativeMapCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nativeCenterPrompt: {
    alignItems: 'center',
  },
  nativePromptTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 8,
  },
  nativePromptSub: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
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
});
