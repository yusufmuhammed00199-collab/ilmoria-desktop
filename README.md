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

## Signing

Without certificates the installers work, with a warning the first time:
Windows SmartScreen ("More info", then "Run anyway") and macOS Gatekeeper
(Control-click the app, then "Open"). To remove the warnings, add an Apple
Developer ID certificate (and notarization) and a Windows code-signing
certificate as repository secrets; the workflow lists their names.
