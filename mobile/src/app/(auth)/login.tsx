import { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { TextInput } from '../../components/ui/TextInput';
import { FontSize, Spacing, BorderRadius, glassShadowSm } from '../../constants/theme';
import { useToast } from '../../components/cockpit/Toast';
import { useAppModal } from '../../components/cockpit/AppModal';

// Lazy-load so Expo Go doesn't crash on native module lookup.
const AppleAuth: any = (() => {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-apple-authentication');
  } catch {
    return null;
  }
})();

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn, signInWithProvider } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useAppModal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please enter your email and password', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      showModal({ title: 'Sign in failed', message: error, kind: 'danger' });
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    const { error } = await signInWithProvider(provider);
    setOauthLoading(null);
    if (error) {
      showModal({ title: 'Sign in failed', message: error, kind: 'danger' });
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo-glow.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your dashboard
          </Text>
        </View>

        <View style={styles.socialCol}>
          <Pressable
            onPress={() => handleOAuth('google')}
            disabled={oauthLoading !== null}
            style={[styles.socialBtn, { backgroundColor: colors.surface, opacity: oauthLoading === 'apple' ? 0.5 : 1 }, glassShadowSm(colors), { borderWidth: 1, borderColor: colors.glassBorder }]}
          >
            {oauthLoading === 'google' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <View style={styles.socialInner}>
                <Ionicons name="logo-google" size={18} color={colors.text} />
                <Text style={[styles.socialText, { color: colors.text }]}>Continue with Google</Text>
              </View>
            )}
          </Pressable>
          {AppleAuth && (
            <AppleAuth.AppleAuthenticationButton
              buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                colors.background === '#FFFFFF'
                  ? AppleAuth.AppleAuthenticationButtonStyle.BLACK
                  : AppleAuth.AppleAuthenticationButtonStyle.WHITE
              }
              cornerRadius={BorderRadius.md}
              style={styles.appleBtn}
              onPress={() => handleOAuth('apple')}
            />
          )}
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }, glassShadowSm(colors), { borderWidth: 1, borderColor: colors.glassBorder }]}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text style={[styles.link, { color: colors.primary }]}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 200,
    height: 60,
  },
  subtitle: {
    fontSize: FontSize.md,
  },
  form: {
    gap: Spacing.lg,
  },
  socialCol: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  appleBtn: {
    width: '100%',
    minHeight: 48,
  },
  socialBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  socialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socialText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSize.sm,
  },
  primaryBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxxl,
  },
  footerText: {
    fontSize: FontSize.md,
  },
  link: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
