import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';

interface Props {
  badge: string;
  number: string;
  label: string;
  source?: string;
  /** Total value of those fines, e.g. "£35m+ in fines". */
  total?: string;
  /** The fine one driver gets, e.g. "Fine: £70 each". */
  fine?: string;
}

export function FineStatCard({ badge, number, label, source, total, fine }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>{badge}</Text>
      <Text style={styles.number}>{number}</Text>
      <Text style={styles.label}>{label}</Text>
      {(total || fine) && (
        <View style={styles.moneyRow}>
          {total && <Text style={styles.total}>{total}</Text>}
          {fine && <Text style={styles.fine}>{fine}</Text>}
        </View>
      )}
      {source && <Text style={styles.source}>{source}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.lg,
    ...shadow.gold,
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.6,
  },
  number: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    marginTop: spacing.sm,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  moneyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  total: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  fine: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
  },
  source: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
