import { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { TextInput } from '../../components/ui/TextInput';
import { FontSize, Spacing, BorderRadius, glassShadowSm, glassShadow } from '../../constants/theme';
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

const NICHES = [
  'Beauty & Fashion', 'Fitness & Health', 'Food & Cooking', 'Gaming',
  'Travel & Lifestyle', 'Tech & Gadgets', 'Business & Finance', 'Education',
  'Entertainment & Comedy', 'Music & Art', 'Parenting & Family', 'Sports', 'Other',
];

const GOALS = [
  'Grow my audience', 'Increase engagement', 'Monetize my content',
  'Land brand deals', 'Build a personal brand', 'Track competitors', 'Just exploring',
];

const REFERRAL_SOURCES = [
  'Social Media', 'Google Search', 'Friend/Referral', 'YouTube', 'Blog/Article', 'Other',
];

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signUp, signInWithProvider } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useAppModal();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [niche, setNiche] = useState('');
  const [goal, setGoal] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const [nicheOpen, setNicheOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await signUp(email.trim(), password, fullName);
    setLoading(false);
    if (error) {
      showModal({ title: 'Sign up failed', message: error, kind: 'danger' });
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    const { error } = await signInWithProvider(provider);
    setOauthLoading(null);
    if (error) {
      showModal({ title: 'Sign up failed', message: error, kind: 'danger' });
    } else {
      router.replace('/(tabs)');
    }
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    setValue: (v: string) => void,
  ) => (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(!isOpen)}
        style={[styles.dropdownBtn, { backgroundColor: colors.inputBg }, glassShadowSm(colors), { borderWidth: 1, borderColor: colors.glassBorder }]}
      >
        <Text style={[styles.dropdownText, { color: value ? colors.text : colors.textMuted }]}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <Text style={[styles.dropdownArrow, { color: colors.textMuted }]}>{isOpen ? '\u25B2' : '\u25BC'}</Text>
      </Pressable>
      {isOpen && (
        <View style={[styles.dropdownList, { backgroundColor: colors.surface }, glassShadow(colors), { borderWidth: 1, borderColor: colors.glassBorder }]}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => { setValue(opt); setOpen(false); }}
              style={[styles.dropdownItem, opt === value && { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.dropdownItemText, { color: opt === value ? colors.primary : colors.text }]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo-glow.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start your free 14-day trial. No credit card required.
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
              buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_UP}
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
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or sign up with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <TextInput
                label="First Name"
                placeholder="First name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.halfField}>
              <TextInput
                label="Last Name"
                placeholder="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
            placeholder="Create a password (min 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              {renderDropdown('Content Niche', niche, NICHES, nicheOpen, setNicheOpen, setNiche)}
            </View>
            <View style={styles.halfField}>
              {renderDropdown('Primary Goal', goal, GOALS, goalOpen, setGoalOpen, setGoal)}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <TextInput
                label="City"
                placeholder="Your city"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.halfField}>
              <TextInput
                label="State"
                placeholder="Your state"
                value={state}
                onChangeText={setState}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {renderDropdown('How did you hear about us?', referral, REFERRAL_SOURCES, referralOpen, setReferralOpen, setReferral)}

          <Pressable
            onPress={handleSignUp}
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }, glassShadowSm(colors), { borderWidth: 1, borderColor: colors.glassBorder }]}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.terms, { color: colors.textMuted }]}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
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
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 200,
    height: 60,
  },
  subtitle: {
    fontSize: FontSize.md,
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
  form: {
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  dropdownBtn: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: FontSize.md,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  dropdownList: {
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dropdownItemText: {
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
  terms: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  footerText: {
    fontSize: FontSize.md,
  },
  link: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
