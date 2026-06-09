import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface StatsCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatsCard({ label, value, sub, accent }: StatsCardProps) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.label, accent && styles.labelAccent]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>
        {value}
      </Text>
      {sub && (
        <Text style={[styles.sub, accent && styles.subAccent]}>{sub}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    shadowColor: Colors.surface[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 4,
  },
  cardAccent: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface[400],
    letterSpacing: 0.8,
  },
  labelAccent: {
    color: Colors.darkMuted,
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.surface[900],
    letterSpacing: -0.5,
  },
  valueAccent: {
    color: Colors.brand,
  },
  sub: {
    fontSize: 11,
    color: Colors.surface[400],
  },
  subAccent: {
    color: Colors.darkMuted,
  },
});
