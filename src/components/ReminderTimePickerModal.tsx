import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, radii, spacing } from '../theme';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onAdd: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

/**
 * Quarter-hours only. A full minute picker is 1,440 options for a screen
 * whose entire job is "roughly when suits you" — and the client's own default
 * list (23:45 plus five on the hour) fits inside this set exactly.
 */
const MINUTES = ['00', '15', '30', '45'];

/**
 * Adds one reminder time.
 *
 * Deliberately not a native date/time picker: that needs another dependency
 * and a native rebuild, and renders differently on every OEM skin — for
 * choosing an hour and a quarter, two rows of chips are clearer and work
 * identically everywhere.
 */
export function ReminderTimePickerModal({ visible, onCancel, onAdd }: Props) {
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add a reminder time</Text>
          <Text style={styles.preview}>
            {hour}:{minute}
          </Text>

          <Text style={styles.label}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {HOURS.map((h) => (
              <Pressable key={h} onPress={() => setHour(h)} style={[styles.chip, h === hour && styles.chipSelected]}>
                <Text style={[styles.chipText, h === hour && styles.chipTextSelected]}>{h}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Minute</Text>
          <View style={styles.chipRow}>
            {MINUTES.map((m) => (
              <Pressable key={m} onPress={() => setMinute(m)} style={[styles.chip, m === minute && styles.chipSelected]}>
                <Text style={[styles.chipText, m === minute && styles.chipTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} style={styles.actionButton} />
            <PrimaryButton
              label="Add"
              onPress={() => onAdd(`${hour}:${minute}`)}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  preview: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.xs,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minWidth: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.primarySoftBg, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  chipTextSelected: { color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
});
