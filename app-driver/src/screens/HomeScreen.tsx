/**
 * HomeScreen — Daily delivery list with progress
 * AGENT-APP-DRIVER
 */

import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme, StatusBar, SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootState, AppDispatch } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { setCurrentIndex } from '../redux/deliveriesSlice';
import type { DeliveryWithWindow, DeliveryStatus } from '@shared/types';
import { openNavigationPicker, makeCall } from '../services/navigationService';
import {
  PRIMARY, SECONDARY, WARNING,
  BTN_HEIGHT_LG, BTN_HEIGHT_SM,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM, FONT_XS,
  SPACE_MD, SPACE_LG, SPACE_SM,
  RADIUS_MD, RADIUS_LG, TEXT_WHITE, TEXT_MUTED,
  getTheme,
} from '../utils/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const ProgressBar: React.FC<{ completed: number; total: number; textColor: string }> = ({ completed, total, textColor }) => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <View style={styles.progressContainer} testID="progress-bar">
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={[styles.progressLabel, { color: textColor }]}>{completed}/{total} livraisons</Text>
    </View>
  );
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { items: deliveries, statuses, currentIndex } = useSelector((s: RootState) => s.deliveries);
  const { current: route } = useSelector((s: RootState) => s.route);
  const MANAGER_PHONE = process.env.EXPO_PUBLIC_MANAGER_PHONE ?? '0600000000';

  const deliveriesOrdered = useMemo(() => {
    if (!route?.deliveries_ordered?.length) return deliveries;
    return route.deliveries_ordered
      .map((id) => deliveries.find((d) => d.id === id))
      .filter((d): d is DeliveryWithWindow => d !== undefined);
  }, [deliveries, route]);

  const getStatus = useCallback(
    (d: DeliveryWithWindow): DeliveryStatus => statuses[d.id] ?? d.status,
    [statuses],
  );

  const completedCount = useMemo(
    () => deliveriesOrdered.filter((d) => { const s = getStatus(d); return s === 'completed' || s === 'failed'; }).length,
    [deliveriesOrdered, getStatus],
  );

  const current = deliveriesOrdered[currentIndex];

  const handleArrive = useCallback(() => {
    if (!current) return;
    navigation.navigate('Arrived', { deliveryId: current.id, arrivedAt: new Date().toISOString() });
  }, [current, navigation]);

  const handleNavigate = useCallback(() => {
    if (!current) return;
    openNavigationPicker(current.latitude, current.longitude, current.address);
  }, [current]);

  const handleCardPress = useCallback((delivery: DeliveryWithWindow, idx: number) => {
    dispatch(setCurrentIndex(idx));
    navigation.navigate('DeliveryDetails', { deliveryId: delivery.id });
  }, [dispatch, navigation]);

  const today = format(new Date(), 'EEEE d MMM', { locale: fr });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]} testID="home-scroll">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: PRIMARY }]}>GERVIFRAIS</Text>
            <Text style={[styles.headerDate, { color: theme.textMuted }]}>📅 {today.charAt(0).toUpperCase() + today.slice(1)}</Text>
          </View>
          <TouchableOpacity
            style={styles.problemBtn}
            onPress={() => current && navigation.navigate('Problem', { deliveryId: current.id })}
            testID="problem-btn"
            accessibilityLabel="Signaler un problème"
          >
            <Text style={styles.problemBtnText}>⚠️ Problème</Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <ProgressBar completed={completedCount} total={deliveriesOrdered.length} textColor={theme.textMuted} />

        {/* Current delivery */}
        {current && (
          <TouchableOpacity
            style={[styles.currentCard, { backgroundColor: theme.card, borderColor: SECONDARY }]}
            onPress={() => handleCardPress(current, currentIndex)}
            testID="current-delivery-card"
            accessibilityLabel={`Livraison en cours: ${current.reception_windows.store_name}`}
          >
            <View style={styles.currentBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.currentBadgeText}>LIVRAISON EN COURS</Text>
            </View>
            <Text style={[styles.storeName, { color: theme.text }]}>{current.reception_windows.store_name}</Text>
            <Text style={[styles.address, { color: theme.textMuted }]} numberOfLines={2}>{current.address}</Text>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textMuted }]}>⏰ {current.reception_windows.open_time}–{current.reception_windows.close_time}</Text>
              <Text style={[styles.deadlineLabel, { color: WARNING }]}>Deadline: {current.client_deadline}</Text>
            </View>
            <View style={styles.cardButtons}>
              <TouchableOpacity style={[styles.btnNavigate, { minHeight: BTN_HEIGHT_LG }]} onPress={handleNavigate} testID="navigate-btn" accessibilityLabel="Naviguer">
                <Text style={styles.btnText}>🗺️ NAVIGUER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnCallManager, { minHeight: BTN_HEIGHT_SM }]} onPress={() => void makeCall(MANAGER_PHONE)} testID="call-manager-btn" accessibilityLabel="Appeler manager">
                <Text style={styles.btnTextSm}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnArrived, { minHeight: BTN_HEIGHT_LG }]} onPress={handleArrive} testID="arrived-btn" accessibilityLabel="Marquer arrivé">
                <Text style={styles.btnText}>✅ ARRIVÉ</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* Other deliveries */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Toutes les livraisons</Text>
        {deliveriesOrdered.map((delivery, idx) => {
          if (idx === currentIndex) return null;
          const done = (() => { const s = getStatus(delivery); return s === 'completed' || s === 'failed'; })();
          return (
            <TouchableOpacity
              key={delivery.id}
              style={[styles.deliveryCard, { backgroundColor: theme.card, borderColor: theme.border, opacity: done ? 0.5 : 1 }]}
              onPress={() => handleCardPress(delivery, idx)}
              testID={`delivery-card-${idx}`}
              accessibilityLabel={`Livraison ${idx + 1}: ${delivery.reception_windows.store_name}`}
            >
              <View style={styles.cardLeft}><Text style={[styles.indexLabel, { color: TEXT_MUTED }]}>{idx + 1}</Text></View>
              <View style={styles.cardCenter}>
                <Text style={[styles.cardStoreName, { color: done ? TEXT_MUTED : theme.text }]}>{done ? '✅ ' : '○  '}{delivery.reception_windows.store_name}</Text>
                <Text style={[styles.cardTime, { color: TEXT_MUTED }]}>{delivery.reception_windows.open_time}–{delivery.reception_windows.close_time}</Text>
              </View>
              <View style={styles.cardRight}><Text style={[styles.cardDeadline, { color: WARNING }]}>{delivery.client_deadline}</Text></View>
            </TouchableOpacity>
          );
        })}

        {deliveriesOrdered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>🚚 Aucune livraison assignée aujourd'hui</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: SPACE_MD, marginBottom: SPACE_MD },
  headerTitle: { fontSize: FONT_XL, fontWeight: '800', letterSpacing: 1 },
  headerDate: { fontSize: FONT_SM, marginTop: 2 },
  problemBtn: { backgroundColor: '#FEF3C7', borderRadius: RADIUS_MD, paddingHorizontal: SPACE_MD, paddingVertical: SPACE_SM },
  problemBtnText: { fontSize: FONT_SM, color: '#92400E', fontWeight: '600' },
  progressContainer: { marginBottom: SPACE_LG },
  progressTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: RADIUS_LG, overflow: 'hidden', marginBottom: SPACE_SM },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: RADIUS_LG },
  progressLabel: { fontSize: FONT_SM, fontWeight: '600', textAlign: 'right' },
  currentCard: { borderRadius: RADIUS_LG, padding: SPACE_LG, marginBottom: SPACE_MD, borderWidth: 2 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACE_SM },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SECONDARY, marginRight: SPACE_SM },
  currentBadgeText: { fontSize: FONT_XS, fontWeight: '700', color: SECONDARY, letterSpacing: 1 },
  storeName: { fontSize: FONT_LG, fontWeight: '700', marginBottom: SPACE_SM / 2 },
  address: { fontSize: FONT_MD, marginBottom: SPACE_SM },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE_MD },
  timeLabel: { fontSize: FONT_SM },
  deadlineLabel: { fontSize: FONT_SM, fontWeight: '600' },
  cardButtons: { flexDirection: 'row', gap: SPACE_SM, marginTop: SPACE_SM },
  btnNavigate: { flex: 2, backgroundColor: SECONDARY, borderRadius: RADIUS_MD, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE_SM },
  btnCallManager: { width: BTN_HEIGHT_SM + 8, backgroundColor: '#F1F5F9', borderRadius: RADIUS_MD, justifyContent: 'center', alignItems: 'center' },
  btnArrived: { flex: 2, backgroundColor: PRIMARY, borderRadius: RADIUS_MD, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACE_SM },
  btnText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700' },
  btnTextSm: { fontSize: FONT_LG },
  sectionLabel: { fontSize: FONT_XS, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE_SM, marginTop: SPACE_MD },
  deliveryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS_MD, padding: SPACE_MD, marginBottom: SPACE_SM, borderWidth: 1 },
  cardLeft: { width: 28, alignItems: 'center' },
  indexLabel: { fontSize: FONT_SM, fontWeight: '700' },
  cardCenter: { flex: 1, marginLeft: SPACE_SM },
  cardStoreName: { fontSize: FONT_MD, fontWeight: '600' },
  cardTime: { fontSize: FONT_SM, marginTop: 2 },
  cardRight: { marginLeft: SPACE_SM },
  cardDeadline: { fontSize: FONT_SM, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: FONT_MD, textAlign: 'center' },
});

export default HomeScreen;
