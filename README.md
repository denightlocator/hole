# Sprout

On Windows 10/11 with Windows Package Manager (`winget`, part of App Installer), download just [start.bat](https://github.com/denightlocator/hole/raw/refs/heads/arena/e00e47c7-hole/start.bat) and double-click it. No Git client or manual extraction is needed. The launcher uses built-in Windows PowerShell to download the GitHub branch archive and install the app files under `%LOCALAPPDATA%\Sprout\desktop-v8`. Later starts reuse that copy offline. To refresh the app files, close Sprout, delete that desktop-v8 folder and run start.bat again. Allow the installation prompts. The launcher checks for Python and Ollama, installs missing tools, downloads Qwen2.5 1.5B (roughly 1 GB), then opens Sprout in its own native desktop window (Python + Tkinter). First setup requires internet and several GB of free disk space. Later launches reuse the model. Keep the launcher open while chatting. Close it to stop the web app; Ollama may remain running and can be quit separately.

Sprout generates replies on your PC using recent conversation and saved memories. Try “Remember my dog is named Maple”, then ask for a story about your dog. Memory grows through conversation; the model weights are not retrained. The memory bank and last 40 exchanges are stored in `%LOCALAPPDATA%\Sprout\journal.json`. Forgetting a note does not erase earlier conversation. Close Sprout and delete the journal for a full reset. Memories from the old browser version are not imported.

Optional research: check **Look up next message on Wikipedia** before sending a topic. Only that message is sent to English Wikipedia; the local model gets the matching article introduction. The checkbox resets after each send. No Google account, cloud AI or API key is needed. This is an encyclopedia lookup, not a general web search.

Other operating systems: install Python 3.8+ and Ollama, start Ollama, run `ollama pull qwen2.5:1.5b`, then `python3 desktop.py` with Tkinter installed.

## UI demos
Open `demos/index.html` directly to try Studio (conversation-first) and Console (developer workspace). These standalone design studies use sample replies and do not change the installed app or run commands.

Fenced code and text in replies appear as labeled panels. With auto-save enabled, each complete block in a new reply is written as a separate uniquely named file in `%LOCALAPPDATA%\Sprout\Files`; unknown languages become `.txt`. Sprout does not execute these files. Try “Make a packing checklist as a text file.”

Sprout Studio mirrors the dark IDE layout in a native window. Chat, the document workbench and Activity stay visible together. Switch the sidebar between Files and Memory. Select files to open individual numbered read-only previews in tabs; close a tab without deleting the file. Drag pane dividers to adjust the layout. Balanced, Coder, and Creative are response profiles of the same local Qwen model with different instructions and temperatures. Enter sends, Shift+Enter inserts a newline.

### Local training notebook
Click **Start training** to repeatedly generate short coding lessons using local Ollama. Each pass favors underrepresented topics and rereads up to two cards on its chosen topic and saves a Markdown file to Explorer. Safe session is on by default and stops training after 15 minutes, even during a request. Restart manually or uncheck it before starting for untimed sessions. Study notes and chat exports share a 100-file limit in Files; move files elsewhere to free space. Existing files are never removed to enforce the limit. Stop with **Stop training**, Escape, or by closing the app. Chat resumes after stopping. This is self-study, not model-weight training; notes are unverified and never executed.

**Activity:** Expand a Chat or Training row using its disclosure arrow to see timestamped actions. A moving bar indicates ongoing work, not a predicted percentage. Completed runs fold into a summary. Details are observable app events, not private model reasoning. Activity retains the latest 40 runs and 120 events per run during the session.

Study starts with short worked examples, then revisits topics through counterexamples, exercises and comparisons. Cards use a 220-token output budget with one second between passes. Chat retrieves up to two keyword-matched notebook cards and shows their filenames. This does not update model weights or verify the cards.
