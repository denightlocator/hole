using System;
using System.Runtime.InteropServices;

namespace TaskTape
{
    internal static class Native
    {
        internal const int HotkeyMessage = 0x0312, KeyboardHook = 13, MouseHook = 14;
        internal const uint F4 = 0x73, F5 = 0x74, NoRepeat = 0x4000;
        internal const int XVirtualScreen = 76, YVirtualScreen = 77, VirtualWidth = 78, VirtualHeight = 79;
        internal delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);

        [StructLayout(LayoutKind.Sequential)]
        internal struct Point
        {
            internal int X, Y;
            internal Point(int x, int y) { X = x; Y = y; }
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct KeyboardHookData
        {
            internal uint Vk, Scan, Flags, Time;
            internal UIntPtr ExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct MouseHookData
        {
            internal Point Point;
            internal uint Data, Flags, Time;
            internal UIntPtr ExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct MouseInput
        {
            internal int X, Y;
            internal uint Data, Flags, Time;
            internal UIntPtr ExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct KeyboardInput
        {
            internal ushort Vk, Scan;
            internal uint Flags, Time;
            internal UIntPtr ExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        internal struct InputData
        {
            [FieldOffset(0)] internal MouseInput Mouse;
            [FieldOffset(0)] internal KeyboardInput Keyboard;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct Input
        {
            internal uint Type;
            internal InputData Data;
        }

        [DllImport("user32.dll", SetLastError = true)]
        internal static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint virtualKey);

        [DllImport("user32.dll")]
        internal static extern bool UnregisterHotKey(IntPtr window, int id);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        internal static extern IntPtr SetWindowsHookEx(int hook, HookProc callback, IntPtr module, uint threadId);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        internal static extern IntPtr GetModuleHandle(string name);

        [DllImport("user32.dll")]
        internal static extern bool UnhookWindowsHookEx(IntPtr hook);

        [DllImport("user32.dll")]
        internal static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);

        [DllImport("user32.dll")]
        internal static extern IntPtr WindowFromPoint(Point point);

        [DllImport("user32.dll")]
        internal static extern bool IsChild(IntPtr parent, IntPtr child);

        [DllImport("user32.dll")]
        internal static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        internal static extern bool PostMessage(IntPtr window, int message, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        internal static extern short GetAsyncKeyState(int virtualKey);

        [DllImport("user32.dll", SetLastError = true)]
        internal static extern uint SendInput(uint count, [In] Input[] inputs, int size);

        [DllImport("user32.dll")]
        internal static extern int GetSystemMetrics(int index);

        [DllImport("user32.dll")]
        private static extern bool SetProcessDpiAwarenessContext(IntPtr context);

        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        internal static extern bool DestroyIcon(IntPtr icon);

        internal static void EnablePhysicalCoordinates()
        {
            try { if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return; }
            catch (EntryPointNotFoundException) { }
            SetProcessDPIAware();
        }

        internal static int ToAbsolute(int coordinate, int origin, int span)
        {
            if (span <= 1) return 0;
            long pixel = Math.Max(0, Math.Min(span - 1L, (long)coordinate - origin));
            // Aim at the middle of the pixel rather than its lower boundary, which can round down.
            return (int)(((2 * pixel + 1) * 65536) / (2L * span));
        }
    }

    internal interface IInputOutput
    {
        void Send(RecordedInput input);
        void Release(RecordedInput held);
    }

    internal sealed class WindowsOutput : IInputOutput
    {
        private const uint Move = 0x0001, Absolute = 0x8000, VirtualDesk = 0x4000, MoveNoCoalesce = 0x2000;
        private static readonly int InputSize = Marshal.SizeOf(typeof(Native.Input));
        private static readonly uint[] Down = { 0, 0x0002, 0x0008, 0x0020, 0x0080, 0x0080 };
        private static readonly uint[] Up = { 0, 0x0004, 0x0010, 0x0040, 0x0100, 0x0100 };
        private readonly Native.Input[] _batch = new Native.Input[2];
        private readonly int _left = Native.GetSystemMetrics(Native.XVirtualScreen);
        private readonly int _top = Native.GetSystemMetrics(Native.YVirtualScreen);
        private readonly int _width = Native.GetSystemMetrics(Native.VirtualWidth);
        private readonly int _height = Native.GetSystemMetrics(Native.VirtualHeight);

        internal static Native.Input Key(RecordedInput input, bool up)
        {
            var result = new Native.Input { Type = 1 };
            // Pause uses an E1 sequence; fall back to virtual keys when a scan code isn't usable.
            bool scan = input.UsesScan;
            result.Data.Keyboard = new Native.KeyboardInput
            {
                Vk = scan ? (ushort)0 : (ushort)input.X,
                Scan = scan ? (ushort)input.Y : (ushort)0,
                Flags = (scan ? 8u : 0u) | (input.Data != 0 ? 1u : 0u) | (up ? 2u : 0u)
            };
            return result;
        }

        private static Native.Input Mouse(uint flags, uint data, int x, int y)
        {
            var result = new Native.Input { Type = 0 };
            result.Data.Mouse = new Native.MouseInput { X = x, Y = y, Flags = flags, Data = data };
            return result;
        }

        private static Native.Input Button(int id, bool up)
        {
            return Mouse(up ? Up[id] : Down[id], id >= 4 ? (uint)(id - 3) : 0u, 0, 0);
        }

        public void Send(RecordedInput input)
        {
            uint count = 1;
            switch (input.Kind)
            {
                case InputKind.KeyDown:
                case InputKind.KeyUp:
                    _batch[0] = Key(input, input.Kind == InputKind.KeyUp);
                    break;
                default:
                    _batch[0] = Mouse(Move | Absolute | VirtualDesk | MoveNoCoalesce, 0,
                        Native.ToAbsolute(input.X, _left, _width), Native.ToAbsolute(input.Y, _top, _height));
                    if (input.Kind != InputKind.Move)
                    {
                        count = 2;
                        if (input.Kind == InputKind.ButtonDown || input.Kind == InputKind.ButtonUp)
                            _batch[1] = Button(input.Data, input.Kind == InputKind.ButtonUp);
                        else
                            _batch[1] = Mouse(input.Kind == InputKind.VerticalWheel ? 0x0800u : 0x1000u,
                                unchecked((uint)input.Data), 0, 0);
                    }
                    break;
            }
            if (Native.SendInput(count, _batch, InputSize) != count)
                throw new InvalidOperationException("Windows blocked playback input. Try a regular, non-administrator window.");
        }

        public void Release(RecordedInput held)
        {
            _batch[0] = held.Kind == InputKind.KeyDown ? Key(held, true) : Button(held.Data, true);
            Native.SendInput(1, _batch, InputSize);
        }
    }
}
