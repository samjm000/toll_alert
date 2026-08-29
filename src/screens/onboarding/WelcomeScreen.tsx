import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, gradient, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const DEMO_VISIBLE_MS = 4500;

export function WelcomeScreen({ navigation }: Props) {
  const [demoVisible, setDemoVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideDemo = () => {
    Animated.timing(slideAnim, { toValue: -160, duration: 250, useNativeDriver: true }).start(() => {
      setDemoVisible(false);
    });
  };

  const triggerDemo = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setDemoVisible(true);
    slideAnim.setValue(-160);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    hideTimer.current = setTimeout(hideDemo, DEMO_VISIBLE_MS);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={styles.hero}
      >
        <SafeAreaView style={styles.heroInner} edges={['top']}>
          <Logo size={104} variant="full" />
          <Text style={styles.wordmark}>Toll Alert</Text>
          <Text style={styles.tagline}>Drive on. We'll watch the crossings.</Text>
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView style={styles.body} edges={['bottom']}>
        <View style={styles.content}>
          <View style={styles.warningChip}>
            <Text style={styles.warningChipText}>⚠️ 2,130,392 ULEZ fines issued last year</Text>
          </View>
          <Text style={styles.title}>One missed crossing. One nasty fine.</Text>
          <Text style={styles.copy}>
            Toll Alert watches Dartford Crossing and the London ULEZ in the background and warns
            you the moment you cross — even if the app isn't open. No more finding out weeks later.
          </Text>
          <Pressable onPress={triggerDemo} style={styles.demoButton}>
            <Text style={styles.demoButtonText}>🔔 See what an alert looks like</Text>
          </Pressable>
        </View>
        <PrimaryButton label="Get started" onPress={() => navigation.navigate('HowItWorks')} />
      </SafeAreaView>

      {demoVisible && (
        <Animated.View
          style={[styles.notification, { transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
          <SafeAreaView edges={['top']}>
            <Pressable style={styles.notificationCard} onPress={hideDemo}>
              <View style={styles.notificationIcon}>
                <Text style={styles.notificationIconText}>🔔</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.notificationHeaderRow}>
                  <Text style={styles.notificationApp}>TOLL ALERT</Text>
                  <Text style={styles.notificationTime}>now</Text>
                </View>
                <Text style={styles.notificationTitle}>Dartford Crossing detected</Text>
                <Text style={styles.notificationBody}>
                  You've just crossed. Tap to pay £2.50 — or mark as paid once you have.
                </Text>
              </View>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 1.6,
    paddingTop: spacing.sm,
    borderBottomLeftRadius: spacing.xl,
    borderBottomRightRadius: spacing.xl,
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textOnDark,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnDarkMuted,
  },
  body: {
    flex: 1,
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#3A2E0A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  warningChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerBg,
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  warningChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 34,
  },
  copy: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 21,
  },
  demoButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDeep,
  },
  notification: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(23, 20, 15, 0.96)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconText: { fontSize: 16 },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationApp: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textOnDarkMuted,
    letterSpacing: 0.5,
  },
  notificationTime: {
    fontSize: 10,
    color: colors.textOnDarkMuted,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnDark,
    marginTop: 2,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
});
