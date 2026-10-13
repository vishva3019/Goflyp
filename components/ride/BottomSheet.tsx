import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Shadows } from '../../constants/theme';

interface BottomSheetProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  style,
  contentStyle,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
          borderColor: colors.border,
        },
        Shadows.card,
        style,
      ]}
    >
      <View style={styles.handleContainer}>
        <View style={[styles.handlePill, { backgroundColor: colors.border }]} />
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl + 4,
    borderTopRightRadius: BorderRadius.xxl + 4,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handlePill: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
});
