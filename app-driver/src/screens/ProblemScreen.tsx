/**
 * ProblemScreen — Incident reporting modal
 * AGENT-APP-DRIVER
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  useColorScheme, SafeAreaView, ScrollView, Modal, Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootState, AppDispatch } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { reportProblem } from '../redux/deliveriesSlice';
import { makeCall } from '../services/navigationService';
import {
  PRIMARY, SECONDARY, WARNING, ERROR,
  BTN_HEIGHT_LG, BTN_HEIGHT_MD,
  FONT_XL, FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM,
  RADIUS_MD, RADIUS_LG, TEXT_WHITE,
  getTheme,
} from '../utils/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Problem'>;

const PROBLEM_TYPES = [
  { value: 'reception_closed',  label: 'Réception fermée' },
  { value: 'refused',           label: 'Refus de marchandise' },
  { value: 'absent',            label: 'Client absent' },
  { value: 'access_blocked',    label: 'Accès bloqué' },
  { value: 'damaged',           label: 'Dégâts marchandise' },
  { value: 'other',             label: 'Autre' },
] as const;

const ProblemScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const { items } = useSelector((s: RootState) => s.deliveries);
  const { current: driver } = useSelector((s: RootState) => s.driver);
  const { current: routeState } = useSelector((s: RootState) => s.route);

  const delivery = items.find((d) => d.id === deliveryId);
  const MANAGER_PHONE = process.env.EXPO_PUBLIC_MANAGER_PHONE ?? '0600000000';

  const [selectedType, setSelectedType] = useState<string>('reception_closed');
  const [notes, setNotes] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedLabel = PROBLEM_TYPES.find((t) => t.value === selectedType)?.label ?? '';

  const handleCallNow = useCallback(() => {
    void makeCall(MANAGER_PHONE);
  }, [MANAGER_PHONE]);

  const handleSubmit = useCallback(async (immediate: boolean) => {
    if (!driver) return;
    setSubmitting(true);
    try {
      await dispatch(reportProblem({
        deliveryId,
        driverId: driver.id,
        routeId: routeState?.id ?? '',
        notes: [selectedLabel, notes].filter(Boolean).join(' — '),
      })).unwrap();

      if (immediate) {
        void makeCall(MANAGER_PHONE);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de soumettre le problème. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }, [driver, dispatch, deliveryId, routeState, selectedLabel, notes, MANAGER_PHONE, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: ERROR }]}>⚠️ Signaler un problème</Text>
          {delivery && <Text style={[styles.storeName, { color: theme.textMuted }]}>{delivery.reception_windows.store_name}</Text>}
        </View>

        {/* Problem type picker */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Type de problème</Text>
          <TouchableOpacity
            style={[styles.picker, { backgroundColor: theme.input, borderColor: theme.border }]}
            onPress={() => setShowTypePicker(true)}
            testID="problem-type-picker"
            accessibilityLabel="Sélectionner le type de problème"
          >
            <Text style={[styles.pickerText, { color: theme.text }]}>▼ {selectedLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Notes (optionnel)</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder="Décrivez le problème..."
            placeholderTextColor={theme.textMuted}
            testID="notes-input"
          />
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={[styles.btnCallNow, { minHeight: BTN_HEIGHT_LG }]}
          onPress={() => void handleSubmit(true)}
          disabled={submitting}
          testID="call-manager-now-btn"
          accessibilityLabel="Appeler le manager maintenant"
        >
          <Text style={styles.btnText}>📞 APPELER MANAGER MAINTENANT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnLater, { minHeight: BTN_HEIGHT_MD, borderColor: WARNING }]}
          onPress={() => void handleSubmit(false)}
          disabled={submitting}
          testID="report-later-btn"
          accessibilityLabel="Signaler plus tard"
        >
          <Text style={[styles.btnTextSecondary, { color: WARNING }]}>
            {submitting ? '⏳ Envoi...' : '📤 SIGNALER PLUS TARD'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelLink}>
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Type picker modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Type de problème</Text>
            {PROBLEM_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.modalOption, { backgroundColor: selectedType === t.value ? '#EFF6FF' : 'transparent' }]}
                onPress={() => { setSelectedType(t.value); setShowTypePicker(false); }}
              >
                <Text style={[styles.modalOptionText, { color: selectedType === t.value ? SECONDARY : theme.text }]}>
                  {selectedType === t.value ? '● ' : '○ '}{t.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowTypePicker(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: theme.textMuted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: SPACE_MD, paddingBottom: 32, gap: SPACE_MD, paddingTop: SPACE_MD },
  header: { gap: SPACE_SM },
  title: { fontSize: FONT_XL, fontWeight: '800' },
  storeName: { fontSize: FONT_MD },
  section: { borderRadius: RADIUS_LG, padding: SPACE_MD, gap: SPACE_SM },
  label: { fontSize: FONT_SM, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  picker: { borderRadius: RADIUS_MD, padding: SPACE_MD, borderWidth: 1 },
  pickerText: { fontSize: FONT_MD },
  notesInput: { borderRadius: RADIUS_MD, padding: SPACE_MD, fontSize: FONT_MD, borderWidth: 1, minHeight: 100, textAlignVertical: 'top' },
  btnCallNow: { backgroundColor: ERROR, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center' },
  btnLater: { borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  btnText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_MD },
  btnTextSecondary: { fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_MD },
  cancelLink: { alignItems: 'center', paddingVertical: SPACE_SM },
  cancelText: { fontSize: FONT_SM },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: RADIUS_XL, borderTopRightRadius: RADIUS_XL, padding: SPACE_LG, gap: SPACE_SM },
  modalTitle: { fontSize: FONT_LG, fontWeight: '700', marginBottom: SPACE_SM },
  modalOption: { borderRadius: RADIUS_MD, padding: SPACE_MD },
  modalOptionText: { fontSize: FONT_MD },
  modalCancel: { marginTop: SPACE_SM, alignItems: 'center', paddingVertical: SPACE_SM },
  modalCancelText: { fontSize: FONT_MD },
});

export default ProblemScreen;
