import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import {
  ALLIANCE_CAMPUS_NAME,
  ALLIANCE_CAMPUS_ADDRESS,
  ALLIANCE_CAMPUS_LAT,
  ALLIANCE_CAMPUS_LNG,
} from '../../constants/campus';
import { VERIFIED_CAMPUS_HUBS, CampusHub } from '../../constants/campusHubs';
import { ApiClient } from '../../services/api';
import { LatLng } from '../../types';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
  } catch (e) {
    // Graceful fallback for non-native environments
  }
}

export interface LocationPickerModalProps {
  visible: boolean;
  mode: 'pickup' | 'destination';
  initialLocation?: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
  };
  onConfirm: (location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  mode,
  initialLocation,
  onConfirm,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  // Initial Coordinates default to Alliance Campus if not provided
  const defaultLat = initialLocation?.lat || ALLIANCE_CAMPUS_LAT;
  const defaultLng = initialLocation?.lng || ALLIANCE_CAMPUS_LNG;
  const defaultName = initialLocation?.name || (mode === 'pickup' ? ALLIANCE_CAMPUS_NAME : 'Selected Destination');
  const defaultAddress = initialLocation?.address || ALLIANCE_CAMPUS_ADDRESS;

  const [currentCoords, setCurrentCoords] = useState<LatLng>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [placeName, setPlaceName] = useState<string>(defaultName);
  const [placeAddress, setPlaceAddress] = useState<string>(defaultAddress);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isCenterUserLoading, setIsCenterUserLoading] = useState<boolean>(false);

  const debounceTimerRef = useRef<any>(null);

  // Sync initial location when modal opens
  useEffect(() => {
    if (visible) {
      const lat = initialLocation?.lat || ALLIANCE_CAMPUS_LAT;
      const lng = initialLocation?.lng || ALLIANCE_CAMPUS_LNG;
      const name = initialLocation?.name || (mode === 'pickup' ? ALLIANCE_CAMPUS_NAME : 'Selected Destination');
      const address = initialLocation?.address || ALLIANCE_CAMPUS_ADDRESS;

      setCurrentCoords({ lat, lng });
      setPlaceName(name);
      setPlaceAddress(address);
      setSearchQuery('');
      setSearchResults([]);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          400
        );
      }
    }
  }, [visible, initialLocation, mode]);

  // Reverse geocodes coordinates to a human-readable location
  const performReverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      // 1. Proximity check with verified campus hubs first (< 250m)
      for (const hub of VERIFIED_CAMPUS_HUBS) {
        const dLat = (hub.lat - lat) * 111000;
        const dLng = (hub.lng - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist < 250) {
          setPlaceName(hub.name);
          setPlaceAddress(hub.address);
          setIsGeocoding(false);
          return;
        }
      }

      // 2. Query backend reverse geocode
      const res = await ApiClient.reverseGeocode(lat, lng);
      if (res && res.name) {
        setPlaceName(res.name);
        setPlaceAddress(res.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setPlaceName(`Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setPlaceAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (err) {
      setPlaceName(`Selected Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setPlaceAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Map drag / region change completion
  const handleRegionChangeComplete = (region: any) => {
    if (!region || !region.latitude || !region.longitude) return;
    const lat = region.latitude;
    const lng = region.longitude;

    setCurrentCoords({ lat, lng });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performReverseGeocode(lat, lng);
    }, 450);
  };

  // Center on verified campus hub
  const handleSelectHub = (hub: CampusHub) => {
    Keyboard.dismiss();
    setPlaceName(hub.name);
    setPlaceAddress(hub.address);
    setCurrentCoords({ lat: hub.lat, lng: hub.lng });
    setSearchResults([]);
    setSearchQuery('');

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: hub.lat,
          longitude: hub.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );
    }
  };

  // Search input handler
  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() || text.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await ApiClient.searchPlaces(text.trim());
      setSearchResults(res.places || []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select search result
  const handleSelectSearchResult = (place: any) => {
    Keyboard.dismiss();
    setPlaceName(place.name);
    setPlaceAddress(place.address);
    setCurrentCoords({ lat: place.lat, lng: place.lng });
    setSearchResults([]);
    setSearchQuery(place.name);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  // Center on device GPS (Optional, does not block manual selection if not allowed)
  const handleCenterOnUser = async () => {
    setIsCenterUserLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setCurrentCoords({ lat, lng });

        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            600
          );
        }
        performReverseGeocode(lat, lng);
      } else {
        // Center on Alliance Campus when permission denied
        handleCenterOnCampus();
      }
    } catch (err) {
      handleCenterOnCampus();
    } finally {
      setIsCenterUserLoading(false);
    }
  };

  const handleCenterOnCampus = () => {
    setCurrentCoords({ lat: ALLIANCE_CAMPUS_LAT, lng: ALLIANCE_CAMPUS_LNG });
    setPlaceName(ALLIANCE_CAMPUS_NAME);
    setPlaceAddress(ALLIANCE_CAMPUS_ADDRESS);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: ALLIANCE_CAMPUS_LAT,
          longitude: ALLIANCE_CAMPUS_LNG,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  const handleConfirmSelection = () => {
    onConfirm({
      name: placeName,
      address: placeAddress,
      lat: currentCoords.lat,
      lng: currentCoords.lng,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Native Apple Maps MapView */}
        {MapView ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: defaultLat,
              longitude: defaultLng,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            }}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={true}
            onRegionChangeComplete={handleRegionChangeComplete}
          />
        ) : (
          <View style={[styles.webFallback, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="map-outline" size={48} color={colors.accent} />
            <Text style={[styles.webFallbackText, { color: colors.textPrimary }]}>
              Apple MapKit (Native iOS View)
            </Text>
          </View>
        )}

        {/* Fixed Center Pin / Crosshair Pointer */}
        <View pointerEvents="none" style={styles.centerCrosshairContainer}>
          <View style={styles.pinWrapper}>
            <View
              style={[
                styles.pinHead,
                {
                  backgroundColor: mode === 'pickup' ? colors.accent : '#38BDF8',
                  borderColor: '#000000',
                },
                Shadows.card,
              ]}
            >
              <Ionicons
                name={mode === 'pickup' ? 'bicycle' : 'flag'}
                size={18}
                color="#000000"
              />
            </View>
            <View style={[styles.pinTail, { borderTopColor: mode === 'pickup' ? colors.accent : '#38BDF8' }]} />
            <View style={styles.pinShadow} />
          </View>
        </View>

        {/* Top Header Overlay */}
        <SafeAreaView style={styles.topOverlay} edges={['top']}>
          <View
            style={[
              styles.headerBar,
              {
                backgroundColor: isDark ? 'rgba(16, 21, 34, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                borderColor: colors.border,
              },
              Shadows.card,
            ]}
          >
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Cancel"
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleCol}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {mode === 'pickup' ? 'Choose Pickup Pin' : 'Choose Destination Pin'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.accent }]}>
                Drag map to position pin
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={handleCenterOnCampus}
              activeOpacity={0.7}
              accessibilityLabel="Center on Campus"
            >
              <Ionicons name="school-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Quick Search Input */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? 'rgba(16, 21, 34, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                borderColor: colors.border,
              },
              Shadows.card,
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search campus hub, metro, or landmark..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          {/* Search Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <View
              style={[
                styles.searchResultsDropdown,
                {
                  backgroundColor: isDark ? 'rgba(16, 21, 34, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  borderColor: colors.border,
                },
                Shadows.card,
              ]}
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <Ionicons
                    name={item.isCampusLocation ? 'school' : 'location'}
                    size={16}
                    color={colors.accent}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchResultName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.searchResultAddress, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Horizontal Quick Campus Hubs Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hubsScroll}
          >
            {VERIFIED_CAMPUS_HUBS.map((hub) => (
              <TouchableOpacity
                key={hub.id}
                style={[
                  styles.hubChip,
                  {
                    backgroundColor: isDark ? 'rgba(25, 29, 43, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: colors.border,
                  },
                  Shadows.soft,
                ]}
                onPress={() => handleSelectHub(hub)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hub.isCampusGate ? 'school-outline' : 'navigate-outline'}
                  size={12}
                  color={colors.accent}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.hubChipText, { color: colors.textPrimary }]}>
                  {hub.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>

        {/* Floating Controls (GPS / Center) */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[
              styles.floatingBtn,
              {
                backgroundColor: isDark ? 'rgba(25, 29, 43, 0.94)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: colors.border,
              },
              Shadows.card,
            ]}
            onPress={handleCenterOnUser}
            activeOpacity={0.7}
            accessibilityLabel="My Location"
          >
            {isCenterUserLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="locate" size={20} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Confirmation Card */}
        <SafeAreaView style={styles.bottomOverlay} edges={['bottom']}>
          <View
            style={[
              styles.bottomCard,
              {
                backgroundColor: isDark ? 'rgba(16, 21, 34, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: colors.border,
              },
              Shadows.card,
            ]}
          >
            {/* Location Label Row */}
            <View style={styles.locationHeaderRow}>
              <View
                style={[
                  styles.modePill,
                  {
                    backgroundColor: mode === 'pickup' ? 'rgba(32, 232, 90, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    borderColor: mode === 'pickup' ? colors.accent : '#38BDF8',
                  },
                ]}
              >
                <Ionicons
                  name={mode === 'pickup' ? 'location' : 'flag'}
                  size={12}
                  color={mode === 'pickup' ? colors.accent : '#38BDF8'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.modePillText,
                    { color: mode === 'pickup' ? colors.accent : '#38BDF8' },
                  ]}
                >
                  {mode === 'pickup' ? 'PICKUP' : 'DESTINATION'}
                </Text>
              </View>

              {isGeocoding && (
                <View style={styles.geocodingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.geocodingText, { color: colors.textMuted }]}>
                    Resolving place...
                  </Text>
                </View>
              )}
            </View>

            {/* Place Name and Address */}
            <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={2}>
              {placeName}
            </Text>
            <Text style={[styles.placeAddress, { color: colors.textSecondary }]} numberOfLines={2}>
              {placeAddress}
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={handleConfirmSelection}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-sharp" size={18} color="#05070E" style={{ marginRight: 6 }} />
                <Text style={styles.confirmBtnText}>
                  {mode === 'pickup' ? 'Confirm Pickup' : 'Confirm Destination'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallbackText: {
    marginTop: 12,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  centerCrosshairContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinWrapper: {
    alignItems: 'center',
    marginBottom: 40, // Offsets pin so the tip points to center
  },
  pinHead: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pinShadow: {
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: 2,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: 6,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCol: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    fontWeight: Typography.fontWeight.medium,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    paddingVertical: 0,
  },
  searchResultsDropdown: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  searchResultName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  searchResultAddress: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  hubsScroll: {
    paddingVertical: 8,
    gap: 8,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  hubChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 240,
    zIndex: 20,
    gap: 10,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bottomCard: {
    padding: 16,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 0.5,
  },
  geocodingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  geocodingText: {
    fontSize: Typography.fontSize.xs,
  },
  placeName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 16,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
});
