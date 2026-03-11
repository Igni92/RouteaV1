/**
 * PhotoBLScreen — Full-screen camera for stamped BL photo
 * AGENT-APP-DRIVER
 *
 * Same as PhotoMarchandiseScreen but captures the "Bon de Livraison tamponné".
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  useColorScheme, SafeAreaView, Alert, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useDispatch } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppDispatch } from '../redux/store';
import type { HomeStackParamList } from '../types/navigation';
import { setPhotoUri } from '../redux/photoSlice';
import { processCapture } from '../services/cameraService';
import {
  PRIMARY,
  BTN_HEIGHT_LG, BTN_HEIGHT_MD,
  FONT_LG, FONT_MD, FONT_SM,
  SPACE_MD, SPACE_LG, SPACE_SM,
  RADIUS_LG, RADIUS_FULL, TEXT_WHITE,
  BG_DARK,
} from '../utils/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'PhotoBL'>;

const PhotoBLScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const dispatch = useDispatch<AppDispatch>();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        const compressed = await processCapture(photo.uri);
        setCapturedUri(compressed.uri);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de prendre la photo. Réessayez.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const handleConfirm = useCallback(() => {
    if (!capturedUri) return;
    dispatch(setPhotoUri({ deliveryId, type: 'bl', uri: capturedUri }));
    navigation.goBack();
  }, [capturedUri, dispatch, deliveryId, navigation]);

  if (!permission) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]}>
        <View style={styles.centered}>
          <Text style={styles.permText}>Vérification des permissions caméra...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]}>
        <View style={styles.centered}>
          <Text style={styles.permText}>Accès caméra requis</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedUri) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📷 BL Tamponné</Text>
        </View>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />
        </View>
        <Text style={styles.guideText}>Vérifiez que le tampon et la signature sont visibles</Text>
        <View style={styles.previewButtons}>
          <TouchableOpacity
            style={[styles.btnRetake, { minHeight: BTN_HEIGHT_MD }]}
            onPress={() => setCapturedUri(null)}
            testID="retake-btn"
            accessibilityLabel="Reprendre la photo"
          >
            <Text style={styles.btnRetakeText}>🔄 REPRENDRE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnConfirm, { minHeight: BTN_HEIGHT_LG }]}
            onPress={handleConfirm}
            testID="confirm-btn"
            accessibilityLabel="Confirmer la photo"
          >
            <Text style={styles.btnConfirmText}>✅ CONFIRMER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_DARK }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn} accessibilityLabel="Annuler">
          <Text style={styles.cancelText}>← Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📷 BL Tamponné</Text>
        <View style={{ width: 80 }} />
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        testID="camera-view"
      />

      <Text style={styles.guideText}>
        Photographiez le bon de livraison avec le tampon du magasin
      </Text>

      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[styles.captureBtn, isCapturing && styles.captureBtnActive]}
          onPress={() => void handleCapture()}
          disabled={isCapturing}
          testID="capture-btn"
          accessibilityLabel="Prendre la photo"
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACE_LG },
  permText: { color: TEXT_WHITE, fontSize: FONT_MD, textAlign: 'center', marginBottom: SPACE_MD },
  permBtn: { backgroundColor: PRIMARY, borderRadius: RADIUS_LG, paddingHorizontal: SPACE_LG, paddingVertical: SPACE_MD },
  permBtnText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACE_MD, paddingVertical: SPACE_SM },
  headerTitle: { color: TEXT_WHITE, fontSize: FONT_LG, fontWeight: '700' },
  cancelBtn: { padding: SPACE_SM },
  cancelText: { color: TEXT_WHITE, fontSize: FONT_MD },
  camera: { flex: 1 },
  guideText: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SM, textAlign: 'center', padding: SPACE_MD },
  captureContainer: { alignItems: 'center', paddingVertical: SPACE_LG },
  captureBtn: { width: 72, height: 72, borderRadius: RADIUS_FULL, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: TEXT_WHITE },
  captureBtnActive: { backgroundColor: 'rgba(255,255,255,0.6)' },
  captureInner: { width: 52, height: 52, borderRadius: RADIUS_FULL, backgroundColor: TEXT_WHITE },
  previewContainer: { flex: 1, backgroundColor: '#000' },
  preview: { width: '100%', height: '100%' },
  previewButtons: { flexDirection: 'row', padding: SPACE_MD, gap: SPACE_SM },
  btnRetake: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center' },
  btnRetakeText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_SM },
  btnConfirm: { flex: 2, backgroundColor: PRIMARY, borderRadius: RADIUS_LG, justifyContent: 'center', alignItems: 'center' },
  btnConfirmText: { color: TEXT_WHITE, fontSize: FONT_MD, fontWeight: '700', paddingVertical: SPACE_SM },
});

export default PhotoBLScreen;
