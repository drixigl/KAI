# Personal music app: audit and fix plan

Personal use only. Not for public release.

- **Base project:** OpenTune by justshivv, version 1.0.3 (commit `4f00de0`, 25 Oct 2026), GPL-3.0
- **Source:** https://github.com/justshivv/opentune
- **What it is:** an Android app (Kotlin, Jetpack Compose, Media3) that plays YouTube Music through YouTube's private "Innertube" API. The same repo also has an iOS app, a web player with a browser extension, a desktop app, a Wear OS app, a website, and the developer's own Cloudflare servers.
- **Audit date:** 29 Oct 2026

> Note: the `KAI` repo itself is the "Arul Boarding" hostel website (HTML/CSS/JS).
> It has no music code. The music app has to be brought into a repo first; see
> "Decisions needed" at the end.

---

## 1. Verdict

- **No malware found.** There are no ad, tracking or analytics SDKs: no Firebase, Google Analytics, Crashlytics, Sentry, AdMob or Facebook.
- **It is not "no data leaves my phone" as shipped.** The developer collects usage counts, controls the app remotely, and can push new audio servers and app updates to your phone. Several features also send what you listen to to third parties. All of this can be removed in our own build.
- **Main risk of "it breaks":** it depends on YouTube's private API. Google changes that API without warning. Nobody can promise it never breaks. We can make it recover quickly and keep downloads playing offline.

---

## 2. Privacy and data leaks (fix first)

| # | Problem | Where (upstream path) | Severity |
|---|---------|----------------------|----------|
| P1 | **Usage telemetry is on by default.** It sends a random install ID, the app version and daily play counts to the developer's Cloudflare Worker. The server address is downloaded from the developer's website, so it can change at any time. | `core/.../data/Usage.kt:26`, `data/settings/AppSettings.kt:413` (`countUsage = true`) | High |
| P2 | **Remote control by the developer.** A signed config from `addon-opentune.rethinknow.in` (a third-party domain) decides home sections, banners, featured playlists, links and **audio sources**. | `core/.../data/config/RemoteConfig.kt:98` | High |
| P3 | **The developer can push up to 20 "admin" audio servers to your phone.** The app checks every 10 minutes. These servers are on by default and their URLs are hidden in the UI. With lossless on, they receive the title and artist of what you play. | `data/addons/CommunityAddons.kt`, `data/addons/AddonStore.kt:58` | High |
| P4 | **Auto-update from the developer's GitHub** every 12 hours. On Android 12+ it installs without asking. The checksum comes from the same release, so it doesn't protect against a hacked release. If the checksum file is missing, it skips the check. | `data/UpdateCheck.kt:46`, `data/Updater.kt:74,151` | High |
| P5 | **Spotify extras are on by default once you connect Spotify** (Canvas, save likes, mixes). Every song you play is looked up on Spotify with your Spotify login cookie. | `AppSettings.kt:391-397`, `data/spotify/SpotifyWebPlayer.kt` | Medium |
| P6 | **Lyrics lookups go to up to about 12 third-party servers.** Many are hobby hosts (workers.dev, vercel.app, my.id), and each one sees the title and artist. | `data/lyrics/LyricsPlus.kt:37` and other lyrics providers | Medium |
| P7 | Listen Together uses 8 public Nostr relays. Messages are encrypted, but the relays see your IP address and when you send. | `data/together/Together.kt:37` | Low (only when used) |
| P8 | Name-that-song sends a sound fingerprint to Shazam. Live radio sends your approximate location to radio-browser. | `data/recognize`, `data/radio` | Low (only when used) |
| P9 | Account approval link for the developer's web add-on server (an exported `opentune://addon-approve` activity). Not needed. | `app/.../AddonApprovalActivity.kt` | Low |

Already done well, so we keep it: SponsorBlock uses hash-prefix lookups. Login cookies are excluded from Android backups. Last.fm and ListenBrainz are opt-in. The TV sign-in uses one-time AES-GCM over the local network.

## 3. Security

| # | Problem | Where | Severity |
|---|---------|-------|----------|
| S1 | **Release builds fall back to the debug signing key** when no key is set. We must sign with your own private key, kept as a GitHub secret. | `app/build.gradle.kts:28-31,59` | High |
| S2 | **Login cookies are stored unencrypted.** YouTube, Last.fm, Subsonic and ListenBrainz sessions sit in plain SharedPreferences. They should be encrypted with the Android Keystore. | `data/account/AccountStore.kt` | Medium |
| S3 | **Plain HTTP is allowed app-wide** (to support home music servers). It should be limited to local-network servers only. | `app/src/main/res/xml/network_security_config.xml` | Medium |
| S4 | **No dependency checksum verification.** Core libraries (InnerTubeX, NewPipeExtractor) come from JitPack, which rebuilds from GitHub tags, so the code behind a tag can change. We should add `gradle/verification-metadata.xml`. | `settings.gradle.kts`, `core/build.gradle.kts:64,104` | Medium |
| S5 | GitHub Actions are pinned to tags, not commit hashes. | `.github/workflows/*.yml` | Low |
| S6 | Any app on the phone can control playback and browse your library and history through the media session. This is common for music apps, but it can be limited to the system, Bluetooth and Android Auto. | `playback/PlaybackService.kt:606` | Low |
| S7 | The Exportify WebView gives a JavaScript bridge to any page it opens, including plain-HTTP pages. | `ui/spotify/ExportifyActivity.kt:160` | Low |

