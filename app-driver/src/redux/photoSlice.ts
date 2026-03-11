/**
 * photoSlice — Photo capture queue + upload status
 * AGENT-APP-DRIVER
 *
 * Tracks photos captured by the driver before/during upload.
 * Persists to AsyncStorage for offline resilience.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { uploadProofPhotos } from '../services/s3Service';
import { queuePhotoUpload, updatePhotoStatus, getIsOnline } from '../services/offlineService';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PhotoQueueItem {
  id: string;
  deliveryId: string;
  type: 'marchandise' | 'bl';
  uri: string;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  attempts: number;
  uploadUrl?: string;
  createdAt: string;
}

export interface UploadedPhotos {
  marchandiseUri?: string;
  blUri?: string;
  marchandiseUrl?: string;
  blUrl?: string;
}

export interface PhotoState {
  queue: PhotoQueueItem[];
  uploaded: Record<string, UploadedPhotos>;  // keyed by deliveryId
  uploadProgress: number;  // 0–100 for current upload
}

// ── Initial state ──────────────────────────────────────────────────────────────

const initialState: PhotoState = {
  queue: [],
  uploaded: {},
  uploadProgress: 0,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

/**
 * Upload both photos for a delivery.
 * If offline, queues for later sync.
 */
export const uploadDeliveryPhotos = createAsyncThunk(
  'photos/upload',
  async (
    payload: { deliveryId: string; marchandiseUri: string; blUri: string },
    { dispatch },
  ) => {

    if (!getIsOnline()) {
      // Queue for offline sync
      await queuePhotoUpload({
        deliveryId: payload.deliveryId,
        type: 'marchandise',
        uri: payload.marchandiseUri,
        timestamp: new Date().toISOString(),
      });
      await queuePhotoUpload({
        deliveryId: payload.deliveryId,
        type: 'bl',
        uri: payload.blUri,
        timestamp: new Date().toISOString(),
      });
      return {
        deliveryId: payload.deliveryId,
        marchandiseUri: payload.marchandiseUri,
        blUri: payload.blUri,
        offline: true,
      };
    }

    const result = await uploadProofPhotos(
      payload.deliveryId,
      payload.marchandiseUri,
      payload.blUri,
      (progress) => { dispatch(setUploadProgress(progress)); },
    );

    return {
      deliveryId: payload.deliveryId,
      marchandiseUri: payload.marchandiseUri,
      blUri: payload.blUri,
      marchandiseUrl: result.marchandise_url,
      blUrl: result.bl_url,
      offline: false,
    };
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const photoSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    /** Store a captured photo URI locally (before upload). */
    setPhotoUri(
      state,
      action: PayloadAction<{ deliveryId: string; type: 'marchandise' | 'bl'; uri: string }>,
    ) {
      const { deliveryId, type, uri } = action.payload;
      if (!state.uploaded[deliveryId]) {
        state.uploaded[deliveryId] = {};
      }
      if (type === 'marchandise') {
        state.uploaded[deliveryId].marchandiseUri = uri;
      } else {
        state.uploaded[deliveryId].blUri = uri;
      }
    },

    /** Clear photos for a delivery (after confirmation). */
    clearDeliveryPhotos(state, action: PayloadAction<string>) {
      delete state.uploaded[action.payload];
    },

    setUploadProgress(state, action: PayloadAction<number>) {
      state.uploadProgress = action.payload;
    },

    resetUploadProgress(state) {
      state.uploadProgress = 0;
    },

    resetPhotos() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadDeliveryPhotos.pending, (state) => {
        state.uploadProgress = 0;
      })
      .addCase(uploadDeliveryPhotos.fulfilled, (state, action) => {
        const { deliveryId, marchandiseUri, blUri, marchandiseUrl, blUrl } = action.payload;
        state.uploaded[deliveryId] = {
          marchandiseUri,
          blUri,
          marchandiseUrl,
          blUrl,
        };
        state.uploadProgress = 100;
      })
      .addCase(uploadDeliveryPhotos.rejected, (state) => {
        state.uploadProgress = 0;
      });
  },
});

// ── Selectors (operate on slice state directly to avoid circular import) ───────

export function selectPhotosBothCaptured(photosState: PhotoState, deliveryId: string): boolean {
  const photos = photosState.uploaded[deliveryId];
  return !!(photos?.marchandiseUri && photos?.blUri);
}

export const {
  setPhotoUri,
  clearDeliveryPhotos,
  setUploadProgress,
  resetUploadProgress,
  resetPhotos,
} = photoSlice.actions;

export default photoSlice.reducer;
