import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../assets/logo.png') as number;

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function AppHeader({ title, subtitle, right }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
      <StatusBar backgroundColor={Colors.dark} barStyle="light-content" />
      <View style={styles.row}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle != null && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
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
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.white,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.darkMuted,
    letterSpacing: 0.1,
  },
  right: {
    flexShrink: 0,
  },
  accent: {
    height: 3,
    backgroundColor: Colors.brand,
  },
});
