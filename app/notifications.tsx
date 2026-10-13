import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useRides } from '../context/RideContext';
import { EmptyState } from '../components/common/EmptyState';
import { Typography, BorderRadius, Spacing } from '../constants/theme';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationAsRead } = useRides();

  const handleNotificationPress = (id: string, actionUrl?: string) => {
    markNotificationAsRead(id);
    if (actionUrl) {
      router.push(actionUrl as any);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ride_confirmed':
        return { name: 'checkmark-circle' as const, color: colors.accent };
      case 'payment_received':
        return { name: 'cash-outline' as const, color: colors.accent };
      case 'seat_request':
        return { name: 'person-add-outline' as const, color: '#38BDF8' };
      default:
        return { name: 'information-circle-outline' as const, color: colors.accent };
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 12,
        },
      ]}
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.roundBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No Notifications"
            description="You're all caught up! New ride confirmations and requests will appear here."
          />
        ) : (
          notifications.map((n) => {
            const iconConfig = getNotifIcon(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: !n.read ? colors.accent : colors.border,
                    borderWidth: !n.read ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleNotificationPress(n.id, n.actionUrl)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                      {n.title}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                      {n.timestamp}
                    </Text>
                  </View>
                  <Text style={[styles.notifMessage, { color: colors.textSecondary }]}>
                    {n.message}
                  </Text>
                </View>

                {!n.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  timestamp: {
    fontSize: 10,
  },
  notifMessage: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
