import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Spacing } from '../../constants/theme';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showProfile?: boolean;
  showNotifications?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showProfile = true,
  showNotifications = true,
  onBack,
  style,
}) => {
  const { colors } = useTheme();
  const { user, isAuthenticated, activeRole } = useAuth();

  return (
    <View style={[styles.header, { backgroundColor: colors.background }, style]}>
      {/* Left section: Back button or Goflyp Logo */}
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={onBack ? onBack : () => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logoRow}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <View style={[styles.logoIconContainer, { backgroundColor: colors.accent }]}>
              <Ionicons name="flash" size={16} color="#05070E" />
            </View>
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>
              GO<Text style={{ color: colors.accent }}>FLYP</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Middle: Title if present */}
      {title && (
        <View style={styles.centerSection}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}

      {/* Right section: Notifications and Student Avatar */}
      <View style={styles.rightSection}>
        {showNotifications && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginRight: 10,
              },
            ]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {showProfile && (
          <TouchableOpacity
            onPress={() => (isAuthenticated ? router.push('/(tabs)/profile') : router.push('/auth'))}
            style={styles.avatarWrapper}
          >
            {isAuthenticated ? (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: activeRole === 'captain' ? colors.accent : '#38BDF8' },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            ) : (
              <View style={[styles.signInPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Ionicons name="log-in-outline" size={15} color={colors.accent} />
                <Text style={[styles.signInText, { color: colors.accent }]}>Sign In</Text>
              </View>
            )}

            {user?.isVerified && (
              <View
                style={[
                  styles.verifiedPip,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.background,
                  },
                ]}
              >
                <Ionicons name="checkmark" size={8} color="#000000" />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 40,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: 1.5,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 6,
    right: 8,
  },
  avatarWrapper: {
    height: 38,
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  signInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  signInText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
  },
  verifiedPip: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
