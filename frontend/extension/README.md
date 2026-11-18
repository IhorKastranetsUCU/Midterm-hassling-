# 🧩 Universal LMS AI Workspace Sync (Chrome / Edge Extension)

Sync courses from **any Moodle LMS** (`learn.ucu.edu.ua`, `e-learning.lnu.edu.ua`, `vns.lpnu.ua`, `dl.nure.ua`, `do.ipo.kpi.ua`, etc.) directly into your **AI Course Workspace** without copying F12 session cookies or sharing passwords.

## Quick Install (30 Seconds)

1. Start the Web Portal locally (`python run.py`) — running at `http://127.0.0.1:8000`.
2. Open Google Chrome or Microsoft Edge and navigate to:
   * Chrome: `chrome://extensions`
   * Edge: `edge://extensions`
3. Toggle **Developer mode** ON (top-right).
4. Click **Load unpacked** and select this `extension/` folder.
5. Open any Moodle course page (`.../course/view.php?id=...`) where you are already logged in:
   * Either click the floating **⚡ Sync to AI Workspace** button in the bottom-right corner, OR
   * Click the extension icon in your toolbar, toggle your desired tools (`Interactive Book`, `Mermaid Diagrams`, `Practice Quizzes`, `Flashcards`, `Exam Mix`), and press **⚡ Sync & Open Workspace**.

## Security & Academic Integrity

* **No manual token copying.** After you explicitly connect a supported university on the Hustle website, the extension sends its MoodleSession cookie to that Hustle server through `/api/auth/extension-pair`. The server retains the session in an HttpOnly signed JWT cookie (signed, not encrypted). Course material extraction uses `/api/sync/extension`; Moodle passwords are not requested by the extension.
* **Fail-closed Quiz Shield**: Graded/timed quizzes are automatically filtered out and never ingested into AI storage.

## Hustle installation flow (v1.1)

Open `/hustle/connect.html`. Download the ZIP, unpack it, and load its `Hustle` folder at `chrome://extensions` with Developer mode enabled. The website detects the extension; if necessary, reload the page. Choose the university and click Connect. No portal URL or token needs to be copied.

Automatic session pairing is restricted to the university/portal pair explicitly selected on the Hustle website. The bridge only runs on packaged portal origins, exposes no session credentials to web pages, and checks the sender again in the service worker. Sync resolves the current workspace only after Moodle pairing. Synced courses open `/hustle/app.html#course/…`.

Download package endpoint: `/api/hustle/extension.zip`. Server setting `HUSTLE_PUBLIC_ORIGIN` controls the portal origin included in the package; request Host headers do not. A deployed origin must use HTTPS. To replace ZIP installation with the published listing, configure `HUSTLE_EXTENSION_STORE_URL`. Publishing and Chrome review are separate; no listing has been published by this change. ZIP/unpacked installations require manual updates; Store installations support automatic updates.
