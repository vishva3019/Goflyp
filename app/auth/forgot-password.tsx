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
import { Typography, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { isValidAllianceEmail, getAllianceEmailDomain } from '../../services/domain';
import { ApiClient } from '../../services/api';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email || '');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request_code' | 'enter_new_password'>('request_code');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your Alliance University email address.');
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
      const res = await ApiClient.forgotPassword(email.trim().toLowerCase());
      setSuccessInfo(
        res.resetToken
          ? `Reset code generated: ${res.resetToken} (Valid for 15 minutes)`
          : 'A password reset code has been sent to your university inbox.'
      );
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setStep('enter_new_password');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      setErrorMsg('Please enter the 6-digit reset code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await ApiClient.resetPassword({
        email: email.trim().toLowerCase(),
        token: resetToken.trim(),
        newPassword,
      });

      Alert.alert(
        'Password Reset Successful',
        'Your password has been securely updated. You can now sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Please check your code and try again.');
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
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Password Reset</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(32, 232, 90, 0.15)' }]}>
            <Ionicons name="key-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {step === 'request_code' ? 'Forgot Password?' : 'Create New Password'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'request_code'
              ? 'Enter your verified Alliance University email to receive a secure 6-digit password reset code.'
              : 'Enter the verification code and set your new account password.'}
          </Text>
        </View>

        {/* Alerts */}
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(255, 91, 101, 0.12)', borderColor: '#FF5B65' }]}>
            <Ionicons name="alert-circle" size={18} color="#FF5B65" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {successInfo && (
          <View style={[styles.successBanner, { backgroundColor: 'rgba(32, 232, 90, 0.12)', borderColor: colors.accent }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
            <Text style={[styles.successText, { color: colors.accent }]}>{successInfo}</Text>
          </View>
        )}

        {/* Step 1: Request Code */}
        {step === 'request_code' ? (
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Alliance University Email
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
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

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }, Shadows.button]}
              onPress={handleRequestCode}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#05070E" />
              ) : (
                <View style={styles.submitRow}>
                  <Text style={styles.submitText}>Send Reset Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#05070E" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Step 2: Enter Code & New Password */
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              6-Digit Reset Code
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, letterSpacing: 4, fontWeight: 'bold' }]}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                value={resetToken}
                onChangeText={setResetToken}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              New Password
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
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

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              Confirm New Password
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Repeat new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }, Shadows.button]}
              onPress={handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#05070E" />
              ) : (
                <View style={styles.submitRow}>
                  <Text style={styles.submitText}>Update Password & Sign In</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#05070E" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleRequestCode}
              disabled={isLoading}
            >
              <Text style={[styles.resendText, { color: colors.accent }]}>
                Didn't receive code? Request new code
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.black,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    fontWeight: Typography.fontWeight.semibold,
  },
  formSection: {
    marginBottom: 24,
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
  eyeButton: {
    padding: 8,
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
  resendButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
