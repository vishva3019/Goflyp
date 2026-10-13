import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function AdminWebRedirectScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top + 20 : 30,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 185, 66, 0.15)' }]}>
          <Ionicons name="desktop-outline" size={36} color="#F5B942" />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Alliance Administration Console
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          The Goflyp Super Admin and Campus Security portal is restricted to authorized university personnel and is accessible exclusively via the web management dashboard.
        </Text>

        <View style={[styles.urlBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="globe-outline" size={14} color="#F5B942" />
          <Text style={[styles.urlText, { color: colors.textPrimary }]}>
            https://admin.goflyp.alliance.edu.in
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.returnButton, { backgroundColor: colors.accent }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.88}
        >
          <Ionicons name="arrow-back" size={18} color="#05070E" />
          <Text style={styles.returnButtonText}>Return to Goflyp App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
    borderRadius: BorderRadius.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  urlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: 32,
  },
  urlText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    width: '100%',
    justifyContent: 'center',
  },
  returnButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
});
