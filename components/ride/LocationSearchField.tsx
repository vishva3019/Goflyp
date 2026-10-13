import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { VERIFIED_CAMPUS_HUBS, CampusHub } from '../../constants/campusHubs';
import { ApiClient } from '../../services/api';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  isCampus?: boolean;
}

interface LocationSearchFieldProps {
  pickup: string;
  destination: string;
  onPickupChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onSwap?: () => void;
  onSelectHub?: (hub: string, target: 'pickup' | 'destination') => void;
  onSelectCoordinates?: (coords: LocationCoordinates, target: 'pickup' | 'destination') => void;
  pickupCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  style?: ViewStyle;
}

export const LocationSearchField: React.FC<LocationSearchFieldProps> = ({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  onSwap,
  onSelectHub,
  onSelectCoordinates,
  pickupCoords,
  destCoords,
  style,
}) => {
  const { colors, isDark } = useTheme();

  // Active focus & search state
  const [activeTarget, setActiveTarget] = useState<'pickup' | 'destination' | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<LocationCoordinates[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const searchDebounceRef = useRef<any>(null);

  // Perform real geocoding search using Apple Core Location & Backend catalog
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !activeTarget) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results: LocationCoordinates[] = [];
      const queryLower = searchQuery.toLowerCase().trim();

      // 1. Check verified campus gates & hubs
      const matchedHubs = VERIFIED_CAMPUS_HUBS.filter(
        (h) =>
          h.name.toLowerCase().includes(queryLower) ||
          h.address.toLowerCase().includes(queryLower)
      );
      matchedHubs.forEach((h) => {
        results.push({
          name: h.name,
          address: h.address,
          lat: h.lat,
          lng: h.lng,
          isCampus: h.isCampusGate,
        });
      });

      // 2. Query Apple Core Location Geocoder (Native iOS)
      try {
        const geoResults = await Location.geocodeAsync(`${searchQuery}, Bengaluru, India`);
        if (geoResults && geoResults.length > 0) {
          for (let i = 0; i < Math.min(geoResults.length, 3); i++) {
            const item = geoResults[i];
            // Format nice label
            const formattedName = `${searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1)}`;
            // Avoid duplicate coordinates
            const isDup = results.some(
              (r) => Math.abs(r.lat - item.latitude) < 0.001 && Math.abs(r.lng - item.longitude) < 0.001
            );
            if (!isDup) {
              results.push({
                name: formattedName,
                address: `Geocoded via Apple Core Location (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)})`,
                lat: item.latitude,
                lng: item.longitude,
                isCampus: false,
              });
            }
          }
        }
      } catch (e) {
        // Fallback to backend place search
      }

      // 3. Fallback / supplement with backend places API if needed
      if (results.length < 3) {
        try {
          const apiRes = await ApiClient.searchPlaces(searchQuery);
          if (apiRes && apiRes.places) {
            apiRes.places.forEach((p: any) => {
              const isDup = results.some(
                (r) => Math.abs(r.lat - p.lat) < 0.001 && Math.abs(r.lng - p.lng) < 0.001
              );
              if (!isDup) {
                results.push({
                  name: p.name,
                  address: p.address,
                  lat: p.lat,
                  lng: p.lng,
                  isCampus: p.isCampusLocation,
                });
              }
            });
          }
        } catch (e) {
          // Keep whatever results we found
        }
      }

      setSuggestions(results.slice(0, 6));
      setIsSearching(false);
    }, 280);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, activeTarget]);

  // Handle "Use Current Location" via Apple Core Location
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLocating(false);
        return;
      }

      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out')), 3500)
      );
      const position = await Promise.race([positionPromise, timeoutPromise]);

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get human-readable road address
      let resolvedAddress = 'Current GPS Location';
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseResults && reverseResults.length > 0) {
          const r = reverseResults[0];
          const parts = [
            r.name || r.street,
            r.district || r.subregion || r.city,
          ].filter(Boolean);
          if (parts.length > 0) {
            resolvedAddress = parts.join(', ');
          }
        }
      } catch (err) {
        resolvedAddress = `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      }

      onPickupChange(resolvedAddress);

      if (onSelectCoordinates) {
        onSelectCoordinates(
          {
            name: resolvedAddress,
            address: `GPS Coordinate: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            lat: latitude,
            lng: longitude,
            isCampus: false,
          },
          'pickup'
        );
      }

      setActiveTarget(null);
      setSuggestions([]);
    } catch (e) {
      // Graceful fallback
    } finally {
      setIsLocating(false);
    }
  };

  // Select a suggestion
  const handleSelectSuggestion = (item: LocationCoordinates) => {
    if (!activeTarget) return;

    if (activeTarget === 'pickup') {
      onPickupChange(item.name);
    } else {
      onDestinationChange(item.name);
    }

    if (onSelectCoordinates) {
      onSelectCoordinates(item, activeTarget);
    }

    if (onSelectHub) {
      onSelectHub(item.name, activeTarget);
    }

    setActiveTarget(null);
    setSuggestions([]);
    setSearchQuery('');
  };

  // Select a campus hub chip
  const handleChipSelect = (hub: CampusHub) => {
    const target: 'pickup' | 'destination' = destination ? 'pickup' : 'destination';

    if (target === 'pickup') {
      onPickupChange(hub.name);
    } else {
      onDestinationChange(hub.name);
    }

    if (onSelectCoordinates) {
      onSelectCoordinates(
        {
          name: hub.name,
          address: hub.address,
          lat: hub.lat,
          lng: hub.lng,
          isCampus: hub.isCampusGate,
        },
        target
      );
    }

    if (onSelectHub) {
      onSelectHub(hub.name, target);
    }

    setActiveTarget(null);
    setSuggestions([]);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Search Input Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          Shadows.soft,
        ]}
      >
        {/* Left Indicator Line with Origin/Destination nodes */}
        <View style={styles.indicatorCol}>
          <View
            style={[
              styles.originDot,
              {
                borderColor: colors.accent,
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={[styles.innerOriginDot, { backgroundColor: colors.accent }]} />
          </View>
          <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
          <View
            style={[
              styles.destDot,
              {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <Ionicons name="flag" size={10} color="#000000" />
          </View>
        </View>

        {/* Text Input Rows */}
        <View style={styles.inputsCol}>
          {/* Pickup Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Pickup gate, current location, campus hub..."
              placeholderTextColor={colors.textMuted}
              value={pickup}
              onChangeText={(text) => {
                onPickupChange(text);
                setActiveTarget('pickup');
                setSearchQuery(text);
              }}
              onFocus={() => {
                setActiveTarget('pickup');
                setSearchQuery(pickup);
              }}
            />

            {/* GPS Location Button */}
            <TouchableOpacity
              style={[
                styles.gpsIconBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="locate" size={14} color={colors.accent} />
              )}
            </TouchableOpacity>

            {pickup.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onPickupChange('');
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.inputDivider, { backgroundColor: colors.border }]} />

          {/* Destination Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Where to? (e.g. Silk Board, Metro, Koramangala)"
              placeholderTextColor={colors.textMuted}
              value={destination}
              onChangeText={(text) => {
                onDestinationChange(text);
                setActiveTarget('destination');
                setSearchQuery(text);
              }}
              onFocus={() => {
                setActiveTarget('destination');
                setSearchQuery(destination);
              }}
            />
            {destination.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onDestinationChange('');
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Swap Button */}
        {onSwap && (
          <TouchableOpacity
            style={[
              styles.swapButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            onPress={onSwap}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Real Geocoding Coordinates Telemetry Badge */}
      {(pickupCoords || destCoords) && (
        <View style={styles.coordsBadgeRow}>
          <View
            style={[
              styles.coordsPill,
              {
                backgroundColor: isDark ? '#101522' : '#EAEFF5',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="compass-outline" size={11} color={colors.accent} />
            <Text style={[styles.coordsText, { color: colors.textSecondary }]}>
              {pickupCoords
                ? `Origin: ${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)}`
                : 'Alliance Gate'}{' '}
              {destCoords ? `→ Dest: ${destCoords.lat.toFixed(4)}, ${destCoords.lng.toFixed(4)}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Live Geocoding Suggestions Popover */}
      {suggestions.length > 0 && activeTarget && (
        <View
          style={[
            styles.suggestionsDropdown,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            Shadows.card,
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={[styles.dropdownTitle, { color: colors.textMuted }]}>
              {activeTarget === 'pickup' ? 'SELECT PICKUP LOCATION' : 'SELECT DESTINATION'}
            </Text>
            {isSearching && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={`sug_${idx}_${item.lat}_${item.lng}`}
              style={[
                styles.suggestionItem,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: idx === suggestions.length - 1 ? 0 : 0.5,
                },
              ]}
              onPress={() => handleSelectSuggestion(item)}
            >
              <View
                style={[
                  styles.suggestionIconBox,
                  {
                    backgroundColor: item.isCampus
                      ? 'rgba(32, 232, 90, 0.15)'
                      : colors.surfaceElevated,
                  },
                ]}
              >
                <Ionicons
                  name={item.isCampus ? 'school-outline' : 'location-sharp'}
                  size={15}
                  color={item.isCampus ? colors.accent : colors.textPrimary}
                />
              </View>

              <View style={styles.suggestionDetails}>
                <View style={styles.suggestionTitleRow}>
                  <Text
                    style={[styles.suggestionName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.isCampus && (
                    <View
                      style={[
                        styles.campusBadge,
                        { backgroundColor: 'rgba(32, 232, 90, 0.15)' },
                      ]}
                    >
                      <Text style={[styles.campusBadgeText, { color: colors.accent }]}>Campus</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.suggestionAddress, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {item.address || `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                </Text>
              </View>

              <View style={styles.coordSnippet}>
                <Text style={[styles.coordSnippetText, { color: colors.accent }]}>
                  {item.lat.toFixed(3)},{item.lng.toFixed(3)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Campus Hub Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hubChipsContainer}
      >
        {VERIFIED_CAMPUS_HUBS.slice(0, 6).map((hub) => (
          <TouchableOpacity
            key={hub.id}
            style={[
              styles.hubChip,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleChipSelect(hub)}
          >
            <Ionicons
              name={hub.isCampusGate ? 'school-outline' : 'location-outline'}
              size={12}
              color={colors.accent}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.hubChipText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {hub.name.split(' ')[0]} {hub.name.split(' ')[1] || ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative',
    zIndex: 50,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  indicatorCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginRight: 12,
    height: 74,
  },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOriginDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
  },
  destDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    paddingVertical: 0,
  },
  gpsIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  inputDivider: {
    height: 1,
    marginVertical: 4,
  },
  swapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  coordsBadgeRow: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  coordsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  coordsText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 98,
    left: 0,
    right: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    zIndex: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dropdownTitle: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionDetails: {
    flex: 1,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  campusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  campusBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  suggestionAddress: {
    fontSize: Typography.fontSize.xs,
    marginTop: 1,
  },
  coordSnippet: {
    marginLeft: 8,
  },
  coordSnippetText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
  },
  hubChipsContainer: {
    paddingVertical: 10,
    gap: 8,
  },
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  hubChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
