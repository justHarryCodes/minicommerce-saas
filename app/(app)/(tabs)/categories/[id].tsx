import { useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ChevronDown, FolderOpen } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';
import { SubHeader } from '@/components/SubHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE_GAP = 10;
const TILE_PAD = 16;
const TILE_W   = (SCREEN_W - TILE_PAD * 2 - TILE_GAP) / 2;

const ACCENTS = [
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#DBEAFE', icon: '#2563EB' },
  { bg: '#EDE9FE', icon: '#7C3AED' },
  { bg: '#D1FAE5', icon: '#059669' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#FFEDD5', icon: '#EA580C' },
  { bg: '#CCFBF1', icon: '#0D9488' },
  { bg: '#FEE2E2', icon: '#DC2626' },
];

export default function EditCategoryScreen() {
  const { id, name: initialName, parentId: initialParentId } = useLocalSearchParams<{
    id: string;
    name: string;
    parentId?: string;
  }>();
  const qc = useQueryClient();

  const isSubcategory = !!initialParentId;
  const [name, setName] = useState(initialName ?? '');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(initialParentId || null);
  const [showPicker, setShowPicker] = useState(false);

  // Always fetch categories — needed for parent picker + grid display
  const { data } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/api/categories');
      return res.data ?? [];
    },
  });
  const allCategories = data ?? [];
  const topLevel = allCategories.filter(c => c.id !== id);

  const selectedParentName = topLevel.find(c => c.id === selectedParentId)?.name ?? '';

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/api/categories/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      Toast.show({ type: 'success', text1: 'Category updated!' });
      router.back();
    },
    onError: (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  function handleSubmit() {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a name' });
      return;
    }
    if (isSubcategory && !selectedParentId) {
      Toast.show({ type: 'error', text1: 'Select a parent category' });
      return;
    }
    update.mutate({
      name: name.trim(),
      ...(isSubcategory ? { parentId: selectedParentId } : {}),
    });
  }

  // Build row pairs for the grid (exclude current category being edited)
  const gridCategories = allCategories.filter(c => c.id !== id);
  const rows: Category[][] = [];
  for (let i = 0; i < gridCategories.length; i += 2) {
    rows.push(gridCategories.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <SubHeader title={isSubcategory ? 'Edit Subcategory' : 'Edit Category'} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type badge (read-only) */}
          <View style={styles.typeBadge}>
            <View style={styles.typeDot} />
            <Text style={styles.typeLabel}>
              {isSubcategory ? 'Subcategory' : 'Top-level category'}
            </Text>
          </View>

          {/* Parent picker — only for subcategories */}
          {isSubcategory && (
            <View>
              <Text style={styles.fieldLabel}>
                Parent category <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setShowPicker(v => !v)}
                style={[styles.picker, showPicker && styles.pickerFocused]}
              >
                <Text style={[styles.pickerText, !selectedParentName && styles.pickerPlaceholder]}>
                  {selectedParentName || 'Select a category'}
                </Text>
                <ChevronDown size={16} color={Colors.surface[400]} />
              </Pressable>

              {showPicker && (
                <View style={styles.pickerDropdown}>
                  {topLevel.map((cat, idx) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => { setSelectedParentId(cat.id); setShowPicker(false); }}
                      style={[
                        styles.pickerOption,
                        idx === 0 && styles.pickerOptionFirst,
                        selectedParentId === cat.id && styles.pickerOptionSelected,
                      ]}
                    >
                      <Text style={styles.pickerOptionText}>{cat.name}</Text>
                      {selectedParentId === cat.id && <View style={styles.pickerDot} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <Input
            label={isSubcategory ? 'Subcategory name' : 'Category name'}
            required
            value={name}
            onChangeText={setName}
            placeholder={isSubcategory ? 'e.g. T-Shirts' : 'e.g. Clothing'}
            autoFocus
          />

          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={update.isPending}
            fullWidth
            size="lg"
          />

          {/* Other categories grid */}
          {gridCategories.length > 0 && (
            <View style={styles.gridSection}>
              <Text style={styles.gridTitle}>Other Categories</Text>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.row}>
                  {row.map((cat, ci) => {
                    const globalIndex = ri * 2 + ci;
                    const accent = ACCENTS[globalIndex % ACCENTS.length];
                    const subCount = cat.subcategories?.length ?? 0;
                    return (
                      <Pressable
                        key={cat.id}
                        style={({ pressed }) => [styles.tile, { width: TILE_W, opacity: pressed ? 0.85 : 1 }]}
                        onPress={() =>
                          router.replace({
                            pathname: '/(app)/categories/[id]' as never,
                            params: { id: cat.id, name: cat.name, parentId: cat.parentId ?? '' },
                          })
                        }
                      >
                        <View style={[styles.tileIcon, { backgroundColor: accent.bg }]}>
                          <FolderOpen size={24} color={accent.icon} strokeWidth={1.8} />
                        </View>
                        <Text style={styles.tileName} numberOfLines={2}>{cat.name}</Text>
                        {subCount > 0 ? (
                          <View style={[styles.subBadge, { backgroundColor: accent.bg }]}>
                            <Text style={[styles.subBadgeText, { color: accent.icon }]}>
                              {subCount} {subCount === 1 ? 'sub' : 'subs'}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.noSub}>No subcategories</Text>
                        )}
                      </Pressable>
                    );
                  })}
                  {row.length === 1 && <View style={{ width: TILE_W }} />}
                </View>
              ))}
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface[100] },
  flex: { flex: 1 },
  scroll: { padding: TILE_PAD, gap: 16 },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand },
  typeLabel: { fontSize: 13, fontWeight: '700', color: Colors.surface[600] },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.surface[700], marginBottom: 6 },
  required: { color: Colors.error },

  picker: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerFocused: { borderColor: Colors.brand },
  pickerText: { fontSize: 14, color: Colors.surface[900] },
  pickerPlaceholder: { color: Colors.surface[400] },
  pickerDropdown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: Colors.surface[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
  },
  pickerOptionFirst: { borderTopWidth: 0 },
  pickerOptionSelected: { backgroundColor: Colors.brandLight },
  pickerOptionText: { fontSize: 14, fontWeight: '600', color: Colors.surface[900] },
  pickerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand },

  gridSection: { gap: 10 },
  gridTitle: { fontSize: 13, fontWeight: '800', color: Colors.surface[500], textTransform: 'uppercase', letterSpacing: 0.5 },

  row: { flexDirection: 'row', gap: TILE_GAP },

  tile: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surface[200],
    padding: 12,
    gap: 6,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: { fontSize: 13, fontWeight: '800', color: Colors.surface[900], lineHeight: 18 },
  subBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  subBadgeText: { fontSize: 10, fontWeight: '700' },
  noSub: { fontSize: 10, color: Colors.surface[400], fontWeight: '600' },

  spacer: { height: 16 },
});
