import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Flashing } from '../components/Flashing';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';
import { deadlineText, useLanguage } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'CrossingDetail'>;

export function CrossingDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { crossingEvents, markPaid } = useAppState();
  const { t, language } = useLanguage();

  const event = crossingEvents.find((e) => e.id === eventId);
  const crossing = event ? MOCK_CROSSINGS_CONFIG.crossings.find((c) => c.id === event.crossingId) : undefined;

  if (!event || !crossing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>{t.detail.notFound}</Text>
      </SafeAreaView>
    );
  }

  const isPaid = event.status === 'paid';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{crossing.type === 'point' ? '🌉' : '⬤'}</Text>
          </View>
          {isPaid ? (
            <StatusPill label={t.detail.paid} tone="success" />
          ) : (
            <Flashing>
              <StatusPill label={t.detail.unpaid} tone="warning" />
            </Flashing>
          )}
        </View>
        <Text style={styles.title}>{crossing.name}</Text>
        <Text style={styles.subtitle}>
          {t.detail.detected(
            new Date(event.detectedAt).toLocaleString(language, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          )}
        </Text>
        {!isPaid && <Text style={styles.avoidFines}>{t.common.avoidFines}</Text>}

        <Card style={styles.priceCard}>
          <Text style={styles.priceLabel}>{t.detail.charge}</Text>
          <Text style={styles.price}>{crossing.price.label}</Text>
          <Text style={styles.paymentWindow}>
            {t.detail.payBy(language === 'en' ? crossing.scheme.paymentDeadlineLabel : deadlineText(t, crossing.scheme.paymentDeadlineLabel))}
          </Text>
        </Card>

        {crossing.scheme.caveat && (
          <Card style={styles.caveatCard}>
            <Text style={styles.caveatText}>⚠ {crossing.scheme.caveat}</Text>
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>{t.detail.ifUnpaid}</Text>
          {crossing.scheme.fineStages.map((stage, i) => (
            <View key={i} style={styles.fineRow}>
              <Text style={styles.fineLabel}>{stage.label}</Text>
              <Text style={styles.fineAmount}>£{stage.amount.toFixed(2)}</Text>
              {stage.note && <Text style={styles.fineNote}>{stage.note}</Text>}
            </View>
          ))}
        </Card>

        <Text style={styles.disclaimer}>{t.detail.paidDisclaimer(crossing.scheme.operator)}</Text>

        <Text style={styles.verified}>
          {t.detail.verified(
            crossing.scheme.operator,
            new Date(crossing.scheme.verifiedAt).toLocaleDateString(language, { dateStyle: 'medium' })
          )}
        </Text>

        {crossing.boundarySource && (
          <Text style={styles.verified}>
            {crossing.boundarySource.verifiedAt
              ? `Boundary data verified ${new Date(crossing.boundarySource.verifiedAt).toLocaleDateString([], { dateStyle: 'medium' })}. `
              : 'Boundary is an approximation, not yet checked against official data. '}
            {crossing.boundarySource.attribution}
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label={t.detail.openPayment}
          variant={isPaid ? 'secondary' : 'primary'}
          onPress={() => Linking.openURL(crossing.paymentUrl)}
        />
        <Text style={styles.antiScam}>🔒 {t.detail.antiScam(crossing.scheme.operator)}</Text>
        {!isPaid && (
          <PrimaryButton label={t.detail.markPaid} variant="secondary" onPress={() => markPaid(event.id)} />
        )}
        {isPaid && (
          <PrimaryButton label={t.detail.backHome} variant="secondary" onPress={() => navigation.navigate('Home')} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
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
  avoidFines: { fontSize: 16, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },
  antiScam: { fontSize: 12, color: colors.textMuted, lineHeight: 17, textAlign: 'center' },
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
