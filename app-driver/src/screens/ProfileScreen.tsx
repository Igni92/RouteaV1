/**
 * ProfileScreen — Driver profile, stats, logout
 * AGENT-APP-DRIVER
 */

import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useColorScheme, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../redux/store';
import { logoutDriver } from '../redux/driversSlice';
import { resetDeliveries } from '../redux/deliveriesSlice';
import { resetRoute } from '../redux/routeSlice';
import { resetPhotos } from '../redux/photoSlice';
import {
  PRIMARY, ERROR, WARNING,
  BTN_HEIGHT_LG,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM, SPACE_XL,
  RADIUS_MD, RADIUS_LG, RADIUS_FULL, TEXT_WHITE,
  getTheme,
} from '../utils/colors';

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { current: driver, vehicle } = useSelector((s: RootState) => s.driver);
  const { items: deliveries, statuses } = useSelector((s: RootState) => s.deliveries);
  const { current: route } = useSelector((s: RootState) => s.route);

  // Today's stats
  const stats = useMemo(() => {
    const completed = deliveries.filter((d) => {
      const s = statuses[d.id] ?? d.status;
      return s === 'completed';
    }).length;
    const failed = deliveries.filter((d) => {
      const s = statuses[d.id] ?? d.status;
      return s === 'failed';
    }).length;
    const pending = deliveries.filter((d) => {
      const s = statuses[d.id] ?? d.status;
      return s === 'pending' || s === 'assigned' || s === 'in_route' || s === 'arrived';
    }).length;
    const kmTotal = route?.estimated_total_km ? Math.round(route.estimated_total_km) : 0;
    return { completed, failed, pending, kmTotal };
  }, [deliveries, statuses, route]);

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutDriver());
            dispatch(resetDeliveries());
            dispatch(resetRoute());
            dispatch(resetPhotos());
          },
        },
      ],
    );
  };

  if (!driver) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <Text style={[styles.noDriverText, { color: theme.textMuted }]}>Non connecté</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Avatar + name */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: PRIMARY }]}>
            <Text style={styles.avatarText}>{driver.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.driverName, { color: theme.text }]}>{driver.name}</Text>

          {/* Star rating */}
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text
                key={i}
                style={[styles.star, { color: i < Math.round(driver.rating) ? WARNING : theme.border }]}
              >
                ★
              </Text>
            ))}
            <Text style={[styles.ratingLabel, { color: theme.textMuted }]}>
              {driver.rating.toFixed(1)}/5
            </Text>
          </View>

          {/* Vehicle */}
          {vehicle && (
            <Text style={[styles.vehicleText, { color: theme.textMuted }]}>
              🚚 {vehicle.brand} {vehicle.model} · {vehicle.registration_plate}
            </Text>
          )}
        </View>

        {/* Today's stats */}
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statsTitle, { color: theme.textMuted }]}>STATISTIQUES DU JOUR</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>✅</Text>
              <Text style={[styles.statValue, { color: PRIMARY }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Terminées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>⏳</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>En attente</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>📍</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.kmTotal}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>km estimés</Text>
            </View>
            {stats.failed > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>❌</Text>
                <Text style={[styles.statValue, { color: ERROR }]}>{stats.failed}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Échouées</Text>
              </View>
            )}
          </View>
        </View>

        {/* Driver info */}
        <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Téléphone</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{driver.phone}</Text>
          {driver.email && (
            <>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{driver.email}</Text>
            </>
          )}
          <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Permis</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{driver.license_number}</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { minHeight: BTN_HEIGHT_LG }]}
          onPress={handleLogout}
          testID="logout-btn"
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Text style={styles.logoutText}>SE DÉCONNECTER</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32, gap: SPACE_MD, paddingTop: SPACE_LG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDriverText: { fontSize: FONT_MD },

  profileHeader: { alignItems: 'center', paddingVertical: SPACE_LG, gap: SPACE_SM },
  avatar: { width: 80, height: 80, borderRadius: RADIUS_FULL, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: TEXT_WHITE },
  driverName: { fontSize: FONT_XL, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 24 },
  ratingLabel: { fontSize: FONT_MD, marginLeft: SPACE_SM },
  vehicleText: { fontSize: FONT_SM },

  statsCard: { borderRadius: RADIUS_LG, padding: SPACE_LG },
  statsTitle: { fontSize: FONT_SM - 2, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACE_MD },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: SPACE_SM },
  statItem: { alignItems: 'center', minWidth: 64 },
  statEmoji: { fontSize: FONT_LG },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: FONT_SM },

  infoCard: { borderRadius: RADIUS_LG, padding: SPACE_LG, gap: SPACE_SM / 2 },
  infoLabel: { fontSize: FONT_SM, marginTop: SPACE_SM },
  infoValue: { fontSize: FONT_MD, fontWeight: '600' },

  logoutBtn: { backgroundColor: ERROR, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', marginTop: SPACE_SM },
  logoutText: { color: TEXT_WHITE, fontSize: FONT_LG, fontWeight: '700', paddingVertical: SPACE_MD },
});

export default ProfileScreen;
