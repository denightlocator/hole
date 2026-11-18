using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

namespace TaskTape
{
    internal sealed class CaptureBuffer
    {
        private readonly List<RecordedInput> _events = new List<RecordedInput>();
        private readonly HashSet<int> _keys = new HashSet<int>();
        private int _mouseButtons;

        internal int Count { get { return _events.Count; } }
        internal bool Full { get { return Count >= Macro.MaxEvents; } }

        internal void Add(RecordedInput input)
        {
            if (Full || !input.IsValid()) return;
            switch (input.Kind)
            {
                case InputKind.KeyDown:
                    _keys.Add(input.KeyId); // Repeated downs are intentional (typing with a held key).
                    break;
                case InputKind.KeyUp:
                    if (!_keys.Remove(input.KeyId)) return;
                    break;
                case InputKind.ButtonDown:
                    _mouseButtons |= 1 << input.Data;
                    break;
                case InputKind.ButtonUp:
                    if ((_mouseButtons & (1 << input.Data)) == 0) return;
                    _mouseButtons &= ~(1 << input.Data);
                    break;
                case InputKind.Move:
                    if (Count > 0)
                    {
                        RecordedInput last = _events[Count - 1];
                        // Keep the latest point in each 8 ms bucket, never across a click or key edge.
                        if (last.Kind == InputKind.Move && last.At / 8 == input.At / 8)
                        {
                            _events[Count - 1] = input;
                            return;
                        }
                    }
                    break;
            }
            _events.Add(input);
        }

        internal Macro ToMacro(int duration)
        {
            return new Macro(_events.ToArray(), duration, 100, 1);
        }
    }

    internal sealed class Recorder : IDisposable
    {
        private readonly Stopwatch _clock = new Stopwatch();
        private readonly CaptureBuffer _buffer = new CaptureBuffer();
        private readonly Native.HookProc _keyboardProc, _mouseProc;
        private readonly Func<int, int, bool> _overApp;
        private IntPtr _keyboard, _mouse;
        private bool _hookFailed;

        internal Recorder(Func<int, int, bool> overApp)
        {
            _overApp = overApp;
            _keyboardProc = CaptureKeyboard;
            _mouseProc = CaptureMouse;
        }

        internal int Count { get { return _buffer.Count; } }
        internal int Elapsed { get { return (int)Math.Min(_clock.ElapsedMilliseconds, Macro.MaxDuration); } }
        internal string StopReason
        {
            get
            {
                if (_hookFailed) return "Windows interrupted input capture.";
                if (_buffer.Full) return "The input limit was reached.";
                if (Elapsed == Macro.MaxDuration) return "The one-hour recording limit was reached.";
                return null;
            }
        }

        internal void Start()
        {
            IntPtr module = Native.GetModuleHandle(null);
            _keyboard = Native.SetWindowsHookEx(Native.KeyboardHook, _keyboardProc, module, 0);
            if (_keyboard == IntPtr.Zero)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not start keyboard capture.");
            _mouse = Native.SetWindowsHookEx(Native.MouseHook, _mouseProc, module, 0);
            if (_mouse == IntPtr.Zero)
            {
                int error = Marshal.GetLastWin32Error();
                Dispose();
                throw new Win32Exception(error, "Could not start mouse capture.");
            }
            _clock.Start();
        }

        private bool CanCapture(int code)
        {
            return code == 0 && !_hookFailed && !_buffer.Full && _clock.ElapsedMilliseconds < Macro.MaxDuration;
        }

        private IntPtr CaptureKeyboard(int code, IntPtr message, IntPtr ptr)
        {
            try
            {
                if (CanCapture(code))
                {
                    var key = Marshal.PtrToStructure<Native.KeyboardHookData>(ptr);
                    if ((key.Flags & 0x12) == 0) // Ignore injected input, including lower-integrity injections.
                        _buffer.Add(new RecordedInput(Elapsed, (key.Flags & 0x80) == 0 ? InputKind.KeyDown : InputKind.KeyUp,
                            (int)key.Vk, key.Scan <= byte.MaxValue ? (int)key.Scan : 0, (int)(key.Flags & 1)));
                }
            }
            catch (Exception) { _hookFailed = true; }
            return Native.CallNextHookEx(IntPtr.Zero, code, message, ptr);
        }

