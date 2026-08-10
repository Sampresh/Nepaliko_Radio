import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  const snapshot = await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(snapshot.ref);
}
