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
import { ULEZ_BOUNDARY_META } from '../config/ulezBoundary';

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
          <Text style={styles.paymentWindow}>⏱ Pay by: {crossing.scheme.paymentDeadlineLabel}</Text>
        </Card>

        {crossing.scheme.caveat && (
          <Card style={styles.caveatCard}>
            <Text style={styles.caveatText}>⚠ {crossing.scheme.caveat}</Text>
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>If unpaid</Text>
          {crossing.scheme.fineStages.map((stage, i) => (
            <View key={i} style={styles.fineRow}>
              <Text style={styles.fineLabel}>{stage.label}</Text>
              <Text style={styles.fineAmount}>£{stage.amount.toFixed(2)}</Text>
              {stage.note && <Text style={styles.fineNote}>{stage.note}</Text>}
            </View>
          ))}
        </Card>

        <Text style={styles.disclaimer}>
          Tapping "Mark as paid" only dismisses this reminder — Toll Alert does not verify
          payment with {crossing.scheme.operator}. You're responsible for actually paying.
        </Text>

        <Text style={styles.verified}>
          Figures verified against {crossing.scheme.operator} on{' '}
          {new Date(crossing.scheme.verifiedAt).toLocaleDateString([], { dateStyle: 'medium' })} — rates
          change often, confirm at the payment link before relying on this.
        </Text>

        {crossing.geofence.kind === 'polygon' && (
          <Text style={styles.verified}>
            Boundary data verified {new Date(ULEZ_BOUNDARY_META.verifiedAt).toLocaleDateString([], { dateStyle: 'medium' })}.{' '}
            {ULEZ_BOUNDARY_META.attribution} Licensed under the {ULEZ_BOUNDARY_META.licence}.
          </Text>
        )}
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
  typeBadgeText: { fontSize: 20, color: colors.primary },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  priceCard: { gap: 4, borderLeftWidth: 4, borderLeftColor: colors.primary },
  priceLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  price: { fontSize: 24, fontWeight: '800', color: colors.text },
  paymentWindow: { fontSize: 13, color: colors.warning, marginTop: 6, fontWeight: '600' },
  caveatCard: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  caveatText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.xs },
  fineRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  fineLabel: { fontSize: 14, color: colors.text },
  fineAmount: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
  fineNote: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  disclaimer: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  verified: { fontSize: 11, color: colors.textMuted, lineHeight: 16, fontStyle: 'italic' },
  notFound: { padding: spacing.lg, color: colors.textMuted },
  actions: { padding: spacing.lg, gap: spacing.sm },
});
