import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'HowItWorks'>;


/**
 * Steps come from src/i18n/strings.ts `howItWorks.steps`. Client review
 * (2026-09-24, via Rob): keep "It detects the crossing" and the "Paid" step
 * as they were; the alert step now says the reminders repeat through the day
 * until paid; and a new step says the link goes to the official payment site,
 * so nobody gets scammed by a copycat one.
 */
export function HowItWorksScreen({ navigation }: Props) {
  const { t } = useLanguage();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.howItWorks.title}</Text>
        <Text style={styles.avoidFines}>{t.common.avoidFines}</Text>
        {t.howItWorks.steps.map((step, i) => (
          <Card key={step.title} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
      <PrimaryButton label={t.howItWorks.continue} onPress={() => navigation.navigate('Disclaimer')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  scroll: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  avoidFines: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.ink,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  stepBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
