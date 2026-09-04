import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';
import { useAppState } from '../state/AppState';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { resetOnboarding, backgroundMonitoringEnabled, setBackgroundMonitoringEnabled } = useAppState();
  const [togglingMonitoring, setTogglingMonitoring] = useState(false);

  const onToggleMonitoring = async () => {
    setTogglingMonitoring(true);
    try {
      const ok = await setBackgroundMonitoringEnabled(!backgroundMonitoringEnabled);
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
              </View>
              <StatusPill label="On" tone="success" />
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Card style={styles.permRow}>
            <Text style={styles.permLabel}>Location — Always</Text>
            <StatusPill label="Mocked" tone="neutral" />
          </Card>
          <Card style={styles.permRow}>
            <Text style={styles.permLabel}>Notifications</Text>
            <StatusPill label="Mocked" tone="neutral" />
          </Card>
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
              <Text style={styles.permLabel}>Monitor Dartford &amp; ULEZ in the background</Text>
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
    </SafeAreaView>
  );
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
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
