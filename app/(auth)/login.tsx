import { useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Colors } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === 'cancelled') return;
      if (!result.data.idToken) throw new Error('No ID token returned');
      const credential = GoogleAuthProvider.credential(result.data.idToken);
      await signInWithCredential(auth, credential);
      registerForPushNotifications().catch(() => {});
      router.replace('/(app)');
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Google sign-in failed', text2: e instanceof Error ? e.message : '' });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      registerForPushNotifications().catch(() => {});
      router.replace('/(app)');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      Toast.show({ type: 'error', text1: 'Sign in failed', text2: friendlyError(code) });
    } finally {
      setLoading(false);
    }
  }

  function friendlyError(code: string): string {
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential'))
      return 'Invalid email or password';
    if (code.includes('too-many-requests'))      return 'Too many attempts — try again later';
    if (code.includes('network-request-failed')) return 'Network error. Check your connection.';
    if (code.includes('user-disabled'))          return 'This account has been disabled.';
    if (code.includes('invalid-email'))          return 'Invalid email address.';
    return 'Sign in failed. Please try again.';
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand hero */}
        <View style={styles.hero}>
          <Image
            source={require('@/assets/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.appName}>Duka Vendors</Text>
          <Text style={styles.powered}>Powered by Awarizon</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to manage your store</Text>

          <View style={styles.fields}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <View>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable style={styles.forgotWrap}>
                  <Text style={styles.forgot}>Forgot password?</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <Button title="Sign in" onPress={handleLogin} loading={loading} fullWidth size="lg" />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            disabled={googleLoading}
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.googleBtn,
              { opacity: googleLoading ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleG}>G</Text>
            </View>
            <Text style={styles.googleLabel}>
              {googleLoading ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don&apos;t have an account?</Text>
            <Pressable onPress={() => WebBrowser.openBrowserAsync('https://awarizon.shop/auth/signup')}>
              <Text style={styles.signupLink}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  powered: {
    fontSize: 13,
    color: Colors.darkMuted,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.surface[900],
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    color: Colors.surface[500],
    marginTop: -8,
  },
  fields: {
    gap: 14,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgot: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.surface[600],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surface[100],
  },
  dividerLabel: {
    fontSize: 12,
    color: Colors.surface[400],
    fontWeight: '500',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.surface[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4285F4',
    lineHeight: 14,
  },
  googleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.surface[800],
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  signupText: {
    fontSize: 14,
    color: Colors.surface[500],
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[900],
    textDecorationLine: 'underline',
  },
});
