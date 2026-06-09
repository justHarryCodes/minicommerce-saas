import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { CheckCircle, Film, Lightbulb, Smartphone } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import { Input } from '@/components/ui/Input';
import type { UploadSignature } from '@/types/reels';

interface PickedVideo {
  uri: string;
  duration: number | undefined;
  fileName: string | null | undefined;
}

type UploadStage = 'idle' | 'signing' | 'uploading' | 'saving';

const STAGE_LABELS: Record<UploadStage, string> = {
  idle:      '',
  signing:   'Getting upload credentials…',
  uploading: 'Uploading video…',
  saving:    'Saving reel…',
};

export default function NewReelScreen() {
  const qc = useQueryClient();

  const [video, setVideo]         = useState<PickedVideo | null>(null);
  const [title, setTitle]         = useState('');
  const [desc, setDesc]           = useState('');
  const [stage, setStage]         = useState<UploadStage>('idle');
  const [uploadPct, setUploadPct] = useState(0);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/reels', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reels'] });
      Toast.show({ type: 'success', text1: 'Reel uploaded!' });
      router.back();
    },
    onError: (e: Error) => {
      Toast.show({ type: 'error', text1: e.message });
      setStage('idle');
    },
  });

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setVideo({ uri: asset.uri, duration: asset.duration ?? undefined, fileName: asset.fileName });
  }

  async function handleUpload() {
    if (!video) {
      Toast.show({ type: 'error', text1: 'Please pick a video first' });
      return;
    }
    try {
      setStage('signing');
      const sig = await api.get<UploadSignature>('/api/reels/upload-signature');

      setStage('uploading');
      setUploadPct(0);

      const formData = new FormData();
      formData.append('file', {
        uri: video.uri,
        name: video.fileName ?? 'reel.mp4',
        type: 'video/mp4',
      } as unknown as Blob);
      formData.append('api_key',   sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder',    sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
        { method: 'POST', body: formData }
      );
      setUploadPct(80);

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Cloudinary upload failed');
      }

      const cloudData = await uploadRes.json() as {
        public_id: string;
        secure_url: string;
        duration: number;
        eager?: { secure_url: string }[];
      };
      setUploadPct(100);

      setStage('saving');
      await save.mutateAsync({
        cloudinaryPublicId: cloudData.public_id,
        videoUrl:           cloudData.secure_url,
        thumbnailUrl:       cloudData.eager?.[0]?.secure_url ?? undefined,
        durationSeconds:    cloudData.duration ? Math.round(cloudData.duration) : undefined,
        title:              title.trim() || undefined,
        description:        desc.trim()  || undefined,
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Upload failed' });
      setStage('idle');
    }
  }

  const busy = stage !== 'idle' || save.isPending;

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <SubHeader title="Upload Reel" onBack={() => { if (!busy) router.back(); }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Video picker card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Video file</Text>
              <Text style={styles.cardSub}>Max 60 seconds · MP4 or MOV</Text>
            </View>

            <Pressable
              onPress={pickVideo}
              disabled={busy}
              style={[styles.videoPicker, video && styles.videoPickerDone]}
            >
              {video ? (
                <View style={styles.videoSelected}>
                  <View style={styles.videoIconWrap}>
                    <Film size={28} color={Colors.brand} />
                  </View>
                  <View style={styles.videoMeta}>
                    <Text style={styles.videoName} numberOfLines={1}>
                      {video.fileName ?? 'Video selected'}
                    </Text>
                    {video.duration ? (
                      <Text style={styles.videoDuration}>
                        {Math.round(video.duration)}s · tap to change
                      </Text>
                    ) : (
                      <Text style={styles.videoDuration}>Tap to change</Text>
                    )}
                  </View>
                  <CheckCircle size={18} color={Colors.brand} />
                </View>
              ) : (
                <View style={styles.videoEmpty}>
                  <Smartphone size={40} color={Colors.surface[300]} />
                  <Text style={styles.videoPickLabel}>Tap to pick a video</Text>
                  <Text style={styles.videoPickSub}>MP4 / MOV · max 60 seconds</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Upload progress card ── */}
          {busy && (
            <View style={styles.card}>
              <View style={styles.progressRow}>
                <ActivityIndicator color={Colors.brand} />
                <Text style={styles.progressLabel}>{STAGE_LABELS[stage]}</Text>
              </View>
              {stage === 'uploading' && (
                <View style={styles.progressTrackWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${uploadPct}%` }]} />
                  </View>
                  <Text style={styles.progressPct}>{uploadPct}%</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Reel details card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Reel details</Text>
              <Text style={styles.cardSub}>Both fields are optional</Text>
            </View>

            <View style={styles.fields}>
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. New summer collection drop"
                editable={!busy}
                maxLength={100}
              />
              <Input
                label="Description"
                value={desc}
                onChangeText={setDesc}
                placeholder="Tell customers about this reel…"
                multiline
                numberOfLines={3}
                style={styles.textarea}
                editable={!busy}
                maxLength={500}
              />
            </View>
          </View>

          {/* ── Tips card ── */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Lightbulb size={14} color="#d97706" />
              <Text style={styles.tipTitle}>Tips for better reels</Text>
            </View>
            <View style={styles.tipList}>
              {[
                'Shoot vertically (9:16 aspect ratio) for best results',
                'Keep it under 30 seconds for higher engagement',
                'Show the product being used, worn, or unboxed',
                'Add a price or CTA directly in the video',
              ].map(tip => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => { if (!busy) router.back(); }}
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleUpload}
              disabled={!video || busy}
              style={({ pressed }) => [
                styles.uploadBtn,
                (!video || busy) && styles.uploadBtnDisabled,
                { opacity: pressed && video && !busy ? 0.88 : 1 },
              ]}
            >
              {busy && <ActivityIndicator color={Colors.dark} size="small" />}
              <Text style={styles.uploadLabel}>
                {busy ? 'Uploading…' : 'Upload Reel'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },

  /* ── Cards ── */
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    padding: 16,
    gap: 14,
  },
  cardHeader: { gap: 2 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.surface[900],
    letterSpacing: -0.1,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.surface[400],
    fontWeight: '500',
  },

  /* ── Video picker ── */
  videoPicker: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.surface[300],
    backgroundColor: Colors.surface[50],
    overflow: 'hidden',
  },
  videoPickerDone: {
    borderStyle: 'solid',
    borderColor: Colors.brand,
    backgroundColor: Colors.brandLight,
  },
  videoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  videoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoMeta: { flex: 1, gap: 2 },
  videoName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[900],
  },
  videoDuration: {
    fontSize: 12,
    color: Colors.surface[400],
  },
  videoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  videoPickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[700],
  },
  videoPickSub: {
    fontSize: 12,
    color: Colors.surface[400],
  },

  /* ── Progress ── */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.surface[700],
    flex: 1,
  },
  progressTrackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.surface[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: Colors.brand,
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface[500],
    width: 34,
    textAlign: 'right',
  },

  /* ── Fields ── */
  fields: { gap: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  /* ── Tips ── */
  tipCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 14,
    gap: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
  tipList: { gap: 6 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d97706',
    marginTop: 5,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },

  /* ── Actions ── */
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface[100],
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.surface[700],
  },
  uploadBtn: {
    flex: 2,
    backgroundColor: Colors.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },

  spacer: { height: 16 },
});
