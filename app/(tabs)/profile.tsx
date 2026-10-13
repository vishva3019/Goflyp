import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useRides } from '../../context/RideContext';
import { Header } from '../../components/layout/Header';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, activeRole, setActiveRole, logout } = useAuth();
  const { riderBookings, captainRides } = useRides();

  const handleHelpSafety = () => {
    Alert.alert(
      'Campus Safety & Support',
      'Alliance University Campus Security: 080-4619-9000\nGoflyp Student Safety Desk: safety@goflyp.app\n\nAll rides are covered under the Campus Peer Code of Conduct.'
    );
  };

  const handleVerifyPortal = () => {
    Alert.alert(
      'Student Identity Status',
      `Student: ${user?.fullName || 'Alliance Student'}\nEmail: ${user?.email || 'N/A'}\nRegistration: ${user?.regNumber || 'Verified'}\nDepartment: ${user?.department || 'Alliance University'}\nStatus: ${user?.isVerified ? 'Active & Approved' : 'Pending Verification'}`
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Goflyp?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth');
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 8,
        },
      ]}
    >
      <Header title="Student Profile" showBack={false} showProfile={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Profile Identity Card */}
        {isAuthenticated && user ? (
          <View
            style={[
              styles.identityCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              Shadows.soft,
            ]}
          >
            <View style={styles.topProfileRow}>
              <View
                style={[
                  styles.avatarLargeFallback,
                  { backgroundColor: activeRole === 'captain' ? colors.accent : '#38BDF8' },
                ]}
              >
                <Text style={styles.avatarLargeInitial}>
                  {user.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.studentName, { color: colors.textPrimary }]}>
                    {user.fullName}
                  </Text>
                  {user.isVerified && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.accent}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.editProfileBtn,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    onPress={() => router.push('/profile/edit')}
                  >
                    <Ionicons name="create-outline" size={13} color={colors.accent} />
                    <Text style={[styles.editProfileText, { color: colors.accent }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.deptText, { color: colors.textSecondary }]}>
                  {user.department || 'Alliance University'}
                </Text>
                <Text style={[styles.uniText, { color: colors.textMuted }]}>
                  {user.email}
                </Text>
                <View style={{ marginTop: 8 }}>
                  <VerificationBadge
                    label={
                      user.isVerified
                        ? 'Alliance Campus Verified'
                        : 'Verification Pending Review'
                    }
                    size="sm"
                  />
                </View>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

            {/* Impact & Commute Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <View style={styles.ratingValRow}>
                  <Ionicons name="star" size={16} color="#F5B942" />
                  <Text style={[styles.statValue, { color: colors.textPrimary, marginLeft: 4 }]}>
                    {(user.rating || 5.0).toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {user.totalRatings || 0} ratings
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {user.tripsCompleted || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Trips Shared
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {user.co2SavedKg || 0} kg
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  CO₂ Saved
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.identityCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              Shadows.soft,
            ]}
          >
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Ionicons name="school" size={44} color={colors.accent} />
              <Text style={[styles.studentName, { color: colors.textPrimary, marginTop: 10 }]}>
                Alliance University Student
              </Text>
              <Text
                style={[
                  styles.deptText,
                  { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
                ]}
              >
                Sign in with your official university email to publish or request rides.
              </Text>

              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/auth')}
              >
                <Text style={styles.signInBtnText}>Sign In / Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Registered Vehicle Section (if Captain) */}
        {user?.vehicle && (
          <View
            style={[
              styles.vehicleCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Registered Motorcycle
              </Text>
              <View
                style={[
                  styles.verifiedRcBadge,
                  {
                    backgroundColor: user.vehicle.verified
                      ? 'rgba(32, 232, 90, 0.12)'
                      : 'rgba(245, 185, 66, 0.12)',
                  },
                ]}
              >
                <Ionicons
                  name={user.vehicle.verified ? 'shield-checkmark' : 'time-outline'}
                  size={12}
                  color={user.vehicle.verified ? colors.accent : '#F5B942'}
                />
                <Text
                  style={[
                    styles.verifiedRcText,
                    { color: user.vehicle.verified ? colors.accent : '#F5B942' },
                  ]}
                >
                  {user.vehicle.verified ? 'RC Verified' : 'RC Under Review'}
                </Text>
              </View>
              <TouchableOpacity
                style={{ marginLeft: 8, padding: 4 }}
                onPress={() => router.push('/profile/edit')}
              >
                <Ionicons name="create-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>

            <View style={styles.bikeInfoRow}>
              <View
                style={[
                  styles.bikeIconBox,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Ionicons name="bicycle" size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.bikeModel, { color: colors.textPrimary }]}>
                  {user.vehicle.make} {user.vehicle.model}
                </Text>
                <Text style={[styles.bikeReg, { color: colors.accent }]}>
                  {user.vehicle.registrationNumber}
                </Text>
                <Text style={[styles.bikeColor, { color: colors.textMuted }]}>
                  {user.vehicle.color || 'Black'} •{' '}
                  {user.vehicle.helmetProvided ? 'Helmet Provided ✅' : 'Passenger Helmet Required'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Theme Settings Card (Dark / Light / System) */}
        <View
          style={[
            styles.settingsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
            Appearance Theme
          </Text>
          <ThemeToggle />
        </View>

        {/* Quick Menu Links */}
        <View
          style={[
            styles.menuCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                My Bookings & Trips
              </Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                {riderBookings.length} bookings • {captainRides.length} published
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setActiveRole('captain');
              router.push('/offer-ride');
            }}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="bicycle-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                Publish Motorcycle Route
              </Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                Share your empty seat with peers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleVerifyPortal}>
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="card-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                Student ID Verification
              </Text>
              <Text style={[styles.menuSub, { color: colors.accent }]}>
                {user?.isVerified ? 'Verified & Active ✅' : 'Under Review ⏳'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleHelpSafety}>
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Ionicons name="shield-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                Help, Safety & Campus SOS
              </Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                24/7 Alliance Security Desk contacts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Sign Out Action */}
          {isAuthenticated && (
            <>
              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                <View
                  style={[
                    styles.menuIconCircle,
                    { backgroundColor: 'rgba(255, 91, 101, 0.12)' },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={18} color="#FF5B65" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.menuTitle, { color: '#FF5B65' }]}>Sign Out</Text>
                  <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                    Switch student account
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Version Information */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            Goflyp v2.0.0 (Production Release) • Alliance University Mobility Desk
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  identityCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  topProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLargeFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeInitial: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.black,
    color: '#05070E',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginLeft: 8,
  },
  editProfileText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
  },
  studentName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    flex: 1,
  },
  deptText: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  uniText: {
    fontSize: 11,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  ratingValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  signInBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    marginTop: 14,
  },
  signInBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  vehicleCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  verifiedRcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  verifiedRcText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  bikeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bikeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bikeModel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  bikeReg: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bikeColor: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  settingsCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: Spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  menuSub: {
    fontSize: 11,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
