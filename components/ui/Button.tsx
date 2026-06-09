import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, loading, disabled,
  variant = 'primary', size = 'md', style, fullWidth,
}: ButtonProps) {
  const inactive = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.black : Colors.white}
        />
      )}
      <Text style={[styles.label, labelStyles[variant], labelSizes[size]]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    gap: 8,
  },
  /* variants */
  primary: {
    backgroundColor: Colors.brand,
  },
  secondary: {
    backgroundColor: Colors.surface[100],
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
  danger: {
    backgroundColor: Colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.surface[300],
  },
  dark: {
    backgroundColor: Colors.dark,
  },
  /* sizes */
  sm: { paddingVertical: 8,  paddingHorizontal: 14 },
  md: { paddingVertical: 13, paddingHorizontal: 20 },
  lg: { paddingVertical: 16, paddingHorizontal: 24 },
  /* state */
  fullWidth:  { width: '100%' },
  inactive:   { opacity: 0.5 },
  pressed:    { opacity: 0.82 },
});

const labelStyles = StyleSheet.create({
  primary:   { color: Colors.black },
  secondary: { color: Colors.surface[700] },
  danger:    { color: Colors.white },
  ghost:     { color: Colors.surface[700] },
  dark:      { color: Colors.white },
});

const labelSizes = StyleSheet.create({
  sm: { fontSize: 13, fontWeight: '700' },
  md: { fontSize: 14, fontWeight: '700' },
  lg: { fontSize: 16, fontWeight: '800' },
});
