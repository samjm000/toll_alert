import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FineStatCard } from '../../components/FineStatCard';
import { Flashing } from '../../components/Flashing';
import { LanguageButton } from '../../components/LanguagePicker';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FINE_STAT_ROTATE_MS, FINE_STATS } from '../../config/fineStats';
import { formatCount, useLanguage } from '../../i18n';
import { colors, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

/**
 * The landing page — also what the GitHub Pages web mockup opens on.
 *
 * Client review (2026-09-24, via Rob): "AVOID THE TOLL FINES" in yellow; a
 * fines card for every toll covered, changing every 5 seconds; the "No
 * barrier. No excuse." section and its paragraph removed; and the Dartford
 * alert shown on the page itself, not only behind a "see what an alert
 * looks like" button, so people can see what they're getting.
 */
export function WelcomeScreen({ navigation }: Props) {
  const { t, language } = useLanguage();
  const [statIndex, setStatIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setStatIndex((i) => (i + 1) % FINE_STATS.length);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, FINE_STAT_ROTATE_MS);
    return () => clearInterval(interval);
  }, [fade]);

  const stat = FINE_STATS[statIndex];
  const millions = stat.totalMillions.toLocaleString(language === 'en' ? 'en-GB' : language);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView edges={['top']} style={styles.topRow}>
          <LanguageButton />
          <View style={styles.progressDots}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
        </SafeAreaView>

        <View style={styles.heroInner}>
          <Logo size={120} variant="full" />
          <Text style={styles.wordmark}>{t.welcome.headline}</Text>
          <Text style={styles.avoidFines}>{t.common.avoidFines}</Text>
        </View>

        <Animated.View style={[styles.statWrap, { opacity: fade }]}>
          <FineStatCard
            badge={`⚠️ ${stat.badge}`}
            number={
              stat.count === undefined
                ? t.stats.money(millions)
                : `${formatCount(language, stat.count)}${stat.countIsFloor ? '+' : ''}`
            }
            label={t.stats.labels[stat.id] ?? ''}
            total={stat.count === undefined ? undefined : t.stats.totalMillions(millions)}
            fine={t.stats.fineEach(stat.fine)}
            source={`Source: ${stat.source}${stat.estimate ? ' · total estimated from count × fine' : ''}`}
          />
        </Animated.View>
        <View style={styles.statDots}>
          {FINE_STATS.map((s, i) => (
            <View key={s.id} style={[styles.statDot, i === statIndex && styles.statDotActive]} />
          ))}
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>🔔 {t.welcome.alertPreviewTitle}</Text>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <Logo size={30} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.notificationHeaderRow}>
                <Text style={styles.notificationApp}>TOLL ALERT</Text>
                <Text style={styles.notificationTime}>{t.welcome.alertNow}</Text>
              </View>
              <Text style={styles.notificationTitle}>{t.welcome.alertTitle('Dartford Crossing')}</Text>
              <Text style={styles.notificationBody}>{t.welcome.alertBody('£3.50')}</Text>
              <Flashing style={styles.tapToPay}>
                <Text style={styles.tapToPayText}>{t.common.tapToPay}</Text>
              </Flashing>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.welcome.download} onPress={() => navigation.navigate('UlezIntro')} />
        <Text style={styles.footerSubtext}>{t.welcome.subscribe}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 32,
  },
  avoidFines: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  statWrap: {
    marginTop: spacing.md,
    // Cards differ in label length; a floor stops the page jumping every 5s.
    minHeight: 250,
  },
  statDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  statDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  statDotActive: { backgroundColor: colors.primary },
  previewSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
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
  notificationCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(8, 6, 4, 0.97)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  tapToPay: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  tapToPayText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: 0.5,
  },
});
