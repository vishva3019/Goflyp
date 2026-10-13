import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Shadows } from '../../constants/theme';

interface DestinationMarkerProps {
  size?: number;
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({ size = 34 }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.markerPin,
          {
            backgroundColor: colors.accent,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          Shadows.glowGreen,
        ]}
      >
        <Ionicons name="flag" size={16} color="#000000" />
      </View>
      <View style={[styles.arrow, { borderTopColor: colors.accent }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
