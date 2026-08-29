import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';

type Props = NativeStackScreenProps<RootStackParamList, 'CrossingDetail'>;

export function CrossingDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { crossingEvents, markPaid } = useAppState();

  const event = crossingEvents.find((e) => e.id === eventId);
  const crossing = event ? MOCK_CROSSINGS_CONFIG.crossings.find((c) => c.id === event.crossingId) : undefined;

  if (!event || !crossing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>This reminder no longer exists.</Text>
      </SafeAreaView>
    );
  }

  const isPaid = event.status === 'paid';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{crossing.type === 'point' ? '🌉' : '⬤'}</Text>
          </View>
          <StatusPill label={isPaid ? 'Paid' : 'Unpaid'} tone={isPaid ? 'success' : 'warning'} />
        </View>
        <Text style={styles.title}>{crossing.name}</Text>
        <Text style={styles.subtitle}>
          Detected {new Date(event.detectedAt).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Text>

        <Card style={styles.priceCard}>
          <Text style={styles.priceLabel}>Charge</Text>
          <Text style={styles.price}>{crossing.price.label}</Text>
          {crossing.paymentWindow && (
            <Text style={styles.paymentWindow}>⏱ Pay by: {crossing.paymentWindow}</Text>
          )}
        </Card>

        <Text style={styles.disclaimer}>
          Tapping "Mark as paid" only dismisses this reminder — Toll Alert does not verify
          payment with Dart Charge or TfL. You're responsible for actually paying.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Open payment site"
          variant="secondary"
          onPress={() => Linking.openURL(crossing.paymentUrl)}
        />
        {!isPaid && (
          <PrimaryButton label="Mark as paid" onPress={() => markPaid(event.id)} />
        )}
        {isPaid && (
          <PrimaryButton label="Back to home" variant="secondary" onPress={() => navigation.navigate('Home')} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: { fontSize: 20, color: colors.primaryDeep },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  priceCard: { gap: 4, borderLeftWidth: 4, borderLeftColor: colors.primary },
  priceLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  price: { fontSize: 24, fontWeight: '800', color: colors.text },
  paymentWindow: { fontSize: 13, color: colors.warning, marginTop: 6, fontWeight: '600' },
  disclaimer: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  notFound: { padding: spacing.lg, color: colors.textMuted },
  actions: { padding: spacing.lg, gap: spacing.sm },
});
