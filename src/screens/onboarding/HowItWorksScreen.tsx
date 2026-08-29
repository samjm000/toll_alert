import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'HowItWorks'>;

const STEPS = [
  {
    title: 'It detects the crossing',
    body: 'Toll Alert notices when you’ve crossed the bridge, tunnel, or toll road — running in the background, even with the app closed.',
  },
  {
    title: 'It sends you an alert',
    body: 'A phone notification reminds you straight away which charge applies, with a link to pay it.',
  },
  {
    title: 'You tap "Paid" once you have',
    body: 'That turns the reminder off. Toll Alert doesn’t check with Dart Charge or TfL — tapping "Paid" just tells the app you’ve paid, it doesn’t prove it.',
  },
];

export function HowItWorksScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>How it works</Text>
        {STEPS.map((step, i) => (
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

        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>2,130,392</Text>
          <Text style={styles.statBody}>
            ULEZ penalty charge notices were issued in the year to September 2024 — Toll Alert
            helps make sure you're never one of them.
          </Text>
          <Text style={styles.statSource}>Source: Mayor of London / TfL, FOI response to the London Assembly</Text>
        </Card>
      </ScrollView>
      <PrimaryButton label="Continue" onPress={() => navigation.navigate('Disclaimer')} />
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
  statCard: {
    backgroundColor: colors.primarySoftBg,
    borderColor: colors.primarySoftBg,
    marginTop: spacing.xs,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDeep,
  },
  statBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 4,
  },
  statSource: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
