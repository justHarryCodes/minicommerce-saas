import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Package } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { useNotificationsStore } from '@/store/notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function NotifItem({ item }: { item: Notification }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        !item.is_read && styles.itemUnread,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push('/(app)/orders')}
    >
      <View style={[styles.iconWrap, item.type === 'order' && styles.iconWrapOrder]}>
        <Package size={18} color={Colors.brand} />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const setUnreadCount = useNotificationsStore(s => s.setUnreadCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { notifications: data, unreadCount } =
        await api.get<{ notifications: Notification[]; unreadCount: number }>(
          '/api/mobile/notifications'
        );
      setNotifications(data);
      setUnreadCount(unreadCount);
    } catch {
      // keep whatever we had
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount, then mark all read
  useEffect(() => {
    load().then(() => {
      api.patch('/api/mobile/notifications/read-all', {}).then(() => {
        setUnreadCount(0);
        // Optimistically flip all items to read
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }).catch(() => {});
    });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <ArrowLeft size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <View style={styles.headerAccent} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color={Colors.surface[300]} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptyBody}>New order alerts will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={({ item }) => <NotifItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerAccent: { height: 3, backgroundColor: Colors.brand },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.surface[700] },
  emptyBody: { fontSize: 13, color: Colors.surface[400], textAlign: 'center', marginTop: 2 },

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: Colors.surface[200], marginLeft: 70 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: 12,
  },
  itemUnread: {
    backgroundColor: '#FFFBEB',
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapOrder: {
    backgroundColor: 'rgba(233,188,7,0.12)',
  },

  itemBody: { flex: 1, gap: 3 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: Colors.surface[900] },
  itemTime: { fontSize: 11, color: Colors.surface[400], fontWeight: '500', flexShrink: 0 },
  itemDesc: { fontSize: 13, color: Colors.surface[600], lineHeight: 18 },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand,
    flexShrink: 0,
  },
});
