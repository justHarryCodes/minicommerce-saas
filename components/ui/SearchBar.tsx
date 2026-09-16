import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

/**
 * The icon + input + clear-button search field, shared by every screen
 * that has one (Orders, Products) — was copy-pasted between the two with
 * the inner styling identical but the outer wrapper's bottom padding
 * silently drifting (2 vs 10). Each screen still owns its own outer
 * spacing (it varies legitimately with what sits below — filter chips on
 * one screen, nothing on the other), this just fixes the field itself.
 */
export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View style={styles.bar}>
      <Search size={16} color={Colors.surface[400]} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.surface[400]}
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={16} color={Colors.surface[400]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.surface[900],
  },
});
