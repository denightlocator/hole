using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace TaskTape
{
    internal static class Tests
    {
        private sealed class Output : IInputOutput
        {
            internal readonly List<RecordedInput> Sent = new List<RecordedInput>();
            internal readonly List<RecordedInput> Released = new List<RecordedInput>();
            internal Action<RecordedInput> OnSend;

            public void Send(RecordedInput input)
            {
                if (OnSend != null) OnSend(input);
                Sent.Add(input);
            }

            public void Release(RecordedInput input) { Released.Add(input); }
        }

        private static void Check(bool value, string detail)
        {
            if (!value) throw new Exception(detail);
        }

        private static void Throws<T>(Action action, string detail) where T : Exception
        {
            try { action(); }
            catch (T) { return; }
            throw new Exception("Expected " + typeof(T).Name + ": " + detail);
        }

        private static RecordedInput Press(int at, bool up)
        {
            return new RecordedInput(at, up ? InputKind.KeyUp : InputKind.KeyDown, 'A', 30, 0);
        }

        private static Macro Example()
        {
            return new Macro(new[] { new RecordedInput(2, InputKind.Move, -640, 45, 0), Press(20, false), Press(70, true),
                new RecordedInput(143, InputKind.HorizontalWheel, -640, 45, -120) }, 220, 150, 3);
        }

        private static byte[] Serialize(Macro tape)
        {
            using (var stream = new MemoryStream())
            {
                MacroFile.Write(stream, tape);
                return stream.ToArray();
            }
        }

        private static Macro Deserialize(byte[] bytes)
        {
            using (var stream = new MemoryStream(bytes)) return MacroFile.Read(stream, bytes.Length);
        }

        private static void FileFormat()
        {
            byte[] bytes = Serialize(Example());
            Macro back = Deserialize(bytes);
            Check(back.Events.Length == 4 && back.Duration == 220 && back.Speed == 150 && back.Repeats == 3,
                "Recording timing and options did not round-trip.");
            Check(back.Events[0].X == -640 && back.Events[3].Data == -120 && back.Events[1].At == 20 && back.Events[2].Kind == InputKind.KeyUp,
                "Recording data did not round-trip.");
            var extra = new byte[bytes.Length + 1];
            Array.Copy(bytes, extra, bytes.Length);
            Throws<InvalidDataException>(() => Deserialize(extra), "trailing data");
            bytes[8] = 2;
            Throws<InvalidDataException>(() => Deserialize(bytes), "future version");
            Throws<InvalidDataException>(() => Deserialize(Serialize(new Macro(new[] { Press(50, false), Press(40, true) }, 80, 100, 1))),
                "decreasing timestamps");
            Throws<InvalidDataException>(() => Deserialize(Serialize(new Macro(new[] { Press(90, false) }, 80, 100, 1))),
                "event after finish");
            Throws<InvalidDataException>(() => Deserialize(Serialize(new Macro(new[] { Press(50, false) }, 80, 999, 1))),
                "invalid speed");
            Throws<InvalidDataException>(() => Deserialize(Serialize(new Macro(new[] { new RecordedInput(0, InputKind.KeyDown, 0x74, 0x3f, 0) }, 0, 100, 1))),
                "playback may not contain the control hotkeys");
            Throws<InvalidDataException>(() => Deserialize(Serialize(new Macro(new[] { new RecordedInput(0, InputKind.KeyDown, 'A', 0x3e, 0) }, 0, 100, 1))),
                "reserved scan code");
        }

        private static void Capture()
        {
            var capture = new CaptureBuffer();
            capture.Add(Press(0, true)); // Already held when recording started.
            capture.Add(new RecordedInput(1, InputKind.Move, 10, 20, 0));
            capture.Add(new RecordedInput(2, InputKind.Move, 11, 22, 0));
            capture.Add(new RecordedInput(3, InputKind.ButtonDown, 11, 22, 1));
            capture.Add(new RecordedInput(4, InputKind.Move, 15, 25, 0));
            capture.Add(new RecordedInput(5, InputKind.ButtonUp, 15, 25, 1));
            capture.Add(new RecordedInput(6, InputKind.ButtonUp, 15, 25, 2));
            capture.Add(Press(7, false));
            capture.Add(Press(8, false)); // Typematic repeat.
            capture.Add(Press(9, true));
            Macro tape = capture.ToMacro(11);
            Check(tape.Events.Length == 7 && tape.Events[0].X == 11 && tape.Events[0].At == 2 && tape.Events[2].At == 4,
                "Capture should retain moves around mouse edges but not orphan releases.");
            Check(tape.Events[4].Kind == InputKind.KeyDown && tape.Events[5].Kind == InputKind.KeyDown && tape.Events[6].Kind == InputKind.KeyUp,
                "Repeated downs should retain their timing.");
        }

        private static void Playback()
        {
            var output = new Output();
            var iterations = new List<int>();
            Player.Run(Example().WithOptions(0, 2), output, CancellationToken.None, iterations.Add);
            Check(iterations.Count == 2 && iterations[0] == 1 && iterations[1] == 2 && output.Sent.Count == 8 && output.Released.Count == 0,
                "Repeat count or paired-key handling is wrong.");

            var held = new Macro(new[] { Press(0, true), Press(0, false), new RecordedInput(0, InputKind.ButtonDown, 20, 20, 2) },
                30000, 100, 0);
            using (var cancel = new CancellationTokenSource())
            using (var started = new ManualResetEventSlim(false))
            {
                output = new Output { OnSend = input => { if (input.Kind == InputKind.ButtonDown) started.Set(); } };
                var working = Task.Run(() => Throws<OperationCanceledException>(() => Player.Run(held, output, cancel.Token, null), "continuous stop"));
                try { Check(started.Wait(3000), "Playback never started."); }
                finally { cancel.Cancel(); }
                Check(working.Wait(3000), "Stop should interrupt an ongoing delay.");
                Check(output.Sent.Count == 2 && output.Released.Count == 2 && output.Released[0].Kind == InputKind.ButtonDown &&
                    output.Released[1].Kind == InputKind.KeyDown, "Playback must release both the button and key after cancellation.");
            }

            var failure = new Output { OnSend = input => { if (input.Kind == InputKind.ButtonDown) throw new IOException("Input blocked"); } };
            Throws<IOException>(() => Player.Run(held, failure, CancellationToken.None, null), "down error");
            Check(failure.Released.Count == 1 && failure.Released[0].Kind == InputKind.KeyDown, "Only injected downs should be released on error.");
        }

        private static void Layout()
        {
            Check(Marshal.SizeOf(typeof(Native.Input)) == (IntPtr.Size == 8 ? 40 : 28), "Wrong size for Win32 INPUT.");
            Check(Marshal.SizeOf(typeof(Native.KeyboardHookData)) == (IntPtr.Size == 8 ? 24 : 20), "Wrong size for KBDLLHOOKSTRUCT.");
            Check(Marshal.SizeOf(typeof(Native.MouseHookData)) == (IntPtr.Size == 8 ? 32 : 24), "Wrong size for MSLLHOOKSTRUCT.");
            int origin = -1920, width = 4480;
            foreach (int pixel in new[] { 0, 1, 1919, 1920, 2712, width - 2, width - 1 })
                Check((long)Native.ToAbsolute(origin + pixel, origin, width) * width / 65536 == pixel, "Pointer position did not map to the same desktop pixel.");
            var rightCtrl = WindowsOutput.Key(new RecordedInput(0, InputKind.KeyUp, 0xA3, 0x1d, 1), true).Data.Keyboard;
            Check(rightCtrl.Scan == 0x1d && rightCtrl.Vk == 0 && rightCtrl.Flags == 11, "Extended scan-code key up was encoded incorrectly.");
        }

        private static void Export(string executable, string portable)
        {
            long baseSize;
            Check(PortableMacro.Read(executable, out baseSize) == null && baseSize == new FileInfo(executable).Length, "Fresh app should not have an overlay.");
            PortableMacro.Write(portable, executable, baseSize, Example());
            Macro loaded = PortableMacro.Read(portable, out baseSize);
            Check(loaded != null && loaded.Events.Length == 4 && loaded.Repeats == 3 && baseSize == new FileInfo(executable).Length,
                "Embedded recording failed to load.");
            Check(AssemblyName.GetAssemblyName(portable).Name == AssemblyName.GetAssemblyName(executable).Name, "An exported EXE must still be a valid assembly.");

            string updated = Path.Combine(Path.GetDirectoryName(portable), "Re-export test.exe");
            try
            {
                PortableMacro.Write(updated, portable, baseSize, Example().WithOptions(0, 0));
                Check(new FileInfo(updated).Length == new FileInfo(portable).Length, "Re-export nested the old payload.");
                loaded = PortableMacro.Read(updated, out baseSize);
                Check(loaded.Speed == 0 && loaded.Repeats == 0, "Re-export did not keep updated options.");
                using (var stream = new FileStream(updated, FileMode.Open, FileAccess.Write))
                {
                    stream.Position = baseSize;
                    stream.WriteByte(0);
                }
                Throws<InvalidDataException>(() => PortableMacro.Read(updated, out baseSize), "tampered export");
            }
            finally { File.Delete(updated); }
        }

        private static int Main(string[] args)
        {
            FileFormat();
            Capture();
            Playback();
            Layout();
            if (args.Length == 2) Export(Path.GetFullPath(args[0]), Path.GetFullPath(args[1]));
            Console.WriteLine("TaskTape tests passed: file format, capture, playback, native layout" + (args.Length == 2 ? ", portable EXE." : "."));
            return 0;
        }
    }
}
