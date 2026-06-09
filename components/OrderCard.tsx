import { Image, StyleSheet, Text, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { Order } from '@/types';

function fmt(n: number | null | undefined) {
  return '₦' + (Number(n) || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const firstImage = order.items?.[0]?.imageUrl ?? null;
  const itemCount  = order.items?.length ?? 0;

  return (
    <Card onPress={onPress} padding={14}>
      <View style={styles.row}>
        {firstImage ? (
          <Image source={{ uri: firstImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Package size={20} color={Colors.surface[400]} />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.orderNum}>#{order.orderNumber}</Text>
            <Text style={styles.amount}>{fmt(order.totalAmount)}</Text>
          </View>
          <Text style={styles.customer} numberOfLines={1}>{order.customerName}</Text>
          <View style={styles.bottomRow}>
            <View style={styles.badgeRow}>
              <Badge status={order.orderStatus} />
              {itemCount > 0 && (
                <Text style={styles.itemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
              )}
            </View>
            <Text style={styles.time}>{timeAgo(order.createdAt)}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface[100],
  },
  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNum: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.surface[900],
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.surface[900],
  },
  customer: {
    fontSize: 13,
    color: Colors.surface[500],
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemCount: {
    fontSize: 11,
    color: Colors.surface[400],
  },
  time: {
    fontSize: 11,
    color: Colors.surface[400],
  },
});
