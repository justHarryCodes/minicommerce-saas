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

export default function NewCategoryScreen() {
  const { parentId, parentName } = useLocalSearchParams<{ parentId?: string; parentName?: string }>();
  const qc = useQueryClient();

  const [name, setName]                     = useState('');
  const [isSubMode, setIsSubMode]           = useState(!!parentId);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentId ?? null);
  const [showPicker, setShowPicker]         = useState(false);

  const { data } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: Category[] }>('/api/categories');
      return res.data ?? [];
    },
  });
  const topLevel = data ?? [];

  const selectedParentName = selectedParentId
    ? (topLevel.find(c => c.id === selectedParentId)?.name ?? parentName ?? '')
    : '';

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/categories', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      Toast.show({ type: 'success', text1: isSubMode ? 'Subcategory created!' : 'Category created!' });
      router.back();
    },
    onError: (e: Error) => Toast.show({ type: 'error', text1: e.message }),
  });

  function handleSubmit() {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a name' });
      return;
    }
    if (isSubMode && !selectedParentId) {
      Toast.show({ type: 'error', text1: 'Select a parent category' });
      return;
    }
    create.mutate({
      name: name.trim(),
      ...(isSubMode && selectedParentId ? { parentId: selectedParentId } : {}),
    });
  }

  // Pair up categories into rows of 2
  const rows: Category[][] = [];
  for (let i = 0; i < topLevel.length; i += 2) {
    rows.push(topLevel.slice(i, i + 2));
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <SubHeader title={isSubMode ? 'New Subcategory' : 'New Category'} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type toggle */}
          <View style={styles.toggle}>
            {(['Category', 'Subcategory'] as const).map((label, i) => {
              const active = i === 0 ? !isSubMode : isSubMode;
              return (
                <Pressable
                  key={label}
                  onPress={() => {
                    if (i === 1 && topLevel.length === 0) {
                      Toast.show({ type: 'info', text1: 'Create a category first' });
                      return;
                    }
                    const sub = i === 1;
                    setIsSubMode(sub);
                    if (sub && !selectedParentId && topLevel.length > 0) {
                      setSelectedParentId(topLevel[0].id);
                    }
                  }}
                  style={[styles.toggleOption, active && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Parent picker */}
          {isSubMode && (
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
            label={isSubMode ? 'Subcategory name' : 'Category name'}
            required
            value={name}
            onChangeText={setName}
            placeholder={isSubMode ? 'e.g. T-Shirts' : 'e.g. Clothing'}
            autoFocus
          />

          <Button
            title={isSubMode ? 'Create Subcategory' : 'Create Category'}
            onPress={handleSubmit}
            loading={create.isPending}
            fullWidth
            size="lg"
          />

          {/* Existing categories grid */}
          {topLevel.length > 0 && (
            <View style={styles.gridSection}>
              <Text style={styles.gridTitle}>Existing Categories</Text>
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
                          router.push({
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

  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface[200],
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: { fontSize: 13, fontWeight: '700', color: Colors.surface[500] },
  toggleLabelActive: { color: Colors.surface[900] },

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
