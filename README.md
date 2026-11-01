# Ilmoria for Windows and macOS

The whole of Ilmoria in a window of its own. The app opens the school's Ilmoria
(`https://app.ilmoria.com`, or a school's own address) on the **same server and
the same accounts as the website**: whatever someone does in the app shows on
the website straight away, and the other way round.

What the app adds to the website:

- an opening animation while the site loads, and its own sign-in screen
- notifications for Connect messages and calls and for the bell (grades,
  announcements…), even with the window closed: it keeps running in the tray
  (Windows) or the Dock (macOS)
- the unread count on the taskbar button or the Dock icon
- calls with camera, microphone and screen sharing (with a screen/window picker)
- downloads to the Downloads folder, spell check, right-click menus
- starting with the computer, `ilmoria://` links, update checks
- its own settings on each computer (which messages notify, sound, muted chats…)
- English and Arabic, following the language chosen in Ilmoria

Demo schools, universities and demo accounts are **only** made on the website:
the app sends people there, and the server refuses those requests from the app.

## How it fits together

```
src/main/index.js     start-up, one copy only, ilmoria:// links
src/main/window.js    the main window and the windows it opens
src/main/session.js   permissions, screen picker, downloads, user agent
src/main/notify.js    notifications, unread badge, attention
src/main/tray.js      tray menu, start with the computer
src/main/menu.js      app menu
src/main/updates.js   update checks (the server's /desktop/latest.json)
src/main/setup.js     the school-address window
src/main/splash.js    the opening animation window
src/main/ipc.js       what the page may ask of the app
src/preload/app.js    window.ilmoriaDesktop, the page's bridge (school's address only)
src/pages/*.html      splash, offline, screen picker, school address
src/store.js          settings on this computer
src/strings.js        the app's own words in English and Arabic
```

The web side lives in the LMS: `lms/src/lib/desktop.ts` (the bridge's types),
`lms/src/pages/connect/DesktopSync.tsx` and `lms/src/components/desktop/*`.
In a browser none of it runs.

## Building

```bash
npm install
npm start                       # run it (ILMORIA_SERVER=http://localhost:8090 for a local copy)
npm run dist:win                # Windows installer (on Linux this needs wine with 32-bit support)
npm run dist:mac                # macOS .dmg and .zip (on a Mac)
npm run dist:mac-on-linux       # macOS .zip on Linux, signed ad hoc with rcodesign
npm run icons                   # redraw the icons from the brand mark
```

Raising "version" in package.json and pushing to the desktop repository runs
`.github/workflows/release.yml`, which builds Windows and macOS on GitHub's
machines and publishes the installers as a release. After a release, update
`lms/public/desktop/latest.json` (version and links): the app and the
download page (`/download`) read it.

## Signing (no warnings when installing)

Without signing, the installers work but warn the first time: Windows SmartScreen
("More info", then "Run anyway") and macOS Gatekeeper (Control-click, then "Open").
The warnings go away only when Microsoft and Apple can verify who made the app:

- **Windows, free:** publish through the **Microsoft Store**. Registration is free; the
  workflow already builds the Store package (MSIX, artifact "microsoft-store"). After
  reserving the name "Ilmoria" in Partner Center, set the repository variables
  `STORE_IDENTITY_NAME`, `STORE_PUBLISHER` and `STORE_PUBLISHER_NAME` from its Product
  identity page and upload the package there. Microsoft signs it; it installs and
  updates from the Store with no warning.
- **Windows, the downloaded .exe:** a code-signing certificate (OV, about $150–300 a
  year, key in a hardware token or a cloud signing service). The publisher then shows as
  Ilmoria; SmartScreen may still warn for a while until the installer earns reputation.
  Add it as `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` secrets.
- **macOS:** the Apple Developer Program ($99 a year) gives a "Developer ID Application"
  certificate and notarization. Add `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` as repository secrets: the workflow
  then signs and notarizes the Mac apps, and they open with no warning.
