import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MOCK_CROSSINGS_CONFIG } from '../../config/crossings';
import { useLanguage } from '../../i18n';
import { colors, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'TollsCovered'>;

/**
 * Every crossing the app watches, by name only (no prices — those can go out
 * of date). Read from the crossings config so a new toll appears here too.
 * Drops an operator in brackets ("Dartford Crossing (Dart Charge)") but keeps
 * an acronym ("Ultra Low Emission Zone (ULEZ)").
 */
const TOLLS_COVERED = MOCK_CROSSINGS_CONFIG.crossings.map((c) => ({
  id: c.id,
  icon: c.type === 'point' ? '🌉' : '⬤',
  name: c.name.replace(/\s*\(([^)]*)\)/, (bracket, inner: string) => (/[a-z]/.test(inner) ? '' : bracket)),
}));

/**
 * Page 2 of onboarding. Client ask (2026-10, via Rob): the landing page
 * stopped naming the tolls once the fines cards became one total, and a list
 * squeezed onto the landing page sat behind GET STARTED on a phone — so it
 * gets a page of its own.
 */
export function TollsCoveredScreen({ navigation }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.root}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView edges={['top']} style={styles.topRow}>
          <View style={styles.brandRow}>
            <Logo size={28} />
            <Text style={styles.brandText}>Toll Alert</Text>
          </View>
          <View style={styles.progressDots}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
        </SafeAreaView>

        <Text style={styles.title}>{t.welcome.tollsCovered}</Text>
        <View style={styles.list}>
          {TOLLS_COVERED.map((toll) => (
            <View key={toll.id} style={styles.row}>
              <Text style={styles.rowIcon}>{toll.icon}</Text>
              <Text style={styles.rowName}>{toll.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.howItWorks.continue} onPress={() => navigation.navigate('AlertPreview')} />
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { fontSize: 15, fontWeight: '800', color: colors.text },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowIcon: { fontSize: 16, color: colors.primary, width: 22, textAlign: 'center' },
  rowName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
});