        private IntPtr CaptureMouse(int code, IntPtr message, IntPtr ptr)
        {
            try
            {
                if (CanCapture(code))
                {
                    var mouse = Marshal.PtrToStructure<Native.MouseHookData>(ptr);
                    if ((mouse.Flags & 3) == 0) ProcessMouse(message.ToInt32(), mouse);
                }
            }
            catch (Exception) { _hookFailed = true; }
            return Native.CallNextHookEx(IntPtr.Zero, code, message, ptr);
        }

        private void ProcessMouse(int message, Native.MouseHookData mouse)
        {
            InputKind kind;
            int data;
            switch (message)
            {
                case 0x0200: kind = InputKind.Move; data = 0; break;
                case 0x0201: kind = InputKind.ButtonDown; data = 1; break;
                case 0x0202: kind = InputKind.ButtonUp; data = 1; break;
                case 0x0204: kind = InputKind.ButtonDown; data = 2; break;
                case 0x0205: kind = InputKind.ButtonUp; data = 2; break;
                case 0x0207: kind = InputKind.ButtonDown; data = 3; break;
                case 0x0208: kind = InputKind.ButtonUp; data = 3; break;
                case 0x020B:
                case 0x020C:
                    kind = message == 0x020B ? InputKind.ButtonDown : InputKind.ButtonUp;
                    data = 3 + (int)(mouse.Data >> 16);
                    if (data < 4 || data > 5) return;
                    break;
                case 0x020A:
                case 0x020E:
                    kind = message == 0x020A ? InputKind.VerticalWheel : InputKind.HorizontalWheel;
                    data = unchecked((short)(mouse.Data >> 16));
                    break;
                default: return;
            }
            // Do not replay clicks on the recorder itself. Preserve an up edge when a drag ends there.
            if (kind != InputKind.Move && kind != InputKind.ButtonUp && _overApp(mouse.Point.X, mouse.Point.Y)) return;
            _buffer.Add(new RecordedInput(Elapsed, kind, mouse.Point.X, mouse.Point.Y, data));
        }

        internal Macro Finish()
        {
            Dispose();
            return _buffer.ToMacro(Elapsed);
        }

        public void Dispose()
        {
            _clock.Stop();
            if (_keyboard != IntPtr.Zero) Native.UnhookWindowsHookEx(_keyboard);
            if (_mouse != IntPtr.Zero) Native.UnhookWindowsHookEx(_mouse);
            _keyboard = _mouse = IntPtr.Zero;
        }
    }

    // Only active during playback (and, if necessary, until the stop key is released).
    // The physical F4 key must still stop a macro even if it is holding Ctrl, Shift or Alt.
    internal sealed class PlaybackStopKeys : IDisposable
    {
        internal const int Message = 0x802A;
        private readonly Native.HookProc _callback;
        private readonly IntPtr _window;
        private readonly bool _handleF4;
        private IntPtr _hook;
        private bool _playing = true, _down, _swallowedDown;

        internal PlaybackStopKeys(IntPtr window, bool handleF4)
        {
            _window = window;
            _handleF4 = handleF4;
            _down = handleF4 && Native.GetAsyncKeyState((int)Native.F4) < 0;
            _callback = CheckKey;
            _hook = Native.SetWindowsHookEx(Native.KeyboardHook, _callback, Native.GetModuleHandle(null), 0);
        }

        internal bool Available { get { return _hook != IntPtr.Zero; } }
        internal bool WaitingForRelease { get { return Available && _down; } }
        internal void EndPlayback() { _playing = false; }

