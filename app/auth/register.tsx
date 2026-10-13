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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { isValidAllianceEmail, getAllianceEmailDomain } from '../../services/domain';

const DEPARTMENTS = [
  'Alliance College of Engineering and Design (ACED)',
  'Alliance School of Business (ASOB)',
  'Alliance School of Law (ASOL)',
  'Alliance School of Liberal Arts (ASLA)',
  'Alliance School of Sciences (ASOS)',
];

export default function RegisterScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();

  const [role, setRole] = useState<'captain' | 'rider'>(
    params.role === 'captain' ? 'captain' : 'rider'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Captain specific fields
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [helmetProvided, setHelmetProvided] = useState(true);
  const [upiId, setUpiId] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleAccent = role === 'captain' ? colors.accent : '#38BDF8';

  const handleRegister = async () => {
    // Basic validation
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Please fill in all required personal credentials.');
      return;
    }

    if (!isValidAllianceEmail(email)) {
      const allowedDomain = getAllianceEmailDomain();
      setErrorMsg(`Official Alliance University email (@${allowedDomain} or subdomains like @ced.${allowedDomain}) is required.`);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (role === 'captain') {
      if (!vehicleMake.trim() || !vehicleModel.trim() || !registrationNumber.trim()) {
        setErrorMsg('Please specify your motorcycle brand, model, and registration plate.');
        return;
      }
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const payload: any = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        role,
        department,
        regNumber: regNumber.trim() || undefined,
        upiId: upiId.trim() || undefined,
      };

      if (role === 'captain') {
        payload.vehicle = {
          make: vehicleMake.trim(),
          model: vehicleModel.trim(),
          registrationNumber: registrationNumber.trim().toUpperCase(),
          color: vehicleColor.trim() || 'Black',
          helmetProvided,
          verified: false,
        };
      }

      await register(payload);
      router.replace('/(tabs)');
    } catch (err: any) {
      const message = err.message || 'Registration failed. Please check your details.';
      setErrorMsg(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Registration Error', message);
      }
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
            paddingTop: Platform.OS === 'ios' ? insets.top + 16 : 24,
            paddingBottom: insets.bottom + 36,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nav Header */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Student Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Role Toggle */}
        <View style={[styles.roleTabsContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.roleTab,
              role === 'rider' && [styles.roleTabActive, { backgroundColor: colors.card, borderColor: '#38BDF8' }],
            ]}
            onPress={() => {
              setRole('rider');
              setErrorMsg(null);
            }}
          >
            <Ionicons name="person" size={14} color={role === 'rider' ? '#38BDF8' : colors.textMuted} />
            <Text style={[styles.roleTabText, { color: role === 'rider' ? colors.textPrimary : colors.textMuted }]}>
              Register as Rider
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleTab,
              role === 'captain' && [styles.roleTabActive, { backgroundColor: colors.card, borderColor: colors.accent }],
            ]}
            onPress={() => {
              setRole('captain');
              setErrorMsg(null);
            }}
          >
            <Ionicons name="bicycle" size={15} color={role === 'captain' ? colors.accent : colors.textMuted} />
            <Text style={[styles.roleTabText, { color: role === 'captain' ? colors.textPrimary : colors.textMuted }]}>
              Register as Captain
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header Info */}
        <View style={styles.headerBlock}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {role === 'captain' ? 'Captain Onboarding' : 'Rider Onboarding'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {role === 'captain'
              ? 'Join as a verified student motorcycle owner. Share your daily commute and split fuel with peers.'
              : 'Join as a verified Alliance student rider. Discover safe peer rides across Bengaluru.'}
          </Text>
        </View>

        {/* Error Banner */}
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 91, 101, 0.12)', borderColor: '#FF5B65' }]}>
            <Ionicons name="alert-circle" size={18} color="#FF5B65" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Section: Student Profile */}
        <Text style={[styles.sectionTitle, { color: roleAccent }]}>1. Alliance Student Profile</Text>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name (as per Student ID) *</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="e.g. Rohan Sharma"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
          Alliance University Email * (@ced.alliance.edu.in / @alliance.edu.in)
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="school-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="student@ced.alliance.edu.in"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Phone Number *</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
          Registration / Roll Number (Optional)
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="card-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="e.g. 2024ACED0142"
            placeholderTextColor={colors.textMuted}
            value={regNumber}
            onChangeText={setRegNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Section: Captain Motorcycle Details */}
        {role === 'captain' && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>2. Motorcycle & Safety Details</Text>

            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Brand / Make *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Yamaha / Honda"
                    placeholderTextColor={colors.textMuted}
                    value={vehicleMake}
                    onChangeText={setVehicleMake}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Model *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="MT-15 / Activa"
                    placeholderTextColor={colors.textMuted}
                    value={vehicleModel}
                    onChangeText={setVehicleModel}
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Vehicle Plate / Reg Number *
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="KA-51-EZ-4219"
                placeholderTextColor={colors.textMuted}
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
                autoCapitalize="characters"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Color (Optional)
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="color-palette-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Matte Black / Metallic Blue"
                placeholderTextColor={colors.textMuted}
                value={vehicleColor}
                onChangeText={setVehicleColor}
              />
            </View>

            {/* Helmet switch */}
            <View
              style={[
                styles.switchCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                  Pillion Helmet Provided
                </Text>
                <Text style={[styles.switchSub, { color: colors.textSecondary }]}>
                  Alliance University security mandates ISI helmets for pillion passengers at all gates.
                </Text>
              </View>
              <Switch
                value={helmetProvided}
                onValueChange={setHelmetProvided}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={helmetProvided ? '#080B14' : '#f4f3f4'}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Direct UPI ID (for student fuel splits)
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="wallet-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g. rohan@okaxis"
                placeholderTextColor={colors.textMuted}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* Section: Security & Password */}
        <Text style={[styles.sectionTitle, { color: roleAccent, marginTop: 24 }]}>
          {role === 'captain' ? '3. Account Password' : '2. Account Password'}
        </Text>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password (min 6 characters) *</Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="••••••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
          Confirm Password *
        </Text>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            placeholder="••••••••••••"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: roleAccent }, Shadows.button]}
          onPress={handleRegister}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#05070E" />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitText}>
                Complete {role === 'captain' ? 'Captain' : 'Rider'} Registration
              </Text>
              <Ionicons name="checkmark-circle" size={18} color="#05070E" />
            </View>
          )}
        </TouchableOpacity>

        {/* Existing account link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already registered with your Alliance email?{' '}
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/auth/login',
                params: { role },
              })
            }
          >
            <Text style={[styles.loginLink, { color: roleAccent }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  roleTabsContainer: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  roleTabActive: {
    borderWidth: 1,
  },
  roleTabText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  headerBlock: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
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
    color: '#FF5B65',
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    height: '100%',
  },
  eyeButton: {
    padding: 8,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginTop: 14,
  },
  switchTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: '#05070E',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
  },
  loginLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});
