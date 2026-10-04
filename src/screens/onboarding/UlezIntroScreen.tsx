import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FineStatCard } from '../../components/FineStatCard';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FINE_STATS } from '../../config/fineStats';
import { formatCount, useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'UlezIntro'>;

// The same sourced ULEZ figure the landing page cycles through, so the two
// screens can't quote different numbers.
const ULEZ_STAT = FINE_STATS.find((s) => s.id === 'ulez')!;

export function UlezIntroScreen({ navigation }: Props) {
  const { t, language } = useLanguage();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView edges={['top']} style={styles.topRow}>
          <View style={styles.brandRow}>
            <Logo size={28} />
            <Text style={styles.brandText}>Toll Alert</Text>
          </View>
          <View style={styles.progressDots}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
        </SafeAreaView>

        <View style={styles.statWrap}>
          <FineStatCard
            badge={`⚠️ ${ULEZ_STAT.badge}`}
            number={`${formatCount(language, ULEZ_STAT.count ?? 0)}${ULEZ_STAT.countIsFloor ? '+' : ''}`}
            label={t.stats.labels[ULEZ_STAT.id] ?? ''}
            fine={t.stats.fineEach(ULEZ_STAT.fine)}
            source={`Source: ${ULEZ_STAT.source}`}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t.ulezIntro.title}</Text>
          <Text style={styles.copy}>{t.ulezIntro.copy}</Text>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.ulezIntro.getStarted} onPress={() => navigation.navigate('HowItWorks')} />
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { fontSize: 15, fontWeight: '800', color: colors.text },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  statWrap: {
    marginTop: spacing.xl,
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
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
});
