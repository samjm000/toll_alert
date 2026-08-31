import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FineStatCard } from '../../components/FineStatCard';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const DEMO_VISIBLE_MS = 4500;
const STAT_ROTATE_MS = 10000;

const STATS = [
  {
    badge: '⚠️ DARTFORD CROSSING',
    number: '500,000+',
    label: 'Dart Charge fines in one month',
    source: 'Source: FleetNews',
  },
  {
    badge: '⚠️ THE ULEZ',
    number: '2,130,392',
    label: 'ULEZ fines issued last year',
    source: 'Source: Mayor of London / TfL, FOI response to the London Assembly',
  },
  {
    badge: '⚠️ CONGESTION CHARGE',
    number: '817,000+',
    label: 'Congestion Charge fines in one year',
    source: 'Source: FleetNews, TfL data (12 months to Sept 2020)',
  },
];

const FEATURES = [
  { icon: '📍', text: "Toll Alert detects when you've travelled through a toll zone" },
  { icon: '🔔', text: 'Toll Alert sends you a reminder to pay' },
  { icon: '📅', text: 'Toll Alert keeps you updated before your payment deadline' },
  { icon: '💷', text: 'Toll Alert helps you avoid costly fines' },
];

export function WelcomeScreen({ navigation }: Props) {
  const [demoVisible, setDemoVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-160)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statIndex, setStatIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatIndex((i) => (i + 1) % STATS.length);
    }, STAT_ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

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
        <SafeAreaView edges={['top']} style={styles.progressRow}>
          <View style={styles.progressDots}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
        </SafeAreaView>

        <View style={styles.heroInner}>
          <Logo size={140} variant="full" />
          <Text style={styles.wordmark}>Never forget a UK road charge again</Text>
        </View>

        <View style={styles.statWrap}>
          <FineStatCard
            badge={STATS[statIndex].badge}
            number={STATS[statIndex].number}
            label={STATS[statIndex].label}
            source={STATS[statIndex].source}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>How it works</Text>
          {FEATURES.map((feature) => (
            <View key={feature.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
          <Pressable onPress={triggerDemo} style={styles.demoButton}>
            <Text style={styles.demoButtonText}>🔔 See what an alert looks like</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label="DOWNLOAD FREE" onPress={() => navigation.navigate('UlezIntro')} />
        <Text style={styles.footerSubtext}>Then subscribe for just £4.99 per year.</Text>
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
  },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  heroInner: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 34,
  },
  statWrap: {
    marginTop: spacing.md,
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
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: 21,
  },
  demoButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
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
    gap: spacing.xs,
  },
  footerSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
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
