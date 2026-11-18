# Sprout

On Windows 10/11 with Windows Package Manager (`winget`, part of App Installer), extract the whole project and double-click **start.bat**. Allow the installation prompts. The launcher checks for Python and Ollama, installs missing tools, downloads Qwen2.5 1.5B (roughly 1 GB), then opens Sprout in your browser. First setup requires internet and several GB of free disk space. Later launches reuse the model. Keep the launcher open while chatting. Close it to stop the web app; Ollama may remain running and can be quit separately.

Sprout generates replies on your PC using recent conversation and saved memories. Try “Remember my dog is named Maple”, then ask for a story about your dog. Memory grows through conversation; the model weights are not retrained. The memory bank and last 40 exchanges live in this browser at the launcher address. × forgets a saved fact but does not erase earlier conversation. Clear site data for a full reset.

Optional research: check **Look up next message on Wikipedia** before sending a topic. Only that message is sent to English Wikipedia; the local model gets the matching article introduction. The checkbox resets after each send. No Google account, cloud AI or API key is needed. This is an encyclopedia lookup, not a general web search.

Other operating systems: install Python 3.8+ and Ollama, start Ollama, run `ollama pull qwen2.5:1.5b`, then `python3 server.py`. Open the launcher address, not `index.html` directly.
