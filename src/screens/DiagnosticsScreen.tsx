import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { geofencing } from '../geofencing';
import { EngineStatus } from '../geofencing/types';
import { getNotificationPermissionStatus } from '../notifications';
import { getScheduledReminderTimes } from '../notifications/reminders';
import { clearLog, formatLog, LogEntry, readLog } from '../diagnostics/log';
import { getHeartbeatInfo, runHealthCheck } from '../diagnostics/heartbeat';
import {
  isUploadConfigured,
  loadUploadSettings,
  loadUploadStatus,
  saveTesterName,
  setUploadEnabled,
  uploadPendingLogs,
  UploadSettings,
  UploadStatus,
} from '../diagnostics/upload';

type Props = NativeStackScreenProps<RootStackParamList, 'Diagnostics'>;

/**
 * The answer to "he drove over Dartford and nothing happened."
 *
 * Every check here exists because its absence made a real failure
 * indistinguishable from every other failure. The point is that a
 * non-technical tester can open this, read the top card, and say something
 * useful — "it says Background location: denied" — without anyone needing
 * a cable, a laptop, or `adb`. Share sends the raw log back through
 * whatever channel they already use; testers can also opt in to sending it
 * automatically (src/diagnostics/upload.ts).
 */
export function DiagnosticsScreen(_props: Props) {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('…');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [scheduledReminders, setScheduledReminders] = useState<string[]>([]);
  const [heartbeat, setHeartbeat] = useState<{ scheduled: boolean; lastCheckAt: string | null } | null>(null);
  const [upload, setUpload] = useState<UploadSettings | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [sending, setSending] = useState(false);
  const uploadConfigured = isUploadConfigured();

  useEffect(() => {
    Promise.all([loadUploadSettings(), loadUploadStatus()]).then(([settings, status]) => {
      setUpload(settings);
      setNameDraft(settings.testerName);
      setUploadStatus(status);
    });
  }, []);

  const sendNow = useCallback(async () => {
    setSending(true);
    setUploadStatus(await uploadPendingLogs());
    setSending(false);
  }, []);

  const toggleUpload = async () => {
    if (!upload) return;
    await saveTesterName(nameDraft.trim());
    const next = await setUploadEnabled(!upload.enabled);
    setUpload(next);
    if (next.enabled) sendNow();
  };

  const saveName = async () => {
    setUpload(await saveTesterName(nameDraft.trim()));
  };
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Run a check first so opening this screen also records a snapshot —
    // and re-registers geofences the OS dropped — before showing the log.
    await runHealthCheck('diagnostics opened');
    const [engineStatus, notifications, log, reminders, heartbeatInfo] = await Promise.all([
      geofencing.getStatus().catch(() => null),
      getNotificationPermissionStatus(),
      readLog(),
      getScheduledReminderTimes(),
      getHeartbeatInfo(),
    ]);
    setHeartbeat(heartbeatInfo);
    setStatus(engineStatus);
    setNotificationStatus(notifications);
    setEntries(log);
    setScheduledReminders(reminders);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onShare = async () => {
    const header = [
      `Toll Alert diagnostics — ${new Date().toISOString()}`,
      `Platform: ${Platform.OS} ${Platform.Version}`,
      status
        ? `Geofences registered with OS: ${status.geofencingRegistered} | crossings loaded: ${status.loadedCrossings} | fine location running: ${status.locationUpdatesRunning}`
        : 'Engine status unavailable',
      status
        ? `Location — foreground: ${status.foregroundLocationStatus}, background: ${status.backgroundLocationStatus}, device services: ${status.locationServicesEnabled}`
        : '',
      `Notifications: ${notificationStatus}`,
      `Unpaid reminders scheduled: ${scheduledReminders.length ? scheduledReminders.join(', ') : 'none'}`,
      `Background health check scheduled: ${yesNo(heartbeat?.scheduled)} | last ran: ${heartbeat?.lastCheckAt ?? 'never'}`,
      `Auto-send: ${upload?.enabled ? `on as "${upload.testerName}" (${upload.deviceId}), last sent ${uploadStatus?.lastSuccessAt ?? 'never'}` : 'off'}`,
      '',
    ].join('\n');
    await Share.share({ message: `${header}${formatLog(entries)}` }).catch(() => {});
  };

  const onClear = async () => {
    await clearLog();
    refresh();
  };

  /** The single most common cause of "nothing happened", checked first. */
  const blockers: string[] = [];
  if (status) {
    if (!status.locationServicesEnabled) blockers.push('Location is switched off for the whole device.');
    if (status.backgroundLocationStatus !== 'granted') {
      blockers.push('Location is not set to "Allow all the time" — nothing can be detected while the app is closed.');
    }
    if (!status.geofencingRegistered) {
      blockers.push('No geofences are registered with the OS — background monitoring has never been switched on, or it failed to start.');
    }
    if (status.geofencingRegistered && status.loadedCrossings === 0) {
      blockers.push('Geofences are registered but this app process has no crossing list loaded.');
    }
  }
  if (notificationStatus !== 'granted' && notificationStatus !== 'unsupported') {
    blockers.push('Notification permission is not granted — a detected crossing would be recorded but never shown.');
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.caption}>
          Everything on this screen is read from the device right now.{' '}
          {upload?.enabled
            ? 'New log lines are also being sent to the Toll Alert team automatically.'
            : 'Nothing is uploaded unless you switch on sending below — or use Share to send it yourself.'}
        </Text>

        {uploadConfigured && upload ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Testing Toll Alert?</Text>
            <Card style={styles.uploadCard}>
              <Text style={styles.rowLabel}>Your name</Text>
              <TextInput
                style={styles.input}
                value={nameDraft}
                onChangeText={setNameDraft}
                onEndEditing={saveName}
                placeholder="e.g. Olly"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
              />
              <Pressable onPress={toggleUpload} style={styles.row}>
                <Text style={[styles.rowLabel, styles.uploadToggleLabel]}>Send diagnostics to the Toll Alert team</Text>
                <StatusPill label={upload.enabled ? 'On' : 'Off'} tone={upload.enabled ? 'success' : 'neutral'} />
              </Pressable>
              {upload.enabled ? (
                <Text style={styles.caption}>
                  {uploadStatus?.lastError
                    ? `Last send failed (${uploadStatus.lastError}) — it will retry automatically.`
                    : `Last sent: ${formatWhen(uploadStatus?.lastSuccessAt ?? null)}`}
                </Text>
              ) : null}
            </Card>
            <Text style={styles.caption}>
              Sends this log about every 15 minutes while monitoring is on, so we can see why an alert didn't
              arrive. Locations are rounded to about 1km. Switch it off any time.
            </Text>
            {upload.enabled ? (
              <PrimaryButton label={sending ? 'Sending…' : 'Send now'} variant="secondary" onPress={sendNow} />
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Is it actually working?</Text>
          {loading ? (
            <Card>
              <ActivityIndicator color={colors.primary} />
            </Card>
          ) : blockers.length === 0 ? (
            <Card>
              <StatusPill label="Ready" tone="success" />
              <Text style={styles.body}>
                Monitoring is armed and permissions are in place. If a crossing still isn't detected, the
                log below will show whether the OS delivered anything at all.
              </Text>
            </Card>
          ) : (
            blockers.map((reason) => (
              <Card key={reason}>
                <StatusPill label="Blocked" tone="danger" />
                <Text style={styles.body}>{reason}</Text>
              </Card>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detail</Text>
          <Card>
            <Row label="Geofences registered with OS" value={yesNo(status?.geofencingRegistered)} />
            <Row label="Crossings loaded in this process" value={status ? String(status.loadedCrossings) : '—'} />
            <Row label="Fine location task running" value={yesNo(status?.locationUpdatesRunning)} />
            <Row label="Location — while using" value={status?.foregroundLocationStatus ?? '—'} />
            <Row label="Location — all the time" value={status?.backgroundLocationStatus ?? '—'} />
            <Row label="Device location services" value={yesNo(status?.locationServicesEnabled)} />
            <Row label="Notifications" value={notificationStatus} />
            <Row label="Background health check" value={yesNo(heartbeat?.scheduled)} />
            <Row label="Last health check" value={formatWhen(heartbeat?.lastCheckAt)} />
            <Row
              label="Unpaid reminders scheduled"
              value={scheduledReminders.length ? scheduledReminders.join(', ') : 'none'}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event log ({entries.length})</Text>
          <Text style={styles.caption}>
            Newest last. Every geofence event the OS delivers, every notification posted, and every
            failure that used to be silent.
          </Text>
          <Card>
            {entries.length === 0 ? (
              <Text style={styles.body}>
                Nothing recorded yet. If this is empty after a drive over a monitored crossing, the OS
                never delivered an event to the app at all — check the blockers above and battery
                optimisation.
              </Text>
            ) : (
              entries.map((entry, index) => (
                <View key={`${entry.at}-${index}`} style={styles.logRow}>
                  <Text style={[styles.logMeta, levelColor(entry.level)]}>
                    {entry.at.slice(11, 19)} {entry.tag}
                  </Text>
                  <Text style={styles.logMessage}>{entry.message}</Text>
                </View>
              ))
            )}
          </Card>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Refresh" variant="secondary" onPress={refresh} />
          <PrimaryButton label="Share log" onPress={onShare} />
          <PrimaryButton label="Clear log" variant="secondary" onPress={onClear} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function yesNo(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

function formatWhen(iso: string | null | undefined): string {
  if (iso === undefined) return '—';
  if (!iso) return 'never';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toTimeString().slice(0, 5)}`;
}

function levelColor(level: LogEntry['level']) {
  if (level === 'error') return { color: colors.danger };
  if (level === 'warn') return { color: colors.warning };
  return { color: colors.textMuted };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  caption: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '700' },
  logRow: {
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  logMeta: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  logMessage: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  actions: { gap: spacing.sm, borderRadius: radii.md },
  uploadCard: { gap: spacing.sm },
  uploadToggleLabel: { color: colors.text, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surfaceRaised,
  },
});
