import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useRides, BookingItem } from '../../context/RideContext';
import { GoflypButton } from '../../components/common/GoflypButton';
import { GoflypInput } from '../../components/common/GoflypInput';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { riderBookings, captainRequests, reportPayment, getBookingById } = useRides();

  const contextBooking =
    riderBookings.find((b) => b.id === id) ||
    captainRequests.find((b) => b.id === id) ||
    null;

  const [booking, setBooking] = useState<BookingItem | null>(contextBooking);
  const [loading, setLoading] = useState<boolean>(!contextBooking);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi');
  const [upiRef, setUpiRef] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (id) {
      (async () => {
        try {
          const b = await getBookingById(id);
          if (isMounted && b) {
            setBooking(b);
          }
        } catch (e) {
          // Keep context booking if any
        } finally {
          if (isMounted) setLoading(false);
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [id, getBookingById]);

  if (loading && !booking) {
    return (
      <View style={[styles.centerError, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary, marginTop: 16 }]}>
          Loading Fuel Contribution...
        </Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.centerError, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Booking Not Found
        </Text>
        <GoflypButton
          title="Back to Bookings"
          onPress={() => router.replace('/(tabs)/bookings')}
          variant="outline"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const isSettled = booking.payment_status === 'confirmed' || booking.payment_status === 'reported';
  const captainUpi = booking.captain_upi || 'captain@okhdfcbank';
  const captainName = booking.captain_name || 'Alliance Captain';
  const amount = booking.contribution_amount || 35;

  const handleCopyUPI = () => {
    Alert.alert('UPI ID Copied', `${captainUpi} copied. Paste into your UPI app.`);
  };

  const handleOpenUPI = () => {
    const upiUri = `upi://pay?pa=${encodeURIComponent(captainUpi)}&pn=${encodeURIComponent(captainName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Goflyp Peer Fuel Share')}`;
    Linking.canOpenURL(upiUri)
      .then((supported) => {
        if (supported) {
          Linking.openURL(upiUri);
        } else {
          Alert.alert(
            'UPI App Launch',
            `Please open Google Pay, PhonePe, or Paytm and send ₹${amount} to:\n${captainUpi}`
          );
        }
      })
      .catch(() => {
        Alert.alert(
          'UPI App Launch',
          `Please open Google Pay, PhonePe, or Paytm and send ₹${amount} to:\n${captainUpi}`
        );
      });
  };

  const handleConfirmPayment = async () => {
    setReporting(true);
    try {
      await reportPayment(booking.id, paymentMethod, upiRef.trim() || undefined);
      Alert.alert(
        'Fuel Contribution Reported',
        'Your direct payment has been reported to the Captain. Thank you for splitting the ride!'
      );
      router.replace('/(tabs)/bookings');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Payment reported.');
      router.replace('/(tabs)/bookings');
    } finally {
      setReporting(false);
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
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.roundBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Direct Student Fuel Split
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* Status Banner */}
        {isSettled ? (
          <View
            style={[
              styles.settledBanner,
              {
                backgroundColor: 'rgba(32, 232, 90, 0.12)',
                borderColor: colors.accent,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.settledTitle, { color: colors.accent }]}>
                Contribution Reported
              </Text>
              <Text style={[styles.settledSub, { color: colors.textSecondary }]}>
                {booking.payment_method === 'cash' ? 'Settled via Cash' : 'Settled via Direct UPI'} • {booking.upi_reference ? `Ref: ${booking.upi_reference}` : 'Direct peer transfer'}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.pendingBanner,
              {
                backgroundColor: 'rgba(245, 185, 66, 0.12)',
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={[styles.pendingText, { color: colors.warning }]}>
              Pending Payment directly to {captainName}
            </Text>
          </View>
        )}

        {/* Agreed Contribution Card */}
        <View
          style={[
            styles.amountCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            Shadows.soft,
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
            Agreed Fuel Share
          </Text>
          <Text style={[styles.amountValue, { color: colors.accent }]}>
            ₹{amount}
          </Text>
          <Text style={[styles.amountSub, { color: colors.textSecondary }]}>
            100% peer-to-peer • 0% platform fee
          </Text>
        </View>

        {/* Captain Student Details */}
        <View
          style={[
            styles.riderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
            Captain Recipient
          </Text>

          <View style={styles.riderMetaRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Ionicons name="bicycle" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.riderName, { color: colors.textPrimary }]}>
                {captainName}
              </Text>
              <Text style={[styles.riderUni, { color: colors.textMuted }]}>
                {booking.vehicle_make ? `${booking.vehicle_make} ${booking.vehicle_model}` : 'Motorcycle'} • Alliance Student
              </Text>
            </View>
          </View>

          {/* UPI ID block */}
          <View
            style={[
              styles.upiBox,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.upiLabel, { color: colors.textMuted }]}>
                Captain's Direct UPI ID
              </Text>
              <Text style={[styles.upiId, { color: colors.textPrimary }]}>
                {captainUpi}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.card }]}
              onPress={handleCopyUPI}
            >
              <Ionicons name="copy-outline" size={16} color={colors.accent} />
              <Text style={[styles.copyText, { color: colors.accent }]}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method Selector */}
        {!isSettled && (
          <View
            style={[
              styles.methodCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
              Choose Payment Method
            </Text>

            <TouchableOpacity
              style={[
                styles.methodOption,
                {
                  backgroundColor:
                    paymentMethod === 'upi' ? colors.surfaceElevated : 'transparent',
                  borderColor: paymentMethod === 'upi' ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setPaymentMethod('upi')}
            >
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={paymentMethod === 'upi' ? colors.accent : colors.textMuted}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                  Direct UPI Payment
                </Text>
                <Text style={[styles.methodSubtitle, { color: colors.textMuted }]}>
                  Google Pay, PhonePe, Paytm, BHIM
                </Text>
              </View>
              {paymentMethod === 'upi' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>

            {paymentMethod === 'upi' && (
              <View style={{ marginTop: 10 }}>
                <GoflypButton
                  title="Open in UPI App"
                  onPress={handleOpenUPI}
                  variant="outline"
                  size="sm"
                  icon={<Ionicons name="open-outline" size={16} color={colors.accent} />}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.methodOption,
                {
                  backgroundColor:
                    paymentMethod === 'cash' ? colors.surfaceElevated : 'transparent',
                  borderColor: paymentMethod === 'cash' ? colors.accent : colors.border,
                  marginTop: 10,
                },
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons
                name="cash-outline"
                size={22}
                color={paymentMethod === 'cash' ? colors.accent : colors.textMuted}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                  Cash on Drop
                </Text>
                <Text style={[styles.methodSubtitle, { color: colors.textMuted }]}>
                  Hand exact ₹{amount} to {captainName}
                </Text>
              </View>
              {paymentMethod === 'cash' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* UPI Ref / Transaction input if UPI */}
        {!isSettled && paymentMethod === 'upi' && (
          <GoflypInput
            label="UPI UTR / Reference ID (Optional)"
            placeholder="e.g. 42561988219"
            value={upiRef}
            onChangeText={setUpiRef}
            leftIcon={<Ionicons name="receipt-outline" size={18} color={colors.accent} />}
          />
        )}

        {/* Payment Policy Notice */}
        <View style={styles.policyNotice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.accent} />
          <Text style={[styles.policyText, { color: colors.textMuted }]}>
            Goflyp operates strictly on peer-to-peer fuel sharing between verified Alliance students. Goflyp does not hold student money or charge commission.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: isDark ? colors.backgroundSecondary : colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        {isSettled ? (
          <GoflypButton
            title="Return to Journeys"
            onPress={() => router.replace('/(tabs)/bookings')}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="checkmark-done" size={18} color="#05070E" />}
          />
        ) : (
          <GoflypButton
            title="Report Payment Settled"
            onPress={handleConfirmPayment}
            loading={reporting}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Ionicons name="checkmark-circle" size={18} color="#05070E" />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 12,
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
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  settledTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  settledSub: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 8,
  },
  pendingText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  amountCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  amountLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: Typography.fontWeight.black,
    marginVertical: 4,
    letterSpacing: -1,
  },
  amountSub: {
    fontSize: Typography.fontSize.xs,
  },
  riderCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  cardHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 12,
  },
  riderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  riderUni: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  upiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  upiLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  upiId: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  copyText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  methodCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 16,
    marginBottom: Spacing.md,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  methodTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  methodSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 8,
  },
  policyText: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
