import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Turns a Firebase Storage error into something the operator can act on.
 *
 * The raw messages are unhelpful at exactly the moments they matter — a project
 * with no Storage bucket and one with a rules problem both surface as opaque
 * failures, and the fix for each is completely different.
 */
function describeUploadError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';

  switch (code) {
    case 'storage/unauthorized':
      return 'Storage rejected the upload. Deploy the storage rules (firebase deploy --only storage) and check your account is in the admins collection.';
    case 'storage/unauthenticated':
      return 'Your session expired. Sign out and back in, then try again.';
    case 'storage/retry-limit-exceeded':
    case 'storage/canceled':
      return 'Upload timed out. Check your connection and try again.';
    case 'storage/quota-exceeded':
      return 'The project has exceeded its Storage quota.';
    case 'storage/unknown':
    case 'storage/object-not-found':
      return 'Could not reach Firebase Storage. If you have never used it on this project, open the Firebase console → Storage → Get started, then deploy the storage rules.';
    default:
      return error instanceof Error ? error.message : 'Upload failed.';
  }
}

/**
 * Uploads an image to Storage and returns its public URL.
 * The same limits are enforced in storage.rules — this is only fast feedback.
 */
export async function uploadImage(file: File, folder: 'posts' | 'promos' | 'station'): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP or GIF images are allowed.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Images must be 5 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  try {
    const snapshot = await uploadBytes(ref(storage, path), file, { contentType: file.type });
    return getDownloadURL(snapshot.ref);
  } catch (error) {
    throw new Error(describeUploadError(error));
  }
}
