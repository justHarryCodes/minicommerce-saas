import { useRef } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { api } from '@/lib/api';
import { Lightbulb, Share2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import type { Store } from '@/types';

export default function QRCodeScreen() {
  const shotRef = useRef<ViewShot>(null);

  const { data: store } = useQuery<Store>({
    queryKey: ['store'],
    queryFn:  () => api.get<Store>('/api/dashboard/store'),
  });

  const storeUrl = store ? `https://${store.slug}.awarizon.shop` : '';

  async function handleShare() {
    try {
      const uri = await (shotRef.current as unknown as { capture: () => Promise<string> }).capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your store QR code' });
      } else {
        Alert.alert('Sharing not available', 'Your device does not support sharing files.');
      }
    } catch {
      Alert.alert('Error', 'Could not capture QR code. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <SubHeader title="Store QR Code" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* QR card */}
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1.0 }} style={styles.shotWrap}>
          <View style={styles.qrCard}>
            <View style={styles.brandRow}>
              <Text style={styles.brandName}>DUKA</Text>
              <Text style={styles.brandSub}>{store?.name ?? 'My Store'}</Text>
            </View>

            {storeUrl ? (
              <View style={styles.qrBorder}>
                <QRCode
                  value={storeUrl}
                  size={200}
                  color={Colors.surface[900]}
                  backgroundColor={Colors.white}
                  logo={undefined}
                  logoSize={40}
                  logoBorderRadius={8}
                  logoBackgroundColor={Colors.brand}
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>Loading…</Text>
              </View>
            )}

            <View style={styles.urlWrap}>
              <Text style={styles.scanLabel}>SCAN TO VISIT STORE</Text>
              <View style={styles.urlBox}>
                <Text style={styles.urlText} numberOfLines={1}>{storeUrl || '—'}</Text>
              </View>
            </View>

            <View style={styles.accentStrip} />
          </View>
        </ViewShot>

        {/* Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Lightbulb size={14} color="#9a3412" />
            <Text style={styles.tipTitle}>How to use</Text>
          </View>
          <Text style={styles.tipBody}>
            Screenshot this page or tap Share below. Send the QR code on WhatsApp, Instagram, or print it for your shop. Customers scan it to visit your store instantly.
          </Text>
        </View>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Share2 size={18} color={Colors.dark} />
          <Text style={styles.shareBtnLabel}>
            {Platform.OS === 'android' ? 'Share QR Code' : 'Share / Save QR Code'}
          </Text>
        </Pressable>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },
  scroll: { padding: 24, gap: 20, alignItems: 'center' },
  shotWrap: { width: '100%' },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  brandRow: { alignItems: 'center', gap: 4 },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.dark,
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: 13,
    color: Colors.surface[500],
    fontWeight: '600',
  },
  qrBorder: {
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.brand,
  },
  qrPlaceholder: {
    width: 232,
    height: 232,
    backgroundColor: Colors.surface[100],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: { color: Colors.surface[400] },
  urlWrap: { alignItems: 'center', gap: 6 },
  scanLabel: {
    fontSize: 11,
    color: Colors.surface[400],
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  urlBox: {
    backgroundColor: Colors.surface[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  urlText: {
    fontSize: 12,
    color: Colors.dark,
    fontWeight: '700',
  },
  accentStrip: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.brand,
    borderRadius: 4,
  },
  tipCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipTitle: { fontSize: 13, color: '#9a3412', fontWeight: '700' },
  tipBody: { fontSize: 12, color: '#9a3412', lineHeight: 18 },
  shareBtn: {
    backgroundColor: Colors.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  shareBtnLabel: { fontSize: 15, fontWeight: '900', color: Colors.dark },
  spacer: { height: 16 },
});
