import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, gradient, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={styles.hero}
      >
        <SafeAreaView style={styles.heroInner} edges={['top']}>
          <Logo size={116} variant="full" />
          <Text style={styles.wordmark}>Toll Alert</Text>
          <Text style={styles.tagline}>Drive on. We'll watch the crossings.</Text>
        </SafeAreaView>
      </LinearGradient>

      <SafeAreaView style={styles.body} edges={['bottom']}>
        <View style={styles.content}>
          <Text style={styles.title}>Never forget a toll or charge again</Text>
          <Text style={styles.copy}>
            Toll Alert watches for Dartford Crossing and the London ULEZ in the background, and
            reminds you to pay as soon as you cross — even if the app isn't open.
          </Text>
        </View>
        <PrimaryButton label="Get started" onPress={() => navigation.navigate('HowItWorks')} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 1.6,
    paddingTop: spacing.sm,
    borderBottomLeftRadius: spacing.xl,
    borderBottomRightRadius: spacing.xl,
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textOnDark,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnDarkMuted,
  },
  body: {
    flex: 1,
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#3A2E0A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 36,
  },
  copy: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
