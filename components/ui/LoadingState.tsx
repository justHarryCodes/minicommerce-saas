import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface LoadingStateProps {
  /** Optional label under the spinner, e.g. "Loading orders…" */
  label?: string;
}

/**
 * Shared full-bleed loading indicator for list screens' ListEmptyComponent.
 * Was previously reimplemented as plain, spinner-less "Loading…" text in
 * four different screens (orders, products, categories, reels), each with
 * its own separate styles.center/loadingText — while every other loading
 * state in the app (detail screens, discover) already used a spinner.
 */
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.brand} size="large" />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.surface[400],
  },
});
