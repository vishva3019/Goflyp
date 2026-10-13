import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface PickupMarkerProps {
  size?: number;
  showPulse?: boolean;
}

export const PickupMarker: React.FC<PickupMarkerProps> = ({ size = 32, showPulse = true }) => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!showPulse) return;
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 2.2,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [showPulse, pulseAnim, pulseOpacity]);

  return (
    <View style={styles.container}>
      {showPulse && (
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.accent,
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.markerBody,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.background,
            borderColor: colors.accent,
          },
        ]}
      >
        <View
          style={[
            styles.innerDot,
            {
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
  },
  markerBody: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#20E85A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
