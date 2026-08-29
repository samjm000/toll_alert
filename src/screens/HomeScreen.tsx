import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useAppState } from '../state/AppState';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { subscription, crossingEvents, simulateCrossing } = useAppState();

  const pendingEvents = crossingEvents.filter((e) => e.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Toll Alert</Text>
            <Text style={styles.subtitle}>Watching 2 crossings</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>

        {subscription.status !== 'active' && (
          <Card style={styles.subBanner}>
            <Text style={styles.subBannerTitle}>
              {subscription.status === 'expired' ? 'Your subscription has expired' : 'Start your subscription'}
            </Text>
            <Text style={styles.subBannerBody}>
              {subscription.status === 'expired'
                ? 'Renew to keep getting background crossing alerts.'
                : 'Subscribe to enable background alerts for Dartford Crossing and ULEZ.'}
            </Text>
            <PrimaryButton
              label={subscription.status === 'expired' ? 'Renew' : 'View subscription'}
              onPress={() => navigation.navigate('Subscription')}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        {pendingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Needs your attention</Text>
            {pendingEvents.map((event) => {
              const crossing = MOCK_CROSSINGS_CONFIG.crossings.find((c) => c.id === event.crossingId);
              if (!crossing) return null;
              return (
                <Pressable
                  key={event.id}
                  onPress={() => navigation.navigate('CrossingDetail', { eventId: event.id })}
                >
                  <Card style={styles.eventCard}>
                    <View style={styles.eventRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle}>{crossing.shortName}</Text>
                        <Text style={styles.eventSubtitle}>
                          Crossed {new Date(event.detectedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <StatusPill label="Unpaid" tone="warning" />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitored crossings</Text>
          {MOCK_CROSSINGS_CONFIG.crossings.map((crossing) => (
            <Card key={crossing.id} style={styles.crossingCard}>
              <View style={styles.eventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{crossing.name}</Text>
                  <Text style={styles.eventSubtitle}>{crossing.price.label}</Text>
                </View>
                <StatusPill
                  label={crossing.type === 'point' ? 'Point' : 'Zone'}
                  tone="neutral"
                />
              </View>
              <Text style={styles.statusLine}>Status: not currently in this crossing</Text>
              <Pressable onPress={() => simulateCrossing(crossing.id)}>
                <Text style={styles.devLink}>Simulate crossing (demo)</Text>
              </Pressable>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  settingsIcon: { fontSize: 22 },
  subBanner: { backgroundColor: colors.warningBg, borderColor: colors.warningBg },
  subBannerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  subBannerBody: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  eventCard: { gap: 4 },
  crossingCard: { gap: spacing.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  eventSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statusLine: { fontSize: 13, color: colors.textMuted },
  devLink: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 4 },
});
