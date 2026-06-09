import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from '@react-native-firebase/auth';
import { auth } from '@/lib/firebase';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleReset() {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Enter your email address' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not send reset email. Check the address.' });
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

        {/* Card */}
        <View style={styles.card}>
          {sent ? (
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Mail size={34} color="#166534" />
              </View>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successSub}>
                We sent a reset link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.backBtn}>
                  <Text style={styles.backBtnLabel}>Back to sign in</Text>
                </Pressable>
              </Link>
            </View>
          ) : (
            <View style={styles.form}>
              <View>
                <Text style={styles.heading}>Reset password</Text>
                <Text style={styles.subheading}>
                  Enter your email and we&apos;ll send you a reset link.
                </Text>
              </View>

              <Input
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
              />

              <Button title="Send reset link" onPress={handleReset} loading={loading} fullWidth size="lg" />

              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.loginRow}>
                  <ArrowLeft size={14} color={Colors.surface[500]} />
                  <Text style={styles.loginText}>Back to sign in</Text>
                </Pressable>
              </Link>
            </View>
          )}
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
    paddingTop: 32,
    paddingBottom: 48,
  },
  form: {
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.surface[900],
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: Colors.surface[500],
    lineHeight: 20,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  loginText: {
    fontSize: 14,
    color: Colors.surface[500],
  },
  successWrap: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.surface[900],
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: Colors.surface[500],
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    fontWeight: '700',
    color: Colors.surface[700],
  },
  backBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: Colors.brand,
    borderRadius: 14,
  },
  backBtnLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.dark,
  },
});
