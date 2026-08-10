import { z } from 'zod';

/**
 * Mirrors the `requests` create rule in firestore.rules exactly. The rule is
 * the real enforcement; this exists so the user sees the error before the
 * round trip, and so the Cloud Function can reuse one definition.
 */
export const requestSchema = z.object({
  type: z.enum(['song', 'shoutout', 'feedback']),
  name: z
    .string()
    .trim()
    .min(1, 'Please tell us your name')
    .max(60, 'Name must be 60 characters or fewer'),
  message: z
    .string()
    .trim()
    .min(1, 'Please write a message')
    .max(500, 'Message must be 500 characters or fewer'),
  contact: z
    .string()
    .trim()
    .max(120, 'Contact must be 120 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export type RequestInput = z.infer<typeof requestSchema>;

export const REQUEST_TYPES: { value: RequestInput['type']; label: string }[] = [
  { value: 'song', label: 'Song request' },
  { value: 'shoutout', label: 'Shout-out' },
  { value: 'feedback', label: 'Feedback' },
];

export const MESSAGE_MAX = 500;
export const NAME_MAX = 60;
