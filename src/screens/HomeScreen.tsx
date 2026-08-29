import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusPill } from '../components/StatusPill';
import { colors, gradientDark, radii, shadow, spacing } from '../theme';
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
          <View style={styles.headerLockup}>
            <Logo size={36} />
            <View>
              <Text style={styles.title}>Toll Alert</Text>
              <Text style={styles.subtitle}>Watching 2 crossings</Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </Pressable>
        </View>

        {subscription.status !== 'active' && (
          <LinearGradient
            colors={gradientDark.colors}
            start={gradientDark.start}
            end={gradientDark.end}
            style={styles.subBanner}
          >
            <Text style={styles.subBannerBadge}>🔔 {subscription.status === 'expired' ? 'EXPIRED' : 'GET STARTED'}</Text>
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
          </LinearGradient>
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
                <View style={styles.typeIcon}>
                  <Text style={styles.typeIconText}>{crossing.type === 'point' ? '🌉' : '⬤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle}>{crossing.name}</Text>
                  <Text style={styles.eventSubtitle}>{crossing.price.label}</Text>
                </View>
                <StatusPill
                  label={crossing.type === 'point' ? 'Point' : 'Zone'}
                  tone="neutral"
                />
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusLine}>Not currently in this crossing</Text>
              </View>
              <Pressable onPress={() => simulateCrossing(crossing.id)}>
                <Text style={styles.devLink}>▸ Simulate crossing (demo)</Text>
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
  headerLockup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 18 },
  subBanner: { borderRadius: radii.xl, padding: spacing.lg, ...shadow.gold },
  subBannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  subBannerTitle: { fontSize: 18, fontWeight: '800', color: colors.textOnDark },
  subBannerBody: { fontSize: 14, color: colors.textOnDarkMuted, marginTop: 4, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  eventCard: { gap: 4, backgroundColor: colors.accentBg, borderColor: colors.accentBg, borderLeftWidth: 4, borderLeftColor: colors.primary },
  crossingCard: { gap: spacing.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  eventSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  typeIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: { fontSize: 15, color: colors.primaryDeep },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  statusLine: { fontSize: 13, color: colors.textMuted },
  devLink: { fontSize: 13, color: colors.warning, fontWeight: '700', marginTop: 4 },
});
