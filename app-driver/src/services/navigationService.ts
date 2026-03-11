/**
 * navigationService — External app deep links + phone calls
 * AGENT-APP-DRIVER
 *
 * Opens Waze, Google Maps, or makes phone calls via React Native Linking.
 */

import { Linking, Platform, Alert } from 'react-native';

// ── Waze ───────────────────────────────────────────────────────────────────────

/**
 * Open Waze with the given coordinates.
 * Falls back to Google Maps if Waze is not installed.
 */
export async function openWaze(lat: number, lng: number): Promise<void> {
  const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
  const webFallback = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  try {
    const canOpen = await Linking.canOpenURL(wazeUrl);
    if (canOpen) {
      await Linking.openURL(wazeUrl);
    } else {
      // Waze not installed — try Google Maps
      await openGoogleMaps(lat, lng);
    }
  } catch {
    // Last resort: open Waze web
    await Linking.openURL(webFallback);
  }
}

// ── Google Maps ────────────────────────────────────────────────────────────────

/**
 * Open Google Maps with the given coordinates.
 * Uses platform-specific URL scheme.
 */
export async function openGoogleMaps(lat: number, lng: number): Promise<void> {
  const iosUrl     = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const androidUrl = `google.navigation:q=${lat},${lng}&mode=d`;
  const webUrl     = `https://maps.google.com/maps?daddr=${lat},${lng}`;

  const nativeUrl = Platform.OS === 'ios' ? iosUrl : androidUrl;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
}

// ── Navigation picker ──────────────────────────────────────────────────────────

/**
 * Show a picker to let the driver choose between Waze and Google Maps.
 * Falls back to Waze if only one is available.
 */
export function openNavigationPicker(
  lat: number,
  lng: number,
  address?: string,
): void {
  Alert.alert(
    'Naviguer',
    address ? `Destination: ${address}` : 'Choisissez votre application',
    [
      {
        text: '🚗 Waze',
        onPress: () => { void openWaze(lat, lng); },
      },
      {
        text: '🗺️ Google Maps',
        onPress: () => { void openGoogleMaps(lat, lng); },
      },
      {
        text: 'Annuler',
        style: 'cancel',
      },
    ],
    { cancelable: true },
  );
}

// ── Phone calls ────────────────────────────────────────────────────────────────

/**
 * Initiate a phone call to the given number.
 */
export async function makeCall(phoneNumber: string): Promise<void> {
  // Normalize: remove spaces, dashes, parentheses
  const normalized = phoneNumber.replace(/[\s\-()]/g, '');
  const url = `tel:${normalized}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Impossible d\'appeler',
        'Votre appareil ne supporte pas les appels téléphoniques.',
        [{ text: 'OK' }],
      );
    }
  } catch (err) {
    console.error('[navigationService] makeCall error:', err);
  }
}
