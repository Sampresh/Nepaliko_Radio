import type { VercelRequest, VercelResponse } from '@vercel/node';

import { adminAuth, db } from './admin';

/** Codes the admin panel branches on, rather than matching prose. */
export type ErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'internal';

const STATUS: Record<ErrorCode, number> = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'resource-exhausted': 429,
  internal: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wraps the handler with everything every request needs.
 *
 * Anything that is not an `ApiError` is logged and replaced with a generic
 * message: an unexpected throw carries stack detail and internal identifiers,
 * and this endpoint faces the public internet.
 */
export function handler<T>(
  fn: (body: Record<string, unknown>, request: VercelRequest) => Promise<T>
) {
  return async (request: VercelRequest, response: VercelResponse) => {
    // The caller is the admin panel in a browser, so the preflight is real —
    // a blocked one fails with no usable error in the console.
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: { code: 'invalid-argument', message: 'Use POST.' } });
      return;
    }

    try {
      const result = await fn(parseBody(request), request);
      response.status(200).json(result ?? {});
    } catch (error) {
      if (error instanceof ApiError) {
        response
          .status(STATUS[error.code])
          .json({ error: { code: error.code, message: error.message } });
        return;
      }

      console.error('Unhandled error in send-notification', error);
      response.status(500).json({
        error: { code: 'internal', message: 'Something went wrong. Please try again.' },
      });
    }
  };
}

/** Vercel parses JSON only when the content type says so; a bare string lands here. */
function parseBody(request: VercelRequest): Record<string, unknown> {
  const { body } = request;
  if (!body) return {};

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new ApiError('invalid-argument', 'Expected a JSON body.');
    }
  }

  return body as Record<string, unknown>;
}

export interface Caller {
  uid: string;
  email: string;
}

/**
 * Establishes who is calling, and that they are an admin.
 *
 * Both halves matter and neither is optional. The token is verified rather than
 * trusted, so the uid cannot be asserted in the body; and admin membership is
 * read from Firestore on every call, so revoking someone by deleting their
 * `admins` row takes effect immediately rather than whenever their token
 * happens to expire.
 */
export async function requireAdmin(request: VercelRequest): Promise<Caller> {
  const header = request.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new ApiError('unauthenticated', 'Sign in required.');

  let uid: string;
  let email: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? '';
  } catch {
    throw new ApiError('unauthenticated', 'Your session has expired. Sign in again.');
  }

  const admin = await db.doc(`admins/${uid}`).get();
  if (!admin.exists) throw new ApiError('permission-denied', 'Admins only.');

  return { uid, email };
}
