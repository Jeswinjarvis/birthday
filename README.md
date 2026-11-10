# A birthday surprise for Jithin, from his wife

A romantic birthday website for 12 November, in warm ivory, burgundy, rose, and gold. All six supplied photographs are included. No installation or build step is needed.

## Open the website

Double-click `index.html`, or run `npm start` in this folder and open http://localhost:4173. The local server provides the best experience for optional microphone access. Stop it with Ctrl+C. Use `PORT=4174 npm start` if port 4173 is busy.

## The experience

1. **For you:** A birthday introduction from his wife, with a “Let’s celebrate” button.
2. **A wish:** Tap the candle or use the optional microphone. The photos appear automatically about two seconds after the candle goes out. “Our sweet moments” advances immediately; “Make another wish” cancels the automatic transition and relights the candle.
3. **Our moments:** Six Polaroid-style cards in a stack. They first shuffle through all photos quickly at 0.4 seconds each, then slow down to showcase each photo every 2 seconds in alternating swipe directions. Previous/next arrows, horizontal swipes, and keyboard arrows also work. Tap the front photo to see the full image. Pause/play is available; autoplay is off by default for reduced-motion users and pauses while a dialog is open or the tab is hidden.
4. **My heart:** An envelope opens a romantic letter. Continue to the gift from the letter or its chapter screen.
5. **Your gift:** Nine illustrated gift boxes. Every box reveals the same gift: a men’s wallet. The first choice immediately disables all boxes and reveals the wallet message. The other eight remain closed.

The chapter navigation only enables chapters already reached. Returning to the beginning does not reset the chosen gift.

## Personalize

Edit `content.js` for the background song path (placed in the `Song` folder), gift image, the wife’s letter, signature, photo captions, and ordering. The romantic text is an editable draft. Colors and layout are in `styles.css`; headings are in `index.html`.

## Gift choice storage

The selected box is remembered using localStorage under `jithin-birthday-2026-gift-choice`. Reloading on the same browser and origin keeps the other boxes locked. Clearing browser storage or using another browser/origin allows a fresh choice. If browser storage is unavailable, the selection remains locked for the current page session. This is a personal surprise, not a secure competition or server-enforced single-use claim.

For a fresh owner test, use a private browser session. The finished gift choice has no recipient-facing reset button.

## Sound and microphone

Background music plays the song saved in the `Song/` folder (with synthesized audio as a fallback). Music can be toggled on or off at any time using the sound control in the header, or begins when clicking “Let’s celebrate”. Microphone audio is analyzed on-device, never recorded or uploaded. If microphone mode is chosen to blow out the candle, background music temporarily pauses to avoid audio interference, and resumes automatically once the candle is blown or microphone mode stops. Access ends on cancellation, after blowing, after twenty seconds, when changing chapters, or when leaving the tab. Microphone mode requires localhost or HTTPS and browser permission. Tapping the candle always works without it.

## Technical notes

The site works as static HTML/CSS/JavaScript. DM Sans is loaded from Google Fonts with system-font fallbacks. There are no external JavaScript libraries. `npm run check` verifies syntax.

To publish later, upload `index.html`, `styles.css`, `app.js`, `content.js`, `assets/`, and `Song/` to a static host. The site includes personal photographs and has no password protection. It is currently a local project.
