import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { ApiClient } from '../../services/api';

const DEPARTMENTS = [
  'Alliance College of Engineering and Design (ACED)',
  'Alliance School of Business (ASOB)',
  'Alliance School of Law (ASOL)',
  'Alliance School of Liberal Arts (ASLA)',
  'Alliance School of Sciences (ASOS)',
];

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, activeRole } = useAuth();

  // Rider/Student profile fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [regNumber, setRegNumber] = useState(user?.regNumber || '');
  const [emergencyContact, setEmergencyContact] = useState((user as any)?.emergencyContact || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');

  // Captain vehicle fields
  const initialVehicle = user?.vehicle || {};
  const [vehicleMake, setVehicleMake] = useState(initialVehicle.make || '');
  const [vehicleModel, setVehicleModel] = useState(initialVehicle.model || '');
  const [registrationNumber, setRegistrationNumber] = useState(
    initialVehicle.registration_number || initialVehicle.registrationNumber || ''
  );
  const [vehicleColor, setVehicleColor] = useState(initialVehicle.color || '');
  const [vehicleYear, setVehicleYear] = useState(
    initialVehicle.year ? String(initialVehicle.year) : '2024'
  );
  const [helmetProvided, setHelmetProvided] = useState(
    initialVehicle.helmet_provided !== undefined
      ? Boolean(initialVehicle.helmet_provided)
      : initialVehicle.helmetProvided !== undefined
      ? Boolean(initialVehicle.helmetProvided)
      : true
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCaptain = activeRole === 'captain' || user?.role === 'captain' || user?.role === 'both';

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Full name and phone number are required.');
      return;
    }

    if (isCaptain && (!vehicleMake.trim() || !vehicleModel.trim() || !registrationNumber.trim())) {
      setErrorMsg('Motorcycle make, model, and registration number are required for Captains.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Update core student profile
      await ApiClient.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        department,
        regNumber: regNumber.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        upiId: upiId.trim() || undefined,
      });

      // 2. If Captain, update vehicle details
      if (isCaptain || vehicleMake.trim()) {
        await ApiClient.updateVehicle({
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          year: parseInt(vehicleYear, 10) || 2024,
          registrationNumber: registrationNumber.toUpperCase().trim(),
          color: vehicleColor.trim() || 'Black',
          helmetProvided,
        });
      }

      await refreshUser();

      Alert.alert(
        'Profile Updated',
        isCaptain &&
          initialVehicle.registration_number &&
          initialVehicle.registration_number.toUpperCase().trim() !== registrationNumber.toUpperCase().trim()
          ? 'Your profile and vehicle details have been saved. Since registration plate changed, RC document is pending re-verification.'
          : 'Your student profile information has been saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 20,
            paddingBottom: insets.bottom + 30,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Navigation Bar */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Error Alert */}
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 91, 101, 0.12)', borderColor: '#FF5B65' }]}>
            <Ionicons name="alert-circle" size={18} color="#FF5B65" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* SECTION 1: Student Information */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Student Identity
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full student name"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            Phone Number
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            University Registration Number
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={regNumber}
              onChangeText={setRegNumber}
              placeholder="2024BTECHCED042"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            Emergency Contact Number
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="Campus Guardian / Parent (+91)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            UPI ID (For Direct Fuel Contributions)
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="student@okaxis or student@okhdfcbank"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* SECTION 2: Captain Motorcycle Specifications (if Captain) */}
        {isCaptain && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderWithBadge}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Motorcycle Details
              </Text>
              <View style={[styles.captainBadge, { backgroundColor: 'rgba(32, 232, 90, 0.15)' }]}>
                <Ionicons name="bicycle" size={13} color={colors.accent} />
                <Text style={[styles.captainBadgeText, { color: colors.accent }]}>Captain</Text>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Make / Brand</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="speedometer-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={vehicleMake}
                onChangeText={setVehicleMake}
                placeholder="Yamaha / Royal Enfield / TVS"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Model
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="hardware-chip-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={vehicleModel}
                onChangeText={setVehicleModel}
                placeholder="MT-15 / Hunter 350 / Apache RTR"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Registration Plate Number
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                placeholder="KA-51-EZ-4219"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>
            <Text style={[styles.subHint, { color: colors.textMuted }]}>
              * Changing the license plate resets RC verification status for campus security review.
            </Text>

            <View style={styles.rowTwoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                  Color
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={vehicleColor}
                    onChangeText={setVehicleColor}
                    placeholder="Black / Blue"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                  Model Year
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={vehicleYear}
                    onChangeText={setVehicleYear}
                    placeholder="2024"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Helmet Provided Switch */}
            <View
              style={[
                styles.switchCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                  Spare Helmet Provided
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  I provide an ISI-approved helmet for the passenger
                </Text>
              </View>
              <Switch
                value={helmetProvided}
                onValueChange={setHelmetProvided}
                trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}

        {/* Save Changes Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }, Shadows.button]}
          onPress={handleSave}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading ? (
            <ActivityIndicator color="#05070E" />
          ) : (
            <View style={styles.saveRow}>
              <Ionicons name="checkmark-circle" size={18} color="#05070E" />
              <Text style={styles.saveButtonText}>Save Profile Updates</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#FF5B65',
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 14,
  },
  sectionHeaderWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  captainBadgeText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    height: '100%',
  },
  subHint: {
    fontSize: 10,
    marginTop: 5,
    paddingHorizontal: 4,
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: 14,
  },
  switchTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  saveButton: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
});
