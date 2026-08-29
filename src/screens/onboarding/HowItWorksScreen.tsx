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
    title: 'Runs quietly in the background',
    body: 'Toll Alert uses your location in the background to notice when you enter a monitored crossing or charging zone — you don’t need the app open.',
  },
  {
    title: 'Alerts you the moment you cross',
    body: 'A notification appears reminding you which charge applies and a link to pay it.',
  },
  {
    title: 'You confirm payment yourself',
    body: 'Tapping "Paid" just dismisses the reminder. Toll Alert doesn’t check with Dart Charge or TfL — you’re confirming, not proving, that you’ve paid.',
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
});
