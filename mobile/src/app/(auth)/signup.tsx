import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Divider } from '../../components/ui/Divider';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start your free trial with Go Virall
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Start Free Trial" onPress={handleSignUp} loading={loading} />
        </View>

        <Divider />

        <View style={styles.social}>
          <Pressable style={[styles.socialBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Text style={[styles.socialText, { color: colors.text }]}>Continue with Google</Text>
          </Pressable>
          <Pressable style={[styles.socialBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Text style={[styles.socialText, { color: colors.text }]}>Continue with Apple</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.link, { color: colors.primary }]}>Sign In</Text>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FontSize.md,
  },
  form: {
    gap: Spacing.lg,
  },
  social: {
    gap: Spacing.md,
  },
  socialBtn: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  socialText: {
    fontSize: FontSize.md,
    fontWeight: '600',
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
