/**
 * ConfirmationScreen — Delivery completion celebration
 * AGENT-APP-DRIVER
 */

import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useColorScheme, SafeAreaView, ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootState, AppDispatch } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { advanceToNext } from '../redux/deliveriesSlice';
import { makeCall } from '../services/navigationService';
import {
  PRIMARY, SECONDARY, TEXT_WHITE,
  BTN_HEIGHT_LG, BTN_HEIGHT_MD,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM, SPACE_XL,
  RADIUS_MD, RADIUS_LG, RADIUS_XL,
  getTheme,
} from '../utils/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Confirmation'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

const ConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId, durationSeconds } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { items, currentIndex } = useSelector((s: RootState) => s.deliveries);
  const { route: routeState } = useSelector((s: RootState) => s);

  const delivery = useMemo(() => items.find((d) => d.id === deliveryId), [items, deliveryId]);
  const nextDelivery = useMemo(() => {
    const ordered = routeState.route.deliveriesOrdered;
    const currentPos = ordered.indexOf(deliveryId);
    const nextId = ordered[currentPos + 1];
    return nextId ? items.find((d) => d.id === nextId) : null;
  }, [items, deliveryId, routeState.route.deliveriesOrdered]);

  const hasMore = !!nextDelivery;
  const MANAGER_PHONE = process.env.EXPO_PUBLIC_MANAGER_PHONE ?? '0600000000';

  const handleNext = () => {
    dispatch(advanceToNext());
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Celebration */}
        <View style={styles.celebrationSection}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={[styles.title, { color: PRIMARY }]}>LIVRAISON COMPLÈTE</Text>
          {delivery && (
            <Text style={[styles.storeName, { color: theme.text }]}>{delivery.reception_windows.store_name}</Text>
          )}
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>✅</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Photo marchandise</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>✅</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Photo BL tamponné</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>⏱️</Text>
            <Text style={[styles.summaryLabel, { color: theme.text }]}>Temps sur site: {formatDuration(durationSeconds)}</Text>
          </View>
        </View>

        {/* Next delivery */}
        {hasMore && nextDelivery && (
          <View style={[styles.nextSection, { backgroundColor: theme.card }]}>
            <Text style={[styles.nextLabel, { color: theme.textMuted }]}>─── Prochaine livraison ───</Text>
            <Text style={[styles.nextStore, { color: theme.text }]}>{nextDelivery.reception_windows.store_name}</Text>
            <Text style={[styles.nextAddress, { color: theme.textMuted }]} numberOfLines={1}>{nextDelivery.address}</Text>
            <Text style={[styles.nextWindow, { color: theme.textMuted }]}>
              ⏰ {nextDelivery.reception_windows.open_time}–{nextDelivery.reception_windows.close_time}
            </Text>
          </View>
        )}

        {!hasMore && (
          <View style={[styles.allDoneSection, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.allDoneText, { color: '#166534' }]}>🏁 Toutes les livraisons du jour sont terminées !</Text>
          </View>
        )}

        {/* Buttons */}
        {hasMore && (
          <TouchableOpacity
            style={[styles.btnNext, { minHeight: BTN_HEIGHT_LG }]}
            onPress={handleNext}
            testID="next-delivery-btn"
            accessibilityLabel="Aller à la prochaine livraison"
          >
            <Text style={styles.btnText}>➡️ ALLER À LA PROCHAINE</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btnManager, { minHeight: BTN_HEIGHT_MD, borderColor: SECONDARY }]}
          onPress={() => void makeCall(MANAGER_PHONE)}
          testID="call-manager-btn"
          accessibilityLabel="Appeler le manager"
        >
          <Text style={[styles.btnTextSecondary, { color: SECONDARY }]}>📞 APPELER LE MANAGER</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32, gap: SPACE_MD, paddingTop: SPACE_XL },
  celebrationSection: { alignItems: 'center', gap: SPACE_SM },
  emoji: { fontSize: 64 },
  title: { fontSize: FONT_XL, fontWeight: '900', letterSpacing: 1 },
  storeName: { fontSize: FONT_LG, fontWeight: '600', textAlign: 'center' },
  summaryCard: { borderRadius: RADIUS_LG, padding: SPACE_LG, gap: SPACE_SM },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE_MD },
  summaryIcon: { fontSize: FONT_LG },
  summaryLabel: { fontSize: FONT_MD },
  nextSection: { borderRadius: RADIUS_LG, padding: SPACE_LG, gap: SPACE_SM },
  nextLabel: { fontSize: FONT_SM, textAlign: 'center' },
  nextStore: { fontSize: FONT_LG, fontWeight: '700' },
  nextAddress: { fontSize: FONT_MD },
  nextWindow: { fontSize: FONT_SM },
  allDoneSection: { borderRadius: RADIUS_LG, padding: SPACE_LG, alignItems: 'center' },
  allDoneText: { fontSize: FONT_LG, fontWeight: '700', textAlign: 'center' },
  btnNext: { backgroundColor: PRIMARY, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center' },
  btnManager: { borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  btnText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_MD },
  btnTextSecondary: { fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_MD },
});

export default ConfirmationScreen;
