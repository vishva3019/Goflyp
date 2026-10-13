import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function WelcomeRoleSelectionScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { setActiveRole } = useAuth();

  const handleSelectRole = (role: 'captain' | 'rider') => {
    setActiveRole(role);
    router.push({
      pathname: '/auth/login',
      params: { role },
    });
  };

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
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={[styles.brandIcon, { backgroundColor: colors.accent }]}>
          <Ionicons name="flash" size={28} color="#05070E" />
        </View>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
          GO<Text style={{ color: colors.accent }}>FLYP</Text>
        </Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Share the ride. Split the journey.
        </Text>
        <View style={styles.allianceBadge}>
          <Ionicons name="school-outline" size={13} color={colors.accent} />
          <Text style={[styles.allianceText, { color: colors.textPrimary }]}>
            Alliance University Student Mobility
          </Text>
        </View>
      </View>

      {/* Role Selection Cards */}
      <View style={styles.rolesContainer}>
        {/* Role A: Captain */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.roleCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            Shadows.soft,
          ]}
          onPress={() => handleSelectRole('captain')}
        >
          <View style={styles.roleCardTop}>
            <View
              style={[
                styles.roleIconCircle,
                { backgroundColor: 'rgba(32, 232, 90, 0.15)' },
              ]}
            >
              <Ionicons name="bicycle" size={26} color={colors.accent} />
            </View>
            <View style={[styles.roleTag, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.roleTagText, { color: colors.accent }]}>Motorcycle Owner</Text>
            </View>
          </View>

          <Text style={[styles.roleName, { color: colors.textPrimary }]}>
            Continue as Captain
          </Text>
          <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
            Publish journeys you already plan to take. Share your spare pillion seat with verified peers and split fuel contributions.
          </Text>

          <View style={styles.roleActionRow}>
            <Text style={[styles.actionPrompt, { color: colors.accent }]}>
              Captain Login & Onboarding
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Role B: Rider */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.roleCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            Shadows.soft,
          ]}
          onPress={() => handleSelectRole('rider')}
        >
          <View style={styles.roleCardTop}>
            <View
              style={[
                styles.roleIconCircle,
                { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
              ]}
            >
              <Ionicons name="person" size={24} color="#38BDF8" />
            </View>
            <View style={[styles.roleTag, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.roleTagText, { color: '#38BDF8' }]}>Passenger</Text>
            </View>
          </View>

          <Text style={[styles.roleName, { color: colors.textPrimary }]}>
            Continue as Rider
          </Text>
          <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
            Discover verified student motorcycle journeys on your route. Request a seat, meet at campus gates, and travel safely.
          </Text>

          <View style={styles.roleActionRow}>
            <Text style={[styles.actionPrompt, { color: '#38BDF8' }]}>
              Rider Login & Discovery
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Student Mobility Footer */}
      <View style={styles.footerRow}>
        <Text style={[styles.mobilityDisclaimer, { color: colors.textMuted }]}>
          Exclusive to Alliance University students with verified @ced.alliance.edu.in accounts
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    marginTop: 10,
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#20E85A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 4,
  },
  allianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#303747',
    marginTop: 12,
    gap: 6,
  },
  allianceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  rolesContainer: {
    gap: 16,
    marginVertical: 20,
  },
  roleCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    padding: 20,
  },
  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  roleName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 6,
  },
  roleDescription: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    marginBottom: 14,
  },
  roleActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionPrompt: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  footerRow: {
    alignItems: 'center',
  },
  mobilityDisclaimer: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
