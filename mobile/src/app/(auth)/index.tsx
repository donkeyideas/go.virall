import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { FontSize, Spacing } from '../../constants/theme';

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
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '20' }]}>
          <Svg width={48} height={48} viewBox="0 0 512 512">
            <Defs>
              <LinearGradient id="splashChart" x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.primary} />
                <Stop offset="100%" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            <Polyline
              points="60,380 140,350 200,340 250,310 280,250 310,180 330,140 380,100 412,80"
              stroke="url(#splashChart)"
              strokeWidth={32}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={412} cy={80} r={20} fill={colors.accent} />
          </Svg>
        </View>
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
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
