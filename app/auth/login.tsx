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
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { isValidAllianceEmail, getAllianceEmailDomain } from '../../services/domain';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();

  const [role, setRole] = useState<'captain' | 'rider'>(
    params.role === 'captain' ? 'captain' : 'rider'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your Alliance University email and password.');
      return;
    }

    if (!isValidAllianceEmail(email.trim())) {
      const allowedDomain = getAllianceEmailDomain();
      setErrorMsg(`Official Alliance University email (@${allowedDomain} or subdomains like @ced.${allowedDomain}) is required.`);
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await login(email.trim().toLowerCase(), password, role);
      router.replace('/(tabs)');
    } catch (err: any) {
      let message = err.message || 'Login failed. Please verify your credentials.';
      if (err.code === 'ACCOUNT_NOT_FOUND') {
        message = `No account found for this email. Tap "Register as ${role === 'captain' ? 'Captain' : 'Rider'}" below to create an account.`;
      } else if (err.code === 'INVALID_CREDENTIALS') {
        message = 'Incorrect password. Please verify your credentials and try again.';
      } else if (err.code === 'BACKEND_UNAVAILABLE') {
        message = 'Cannot connect to Goflyp backend server. Please check your network connection.';
      } else if (err.code === 'ROLE_MISMATCH') {
        message = err.message || 'Account role mismatch. Please log in with the correct role.';
      } else if (err.code === 'ACCOUNT_DISABLED') {
        message = 'Your university account has been disabled. Please contact campus security.';
      }
      setErrorMsg(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Authentication Notice', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleAccent = () => {
    if (role === 'captain') return colors.accent; // #20E85A
    return '#38BDF8'; // Sky blue for rider
  };

  const roleAccent = getRoleAccent();

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
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Sign In</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Role Selector Tabs */}
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
            <Ionicons
              name="person"
              size={14}
              color={role === 'rider' ? '#38BDF8' : colors.textMuted}
            />
            <Text
              style={[
                styles.roleTabText,
                { color: role === 'rider' ? colors.textPrimary : colors.textMuted },
              ]}
            >
              Rider
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
            <Ionicons
              name="bicycle"
              size={15}
              color={role === 'captain' ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.roleTabText,
                { color: role === 'captain' ? colors.textPrimary : colors.textMuted },
              ]}
            >
              Captain
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {role === 'captain' ? 'Captain Portal' : 'Welcome Back'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {role === 'captain'
              ? 'Log in to publish routes and coordinate with student riders.'
              : 'Log in to find verified student motorcycle journeys.'}
          </Text>
        </View>

        {/* Error Banner */}
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 91, 101, 0.12)', borderColor: '#FF5B65' }]}>
            <Ionicons name="alert-circle" size={18} color="#FF5B65" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Input Fields */}
        <View style={styles.formSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Alliance University Email
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder={role === 'captain' ? 'vishvanthbtech24@ced.alliance.edu.in' : 'student@ced.alliance.edu.in'}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.passwordLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Password
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/auth/forgot-password',
                  params: { email: email.trim() },
                })
              }
            >
              <Text style={[styles.forgotPasswordText, { color: roleAccent }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: roleAccent },
              Shadows.button,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#05070E" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitText}>Sign In to Goflyp</Text>
                <Ionicons name="arrow-forward" size={18} color="#05070E" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            New to Goflyp at Alliance?{' '}
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/auth/register',
                params: { role },
              })
            }
          >
            <Text style={[styles.registerLink, { color: roleAccent }]}>
              Register as {role === 'captain' ? 'Captain' : 'Rider'}
            </Text>
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSub: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
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
  formSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
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
  eyeButton: {
    padding: 8,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 11,
    color: '#F5B942',
    textDecorationLine: 'underline',
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
  },
  registerLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});
