import { StyleSheet, Text, View } from 'react-native';
import { Status } from '@/constants/theme';

type StatusKey = keyof typeof Status;

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function Badge({ status, size = 'sm' }: BadgeProps) {
  const s = Status[status as StatusKey] ?? { label: status, bg: '#F1F5F9', text: '#475569' };
  return (
    <View style={[styles.base, size === 'md' ? styles.md : styles.sm, { backgroundColor: s.bg }]}>
      <Text style={[styles.label, size === 'md' ? styles.labelMd : styles.labelSm, { color: s.text }]}>
        {s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  labelSm: { fontSize: 11 },
  labelMd: { fontSize: 12 },
});
