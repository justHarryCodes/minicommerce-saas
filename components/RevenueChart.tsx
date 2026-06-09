import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';

interface DayData { day: string; revenue: number; orders: number }

function fmt(n: number) {
  if (n >= 1_000_000) return '₦' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '₦' + (n / 1_000).toFixed(0) + 'K';
  return '₦' + n.toFixed(0);
}

const PERIODS = [
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
] as const;

export function RevenueChart() {
  const [days, setDays] = useState<7 | 30>(7);

  const { data, isLoading } = useQuery<{ data: DayData[] }>({
    queryKey: ['revenue', days],
    queryFn: () => api.get<{ data: DayData[] }>(`/api/dashboard/revenue?days=${days}`),
  });

  const rows  = data?.data ?? [];
  const max   = Math.max(...rows.map(r => r.revenue), 1);
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return days === 7
      ? d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 3)
      : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.cardLabel}>REVENUE</Text>
          <Text style={styles.totalValue}>
            {isLoading ? '—' : fmt(total)}
          </Text>
          <Text style={styles.period}>last {days} days</Text>
        </View>
        <View style={styles.toggle}>
          {PERIODS.map(p => (
            <Pressable
              key={p.days}
              onPress={() => setDays(p.days)}
              style={[styles.toggleBtn, days === p.days && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleLabel, days === p.days && styles.toggleLabelActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bars */}
      {isLoading ? (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading chart…</Text>
        </View>
      ) : (
        <View style={[styles.barsRow, { gap: days === 7 ? 8 : 3 }]}>
          {rows.map((row) => {
            const pct  = max > 0 ? row.revenue / max : 0;
            const barH = Math.max(pct * 90, row.revenue > 0 ? 4 : 2);
            const peak = row.revenue === max && max > 0;

            return (
              <View key={row.day} style={styles.barCol}>
                <View style={[
                  styles.bar,
                  { height: barH },
                  peak && styles.barPeak,
                ]} />
                {days === 7 && (
                  <Text style={styles.barLabel}>{dayLabel(row.day)}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {days === 30 && !isLoading && rows.length > 0 && (
        <View style={styles.xAxis}>
          {[0, 7, 14, 21, 29].map(i => (
            <Text key={i} style={styles.xLabel}>
              {rows[i] ? dayLabel(rows[i].day) : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface[400],
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.surface[900],
    letterSpacing: -0.5,
  },
  period: {
    fontSize: 11,
    color: Colors.surface[400],
    marginTop: 2,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface[100],
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.dark,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface[500],
  },
  toggleLabelActive: {
    color: Colors.brand,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: Colors.surface[200],
  },
  barPeak: {
    backgroundColor: Colors.brand,
  },
  barLabel: {
    fontSize: 10,
    color: Colors.surface[400],
    fontWeight: '600',
  },
  loading: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.surface[300],
    fontSize: 13,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xLabel: {
    fontSize: 10,
    color: Colors.surface[400],
  },
});
