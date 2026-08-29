import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAppState } from '../../state/AppState';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Permissions'>;

export function PermissionsScreen(_props: Props) {
  const { completeOnboarding } = useAppState();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>One last thing</Text>
        <Text style={styles.body}>
          To detect crossings while your phone is in your pocket, Toll Alert needs to check your
          location in the background — including when the app is closed.
        </Text>
        <Card>
          <Text style={styles.cardTitle}>Next you'll see the system permission prompt</Text>
          <Text style={styles.cardBody}>
            Please choose{' '}
            <Text style={styles.bold}>"Allow While Using App"</Text>, then{' '}
            <Text style={styles.bold}>"Change to Always Allow"</Text> when iOS asks again —
            or "Allow all the time" on Android. Toll Alert only uses this to detect the crossings
            in your config; it doesn't track or store your route.
          </Text>
        </Card>
        <Text style={styles.note}>
          (This screen is a mock — the real permission prompt is triggered by native background
          geolocation setup, not yet wired up in this build.)
        </Text>
      </View>
      <PrimaryButton label="Continue" onPress={completeOnboarding} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
