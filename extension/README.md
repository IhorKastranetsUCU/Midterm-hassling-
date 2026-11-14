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

* **Zero passwords or `MoodleSession` cookies leave Chrome.** Extraction runs inside your already-authenticated browser tab and sends only non-exam course materials via `POST /api/sync/extension`.
* **Fail-closed Quiz Shield**: Graded/timed quizzes are automatically filtered out and never ingested into AI storage.
