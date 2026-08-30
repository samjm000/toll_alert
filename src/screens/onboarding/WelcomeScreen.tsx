import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radii, shadow, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const DEMO_VISIBLE_MS = 4500;

const WARNING_STATS = [
  { number: '2,130,392', label: 'ULEZ fines issued last year' },
  { number: '500,000+', label: 'Dart Charge fines in one month' },
];

export function WelcomeScreen({ navigation }: Props) {
  const [demoVisible, setDemoVisible] = useState(false);
  const [statIndex, setStatIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextStat = () => setStatIndex((i) => (i + 1) % WARNING_STATS.length);
  const stat = WARNING_STATS[statIndex];

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
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView style={styles.heroInner} edges={['top']}>
          <Logo size={92} variant="full" />
          <Text style={styles.wordmark}>Avoid the penalty charge</Text>
          <Text style={styles.tagline}>Drive on. We'll watch the crossings.</Text>
        </SafeAreaView>

        <Pressable style={styles.statCard} onPress={nextStat}>
          <View style={styles.statBadgeRow}>
            <Text style={styles.statBadge}>⚠️ FINES ISSUED</Text>
            <View style={styles.statNextButton}>
              <Text style={styles.statNextText}>NEXT ›</Text>
            </View>
          </View>
          <Text style={styles.statNumber}>{stat.number}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
          <View style={styles.statDots}>
            {WARNING_STATS.map((s, i) => (
              <View key={s.number} style={[styles.statDot, i === statIndex && styles.statDotActive]} />
            ))}
          </View>
        </Pressable>

        <View style={styles.content}>
          <Text style={styles.title}>One missed crossing. One nasty fine.</Text>
          <Text style={styles.copy}>
            Toll Alert watches Dartford Crossing and the London ULEZ in the background and warns
            you the moment you cross — even if the app isn't open. No more finding out weeks later.
          </Text>
          <Pressable onPress={triggerDemo} style={styles.demoButton}>
            <Text style={styles.demoButtonText}>🔔 See what an alert looks like</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  heroInner: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  wordmark: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.gold,
  },
  statBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.6,
  },
  statNextButton: {
    backgroundColor: colors.primarySoftBg,
    borderRadius: radii.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statNextText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  statNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.primary,
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  statDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
  },
  statDot: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  statDotActive: {
    backgroundColor: colors.primary,
  },
  content: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 32,
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
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
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
    backgroundColor: 'rgba(8, 6, 4, 0.97)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.5,
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
