import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import { colors, radii, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
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
          <Text style={styles.sectionTitle}>Legal</Text>
          <Card>
            <View style={styles.placeholderTag}>
              <Text style={styles.placeholderTagText}>PLACEHOLDER — TBD BY SOLICITOR</Text>
            </View>
            <Text style={styles.legalBody}>
              This app is a reminder tool, not a guarantee. You are fully responsible for paying
              your own tolls and charges regardless of whether you receive an alert. Full terms
              and privacy policy links go here once finalised.
            </Text>
          </Card>
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
  typeIconText: { fontSize: 14, color: colors.primaryDeep },
  placeholderTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningBg,
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  placeholderTagText: { color: colors.warning, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  legalBody: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  version: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
