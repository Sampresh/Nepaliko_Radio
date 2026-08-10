# Setup — what only you can do

The code is written. These steps need your accounts, credentials or the
station's assets, so they cannot be done from the repo.

Ordered by what unblocks the most.

---

## 1. Firebase — required before anything renders

**Firestore has never been enabled on this project.** As of the last check the
REST API answers:

```
403 — Cloud Firestore API has not been used in project nepaliko-radio
      before or it is disabled
```

Until this is done, nothing server-backed works: listener requests go nowhere,
the admin panel cannot read or write, and the app runs on the bundled
`DEFAULT_RADIO_CONFIG`. Create the database first:

Firebase Console → **Firestore Database** → *Create database* → **Production
mode**, location **`asia-south1` (Mumbai)**.

> The location is permanent and cannot be changed later. `asia-south1` is the
> closest region to Nepal and matches the `REGION` the Cloud Functions already
> target — picking a US default here would add ~200ms to every read forever.

Then deploy the rules and functions:

```bash
npm install -g firebase-tools     # if not installed
firebase login
firebase use --add                # pick the nepaliko-radio project
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions  # moderateRequest — needs the Blaze plan
```

`moderateRequest` is what rate-limits and profanity-screens listener requests.
Without it the Connect form still writes to `requests` and you still see the
messages, but the only throttle is the client-side one, which a determined user
can clear.

Then in the Firebase Console → Firestore, create the config document by hand:

- Collection `config` → **Document ID `radio`** (type it, do not use auto-ID)

| Field | Type | Value |
|---|---|---|
| `streamUrl` | string | the station's HTTPS stream |
| `stationName` | string | `Nepaliko Radio` |
| `tagline` | string | `88.8 MHz FM · Kathmandu` |
| `isLive` | boolean | `true` |

Optional: `backupStreamUrl`, `logoUrl`, `offlineMessage`, `minAppVersion`.

## 2. Make yourself an admin

Firestore → collection `admins` → **Document ID = your Firebase Auth UID**
(Authentication tab → create a user with email/password first, then copy its UID).

| Field | Type | Value |
|---|---|---|
| `email` | string | your email |
| `role` | string | `owner` |

`admins` is deliberately not writable from any client — the Console is the only
way in. That is the security model, not an oversight.

## 3. The stream URL

**This is the one blocker on shipping.** Ask the station for:

- the stream URL, and whether **HTTPS** is available
- bitrate and format (MP3/AAC)
- whether a backup/failover stream exists
- the concurrent listener cap

The live stream is `http://streaming.webhostnepal.com:9888/` — a SHOUTcast 1.9.8
mount serving MPEG-1 Layer III at 48 kbps / 44.1 kHz. The root path is the audio
itself; there is no `/stream` or `/;` mount to append.

It has no TLS on that port, so cleartext is exempted per-domain in `app.json`:
`ios.infoPlist.NSAppTransportSecurity.NSExceptionDomains` and
`expo-build-properties` → `android.usesCleartextTraffic`. Both are required —
without them playback fails silently on device. Note that the ATS exception must
be justified at App Store review; getting the station an `https` mount removes
both entries and that review question. Verify the exemptions survive a config
change with `npx expo config --type introspect`.

The visualiser rides real PCM. On iOS that is a tap on the player and costs
nothing; on Android `expo-audio` implements it with the system Visualizer
effect, so `recordAudioAndroid: true` puts **RECORD_AUDIO** in the manifest and
the app asks for the microphone at first play. That needs a Play Store
data-safety declaration — the honest wording is that audio is analysed on-device
for visualisation only and never recorded, stored, or transmitted. Deny is
handled: the bars fall back to a synthetic loop, so nothing breaks.

Every field is overridable from `config/radio` at runtime.
`src/config/station.ts` holds `DEFAULT_RADIO_CONFIG`, which ships in the binary
and is used only until Firestore answers (or permanently, if the project is
never provisioned) — so a fresh install plays even on first launch offline.

## 4. EAS

```bash
npm install -g eas-cli
eas login
eas init            # writes extra.eas.projectId into app.json
```

Push notifications will not register until `eas init` has run — the token
request needs that project id.

```bash
eas build --profile development --platform all   # dev client
eas build --profile production --platform ios
```

## 5. Push notifications

- **iOS:** upload an APNs key in the Apple Developer portal, then
  `eas credentials` to attach it.
- **Android:** create an FCM V1 service account key in the Firebase Console and
  upload it via `eas credentials`. A standalone Android build also needs
  `google-services.json` referenced from `app.json` as
  `android.googleServicesFile`.

## 6. Admin panel

```bash
cd admin && npm install && npm run build
cd .. && firebase deploy --only hosting
```

## 7. Cloud Functions — needs the Blaze plan

Cloud Functions require pay-as-you-go. At this app's volume the cost is
effectively zero, but a card must be on file.

```bash
cd functions && npm install
cd .. && firebase deploy --only functions
```

Deploys `moderateRequest` (server-side rate limit + profanity filter) and
`sendPush` (admin-only push fan-out).

## 8. Sentry (optional)

Create a project, then set the DSN as an EAS secret:

```bash
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://…"
```

Unset, Sentry stays disabled — the app does not crash without it.

## 9. Store accounts — enrol early

- Apple Developer Program — $99/yr, verification can take several days
- Google Play Developer — $25 one-time

Privacy policy must be live at a public URL before either submission. Draft is in
`docs/privacy-policy.md`; fill in the `[…]` placeholders.

---

## Known gaps

These are deliberately not built, with reasons:

- **App Check on mobile.** The Firebase JS SDK's App Check providers are
  web-oriented (reCAPTCHA); DeviceCheck and Play Integrity attestation need the
  native `@react-native-firebase/app-check` module, which would reintroduce a
  second Firebase SDK alongside the JS one. Worth doing before launch — verify
  the current provider support first. Until then, abuse protection rests on the
  Firestore rules and the `moderateRequest` function, both of which are live.
- **Nepali UI localisation.** Post and show *content* renders in Devanagari
  correctly (Noto Sans Devanagari is bundled and `AppText lang="np"` selects it).
  The app's own chrome — "Listen", "Connect", button labels — is still English
  only. Needs a string table and a language toggle in Settings.
- **Maestro E2E flows.** Not written. The unit tests cover the schedule and
  validation logic, which is where the real edge cases live.
- **App icon and splash.** Still the Expo template art. Needs the station logo
  as SVG or high-res PNG.
