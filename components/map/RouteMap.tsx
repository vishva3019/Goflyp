import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PickupMarker } from './PickupMarker';
import { DestinationMarker } from './DestinationMarker';
import { Typography, BorderRadius, Shadows } from '../../constants/theme';
import { Waypoint } from '../../types';

interface RouteMapProps {
  pickupName?: string;
  destinationName?: string;
  waypoints?: Waypoint[];
  distance?: string;
  duration?: string;
  riderProgress?: number; // 0 to 1
  riderName?: string;
  height?: number;
  style?: ViewStyle;
  showHUD?: boolean;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  pickupName = 'Alliance University Main Gate',
  destinationName = 'Electronic City Metro (Phase 1)',
  waypoints = [],
  distance = '6.8 km',
  duration = '18 mins',
  riderProgress = 0.42,
  riderName,
  height = 320,
  style,
  showHUD = true,
}) => {
  const { colors, isDark } = useTheme();
  const [zoomLevel, setZoomLevel] = useState(1);

  // SVG / Canvas-style coordinate mapping for dark visual route
  const startX = 60;
  const startY = height - 70;
  const endX = Dimensions.get('window').width > 450 ? 320 : Dimensions.get('window').width - 70;
  const endY = 80;

  // Intermediate curves
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Rider position along path
  const riderX = startX + (endX - startX) * riderProgress;
  const riderY = startY + (endY - startY) * riderProgress - Math.sin(riderProgress * Math.PI) * 45;

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: isDark ? '#090D18' : '#E2E8F0',
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {/* Dark Map Grid & Road Canvas */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Subtle road grid lines */}
        <View style={[styles.gridRoadH, { top: '25%', backgroundColor: colors.mapRoad }]} />
        <View style={[styles.gridRoadH, { top: '55%', backgroundColor: colors.mapRoad }]} />
        <View style={[styles.gridRoadH, { top: '80%', backgroundColor: colors.mapRoad }]} />
        <View style={[styles.gridRoadV, { left: '20%', backgroundColor: colors.mapRoad }]} />
        <View style={[styles.gridRoadV, { left: '50%', backgroundColor: colors.mapRoad }]} />
        <View style={[styles.gridRoadV, { left: '78%', backgroundColor: colors.mapRoad }]} />

        {/* Diagonal Arterial Highway */}
        <View
          style={[
            styles.diagonalRoad,
            {
              backgroundColor: isDark ? '#141B2D' : '#CBD5E1',
            },
          ]}
        />

        {/* Glowing Neon Green Route Polyline simulation */}
        <View
          style={[
            styles.routeGlowSegment1,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        />
        <View
          style={[
            styles.routeGlowSegment2,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        />
        <View
          style={[
            styles.routeGlowSegment3,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        />
      </View>

      {/* Origin Pickup Marker */}
      <View style={[styles.markerWrapper, { left: startX - 16, top: startY - 16 }]}>
        <PickupMarker size={30} showPulse={true} />
        <View
          style={[
            styles.markerTag,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.markerTagText, { color: colors.textPrimary }]} numberOfLines={1}>
            {pickupName.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* Waypoint markers */}
      {waypoints.map((wp, idx) => {
        const wpProgress = (idx + 1) / (waypoints.length + 1);
        const wpX = startX + (endX - startX) * wpProgress;
        const wpY = startY + (endY - startY) * wpProgress - Math.sin(wpProgress * Math.PI) * 35;
        return (
          <View key={wp.id} style={[styles.waypointDotWrapper, { left: wpX - 8, top: wpY - 8 }]}>
            <View style={[styles.waypointDot, { backgroundColor: colors.accentSecondary }]} />
          </View>
        );
      })}

      {/* Destination Marker */}
      <View style={[styles.markerWrapper, { left: endX - 17, top: endY - 26 }]}>
        <DestinationMarker size={32} />
        <View
          style={[
            styles.markerTag,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              top: 36,
            },
          ]}
        >
          <Text style={[styles.markerTagText, { color: colors.textPrimary }]} numberOfLines={1}>
            {destinationName.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* Live Rider Motorcycle Position */}
      <View
        style={[
          styles.riderMarkerWrapper,
          {
            left: riderX - 18,
            top: riderY - 18,
          },
        ]}
      >
        <View
          style={[
            styles.riderAura,
            {
              backgroundColor: colors.accentGlow,
            },
          ]}
        />
        <View
          style={[
            styles.riderBadge,
            {
              backgroundColor: colors.background,
              borderColor: colors.accent,
            },
          ]}
        >
          <Ionicons name="bicycle" size={18} color={colors.accent} />
        </View>
        {riderName ? (
          <View style={[styles.riderLabel, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.riderLabelText, { color: colors.accent }]}>{riderName}</Text>
          </View>
        ) : null}
      </View>

      {/* Top Map HUD: Live Route Metrics */}
      {showHUD && (
        <View
          style={[
            styles.routeHud,
            {
              backgroundColor: isDark ? 'rgba(16, 21, 34, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: colors.border,
            },
            Shadows.soft,
          ]}
        >
          <View style={styles.hudStat}>
            <Ionicons name="speedometer-outline" size={14} color={colors.accent} />
            <Text style={[styles.hudLabel, { color: colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.hudValue, { color: colors.textPrimary }]}>{distance}</Text>
          </View>

          <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

          <View style={styles.hudStat}>
            <Ionicons name="time-outline" size={14} color={colors.accent} />
            <Text style={[styles.hudLabel, { color: colors.textSecondary }]}>ETA</Text>
            <Text style={[styles.hudValue, { color: colors.textPrimary }]}>{duration}</Text>
          </View>

          <View style={[styles.hudDivider, { backgroundColor: colors.border }]} />

          <View style={styles.hudStat}>
            <View style={[styles.trafficDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.hudLabel, { color: colors.textSecondary }]}>Traffic</Text>
            <Text style={[styles.hudValue, { color: colors.success }]}>Smooth</Text>
          </View>
        </View>
      )}

      {/* Map Control Tools & Development Preview Badge */}
      <View style={styles.controlsOverlay}>
        <View
          style={[
            styles.devBadge,
            {
              backgroundColor: isDark ? 'rgba(16, 21, 34, 0.8)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.devBadgeText, { color: colors.textMuted }]}>
            Goflyp Route Engine • Active
          </Text>
        </View>

        <View style={styles.zoomButtons}>
          <TouchableOpacity
            style={[
              styles.zoomBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}
          >
            <Ionicons name="add" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.zoomBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 6,
              },
            ]}
            onPress={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
          >
            <Ionicons name="remove" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  gridRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    opacity: 0.6,
  },
  gridRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    opacity: 0.6,
  },
  diagonalRoad: {
    position: 'absolute',
    width: '140%',
    height: 22,
    top: '40%',
    left: '-20%',
    transform: [{ rotate: '-24deg' }],
    opacity: 0.85,
  },
  routeGlowSegment1: {
    position: 'absolute',
    width: 130,
    height: 6,
    borderRadius: 3,
    bottom: 75,
    left: 65,
    transform: [{ rotate: '-32deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  routeGlowSegment2: {
    position: 'absolute',
    width: 120,
    height: 6,
    borderRadius: 3,
    top: 135,
    left: 145,
    transform: [{ rotate: '-18deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  routeGlowSegment3: {
    position: 'absolute',
    width: 90,
    height: 6,
    borderRadius: 3,
    top: 95,
    right: 70,
    transform: [{ rotate: '-38deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerTag: {
    position: 'absolute',
    top: -24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  markerTagText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
  },
  waypointDotWrapper: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9,
  },
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#080B14',
  },
  riderMarkerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  riderAura: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  riderBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#20E85A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  riderLabel: {
    position: 'absolute',
    bottom: -18,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  riderLabelText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  routeHud: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    zIndex: 30,
  },
  hudStat: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: Typography.fontWeight.medium,
  },
  hudValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 1,
  },
  hudDivider: {
    width: 1,
    height: 24,
  },
  trafficDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 30,
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
  zoomButtons: {
    flexDirection: 'column',
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
