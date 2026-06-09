import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Inbox, Search, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { OrderCard } from '@/components/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Order } from '@/types';

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

const FILTERS = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export default function OrdersScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['orders', filter],
    queryFn: async () => {
      const raw = await api.get<unknown>(
        `/api/orders?limit=50${filter !== 'all' ? `&status=${filter}` : ''}`
      );
      const arr: Record<string, unknown>[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.data)
          ? (raw as Record<string, unknown>).data as Record<string, unknown>[]
          : [];
      return arr.map(mapOrder);
    },
  });

  const orders = (data ?? []).filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.customerPhone.includes(search)
  );

  const subtitle = !isLoading
    ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}${filter !== 'all' ? ` · ${filter}` : ''}`
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[50] }} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Orders" subtitle={subtitle} />

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: Colors.white, borderRadius: 12,
          borderWidth: 1.5, borderColor: Colors.surface[200],
          paddingHorizontal: 12, gap: 8,
        }}>
          <Search size={16} color={Colors.surface[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone, or order #"
            placeholderTextColor={Colors.surface[400]}
            style={{ flex: 1, paddingVertical: 11, fontSize: 14, color: Colors.surface[900] }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color={Colors.surface[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ paddingVertical: 10 }}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: filter === item ? Colors.surface[900] : Colors.white,
                borderWidth: 1.5,
                borderColor: filter === item ? Colors.surface[900] : Colors.surface[200],
              }}
            >
              <Text style={{
                fontSize: 12, fontWeight: '700',
                color: filter === item ? Colors.white : Colors.surface[600],
                textTransform: 'capitalize',
              }}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Text style={{ color: Colors.surface[400], fontSize: 14 }}>Loading orders…</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <AlertTriangle size={28} color="#b45309" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.surface[700], textAlign: 'center', marginBottom: 4 }}>Failed to load orders</Text>
              <Text style={{ fontSize: 12, color: Colors.surface[400], textAlign: 'center' }}>{(error as Error).message}</Text>
            </View>
          ) : (
            <EmptyState icon={<Inbox size={56} color={Colors.surface[300]} />} title="No orders found" subtitle="Orders will appear here once customers start buying." />
          )
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/(app)/orders/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}
