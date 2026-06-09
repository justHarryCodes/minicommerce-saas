import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <View style={styles.actionWrap}>
          <Button title={action.label} onPress={action.onPress} size="md" />
        </View>
      )}
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
  iconWrap: {
    marginBottom: 6,
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.surface[800],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.surface[500],
    textAlign: 'center',
    lineHeight: 21,
  },
  actionWrap: {
    marginTop: 8,
  },
});
