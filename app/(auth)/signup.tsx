import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import { auth } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Colors } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupScreen() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    if (password !== confirm) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user);
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Check your email to verify.' });
      registerForPushNotifications().catch(() => {});
      router.replace('/(app)');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      const msg =
        code.includes('email-already-in-use')   ? 'This email is already registered.' :
        code.includes('network-request-failed') ? 'Network error. Check your connection.' :
        code.includes('invalid-email')          ? 'Invalid email address.' :
        code.includes('weak-password')          ? 'Password is too weak.' :
        'Registration failed. Please try again.';
      Toast.show({ type: 'error', text1: msg });
    } finally {
      setLoading(false);
    }
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
          <View style={styles.logoWrap}>
            <Text style={styles.logoLetter}>D</Text>
          </View>
          <Text style={styles.appName}>Duka Vendors</Text>
          <Text style={styles.powered}>Powered by Awarizon</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.subheading}>Start managing your store today</Text>

          <View style={styles.fields}>
            <Input label="Full name"           value={name}     onChangeText={setName}     placeholder="Jane Doe"            autoComplete="name" />
            <Input label="Email address"       value={email}    onChangeText={setEmail}    placeholder="you@example.com"     keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password"            value={password} onChangeText={setPassword} placeholder="Min. 6 characters"   secureTextEntry />
            <Input label="Confirm password"    value={confirm}  onChangeText={setConfirm}  placeholder="Repeat your password" secureTextEntry />
          </View>

          <Button title="Create account" onPress={handleSignup} loading={loading} fullWidth size="lg" />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.loginLink}>Sign in</Text>
              </Pressable>
            </Link>
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
    paddingTop: 64,
    paddingBottom: 28,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.dark,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  loginText: {
    fontSize: 14,
    color: Colors.surface[500],
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface[900],
    textDecorationLine: 'underline',
  },
});
