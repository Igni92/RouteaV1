/**
 * cameraService — Camera permission + capture + compression helpers
 * AGENT-APP-DRIVER
 *
 * Uses expo-camera for capture and expo-image-manipulator for compression.
 */

import { Camera, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CaptureResult {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ── Permission ─────────────────────────────────────────────────────────────────

/**
 * Request camera permission from the user.
 * Returns 'granted' | 'denied'.
 */
export async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status as CameraPermissionStatus;
}

/**
 * Check current camera permission without prompting.
 */
export async function getCameraPermission(): Promise<CameraPermissionStatus> {
  const { status } = await Camera.getCameraPermissionsAsync();
  return status as CameraPermissionStatus;
}

// ── Compression ────────────────────────────────────────────────────────────────

/**
 * Compress an image to JPEG ≤ ~500 KB.
 * Resizes to max 1280px wide (landscape delivery photos).
 * Compress quality: 0.7 (good balance size/quality for proof photos).
 */
export async function compressImage(uri: string): Promise<CaptureResult> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      { resize: { width: 1280 } },
    ],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Compress and encode image to base64 string.
 * Used for offline queue storage.
 */
export async function compressToBase64(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('Image compression failed: no base64 output');
  }

  return result.base64;
}

/**
 * capturePhoto — wraps the camera ref's takePictureAsync call.
 * Automatically compresses after capture.
 *
 * Usage: call from within the PhotoScreen after takePictureAsync()
 */
export async function processCapture(uri: string): Promise<CaptureResult> {
  return compressImage(uri);
}

// ── Camera config ──────────────────────────────────────────────────────────────

export const DEFAULT_CAMERA_TYPE = CameraType.back;

/**
 * Recommended camera settings for delivery proof photos.
 */
export const CAMERA_OPTIONS = {
  quality: 0.8,    // Raw capture quality (before our compression)
  base64: false,   // We process separately
  skipProcessing: false,
  exif: false,     // Not needed for proofs
} as const;
