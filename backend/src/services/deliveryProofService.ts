/**
 * DeliveryProofService — AWS S3 Photo Upload
 * AGENT-BACKEND-API
 *
 * Responsibilities:
 *  - Upload proof photos to S3 (merchandise photo + stamped BL)
 *  - Generate signed URLs (24h expiry) for secure access
 *  - Store proof metadata in delivery_proofs table
 *  - Validate file types (JPEG/PNG only)
 *
 * See /docs/ARCHITECTURE.md § 3.4 for specification.
 */

import { env } from '../config/env';
import type { DeliveryProof, UpsertDeliveryProofInput } from '../../../shared/types';

// ── S3 key helpers ────────────────────────────────────────────────────────────

function buildS3Key(deliveryId: string, driverId: string, photoType: 'marchandise' | 'bl_tamonne'): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `proofs/${date}/${deliveryId}/${driverId}/${photoType}.jpg`;
}

// ── Allowed MIME types ────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

// ── S3 Client (lazy-initialized) ──────────────────────────────────────────────

interface S3Client {
  upload(params: {
    Bucket: string;
    Key: string;
    Body: Buffer;
    ContentType: string;
    ServerSideEncryption?: string;
  }): { promise(): Promise<{ Location: string }> };

  getSignedUrlPromise(operation: string, params: {
    Bucket: string;
    Key: string;
    Expires: number;
  }): Promise<string>;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AWS = require('aws-sdk') as {
      config: { update(config: object): void };
      S3: new () => S3Client;
    };

    AWS.config.update({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
    });

    s3Client = new AWS.S3();
    return s3Client;
  } catch (err) {
    throw new Error(`Failed to initialize S3 client: ${err}`);
  }
}

// ── Photo upload result ───────────────────────────────────────────────────────

export interface PhotoUploadResult {
  key: string;
  url: string;
  signed_url: string;
  size_bytes: number;
}

export interface DeliveryProofUploadResult {
  photo_marchandise?: PhotoUploadResult;
  photo_bl_tamonne?: PhotoUploadResult;
  delivery_proof_input: UpsertDeliveryProofInput;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class DeliveryProofService {
  /**
   * Upload one or both delivery proof photos to S3.
   * Returns signed URLs and metadata for DB storage.
   *
   * @param deliveryId         — UUID of the delivery
   * @param driverId           — UUID of the driver
   * @param photoMarchandise   — file buffer for merchandise photo (optional)
   * @param photoBLTamonne     — file buffer for stamped BL photo (optional)
   * @param mimeTypeMarchandise — MIME type of merchandise photo
   * @param mimeTypeBL          — MIME type of BL photo
   */
  async uploadProofPhotos(
    deliveryId: string,
    driverId: string,
    photos: {
      marchandise?: { buffer: Buffer; mimeType: string; size: number };
      bl_tamonne?: { buffer: Buffer; mimeType: string; size: number };
    },
  ): Promise<DeliveryProofUploadResult> {
    const result: DeliveryProofUploadResult = {
      delivery_proof_input: {
        delivery_id: deliveryId,
        driver_id: driverId,
      },
    };

    if (photos.marchandise) {
      this.validatePhoto(photos.marchandise.mimeType, photos.marchandise.size, 'photo_marchandise');
      const uploaded = await this.uploadToS3(
        photos.marchandise.buffer,
        buildS3Key(deliveryId, driverId, 'marchandise'),
        photos.marchandise.mimeType,
      );
      result.photo_marchandise = uploaded;
      result.delivery_proof_input.photo_marchandise_url = uploaded.signed_url;
    }

    if (photos.bl_tamonne) {
      this.validatePhoto(photos.bl_tamonne.mimeType, photos.bl_tamonne.size, 'photo_bl_tamonne');
      const uploaded = await this.uploadToS3(
        photos.bl_tamonne.buffer,
        buildS3Key(deliveryId, driverId, 'bl_tamonne'),
        photos.bl_tamonne.mimeType,
      );
      result.photo_bl_tamonne = uploaded;
      result.delivery_proof_input.photo_bl_tamonne_url = uploaded.signed_url;
    }

    return result;
  }

  /**
   * Generate a fresh signed URL for an existing S3 key.
   * Useful for refreshing expired URLs.
   */
  async getSignedUrl(s3Key: string): Promise<string> {
    const s3 = getS3Client();
    return s3.getSignedUrlPromise('getObject', {
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
      Expires: SIGNED_URL_EXPIRY_SECONDS,
    });
  }

  /**
   * Validate photo file type and size.
   * Throws Error if validation fails.
   */
  validatePhoto(mimeType: string, sizeBytes: number, fieldName: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `${fieldName}: invalid file type ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `${fieldName}: file size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds 10MB limit`,
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<PhotoUploadResult> {
    const s3 = getS3Client();

    const uploadResult = await s3.upload({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    }).promise();

    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Expires: SIGNED_URL_EXPIRY_SECONDS,
    });

    return {
      key,
      url: uploadResult.Location,
      signed_url: signedUrl,
      size_bytes: buffer.length,
    };
  }
}
