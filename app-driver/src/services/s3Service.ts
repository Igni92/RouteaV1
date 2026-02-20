/**
 * s3Service — S3 photo upload via backend proxy
 * AGENT-APP-DRIVER
 *
 * Uploads go through the backend: POST /api/deliveries/:id/proof
 * The backend handles S3 via DeliveryProofService (AWS SDK server-side).
 * Retries on failure (3 attempts, exponential backoff).
 */

import { uploadDeliveryProof } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UploadResult {
  marchandise_url: string;
  bl_url: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000];  // exponential backoff

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Upload ─────────────────────────────────────────────────────────────────────

/**
 * Upload both proof photos to S3 via backend proxy.
 * Retries up to 3 times with 2s/4s/8s backoff.
 *
 * @param deliveryId    - UUID of the delivery
 * @param marchandiseUri - Local file:// URI for merchandise photo
 * @param blUri          - Local file:// URI for stamped BL photo
 * @param onProgress     - Optional progress callback (0–100)
 */
export async function uploadProofPhotos(
  deliveryId: string,
  marchandiseUri: string,
  blUri: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 8_000);
        onProgress?.(0); // reset progress on retry
      }

      const result = await uploadDeliveryProof(
        deliveryId,
        marchandiseUri,
        blUri,
        onProgress,
      );

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[s3Service] Upload attempt ${attempt + 1}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw new Error(
    `Photo upload failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message ?? 'Unknown error'}`,
  );
}

/**
 * Upload a single photo (convenience wrapper for partial uploads / retries).
 * Returns the relevant URL from the full proof upload response.
 */
export async function uploadSinglePhoto(
  deliveryId: string,
  type: 'marchandise' | 'bl',
  uri: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  // The API requires both photos — use a placeholder URI for the missing one
  // The backend accepts missing file gracefully (partial upload)
  const PLACEHOLDER = uri; // use same URI as placeholder for missing type

  const result = await uploadProofPhotos(
    deliveryId,
    type === 'marchandise' ? uri : PLACEHOLDER,
    type === 'bl' ? uri : PLACEHOLDER,
    onProgress,
  );

  return type === 'marchandise' ? result.marchandise_url : result.bl_url;
}
