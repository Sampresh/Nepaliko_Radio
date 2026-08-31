/**
 * Seeds demo content for a client walkthrough: posts (News tab), extra links
 * (Connect → Find us) and extra promos (under the player).
 *
 * Usage:  node server/seed-demo.mjs /path/to/service-account.json
 *         node server/seed-demo.mjs /path/to/service-account.json --undo
 *
 * Document ids are deterministic and all prefixed `demo-`, so re-running
 * overwrites rather than duplicating, and `--undo` removes exactly what this
 * script created and nothing else. Pre-existing docs are never touched.
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const [, , keyPath, flag] = process.argv;
if (!keyPath) {
  console.error('usage: node server/seed-demo.mjs <service-account.json> [--undo]');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();

const hoursAgo = (h) => Timestamp.fromMillis(Date.now() - h * 3600_000);

/** News cards. Shape matches the `posts` rule's key allow-list exactly. */
const posts = {
  'demo-post-1': {
    title: 'Nepaliko Radio now streams 24/7 on 88.8 MHz',
    description:
      'Round-the-clock music, news and talk from Kathmandu. Tap through for our latest bulletin.',
    url: 'https://www.youtube.com/@NepalikoTV',
    source: 'youtube.com',
    isPublished: true,
    isPinned: false,
    publishedAt: hoursAgo(3),
  },
  'demo-post-2': {
    title: 'पोखराको नयाँ गन्तव्य: पञ्चमुखी गणेश, सारंकोट',
    description: 'सारंकोटमा भित्रिएको नयाँ पर्यटकीय गन्तव्यबारे हाम्रो रिपोर्ट।',
    url: 'https://www.youtube.com/@vlognepal',
    source: 'youtube.com',
    isPublished: true,
    isPinned: false,
    publishedAt: hoursAgo(28),
  },
  'demo-post-3': {
    title: 'Adhyatma TV joins the Nepaliko family',
    description: 'Devotional programming now streaming alongside our news and music channels.',
    url: 'https://www.youtube.com/@adhyatmatv',
    source: 'youtube.com',
    isPublished: true,
    isPinned: false,
    publishedAt: hoursAgo(76),
  },
};

/** Extra station links. The existing `Vlog Nepal` doc keeps order 0. */
const links = {
  'demo-link-nepalikotv': {
    label: 'Nepaliko TV',
    url: 'https://www.youtube.com/@NepalikoTV',
    icon: 'youtube',
    order: 1,
    isActive: true,
  },
  'demo-link-adhyatma': {
    label: 'Adhyatma TV',
    url: 'https://www.youtube.com/@adhyatmatv',
    icon: 'youtube',
    order: 2,
    isActive: true,
  },
};

/** Extra promo cards. The existing `New promo` doc keeps order 0. */
const promos = {
  'demo-promo-tv': {
    kind: 'youtubeChannel',
    title: 'Nepaliko TV',
    subtitle: 'Latest shows and bulletins',
    url: 'https://www.youtube.com/@NepalikoTV',
    platform: 'youtube',
    order: 1,
    isActive: true,
  },
  'demo-promo-vlog': {
    kind: 'youtubeChannel',
    title: 'Vlog Nepal',
    subtitle: 'Travel and culture across Nepal',
    url: 'https://www.youtube.com/@vlognepal',
    platform: 'youtube',
    order: 2,
    isActive: true,
  },
};

const collections = { posts, links, promos };
const undo = flag === '--undo';

for (const [name, docs] of Object.entries(collections)) {
  for (const [id, data] of Object.entries(docs)) {
    if (undo) {
      await db.collection(name).doc(id).delete();
      console.log(`deleted ${name}/${id}`);
    } else {
      await db.collection(name).doc(id).set(data);
      console.log(`wrote   ${name}/${id}`);
    }
  }
}
console.log(undo ? '\nDemo content removed.' : '\nDemo content seeded.');
process.exit(0);
