import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';
import { FontSize, Spacing } from '../constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, loading } = useAuth();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start(() => {
      if (!loading) {
        router.replace(user ? '/(tabs)' : '/(auth)/login');
      }
    });
  }, [loading, user]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>Go Virall</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Social Intelligence Platform</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: barWidth,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  splashIcon: {
    width: 120,
    height: 120,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    width: '60%',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
