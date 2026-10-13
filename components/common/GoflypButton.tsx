import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography, BorderRadius, Shadows } from '../../constants/theme';

export interface GoflypButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const GoflypButton: React.FC<GoflypButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors, isDark } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let bg = colors.accent;
    let border: string | undefined = undefined;

    switch (variant) {
      case 'primary':
        bg = colors.accent;
        break;
      case 'secondary':
        bg = colors.surfaceElevated;
        break;
      case 'outline':
        bg = 'transparent';
        border = colors.border;
        break;
      case 'ghost':
        bg = 'transparent';
        break;
      case 'danger':
        bg = 'rgba(255, 91, 101, 0.15)';
        border = colors.error;
        break;
    }

    const paddingV = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
    const paddingH = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: border ? 1 : 0,
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: BorderRadius.lg,
      opacity: disabled || loading ? 0.5 : 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      alignSelf: fullWidth ? 'stretch' : 'auto',
      ...(variant === 'primary' && isDark ? Shadows.glowGreen : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    let color = '#000000'; // high contrast on bright neon green

    switch (variant) {
      case 'primary':
        color = '#05070E';
        break;
      case 'secondary':
        color = colors.textPrimary;
        break;
      case 'outline':
        color = colors.textPrimary;
        break;
      case 'ghost':
        color = colors.accent;
        break;
      case 'danger':
        color = colors.error;
        break;
    }

    const fontSize =
      size === 'sm'
        ? Typography.fontSize.sm
        : size === 'lg'
        ? Typography.fontSize.md
        : Typography.fontSize.base;

    return {
      color,
      fontSize,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#000000' : colors.accent}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : {}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
