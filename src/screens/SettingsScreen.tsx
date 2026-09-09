import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundLocationRationaleModal } from '../components/BackgroundLocationRationaleModal';
import { ReminderTimePickerModal } from '../components/ReminderTimePickerModal';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';
import { requestIgnoreBatteryOptimizations } from '../geofencing/batteryOptimization';
import { geofencing } from '../geofencing';
import { EngineStatus } from '../geofencing/types';
import { getNotificationPermissionStatus } from '../notifications';
import { useAppState } from '../state/AppState';
import { DEFAULT_REMINDER_TIMES } from '../state/persistence';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { resetOnboarding, backgroundMonitoringEnabled, setBackgroundMonitoringEnabled, reminderTimes, setReminderTimes } =
    useAppState();
  const [togglingMonitoring, setTogglingMonitoring] = useState(false);
  const [rationaleVisible, setRationaleVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  // Real, live permission state. These two rows used to be hardcoded
  // "Mocked" pills, which meant the one screen a tester would look at to
  // answer "why did nothing happen?" showed the same thing whether every
  // permission was granted or none of them were.
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('…');

  const refreshStatus = useCallback(async () => {
    const [status, notifications] = await Promise.all([
      geofencing.getStatus().catch(() => null),
      getNotificationPermissionStatus(),
    ]);
    setEngineStatus(status);
    setNotificationStatus(notifications);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus, backgroundMonitoringEnabled]);

  const enableMonitoring = async () => {
    setTogglingMonitoring(true);
    try {
      const ok = await setBackgroundMonitoringEnabled(true);
      if (!ok) {
        Alert.alert(
          'Location permission needed',
          'Toll Alert needs "Always" / "Allow all the time" location access to detect crossings in the background. Enable it in system settings and try again.'
        );
      }
    } finally {
      setTogglingMonitoring(false);
    }
  };

  const onToggleMonitoring = async () => {
    if (backgroundMonitoringEnabled) {
      setTogglingMonitoring(true);
      try {
        await setBackgroundMonitoringEnabled(false);
      } finally {
        setTogglingMonitoring(false);
      }
      return;
    }
    // Show the rationale before the OS prompt rather than requesting cold —
    // see src/geofencing/README.md and BackgroundLocationRationaleModal.
    setRationaleVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable onPress={() => navigation.navigate('Subscription')}>
            <Card style={styles.permRow}>
              <Text style={styles.permLabel}>Subscription</Text>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitored crossings</Text>
          <Text style={styles.sectionCaption}>
            Fetched from remote config v{MOCK_CROSSINGS_CONFIG.version} (mocked in this build).
            New crossings can be added here without an app update.
          </Text>
          {MOCK_CROSSINGS_CONFIG.crossings.map((c) => (
            <Card key={c.id} style={styles.crossingRow}>
              <View style={styles.typeIcon}>
                <Text style={styles.typeIconText}>{c.type === 'point' ? '🌉' : '⬤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.crossingName}>{c.name}</Text>
                <Text style={styles.crossingMeta}>{c.price.label}</Text>
                <Text style={styles.crossingVerified}>
                  Verified {new Date(c.scheme.verifiedAt).toLocaleDateString([], { dateStyle: 'medium' })}
                </Text>
              </View>
              <StatusPill label="On" tone="success" />
            </Card>
          ))}
          <Text style={styles.sectionCaption}>
            Toll and fine figures above are unverified field data, not final — coordinates are
            landmark-level approximations and rates change often. See each crossing's "Verified"
            date and src/geofencing/README.md before relying on any of this.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Card style={styles.permRow}>
            <Text style={styles.permLabel}>Location — while using the app</Text>
            <StatusPill {...permissionPill(engineStatus?.foregroundLocationStatus)} />
          </Card>
          <Card style={styles.permRow}>
            <Text style={styles.permLabel}>Location — all the time</Text>
            <StatusPill {...permissionPill(engineStatus?.backgroundLocationStatus)} />
          </Card>
          <Card style={styles.permRow}>
            <Text style={styles.permLabel}>Notifications</Text>
            <StatusPill {...permissionPill(notificationStatus)} />
          </Card>
          <Text style={styles.sectionCaption}>
            "All the time" and Notifications both have to say Granted. Either one missing means a
            crossing detected while the app is closed produces nothing at all.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Pressable onPress={() => navigation.navigate('Diagnostics')}>
            <Card style={styles.permRow}>
              <Text style={styles.permLabel}>Diagnostics</Text>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
          <Text style={styles.sectionCaption}>
            Shows whether monitoring is genuinely armed, plus a log of every geofence event the phone
            has delivered. This is the first place to look if an expected alert never arrived.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background monitoring</Text>
          <Text style={styles.sectionCaption}>
            Real location-based detection (src/geofencing) — separate from the "Simulate crossing"
            demo buttons on Home. Requires the custom dev client on a real device; does nothing under
            Expo Go or the web preview. Still unverified against real GPS — see
            src/geofencing/README.md.
          </Text>
          <Pressable onPress={onToggleMonitoring} disabled={togglingMonitoring || Platform.OS === 'web'}>
            <Card style={styles.permRow}>
              <Text style={styles.permLabel}>Monitor all crossings in the background</Text>
              <StatusPill
                label={
                  Platform.OS === 'web'
                    ? 'Unsupported'
                    : togglingMonitoring
                      ? 'Working…'
                      : backgroundMonitoringEnabled
                        ? 'On'
                        : 'Off'
                }
                tone={backgroundMonitoringEnabled ? 'success' : 'neutral'}
              />
            </Card>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder times</Text>
          <Text style={styles.sectionCaption}>
            If a crossing is still unpaid, Toll Alert warns you again at these times every day until
            you tap "Mark as paid". Tap a time to remove it, or add your own to suit your routine.
          </Text>
          <Card>
            {reminderTimes.length === 0 ? (
              <Text style={styles.remindersOff}>
                No reminder times set — you'll only be told once, when the crossing is detected.
              </Text>
            ) : (
              <View style={styles.timeChips}>
                {reminderTimes.map((time) => (
                  <Pressable
                    key={time}
                    onPress={() => setReminderTimes(reminderTimes.filter((t) => t !== time))}
                    style={styles.timeChip}
                  >
                    <Text style={styles.timeChipText}>{time}</Text>
                    <Text style={styles.timeChipRemove}>×</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
          <View style={styles.reminderActions}>
            <PrimaryButton
              label="Add a time"
              variant="secondary"
              onPress={() => setTimePickerVisible(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Reset"
              variant="secondary"
              onPress={() => setReminderTimes([...DEFAULT_REMINDER_TIMES])}
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reliability</Text>
            <Text style={styles.sectionCaption}>
              Several Android manufacturers (Xiaomi, Huawei, Samsung, and OnePlus among the most
              aggressive) kill background location for apps that aren't explicitly exempted from
              battery optimisation — without this, Toll Alert can silently stop detecting
              crossings after a while, with no error you'd see. There's no way to check whether
              it's already granted, so this always opens the system dialog.
            </Text>
            <PrimaryButton
              label="Improve reliability"
              variant="secondary"
              onPress={() => requestIgnoreBatteryOptimizations()}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          {/* PLACEHOLDER LEGAL COPY — not final, must be reviewed by a solicitor before launch. */}
          <Card>
            <Text style={styles.legalBody}>
              This app is a reminder tool, not a guarantee. You are fully responsible for paying
              your own tolls and charges regardless of whether you receive an alert. Full terms
              and privacy policy links go here once finalised.
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo tools</Text>
          <Pressable onPress={resetOnboarding}>
            <Card style={styles.permRow}>
              <Text style={styles.permLabel}>Replay intro</Text>
              <Text style={styles.chevron}>↺</Text>
            </Card>
          </Pressable>
          <Text style={styles.sectionCaption}>
            Not a real app screen — jumps back to onboarding so testers can replay it without
            clearing storage.
          </Text>
        </View>

        <Text style={styles.version}>Toll Alert — UI mockup build</Text>
      </ScrollView>

      <ReminderTimePickerModal
        visible={timePickerVisible}
        onCancel={() => setTimePickerVisible(false)}
        onAdd={(time) => {
          setTimePickerVisible(false);
          setReminderTimes([...reminderTimes, time]);
        }}
      />

      <BackgroundLocationRationaleModal
        visible={rationaleVisible}
        onCancel={() => setRationaleVisible(false)}
        onContinue={() => {
          setRationaleVisible(false);
          enableMonitoring();
        }}
      />
    </SafeAreaView>
  );
}

/**
 * Maps a raw permission string onto the pill's vocabulary. "Granted" vs
 * anything else is the distinction that matters — an undetermined permission
 * and a denied one both mean no alerts.
 */
function permissionPill(status: string | undefined): { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' } {
  if (!status || status === '…' || status === 'unknown') return { label: 'Checking…', tone: 'neutral' };
  if (status === 'granted') return { label: 'Granted', tone: 'success' };
  if (status === 'unsupported') return { label: 'N/A', tone: 'neutral' };
  if (status === 'undetermined') return { label: 'Not asked', tone: 'warning' };
  return { label: 'Denied', tone: 'danger' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionCaption: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  crossingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  crossingName: { fontSize: 15, fontWeight: '700', color: colors.text },
  crossingMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  crossingVerified: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoftBg,
  },
  timeChipText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  timeChipRemove: { fontSize: 17, fontWeight: '700', color: colors.primary, opacity: 0.7 },
  remindersOff: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  reminderActions: { flexDirection: 'row', gap: spacing.sm },
  permLabel: { fontSize: 14, color: colors.text },
  chevron: { fontSize: 20, color: colors.textMuted },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: { fontSize: 14, color: colors.primary },
  legalBody: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  version: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
