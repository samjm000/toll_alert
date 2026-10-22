import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinesTotalBox } from '../../components/FinesTotalBox';
import { LanguageButton } from '../../components/LanguagePicker';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LANGUAGES_ENABLED, SUBSCRIPTIONS_ENABLED } from '../../config/release';
import { useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;


/**
 * The landing page — also what the GitHub Pages web mockup opens on.
 *
 * Client review (2026-09-24, via Rob): "AVOID THE TOLL FINES" in yellow; the
 * "No barrier. No excuse." section and its paragraph removed; and the Dartford
 * alert shown on its own page (AlertPreviewScreen) so people can see what
 * they're getting. Follow-up (2026-10): the per-scheme fines cards became one
 * combined annual total, and the alert preview moved to page 2.
 */
export function WelcomeScreen({ navigation }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView edges={['top']} style={styles.topRow}>
          {LANGUAGES_ENABLED ? <LanguageButton /> : <View />}
          <View style={styles.progressDots}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
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
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.welcome.download} onPress={() => navigation.navigate('TollsCovered')} />
        {SUBSCRIPTIONS_ENABLED && <Text style={styles.footerSubtext}>{t.welcome.subscribe}</Text>}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
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
});
