/**
 * DeliveryDetailsScreen — Full delivery information
 * AGENT-APP-DRIVER
 */

import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, useColorScheme, SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootState } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { openNavigationPicker, makeCall } from '../services/navigationService';
import {
  PRIMARY, SECONDARY, WARNING, ERROR,
  BTN_HEIGHT_LG,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM,
  RADIUS_MD, RADIUS_LG, TEXT_WHITE,
  getTheme,
} from '../utils/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'DeliveryDetails'>;

function isOnTime(clientDeadline: string): boolean {
  const now = new Date();
  const [h, m] = clientDeadline.split(':').map(Number);
  const deadline = new Date(now);
  deadline.setHours(h, m, 0, 0);
  return now <= deadline;
}

function minutesLate(clientDeadline: string): number {
  const now = new Date();
  const [h, m] = clientDeadline.split(':').map(Number);
  const deadline = new Date(now);
  deadline.setHours(h, m, 0, 0);
  return Math.max(0, Math.round((now.getTime() - deadline.getTime()) / 60000));
}

const DeliveryDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { items, statuses, currentIndex } = useSelector((s: RootState) => s.deliveries);
  const delivery = useMemo(() => items.find((d) => d.id === deliveryId), [items, deliveryId]);

  if (!delivery) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Livraison introuvable</Text>
      </SafeAreaView>
    );
  }

  const onTime = isOnTime(delivery.client_deadline);
  const late = minutesLate(delivery.client_deadline);
  const stopNumber = items.findIndex((d) => d.id === deliveryId) + 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <Text style={[styles.stopLabel, { color: theme.textMuted }]}>Arrêt {stopNumber}/{items.length}</Text>
          <Text style={[styles.storeName, { color: theme.text }]}>{delivery.reception_windows.store_name}</Text>
        </View>

        {/* Address */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>ADRESSE</Text>
          <Text style={[styles.addressText, { color: theme.text }]}>📍 {delivery.address}</Text>
          <Text style={[styles.coordsText, { color: theme.textMuted }]}>
            {delivery.latitude.toFixed(4)}° N, {delivery.longitude.toFixed(4)}° E
          </Text>
        </View>

        {/* Time windows */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>HORAIRES</Text>
          <View style={styles.timeRow}>
            <View>
              <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Fenêtre de réception</Text>
              <Text style={[styles.timeValue, { color: theme.text }]}>
                🕐 {delivery.reception_windows.open_time} – {delivery.reception_windows.close_time}
              </Text>
            </View>
            <View>
              <Text style={[styles.timeLabel, { color: theme.textMuted }]}>Deadline client</Text>
              <Text style={[styles.timeValue, { color: WARNING }]}>⏰ {delivery.client_deadline}</Text>
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: onTime ? '#DCFCE7' : '#FEF3C7' }]}>
          <Text style={[styles.statusText, { color: onTime ? '#166534' : '#92400E' }]}>
            {onTime ? "✅ À L'HEURE" : `⚠️ RETARD +${late} min`}
          </Text>
        </View>

        {/* Merchandise */}
        {delivery.weight_kg !== null && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>MARCHANDISE</Text>
            <Text style={[styles.infoText, { color: theme.text }]}>📦 {delivery.weight_kg} kg</Text>
            {delivery.notes && <Text style={[styles.infoText, { color: theme.text }]}>📝 {delivery.notes}</Text>}
          </View>
        )}

        {/* Store contact */}
        {delivery.reception_windows.store_phone && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>CONTACT MAGASIN</Text>
            <View style={styles.contactRow}>
              <Text style={[styles.phoneText, { color: theme.text }]}>📞 {delivery.reception_windows.store_phone}</Text>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => void makeCall(delivery.reception_windows.store_phone!)}
                testID="call-store-btn"
                accessibilityLabel="Appeler le magasin"
              >
                <Text style={styles.callBtnText}>APPELER</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CTA buttons */}
        <TouchableOpacity
          style={[styles.btnNavigate, { minHeight: BTN_HEIGHT_LG }]}
          onPress={() => openNavigationPicker(delivery.latitude, delivery.longitude, delivery.address)}
          testID="navigate-btn"
          accessibilityLabel="Naviguer vers ce point"
        >
          <Text style={styles.btnText}>🗺️ NAVIGUER VERS CE POINT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnArrived, { minHeight: BTN_HEIGHT_LG }]}
          onPress={() => navigation.navigate('Arrived', { deliveryId: delivery.id, arrivedAt: new Date().toISOString() })}
          testID="arrived-btn"
          accessibilityLabel="Je suis arrivé"
        >
          <Text style={styles.btnText}>✅ ARRIVÉ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32, gap: SPACE_SM },
  header: { borderRadius: RADIUS_LG, padding: SPACE_LG, marginTop: SPACE_MD },
  stopLabel: { fontSize: FONT_SM, marginBottom: SPACE_SM },
  storeName: { fontSize: FONT_XL, fontWeight: '700' },
  section: { borderRadius: RADIUS_MD, padding: SPACE_MD },
  sectionTitle: { fontSize: FONT_SM - 2, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACE_SM },
  addressText: { fontSize: FONT_MD, fontWeight: '600' },
  coordsText: { fontSize: FONT_SM, marginTop: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeLabel: { fontSize: FONT_SM, marginBottom: 4 },
  timeValue: { fontSize: FONT_MD, fontWeight: '600' },
  statusBadge: { borderRadius: RADIUS_MD, paddingVertical: SPACE_MD, alignItems: 'center' },
  statusText: { fontSize: FONT_LG, fontWeight: '700' },
  infoText: { fontSize: FONT_MD, marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneText: { fontSize: FONT_MD },
  callBtn: { backgroundColor: SECONDARY, borderRadius: RADIUS_MD, paddingHorizontal: SPACE_MD, paddingVertical: SPACE_SM },
  callBtnText: { color: TEXT_WHITE, fontSize: FONT_SM, fontWeight: '700' },
  btnNavigate: { backgroundColor: SECONDARY, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', marginTop: SPACE_MD },
  btnArrived: { backgroundColor: PRIMARY, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', marginTop: SPACE_SM },
  btnText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700' },
  errorText: { textAlign: 'center', marginTop: 80, fontSize: FONT_MD },
});

export default DeliveryDetailsScreen;
