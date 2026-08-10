# Store listing copy

Draft copy for the App Store and Google Play. Both stores reject listings that
promise features the build does not have — keep this in sync with what ships.

---

## App name

- **Primary:** Nepaliko Radio
- **Subtitle (iOS, 30 char max):** `88.8 MHz FM Kathmandu` (21)
- **Short description (Play, 80 char max):** `Live Nepali radio from Kathmandu — news, shows and your song requests.` (69)

## Full description (English)

> Nepaliko Radio brings 88.8 MHz FM Kathmandu to your phone, wherever you are.
>
> Tap once and you are listening. The stream keeps playing when you lock your
> phone or switch apps, with full controls on your lock screen.
>
> **Listen live**
> One tap to start. Background playback, lock-screen controls and a sleep timer
> for late-night listening.
>
> **Know what is on**
> See which show is on air right now and who is presenting it. Browse the full
> weekly schedule — always shown in Kathmandu time, so listeners abroad never
> have to do the maths.
>
> **Station news**
> Announcements, event news and updates, published by the station team.
>
> **Talk to the studio**
> Send a song request, a shout-out to someone you love, or feedback — straight
> to the presenters.
>
> No ads. No account needed. Just the station.

## Full description (नेपाली)

> नेपालीको रेडियो ८८.८ मेगाहर्ज एफएम काठमाडौंलाई तपाईंको मोबाइलमा ल्याउँछ।
>
> एक पटक थिच्नुहोस्, सुन्न सुरु हुन्छ। फोन लक गर्दा वा अर्को एप चलाउँदा पनि
> रेडियो बज्दै रहन्छ।
>
> **प्रत्यक्ष सुन्नुहोस्** — ब्याकग्राउन्ड प्लेब्याक, लक स्क्रिन कन्ट्रोल र
> स्लिप टाइमर।
>
> **कार्यक्रम तालिका** — अहिले कुन कार्यक्रम चलिरहेको छ र को आरजे हुनुहुन्छ
> हेर्नुहोस्। सबै समय नेपाली समयमा।
>
> **स्टेसन समाचार** — स्टेसनका घोषणा र अपडेटहरू।
>
> **स्टुडियोसँग कुरा गर्नुहोस्** — गीतको अनुरोध, शुभकामना सन्देश वा सुझाव
> सिधै प्रस्तुतकर्तालाई पठाउनुहोस्।
>
> विज्ञापन छैन। खाता खोल्नु पर्दैन।

## Keywords (iOS, 100 char max, comma-separated)

`nepali,radio,fm,kathmandu,nepal,live,music,news,streaming,88.8,online radio,nepali fm` (84)

## Category

- **iOS:** Music (secondary: News)
- **Play:** Music & Audio

## Content rating

Everyone / 4+. No objectionable content. Note in the questionnaire that the app
contains **user-generated content submitted privately to the station** (requests
are not shown to other users) and that it is **moderated** by staff and an
automated filter.

## Screenshots to capture

Required sizes: iPhone 6.9" and 6.5"; Android phone. Capture in dark mode.

1. **Listen — playing.** Logo, ON AIR card with a real show, waveform active.
2. **Schedule.** A weekday with several shows, one marked ON AIR.
3. **News feed.** Three or four real posts with cover images.
4. **Post detail.** A real article, showing Nepali text rendering.
5. **Connect.** The request form with the type selector visible.

Caption each with a short benefit line rather than a feature name — "Listen with
your screen off" reads better than "Background playback".

## Data safety / privacy answers

Both stores ask what you collect. The honest answers for this build:

| Question | Answer |
|---|---|
| Collects personal info? | Yes — only if the user sends a message (name, message, optional contact) |
| Linked to identity? | No — there are no accounts |
| Used for tracking? | No |
| Location | Not collected |
| Contacts / photos / files | Not collected |
| Microphone | Not used, no permission requested |
| Advertising ID | Not used |
| Data deletion route | Email request, documented in the privacy policy |

Privacy policy URL must be live before submission — see `docs/privacy-policy.md`.

## Pre-submission checklist

- [ ] Stream URL is HTTPS and confirmed working on cellular data
- [ ] `config/radio` populated, `isLive: true`
- [ ] At least 3 published posts and a full week of shows, so screenshots are real
- [ ] Privacy policy hosted at a public URL
- [ ] App icon and splash finalised
- [ ] Apple Developer account active ($99/yr — enrol early, verification takes days)
- [ ] Google Play Developer account active ($25 one-time)
- [ ] TestFlight build tested on a real iPhone with the screen locked
- [ ] Play internal testing build tested on a real Android device
- [ ] Background audio survives 30+ minutes with the screen off on both platforms