## 4. Stability ("make sure it never breaks")

| # | Problem | Where | Severity |
|---|---------|-------|----------|
| B1 | **It depends on YouTube's private API** and on YouTube's anti-bot tokens (PoToken, run in a WebView). When Google changes these, playback fails until it's patched. It has 3 stream engines with automatic fallback, which helps, but nothing can fully prevent this. | `data/innertube/*`, `potoken/*` | High (can't be fully removed) |
| B2 | **Very young code that changes very fast:** about 450 commits in about 3 weeks (7–25 Oct 2026), now at v1.0.3. Few people have tested it (13 issues in total). | git history | High |
| B3 | **Very large files are hard to change safely:** `PlaybackService.kt` has 2,484 lines, `StreamResolver.kt` 2,029, `PlayerScreen.kt` 1,710, `SettingsScreen.kt` 1,526. | see paths | Medium |
| B4 | **Uses preview or alpha parts:** compileSdk 37 with an "unsupported" override, and `backdrop:2.0.0-alpha03` for Liquid Glass. | `gradle.properties`, `app/build.gradle.kts` | Medium |
| B5 | Lossless fails with HTTP 429 (open upstream issue #31) because a shared public server gets rate-limited. | upstream issue #31 | Medium |
| B6 | A network call can run while holding a lock, which can stall playback threads for up to the timeout. | `data/lossless/ExternalStreams.kt:400` | Low |
| B7 | Signing in with your main Google account in an unofficial app could get the account flagged. Use a second Google account, or don't sign in. | — | Advice |

## 5. Not checked yet (be aware)

- **Not compiled or run yet.** This cloud session can't download the Android SDK (Google's download server and JitPack are blocked here). The first build will run on GitHub Actions in your own repo, and that build also checks for compile errors.
- **Not every line was read.** About 83,000 lines of Android code. I reviewed the network, storage, permissions, updater, sign-in, WebView and playback paths, which is where leaks and malware would show up.

---

## 6. Fix plan

### Phase 0: Safe base (your own build)
1. Bring OpenTune v1.0.3 into your repo, pinned to commit `4f00de0`.
2. Delete what you don't use: iOS, web player and extension, desktop, Wear OS, website, usage dashboard, lossless server, and possibly Android TV. Less code means less to break and less to audit.
3. Give it its own app ID and name, so it can never be confused with or overwritten by upstream OpenTune.
4. Add a GitHub Actions build that signs the APK with **your** key, stored as a GitHub secret. You download the APK from your own repo. No third-party APKs.

### Phase 1: No data leaks
1. Remove usage telemetry entirely (P1).
2. Remove remote config and the developer's add-on servers (P2, P3, P9).
3. Turn off auto-update, or point it at your own repo and only update when you tap (P4).
4. Make every third-party feature opt-in: Spotify, extra lyrics servers, radio, Shazam, Listen Together (P5–P8). Keep LRCLIB as the default lyrics source.
5. Encrypt stored logins (S2), limit HTTP to your local network (S3), require your own signing key (S1).
6. Add dependency checksum verification, pin Actions to commit hashes, limit media controllers (S4–S7).
7. Add a "Network activity" page that lists every server the app contacted, so you can check for yourself.

### Phase 2: Never breaks (as close as possible)
1. Every change runs unit tests and lint in CI. A red build never reaches your phone.
2. Keep the 3-engine stream fallback. Add a "playback health check" button that tests stream resolution and reports which engine works.
3. Downloads as a safety net: songs you download keep playing even when YouTube changes something.
4. Take upstream fixes only after reviewing them (mainly stream-engine fixes), never everything at once.
5. Replace the alpha libraries with stable ones, and fix the lock issue (B4, B6).
6. Keep crash logs on the phone only, with a one-tap export when you want to send me one.

### Phase 3: Your own UI
A new name, icon, colours and layout. You choose the direction: a Spotify-style dark green look or an Apple Music-style red and white look, or your own colours.

### Phase 4: More features (suggestions not in the app yet)
- **Private listening mode:** nothing goes into history or recommendations
- **App lock** with fingerprint or face
- **Smart playlists:** auto-built from rules such as "most played this month" or "liked, not played in 30 days"
- **Backup to a file:** export library, playlists and settings to one file you keep yourself
- **Tag editor** for your local music files
- Anything else you want

---

## 7. Decisions needed before building

1. **Where should the app code go?** (a) Replace the hostel website in `drixigl/KAI`, (b) put it in a folder inside `KAI` next to the website, or (c) a new private repo just for the music app (recommended).
2. **App name?** (for example "KAI Music")
3. **Which extras to keep?** Android TV, Listen Together, Name-that-song, Live radio, Podcasts, Spotify import or Canvas, Lossless add-ons.
4. **YouTube Music sign-in:** keep it (use a second Google account), or no sign-in at all.
5. **Look:** Spotify-style, Apple Music-style, or your own colours.
