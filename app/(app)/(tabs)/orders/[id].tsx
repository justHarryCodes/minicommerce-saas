import { useState } from 'react';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ChevronDown, Package } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import type { Order } from '@/types';

const STATUS_OPTIONS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:    { bg: '#FEF3C7', text: '#92400E' },
  confirmed:  { bg: '#DBEAFE', text: '#1E40AF' },
  processing: { bg: '#EDE9FE', text: '#5B21B6' },
  shipped:    { bg: '#D1FAE5', text: '#065F46' },
  delivered:  { bg: '#D1FAE5', text: '#065F46' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
};

function mapOrder(raw: Record<string, unknown>): Order {
  const rawItems = (raw.items as Record<string, unknown>[] | null) ?? [];
  return {
    id:              String(raw.id ?? ''),
    orderNumber:     String(raw.order_number ?? ''),
    customerName:    String(raw.customer_name ?? ''),
    customerPhone:   String(raw.customer_phone ?? ''),
    customerEmail:   (raw.customer_email as string) ?? null,
    deliveryAddress: String(raw.delivery_address ?? ''),
    deliveryCity:    (raw.delivery_city as string) ?? null,
    deliveryState:   (raw.delivery_state as string) ?? null,
    deliveryNote:    (raw.delivery_note as string) ?? null,
    paymentMethod:   raw.payment_method as 'paystack' | 'bank_transfer',
    paymentStatus:   String(raw.payment_status ?? ''),
    orderStatus:     String(raw.order_status ?? ''),
    totalAmount:     Number(raw.total_amount ?? raw.total ?? raw.subtotal ?? 0),
    discountAmount:  Number(raw.discount_amount ?? 0),
    couponCode:      (raw.coupon_code as string) ?? null,
    createdAt:       String(raw.created_at ?? ''),
    updatedAt:       String(raw.updated_at ?? ''),
    items: rawItems.map((item) => ({
      id:          String(item.id ?? ''),
      productId:   String(item.product_id ?? ''),
      productName: String(item.product_name ?? ''),
      quantity:    Number(item.quantity ?? 0),
      unitPrice:   Number(item.price ?? 0),
      totalPrice:  Number(item.subtotal ?? 0),
      imageUrl:    (item.product_image as string) ?? null,
    })),
  };
}

function fmt(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const raw = await api.get<Record<string, unknown>>(`/api/orders/${id}`);
      // unwrap common envelope shapes: { order: {...} } or { data: {...} }
      const payload = (
        raw && typeof raw === 'object' && !raw.id
          ? (raw.order ?? raw.data ?? raw)
          : raw
      ) as Record<string, unknown>;
      return mapOrder(payload);
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/api/orders/${id}`, { orderStatus: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      Toast.show({ type: 'success', text1: 'Order status updated' });
    },
    onError: (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[50] }} edges={['left', 'right', 'bottom']}>
        <SubHeader title="Order" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[50] }} edges={['left', 'right', 'bottom']}>
        <SubHeader title="Order" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Package size={40} color={Colors.surface[300]} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.surface[700], textAlign: 'center', marginBottom: 6 }}>
            Order not found
          </Text>
          <Text style={{ fontSize: 13, color: Colors.surface[400], textAlign: 'center' }}>
            {error ? (error as Error).message : 'This order could not be loaded.'}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.dark, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const status = order.orderStatus as OrderStatus;
  const statusColor = STATUS_COLORS[status] ?? { bg: Colors.surface[100], text: Colors.surface[600] };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[50] }} edges={['left', 'right', 'bottom']}>
      <SubHeader
        title={`#${order.orderNumber}`}
        right={
          <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', fontWeight: '600' }}>
            {fmtDate(order.createdAt)}
          </Text>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.surface[100], padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.surface[500], letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Order Status
          </Text>
          <Pressable
            onPress={() => setShowStatusPicker(v => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: statusColor.bg, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: statusColor.text, textTransform: 'capitalize' }}>
              {order.orderStatus}
            </Text>
            <ChevronDown size={16} color={statusColor.text} />
          </Pressable>

          {showStatusPicker && (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: Colors.surface[200], overflow: 'hidden' }}>
              {STATUS_OPTIONS.map((s, i) => {
                const sc = STATUS_COLORS[s];
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setShowStatusPicker(false);
                      if (s !== order.orderStatus) {
                        Alert.alert('Update Status', `Change status to "${s}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Update', onPress: () => updateStatus.mutate(s) },
                        ]);
                      }
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: Colors.surface[100],
                      backgroundColor: order.orderStatus === s ? Colors.surface[50] : Colors.white,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sc.text }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.surface[900], textTransform: 'capitalize' }}>{s}</Text>
                    {order.orderStatus === s && (
                      <Text style={{ marginLeft: 'auto', fontSize: 11, color: Colors.surface[400], fontWeight: '600' }}>current</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Customer info */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.surface[100], padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.surface[500], letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Customer</Text>
          <Row label="Name" value={order.customerName} />
          <Row label="Phone" value={order.customerPhone} />
          {order.customerEmail && <Row label="Email" value={order.customerEmail} />}
        </View>

        {/* Delivery info */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.surface[100], padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.surface[500], letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Delivery</Text>
          <Row label="Address" value={order.deliveryAddress} />
          {order.deliveryCity && <Row label="City" value={order.deliveryCity} />}
          {order.deliveryState && <Row label="State" value={order.deliveryState} />}
          {order.deliveryNote && <Row label="Note" value={order.deliveryNote} />}
        </View>

        {/* Order items */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.surface[100], overflow: 'hidden' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.surface[100] }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.surface[500], letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Items ({order.items.length})
            </Text>
          </View>
          {order.items.map((item, i) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: Colors.surface[100],
              }}
            >
              <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.surface[100], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={{ width: 56, height: 56 }} contentFit="cover" />
                ) : (
                  <Package size={20} color={Colors.surface[400]} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.surface[900] }} numberOfLines={1}>{item.productName}</Text>
                <Text style={{ fontSize: 12, color: Colors.surface[500] }}>Qty {item.quantity} × {fmt(item.unitPrice)}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.surface[900] }}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Payment summary */}
        <View style={{ backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.surface[100], padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.surface[500], letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Payment</Text>
          <Row label="Method" value={order.paymentMethod === 'paystack' ? 'Paystack' : 'Bank Transfer'} />
          <Row label="Payment Status" value={order.paymentStatus} capitalize />
          {order.discountAmount > 0 && <Row label="Discount" value={`-${fmt(order.discountAmount)}`} />}
          {order.couponCode && <Row label="Coupon" value={order.couponCode} />}
          <View style={{ height: 1, backgroundColor: Colors.surface[100], marginVertical: 2 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.surface[900] }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.surface[900] }}>{fmt(order.totalAmount)}</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <Text style={{ fontSize: 13, color: Colors.surface[500], fontWeight: '600', flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: Colors.surface[900], fontWeight: '600', textAlign: 'right', flex: 1, textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </Text>
    </View>
  );
}
