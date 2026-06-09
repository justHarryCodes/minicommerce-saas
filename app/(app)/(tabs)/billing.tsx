import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Clock, Info, RefreshCw, XCircle } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import type { Store } from '@/types';

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG');
}

const WEB_BILLING_URL = 'https://awarizon.shop/dashboard/billing';

function StatusIcon({ status, color }: { status: string; color: string }) {
  const props = { size: 28, color };
  switch (status) {
    case 'setup_fee_pending': return <RefreshCw {...props} />;
    case 'setup_fee_paid':    return <CheckCircle {...props} />;
    case 'subscribed':        return <CheckCircle {...props} />;
    case 'expired':           return <XCircle {...props} />;
    default:                  return <Clock {...props} />;
  }
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  pending:          { label: 'Pending setup',       color: '#854d0e', bg: '#fef9c3', desc: 'Complete your setup fee to activate your store.' },
  setup_fee_pending:{ label: 'Payment processing',  color: '#1e40af', bg: '#dbeafe', desc: 'Your setup fee payment is being processed.' },
  setup_fee_paid:   { label: 'Setup complete',      color: '#166534', bg: '#dcfce7', desc: 'Setup fee paid. Subscribe to keep your store active.' },
  subscribed:       { label: 'Active',              color: '#166534', bg: '#dcfce7', desc: 'Your store is active and accepting orders.' },
  expired:          { label: 'Subscription expired', color: '#991b1b', bg: '#fee2e2', desc: 'Renew your subscription to reactivate your store.' },
};

export default function BillingScreen() {
  const { data: store } = useQuery<Store>({
    queryKey: ['store'],
    queryFn: () => api.get<Store>('/api/dashboard/store'),
  });

  const meta      = STATUS_META[store?.subscriptionStatus ?? 'pending'] ?? STATUS_META['pending'];
  const expiresAt = store?.subscriptionExpiresAt ? new Date(store.subscriptionExpiresAt) : null;
  const daysLeft  = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000) : null;

  const pricingRows = [
    {
      label: 'One-time setup fee',
      value: fmt(10000),
      sub: 'Paid once to activate your store',
      done: ['setup_fee_paid', 'subscribed', 'expired'].includes(store?.subscriptionStatus ?? ''),
    },
    {
      label: 'Monthly subscription',
      value: fmt(5000) + '/mo',
      sub: 'Keeps your store active',
      done: store?.subscriptionStatus === 'subscribed',
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <SubHeader title="Billing & Subscription" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
          <View style={styles.statusTop}>
            <StatusIcon status={store?.subscriptionStatus ?? 'pending'} color={meta.color} />
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.statusDesc, { color: meta.color }]}>{meta.desc}</Text>

          {daysLeft !== null && daysLeft > 0 && (
            <View style={styles.daysWrap}>
              <Text style={[styles.daysCount, { color: meta.color }]}>{daysLeft} days</Text>
              <Text style={[styles.daysLabel, { color: meta.color }]}>remaining</Text>
            </View>
          )}
          {expiresAt && (
            <Text style={[styles.expiryText, { color: meta.color + 'aa' }]}>
              {daysLeft !== null && daysLeft <= 0 ? 'Expired' : 'Expires'}{' '}
              {expiresAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          )}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingHeaderText}>PRICING</Text>
          </View>
          {pricingRows.map(({ label, value, sub, done }) => (
            <View key={label} style={styles.pricingRow}>
              <View style={styles.pricingLeft}>
                <Text style={styles.pricingLabel}>{label}</Text>
                <Text style={styles.pricingSub}>{sub}</Text>
              </View>
              <View style={styles.pricingRight}>
                <Text style={styles.pricingValue}>{value}</Text>
                {done && <Text style={styles.paidBadge}>PAID ✓</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Info note */}
        <View style={styles.infoCard}>
          <Info size={20} color="#92400e" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Payments handled on the web</Text>
            <Text style={styles.infoBody}>
              All billing is processed securely via Paystack on the Duka web platform. Tap below to manage your subscription.
            </Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => Linking.openURL(WEB_BILLING_URL)}
          style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.ctaLabel}>Manage Billing →</Text>
        </Pressable>

        <Text style={styles.footnote}>Opens securely in your browser · Powered by Paystack</Text>
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },
  scroll: { padding: 16, gap: 14 },
  statusCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    gap: 8,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '900',
  },
  statusDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  daysWrap: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  daysCount: {
    fontSize: 22,
    fontWeight: '900',
  },
  daysLabel: {
    fontSize: 12,
  },
  expiryText: {
    fontSize: 12,
  },
  pricingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    overflow: 'hidden',
  },
  pricingHeader: {
    padding: 14,
    backgroundColor: Colors.surface[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface[100],
  },
  pricingHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.surface[400],
    letterSpacing: 0.5,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface[100],
    gap: 12,
  },
  pricingLeft: { flex: 1, gap: 2 },
  pricingLabel: { fontSize: 14, fontWeight: '700', color: Colors.surface[900] },
  pricingSub: { fontSize: 12, color: Colors.surface[400] },
  pricingRight: { alignItems: 'flex-end', gap: 4 },
  pricingValue: { fontSize: 14, fontWeight: '800', color: Colors.surface[900] },
  paidBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    gap: 10,
  },
  infoText: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  infoBody: { fontSize: 12, color: '#92400e', lineHeight: 18 },
  ctaBtn: {
    backgroundColor: Colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaLabel: { fontSize: 16, fontWeight: '900', color: Colors.dark },
  footnote: { fontSize: 12, color: Colors.surface[400], textAlign: 'center' },
  spacer: { height: 16 },
});
