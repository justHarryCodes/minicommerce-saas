import { router, Tabs } from 'expo-router';
import { Compass, Home, LogIn, Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const TAB_CONTENT_HEIGHT = 60;

export default function DiscoverTabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_CONTENT_HEIGHT + insets.bottom;

  const defaultTabBar = {
    backgroundColor: '#fff',
    borderTopColor: Colors.surface[200],
    borderTopWidth: 1,
    height: tabBarHeight,
    paddingBottom: insets.bottom,
    paddingTop: 4,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: defaultTabBar,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.surface[400],
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Stores',
          tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color }) => <Play size={22} color={color} />,
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: '#111',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 4,
          },
          tabBarActiveTintColor: Colors.brand,
          tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        }}
      />
      <Tabs.Screen
        name="signin"
        options={{
          title: 'Sign In',
          tabBarIcon: ({ color }) => <LogIn size={22} color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/(auth)/login');
          },
        }}
      />
    </Tabs>
  );
}
