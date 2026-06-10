import { Image } from 'expo-image';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../assets/logo.png') as number;

interface Props {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function SubHeader({ title, onBack, right }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />
      <View style={styles.row}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={12}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {right && <View style={styles.right}>{right}</View>}
      </View>
      <View style={styles.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.white,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  right: {
    flexShrink: 0,
  },
  accent: {
    height: 3,
    backgroundColor: Colors.brand,
  },
});
