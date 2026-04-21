
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export type FileUploadFeature = 'STORY_THUMBNAIL' | 'STORY_MEDIA' | 'GENERAL';

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm'];

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
];
const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

const MALICIOUS_SIGNATURES = [
  '<?php',
  '<?=',
  '#!/bin/bash',
  '#!/usr/bin/env',
  '<script',
  'eval(',
  'base64_decode',
  'system(',
  'passthru(',
  'exec(',
];

/**
 * Validates a file based on the rules in the security documentation.
 */
export async function validateFileUpload(
  file: File,
  feature: FileUploadFeature = 'GENERAL',
  maxSizeInBytes: number = 10 * 1024 * 1024 // Default 10MB
): Promise<ValidationResult> {
  // 1. Size Check
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      message: 'Upload size exceeds the maximum allowed limit',
    };
  }

  // 2. Extension Check
  const fileName = file.name;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      isValid: false,
      message: 'File must have an extension',
    };
  }

  const extension = fileName.substring(lastDotIndex + 1).toLowerCase();
  
  let allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
  let allowedMimeTypes = ALLOWED_IMAGE_MIME_TYPES;

  if (feature === 'STORY_MEDIA') {
    allowedExtensions = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];
    allowedMimeTypes = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES];
  }

  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      message: feature === 'STORY_MEDIA' 
        ? 'Invalid file type. Only images and videos are allowed.' 
        : 'Invalid file type. Only images are allowed.',
    };
  }

  // 3. MIME-Type Verification
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      message: feature === 'STORY_MEDIA'
        ? 'Invalid file type. Only images and videos are allowed.'
        : 'Invalid file type. Only images are allowed.',
    };
  }

  // 4. Script Scanning
  try {
    const text = await readFileHeadAsText(file);
    for (const signature of MALICIOUS_SIGNATURES) {
      if (text.includes(signature)) {
        return {
          isValid: false,
          message: `File contains potentially malicious content: ${signature}`,
        };
      }
    }
  } catch {
    // If reading fails, it might be a binary file that's not readable as text,
    // which is fine for images/videos, but we should still try to catch what we can.
  }

  // 5. Integrity Check (for images)
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    const isImageValid = await checkImageIntegrity(file);
    if (!isImageValid) {
      return {
        isValid: false,
        message: 'Invalid image file or corrupted content',
      };
    }
  }

  return { isValid: true };
}

/**
 * Reads the beginning of a file as text to scan for signatures.
 */
async function readFileHeadAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Read only the first 10KB to find signatures in the header/first 200 lines
    const blob = file.slice(0, 10 * 1024);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/**
 * Verifies that an image file is not corrupted.
 */
async function checkImageIntegrity(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}
