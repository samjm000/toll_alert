import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinesTotalBox } from '../../components/FinesTotalBox';
import { Flashing } from '../../components/Flashing';
import { LanguageButton } from '../../components/LanguagePicker';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { SUBSCRIPTIONS_ENABLED } from '../../config/release';
import { useLanguage } from '../../i18n';
import { colors, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

/**
 * The landing page — also what the GitHub Pages web mockup opens on.
 *
 * Client review (2026-09-24, via Rob): "AVOID THE TOLL FINES" in yellow; the
 * "No barrier. No excuse." section and its paragraph removed; and the Dartford
 * alert shown on the page itself, not only behind a "see what an alert
 * looks like" button, so people can see what they're getting. Follow-up
 * (2026-10): the per-scheme fines cards became one combined annual total.
 */
export function WelcomeScreen({ navigation }: Props) {
  const { t } = useLanguage();

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

        <View style={styles.statWrap}>
          <FinesTotalBox />
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
              <Text style={styles.notificationBody}>{t.welcome.alertBody}</Text>
              <Flashing style={styles.tapToPay}>
                <Text style={styles.tapToPayText}>{t.common.tapToPay}</Text>
              </Flashing>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.welcome.download} onPress={() => navigation.navigate('UlezIntro')} />
        {SUBSCRIPTIONS_ENABLED && <Text style={styles.footerSubtext}>{t.welcome.subscribe}</Text>}
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
  },
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
