import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { subscriptionConfig, useAppState } from '../state/AppState';

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

export function SubscriptionScreen(_props: Props) {
  const { subscription, mockSubscribe, mockExpireSubscription } = useAppState();
  const price = subscriptionConfig.annualPrice;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Subscription</Text>

        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.planName}>Annual plan</Text>
            <StatusPill
              label={
                subscription.status === 'active'
                  ? 'Active'
                  : subscription.status === 'expired'
                    ? 'Expired'
                    : 'Not subscribed'
              }
              tone={
                subscription.status === 'active'
                  ? 'success'
                  : subscription.status === 'expired'
                    ? 'danger'
                    : 'neutral'
              }
            />
          </View>
          <Text style={styles.price}>
            £{price.amount.toFixed(2)} <Text style={styles.priceUnit}>/ year</Text>
          </Text>
          {subscription.expiresAt && (
            <Text style={styles.expiry}>
              {subscription.status === 'active' ? 'Renews' : 'Expired'}{' '}
              {new Date(subscription.expiresAt).toLocaleDateString()}
            </Text>
          )}
          <Text style={styles.note}>
            Price shown is a configurable placeholder, not final. Billed and managed through the
            App Store / Google Play — this screen doesn't process payment itself.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>What you get</Text>
          <Text style={styles.bullet}>• Background alerts for Dartford Crossing</Text>
          <Text style={styles.bullet}>• Background alerts for ULEZ</Text>
          <Text style={styles.bullet}>• New crossings added automatically, no app update needed</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Reminders</Text>
          <Text style={styles.bullet}>
            • We'll notify you {subscriptionConfig.renewalReminderDaysBefore} days before your
            subscription expires.
          </Text>
          <Text style={styles.bullet}>
            • If it lapses, we'll remind you every {subscriptionConfig.lapsedReminderIntervalDays}{' '}
            days until you resubscribe or delete the app.
          </Text>
        </Card>

        {subscription.status !== 'active' ? (
          <PrimaryButton label={`Subscribe — £${price.amount.toFixed(2)}/year`} onPress={mockSubscribe} />
        ) : (
          <PrimaryButton label="Simulate expiry (demo)" variant="secondary" onPress={mockExpireSubscription} />
        )}
        <Text style={styles.devNote}>
          Demo only — real in-app purchase (StoreKit / Google Play Billing) isn't wired up in this
          build.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '700', color: colors.text },
  price: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  priceUnit: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  expiry: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    lineHeight: 17,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  bullet: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  devNote: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
