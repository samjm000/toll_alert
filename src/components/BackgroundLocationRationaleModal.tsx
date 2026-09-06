import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { colors, spacing } from '../theme';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

/**
 * Shown once, right before the OS background-location prompt, so the request
 * isn't sprung on the user with no context. Required reading for both
 * platforms per src/geofencing/README.md's outstanding-work list:
 * - iOS: Apple App Review expects a clear on-screen justification before the
 *   "Always" upgrade prompt.
 * - Android 11+: `requestBackgroundPermissionsAsync()` jumps straight to the
 *   system settings page instead of showing an in-context dialog, so this
 *   screen is the only place the user sees a reason at all.
 */
export function BackgroundLocationRationaleModal({ visible, onCancel, onContinue }: Props) {
  const isIOS = Platform.OS === 'ios';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Allow background location?</Text>
          <Text style={styles.body}>
            To detect crossings like Dartford or ULEZ while your phone is in your pocket, Toll
            Alert needs to check your location in the background — including when the app is closed.
            It only ever uses this to detect the crossings in your config; it doesn't track or
            store your route.
          </Text>
          <Card>
            <Text style={styles.cardTitle}>What happens next</Text>
            {isIOS ? (
              <Text style={styles.cardBody}>
                iOS will ask twice. First choose <Text style={styles.bold}>"Allow While Using App"</Text>,
                then, when it asks again, choose <Text style={styles.bold}>"Change to Always Allow"</Text>.
                Toll Alert can't detect crossings in the background without this second step.
              </Text>
            ) : (
              <Text style={styles.cardBody}>
                On newer Android versions this opens your phone's app settings directly instead of
                a popup — look for <Text style={styles.bold}>Permissions → Location</Text> and choose{' '}
                <Text style={styles.bold}>"Allow all the time"</Text>, then come back here.
              </Text>
            )}
          </Card>
          <View style={styles.actions}>
            <PrimaryButton label="Not now" variant="secondary" onPress={onCancel} style={styles.actionButton} />
            <PrimaryButton label="Continue" onPress={onContinue} style={styles.actionButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 21,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
