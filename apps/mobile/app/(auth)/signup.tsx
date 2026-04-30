import { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, type TextInput as TI } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { Button } from '@/components/ui/Button';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const t = useTokens();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TI>(null);
  const passwordRef = useRef<TI>(null);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError('');
    const result = await signUp(email.trim(), password, name.trim());
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

  const inputStyle = {
    backgroundColor: inputBg,
    borderWidth: inputBorderWidth,
    borderColor: inputBorderColor,
    borderRadius: isGlass(t) ? t.radiusMd : isEditorial(t) ? t.radiusMd : t.radiusMd,
    color: fg,
    fontSize: 15,
    fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
    padding: 14,
    marginBottom: 16,
  };

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
        <Text style={{
          color: fg,
          fontSize: 32,
          fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplay : t.fontDisplay,
          marginBottom: 4,
        }}>
          Go Virall
        </Text>
        <Text style={{ color: muted, fontSize: 15, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 32 }}>
          Create your account
        </Text>

        <Text style={{ color: muted, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 6 }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={subtle}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          style={inputStyle}
        />

        <Text style={{ color: muted, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 6 }}>Email</Text>
        <TextInput
          ref={emailRef}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={subtle}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          style={inputStyle}
        />

        <Text style={{ color: muted, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 6 }}>Password</Text>
        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min 8 characters"
          placeholderTextColor={subtle}
          returnKeyType="go"
          onSubmitEditing={handleSignup}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
          style={inputStyle}
        />

        {error ? (
          <Text style={{ color: errorColor, fontSize: 12, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, marginBottom: 8 }}>{error}</Text>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <Button label={loading ? 'Creating...' : 'Create Account'} onPress={handleSignup} disabled={loading} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: muted, fontSize: 13, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody }}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: primaryColor, fontSize: 13, fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody, fontWeight: '600' }}>Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
