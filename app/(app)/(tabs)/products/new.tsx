import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { getIdToken } from '@react-native-firebase/auth';
import { api, API_BASE } from '@/lib/api';
import { auth } from '@/lib/firebase';

function uploadImage(uri: string, token: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as unknown as Blob);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as Record<string, unknown>;
        if (xhr.status >= 200 && xhr.status < 300 && typeof data.url === 'string') {
          resolve(data.url);
        } else {
          reject(new Error(typeof data.error === 'string' ? data.error : `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid response from upload server'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
import { Camera, ChevronDown, FolderOpen } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';

export default function NewProductScreen() {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '', description: '', price: '', comparePrice: '',
    stockQuantity: '0', isActive: true, isFeatured: false,
  });
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [imageUrl, setImageUrl]       = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [categoryId, setCategoryId]   = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string>('');
  const [showCatModal, setShowCatModal]   = useState(false);

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/api/categories');
      return res.data ?? [];
    },
  });
  const categories = categoriesData ?? [];

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/products', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({ type: 'success', text1: 'Product created!' });
      router.back();
    },
    onError: (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    setUploading(true);
    try {
      const user = auth.currentUser;
      const token = user ? await getIdToken(user) : null;
      const url = await uploadImage(asset.uri, token);
      setImageUrl(url);
    } catch (e) {
      Toast.show({ type: 'error', text1: e instanceof Error ? e.message : 'Image upload failed' });
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!form.name || !form.price) {
      Toast.show({ type: 'error', text1: 'Name and price are required' });
      return;
    }
    create.mutate({
      name:          form.name,
      description:   form.description || undefined,
      price:         parseFloat(form.price),
      comparePrice:  form.comparePrice ? parseFloat(form.comparePrice) : undefined,
      stockQuantity: parseInt(form.stockQuantity) || 0,
      isActive:      form.isActive,
      isFeatured:    form.isFeatured,
      imageUrl:      imageUrl ?? undefined,
      images:        imageUrl ? [imageUrl] : [],
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <SubHeader title="New Product" />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Image picker */}
          <Pressable onPress={pickImage} style={styles.imagePicker}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={30} color={Colors.surface[400]} />
                <Text style={styles.imagePlaceholderText}>Add photo</Text>
              </View>
            )}
          </Pressable>
          {uploading && <Text style={styles.uploadingText}>Uploading image...</Text>}

          <Input label="Product name" required value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Blue Sneakers" />
          <Input label="Description" value={form.description} onChangeText={(v) => setForm(f => ({ ...f, description: v }))} placeholder="Describe your product..." multiline numberOfLines={3} style={styles.textarea} />

          <View style={styles.priceRow}>
            <View style={styles.flex}>
              <Input label="Price (₦)" required value={form.price} onChangeText={(v) => setForm(f => ({ ...f, price: v }))} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={styles.flex}>
              <Input label="Compare price" value={form.comparePrice} onChangeText={(v) => setForm(f => ({ ...f, comparePrice: v }))} keyboardType="numeric" placeholder="Old price" />
            </View>
          </View>

          <Input label="Stock quantity" value={form.stockQuantity} onChangeText={(v) => setForm(f => ({ ...f, stockQuantity: v }))} keyboardType="numeric" placeholder="0" />

          {/* Category picker */}
          <View>
            <Text style={styles.fieldLabel}>Category</Text>
            <Pressable onPress={() => setShowCatModal(true)} style={styles.catPicker}>
              <FolderOpen size={16} color={categoryLabel ? Colors.surface[700] : Colors.surface[400]} />
              <Text style={[styles.catPickerText, categoryLabel && styles.catPickerTextSelected]}>
                {categoryLabel || 'None (optional)'}
              </Text>
              <ChevronDown size={16} color={Colors.surface[400]} />
            </Pressable>
          </View>

          {/* Toggles */}
          <View style={styles.toggleCard}>
            {([
              { key: 'isActive' as const,   label: 'Active (visible in store)', sub: 'Customers can see and buy this product' },
              { key: 'isFeatured' as const, label: 'Featured',                  sub: 'Show in featured section' },
            ]).map(({ key, label, sub }, i, arr) => (
              <View key={key} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleRowBorder]}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Text style={styles.toggleSub}>{sub}</Text>
                </View>
                <Switch
                  value={form[key]}
                  onValueChange={(v) => setForm(f => ({ ...f, [key]: v }))}
                  trackColor={{ true: Colors.brand }}
                  thumbColor={Colors.white}
                />
              </View>
            ))}
          </View>

          <Button title="Create Product" onPress={handleSubmit} loading={create.isPending} disabled={uploading} fullWidth size="lg" />
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal visible={showCatModal} transparent animationType="slide" onRequestClose={() => setShowCatModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCatModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => { setCategoryId(null); setSubcategoryId(null); setCategoryLabel(''); setShowCatModal(false); }}>
                <Text style={styles.modalClear}>Clear</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {categories.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <FolderOpen size={32} color={Colors.surface[300]} />
                  <Text style={styles.modalEmptyText}>No categories yet</Text>
                  <Pressable
                    onPress={() => { setShowCatModal(false); router.push('/(app)/categories/new'); }}
                    style={styles.modalCreateBtn}
                  >
                    <Text style={styles.modalCreateLabel}>+ Create Category</Text>
                  </Pressable>
                </View>
              ) : categories.map(cat => (
                <View key={cat.id} style={styles.catItem}>
                  <Pressable
                    onPress={() => { setCategoryId(cat.id); setSubcategoryId(null); setCategoryLabel(cat.name); setShowCatModal(false); }}
                    style={[styles.catRow, categoryId === cat.id && !subcategoryId && styles.catRowSelected]}
                  >
                    <View style={styles.catDot} />
                    <Text style={styles.catName}>{cat.name}</Text>
                  </Pressable>

                  {cat.subcategories.map((sub) => (
                    <Pressable
                      key={sub.id}
                      onPress={() => { setCategoryId(cat.id); setSubcategoryId(sub.id); setCategoryLabel(`${cat.name} › ${sub.name}`); setShowCatModal(false); }}
                      style={[styles.subRow, subcategoryId === sub.id && styles.catRowSelected]}
                    >
                      <View style={styles.subDot} />
                      <Text style={styles.subName}>{sub.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  imagePicker: { alignSelf: 'center' },
  imagePreview: { width: 120, height: 120, borderRadius: 16 },
  imagePlaceholder: {
    width: 120, height: 120, borderRadius: 16,
    backgroundColor: Colors.surface[100],
    borderWidth: 2, borderColor: Colors.surface[200], borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  imagePlaceholderText: { fontSize: 12, color: Colors.surface[400], fontWeight: '600' },
  uploadingText: { textAlign: 'center', color: Colors.surface[400], fontSize: 12 },
  priceRow: { flexDirection: 'row', gap: 12 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.surface[700], marginBottom: 6 },
  catPicker: {
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.surface[200],
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  catPickerText: { flex: 1, fontSize: 14, color: Colors.surface[400] },
  catPickerTextSelected: { color: Colors.surface[900] },
  toggleCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.surface[200],
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14,
  },
  toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.surface[100] },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.surface[900] },
  toggleSub: { fontSize: 12, color: Colors.surface[400] },
  spacer: { height: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%',
  },
  modalHeader: {
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.surface[100],
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '900', color: Colors.surface[900] },
  modalClear: { fontSize: 13, color: Colors.surface[400], fontWeight: '600' },
  modalList: { padding: 12, gap: 6 },
  modalEmpty: { alignItems: 'center', padding: 32, gap: 12 },
  modalEmptyText: { color: Colors.surface[500], fontSize: 14, textAlign: 'center' },
  modalCreateBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
  },
  modalCreateLabel: { fontSize: 14, fontWeight: '800', color: Colors.dark },
  catItem: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surface[100] },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, backgroundColor: Colors.white },
  catRowSelected: { backgroundColor: Colors.brandLight },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand },
  catName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.surface[900] },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, paddingLeft: 32,
    borderTopWidth: 1, borderTopColor: Colors.surface[100],
    backgroundColor: Colors.surface[50], gap: 8,
  },
  subDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.surface[300] },
  subName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.surface[700] },
});