        private IntPtr CheckKey(int code, IntPtr message, IntPtr ptr)
        {
            if (code == 0)
            {
                var key = Marshal.PtrToStructure<Native.KeyboardHookData>(ptr);
                if ((key.Flags & 0x12) == 0)
                {
                    bool up = (key.Flags & 0x80) != 0;
                    if (_handleF4 && key.Vk == Native.F4)
                    {
                        if (up)
                        {
                            bool consume = _swallowedDown;
                            _down = _swallowedDown = false;
                            if (!_playing) Native.PostMessage(_window, Message, new IntPtr(1), IntPtr.Zero);
                            if (consume) return new IntPtr(1);
                        }
                        else if (_playing || _down)
                        {
                            if (!_down)
                            {
                                _down = _swallowedDown = true;
                                Native.PostMessage(_window, Message, IntPtr.Zero, IntPtr.Zero);
                            }
                            return new IntPtr(1);
                        }
                    }
                    else if (_playing && key.Vk == 0x1B) // Esc is an emergency stop, not a global shortcut while idle.
                    {
                        if (!up) Native.PostMessage(_window, Message, IntPtr.Zero, IntPtr.Zero);
                        return new IntPtr(1);
                    }
                }
            }
            return Native.CallNextHookEx(IntPtr.Zero, code, message, ptr);
        }

        public void Dispose()
        {
            if (_hook != IntPtr.Zero) Native.UnhookWindowsHookEx(_hook);
            _hook = IntPtr.Zero;
        }
    }

    internal static class Player
    {
        internal static void Run(Macro tape, IInputOutput output, CancellationToken stop, Action<int> reportIteration)
        {
            var held = new Dictionary<int, RecordedInput>();
            var clock = new Stopwatch();
            double scale = tape.Speed == 0 ? 0 : 100.0 / tape.Speed;
            for (int pass = 1; tape.Repeats == 0 || pass <= tape.Repeats; pass++)
            {
                stop.ThrowIfCancellationRequested();
                if (reportIteration != null) reportIteration(pass);
                clock.Restart();
                try
                {
                    foreach (RecordedInput input in tape.Events)
                    {
                        WaitUntil(clock, input.At * scale, stop);
                        Dispatch(output, held, input);
                    }
                    WaitUntil(clock, tape.Duration * scale, stop);
                }
                finally
                {
                    // Release dragged buttons before modifiers, including on cancellation or input failure.
                    foreach (var pair in held)
                        if (pair.Key < 0) output.Release(pair.Value);
                    foreach (var pair in held)
                        if (pair.Key >= 0) output.Release(pair.Value);
                    held.Clear();
                }
                // Avoid a busy loop for zero-time or Fastest recordings without holding any inputs down.
                if (tape.Repeats == 0 || pass < tape.Repeats) WaitUntil(clock, 25, stop);
            }
        }

        private static void Dispatch(IInputOutput output, Dictionary<int, RecordedInput> held, RecordedInput input)
        {
            switch (input.Kind)
            {
                case InputKind.KeyDown:
                case InputKind.ButtonDown:
                    output.Send(input);
                    held[input.Kind == InputKind.KeyDown ? input.KeyId : -input.Data] = input;
                    break;
                case InputKind.KeyUp:
                case InputKind.ButtonUp:
                    int id = input.Kind == InputKind.KeyUp ? input.KeyId : -input.Data;
                    if (!held.ContainsKey(id)) break;
                    output.Send(input);
                    held.Remove(id);
                    break;
                default: output.Send(input); break;
            }
        }

        private static void WaitUntil(Stopwatch clock, double target, CancellationToken stop)
        {
            while (true)
            {
                stop.ThrowIfCancellationRequested();
                double remaining = target - clock.Elapsed.TotalMilliseconds;
                if (remaining <= 0) return;
                if (stop.WaitHandle.WaitOne((int)Math.Ceiling(remaining))) stop.ThrowIfCancellationRequested();
            }
        }
    }
}
