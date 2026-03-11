/**
 * ArrivedScreen — Post-arrival photo capture flow
 * AGENT-APP-DRIVER
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useColorScheme, SafeAreaView, ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootState, AppDispatch } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { markDeliveryCompleted } from '../redux/deliveriesSlice';
import { selectPhotosBothCaptured } from '../redux/photoSlice';
import { uploadDeliveryPhotos } from '../redux/photoSlice';
import {
  PRIMARY, SECONDARY, WARNING, ERROR,
  BTN_HEIGHT_LG, BTN_HEIGHT_MD,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM,
  RADIUS_MD, RADIUS_LG, TEXT_WHITE,
  getTheme,
} from '../utils/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Arrived'>;

function getArrivalStatus(arrivedAt: string, closeTime: string): { label: string; color: string; bgColor: string } {
  const arrived = new Date(arrivedAt);
  const [h, m] = closeTime.split(':').map(Number);
  const close = new Date(arrived);
  close.setHours(h, m, 0, 0);
  const diffMin = Math.round((arrived.getTime() - close.getTime()) / 60000);
  if (diffMin <= 0) return { label: "🟢 À L'HEURE", color: '#166534', bgColor: '#DCFCE7' };
  if (diffMin <= 30) return { label: `🟡 LÉGER RETARD (+${diffMin} min)`, color: '#92400E', bgColor: '#FEF3C7' };
  return { label: `🔴 EN RETARD (+${diffMin} min)`, color: '#7F1D1D', bgColor: '#FEE2E2' };
}

function timeRemaining(closeTime: string, arrivedAt: string): string {
  const arrived = new Date(arrivedAt);
  const [h, m] = closeTime.split(':').map(Number);
  const close = new Date(arrived);
  close.setHours(h, m, 0, 0);
  const diffMs = close.getTime() - arrived.getTime();
  if (diffMs <= 0) return 'Fenêtre dépassée';
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `Vous avez ${hours}h${String(mins).padStart(2, '0')} pour livrer` : `Vous avez ${mins} min pour livrer`;
}

const ArrivedScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId, arrivedAt } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const startedAt = React.useRef(Date.now());

  const { items } = useSelector((s: RootState) => s.deliveries);
  const { current: driver } = useSelector((s: RootState) => s.driver);
  const { current: routeState } = useSelector((s: RootState) => s.route);
  const photosState = useSelector((s: RootState) => s.photos);

  const delivery = useMemo(() => items.find((d) => d.id === deliveryId), [items, deliveryId]);
  const hasBothPhotos = selectPhotosBothCaptured(photosState, deliveryId);
  const uploadedPhotos = photosState.uploaded[deliveryId];

  const hasMarchandise = !!uploadedPhotos?.marchandiseUri;
  const hasBL = !!uploadedPhotos?.blUri;
  const [completing, setCompleting] = useState(false);

  const status = delivery ? getArrivalStatus(arrivedAt, delivery.reception_windows.close_time) : null;
  const remaining = delivery ? timeRemaining(delivery.reception_windows.close_time, arrivedAt) : '';

  const handleComplete = useCallback(async () => {
    if (!hasBothPhotos || !driver || !delivery) return;
    setCompleting(true);
    try {
      await dispatch(uploadDeliveryPhotos({
        deliveryId,
        marchandiseUri: uploadedPhotos!.marchandiseUri!,
        blUri: uploadedPhotos!.blUri!,
      })).unwrap();
      await dispatch(markDeliveryCompleted({
        deliveryId,
        driverId: driver.id,
        routeId: routeState?.id ?? '',
      })).unwrap();
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      navigation.replace('Confirmation', { deliveryId, durationSeconds: duration });
    } catch (err) {
      console.error('Complete delivery error:', err);
    } finally {
      setCompleting(false);
    }
  }, [hasBothPhotos, driver, delivery, dispatch, deliveryId, uploadedPhotos, routeState, navigation]);

  if (!delivery) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <Text style={[{ color: theme.text, textAlign: 'center', marginTop: 80 }]}>Livraison introuvable</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Store name */}
        <Text style={[styles.storeName, { color: theme.text }]}>{delivery.reception_windows.store_name}</Text>

        {/* Status badge */}
        {status && (
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            <Text style={[styles.arrivedTime, { color: status.color }]}>
              Arrivé à {new Date(arrivedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.remainingText, { color: status.color }]}>{remaining}</Text>
          </View>
        )}

        {/* Photo progress */}
        <View style={[styles.progressSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            📸 Photos requises: {(hasMarchandise ? 1 : 0) + (hasBL ? 1 : 0)}/2
          </Text>

          {/* Photo marchandise button */}
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: hasMarchandise ? '#DCFCE7' : theme.input, borderColor: hasMarchandise ? PRIMARY : theme.border }]}
            onPress={() => navigation.navigate('PhotoMarchandise', { deliveryId })}
            testID="photo-marchandise-btn"
            accessibilityLabel="Prendre photo marchandise"
          >
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={[styles.photoBtnLabel, { color: hasMarchandise ? '#166534' : theme.text }]}>
              PHOTO MARCHANDISE
            </Text>
            <Text style={styles.photoBtnCheck}>{hasMarchandise ? '✅' : '⏳'}</Text>
          </TouchableOpacity>

          {/* Photo BL button */}
          <TouchableOpacity
            style={[styles.photoBtn, { backgroundColor: hasBL ? '#DCFCE7' : theme.input, borderColor: hasBL ? PRIMARY : theme.border }]}
            onPress={() => navigation.navigate('PhotoBL', { deliveryId })}
            testID="photo-bl-btn"
            accessibilityLabel="Prendre photo BL tamponné"
          >
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={[styles.photoBtnLabel, { color: hasBL ? '#166534' : theme.text }]}>
              PHOTO BL TAMPONNÉ
            </Text>
            <Text style={styles.photoBtnCheck}>{hasBL ? '✅' : '⏳'}</Text>
          </TouchableOpacity>
        </View>

        {/* Complete button */}
        <TouchableOpacity
          style={[styles.completeBtn, { backgroundColor: hasBothPhotos ? PRIMARY : theme.border, minHeight: BTN_HEIGHT_LG }]}
          onPress={() => void handleComplete()}
          disabled={!hasBothPhotos || completing}
          testID="complete-btn"
          accessibilityLabel="Livraison complète"
          accessibilityState={{ disabled: !hasBothPhotos }}
        >
          <Text style={[styles.completeBtnText, { color: hasBothPhotos ? TEXT_WHITE : theme.textMuted }]}>
            {completing ? '⏳ Envoi...' : '✅ LIVRAISON COMPLÈTE'}
          </Text>
        </TouchableOpacity>

        {/* Problem link */}
        <TouchableOpacity onPress={() => navigation.navigate('Problem', { deliveryId })} style={styles.problemLink}>
          <Text style={[styles.problemLinkText, { color: WARNING }]}>⚠️ Signaler un problème</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32, paddingTop: SPACE_MD, gap: SPACE_MD },
  storeName: { fontSize: FONT_XL, fontWeight: '700', textAlign: 'center' },
  statusBadge: { borderRadius: RADIUS_LG, padding: SPACE_LG, alignItems: 'center', gap: SPACE_SM },
  statusText: { fontSize: FONT_XL, fontWeight: '800' },
  arrivedTime: { fontSize: FONT_LG, fontWeight: '600' },
  remainingText: { fontSize: FONT_MD },
  progressSection: { borderRadius: RADIUS_LG, padding: SPACE_MD, gap: SPACE_SM },
  sectionTitle: { fontSize: FONT_SM, fontWeight: '700', letterSpacing: 1, marginBottom: SPACE_SM },
  photoBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS_MD, padding: SPACE_MD, borderWidth: 2, minHeight: BTN_HEIGHT_MD, gap: SPACE_SM },
  photoBtnIcon: { fontSize: FONT_LG },
  photoBtnLabel: { flex: 1, fontSize: FONT_MD, fontWeight: '600' },
  photoBtnCheck: { fontSize: FONT_LG },
  completeBtn: { borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', marginTop: SPACE_SM },
  completeBtnText: { fontSize: FONT_LG, fontWeight: '700', paddingVertical: SPACE_MD },
  problemLink: { alignItems: 'center', paddingVertical: SPACE_SM },
  problemLinkText: { fontSize: FONT_SM, fontWeight: '600' },
});

export default ArrivedScreen;
