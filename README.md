# TaskTape

A free Windows macro recorder in the spirit of TinyTask. Record keyboard and mouse input with its timing, then replay it at the original speed, faster, or slower. There are no subscriptions, accounts, ads, or runtime network requests.

## Download and run

1. On **Windows 10 or 11**, open [start.bat on GitHub](https://github.com/denightlocator/hole/blob/arena/c2f76d67-hole/start.bat) and click **Download raw file**. Save it as `start.bat`, not `start.bat.txt`.
2. Double-click `start.bat`. On the first run it downloads the TaskTape source from a fixed GitHub commit, checks the files against SHA-256 hashes, builds the app with the Windows .NET Framework compiler, and opens it. No admin access, Git, Python, or separate SDK is needed.
3. Run `start.bat` again to reopen the installed copy. After setup it works offline. The launcher uses Windows PowerShell and .NET Framework 4.8, which are included with current Windows 10/11 installations. A newer launcher can install a newer version alongside the old one. To remove the app, close it and delete `%LOCALAPPDATA%\TaskTape` and `start.bat`.

## Record and play

| Action | Shortcut or control |
| --- | --- |
| Start or stop recording | **F5** |
| Start or stop playback | **F4** |
| Emergency playback stop | **Esc** during playback |
| Change speed | **Speed**, from 0.25× to 5× or **Fastest** |
| Play more than once | Set **Repeats**, or use **Continuous** to loop until stopped |
| Save or reopen a macro | **Save…** and **Open…** using `.tasktape` files |
| Share a self-contained playback app | **Export EXE…**. It opens with the macro ready, but waits for you to press Play. |

Focus the window you want to automate, press **F5**, perform your task, then press **F5** again. Put the target back in the same position and state before pressing **F4**. Macros replay into the active desktop; they do not find buttons or windows by name. Mouse movement, clicks, drags, side buttons, and both scroll directions are captured. Use the same monitor layout and keyboard layout for best results.

- The toolbar buttons work if another program already uses one of the hotkeys. Some keyboards require holding **Fn** to send F4/F5.
- Recording happens only while the window says **Recording**. It captures what you type across windows, so avoid entering passwords or other sensitive information in a recording. Recordings and exported EXEs stay on disk locally unless you share them.
- TaskTape uses its own file format; it cannot open TinyTask `.rec` files. It cannot automate the Windows sign-in/UAC screen, and elevated windows or apps that block simulated input may not accept playback. Exports are unsigned, like the app itself.
- Each recording can contain up to one hour or 500,000 input events. Continuous playback has no fixed number of repeats.

## Development

Run `tests\windows.ps1` in **Windows PowerShell** to compile and test the C# sources with the same compiler as the launcher. Add `-SmokeWindow` to open the desktop app and a portable export, or `-TestLauncher` to verify the published launcher and its offline cache behavior. Build output is under `build\`.
