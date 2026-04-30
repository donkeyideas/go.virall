import { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, type TextInput as TI } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const t = useTokens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TI>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.replace('/(drawer)');
    }
  };

  const inputBg = isGlass(t) ? 'rgba(255,255,255,0.05)'
    : isEditorial(t) ? t.surface
    : t.surfaceLighter;
  const inputBorderWidth = isNeumorphic(t) ? 0 : isEditorial(t) ? t.border.width : 1;
  const inputBorderColor = isNeumorphic(t) ? 'transparent' : isEditorial(t) ? t.border.color : (isGlass(t) ? t.line : 'transparent');
  const primaryColor = isGlass(t) ? t.violet : isEditorial(t) ? t.accent : t.accent;
  const errorColor = isGlass(t) ? t.bad : isEditorial(t) ? t.bad : t.bad;
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted;
  const subtle = isGlass(t) ? t.subtle : isEditorial(t) ? t.faint : t.faint;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isGlass(t) ? t.bg : isEditorial(t) ? t.bg : t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Header */}
        <Text style={{
          color: fg,
          fontSize: 32,
          fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplay : t.fontDisplay,
          marginBottom: 4,
        }}>
          Go Virall
        </Text>
        <Text style={{ color: muted, fontSize: 15, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 32 }}>
          Sign in to your account
        </Text>

        {/* Email */}
        <Text style={{ color: muted, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholderTextColor={subtle}
          placeholder="you@example.com"
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          style={{
            backgroundColor: inputBg,
            borderWidth: inputBorderWidth,
            borderColor: inputBorderColor,
            borderRadius: isGlass(t) ? t.radiusMd : isEditorial(t) ? t.radiusMd : t.radiusMd,
            color: fg,
            fontSize: 15,
            fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
            padding: 14,
            marginBottom: 16,
          }}
        />

        {/* Password */}
        <Text style={{ color: muted, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 6 }}>Password</Text>
        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          placeholderTextColor={subtle}
          placeholder="Your password"
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          style={{
            backgroundColor: inputBg,
            borderWidth: inputBorderWidth,
            borderColor: inputBorderColor,
            borderRadius: isGlass(t) ? t.radiusMd : isEditorial(t) ? t.radiusMd : t.radiusMd,
            color: fg,
            fontSize: 15,
            fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
            padding: 14,
            marginBottom: 8,
          }}
        />

        {error ? (
          <Text style={{ color: errorColor, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 8 }}>
            {error}
          </Text>
        ) : null}

        {/* Submit */}
        <View style={{ marginTop: 16 }}>
          <Button label={loading ? 'Signing in...' : 'Sign In'} onPress={handleLogin} disabled={loading} />
        </View>

        {/* Link to signup */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: muted, fontSize: 13, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody }}>
            Don't have an account?{' '}
          </Text>
          <Link href="/(auth)/signup">
            <Text style={{ color: primaryColor, fontSize: 13, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, fontWeight: '600' }}>
              Sign Up
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
