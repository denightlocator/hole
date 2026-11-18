using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace TaskTape
{
    internal enum InputKind : byte
    {
        Move = 1, ButtonDown, ButtonUp, VerticalWheel, HorizontalWheel, KeyDown, KeyUp
    }

    internal struct RecordedInput
    {
        internal readonly int At, X, Y, Data;
        internal readonly InputKind Kind;

        // For keys: X is the virtual key, Y is the scan code, Data is the extended flag.
        // For the mouse: X/Y are desktop pixels, Data is a button ID or signed wheel delta.
        internal RecordedInput(int at, InputKind kind, int x, int y, int data)
        {
            At = at;
            Kind = kind;
            X = x;
            Y = y;
            Data = data;
        }

        internal bool UsesScan { get { return Y > 0 && X != 0x13; } } // Pause uses an E1 sequence.
        internal int KeyId { get { return (UsesScan ? (256 + Y) : X) * 2 + Data; } }

        internal static bool IsRecordableKey(int vk)
        {
            return vk >= 1 && vk <= 254 && vk != 0x73 && vk != 0x74; // F4 and F5 are controls only.
        }

        internal bool IsValid()
        {
            switch (Kind)
            {
                case InputKind.Move: return Data == 0;
                case InputKind.ButtonDown:
                case InputKind.ButtonUp: return Data >= 1 && Data <= 5;
                case InputKind.VerticalWheel:
                case InputKind.HorizontalWheel: return Data != 0 && Data >= short.MinValue && Data <= short.MaxValue;
                case InputKind.KeyDown:
                case InputKind.KeyUp:
                    return IsRecordableKey(X) && Y >= 0 && Y <= byte.MaxValue && (Data == 0 || Data == 1) &&
                        (!UsesScan || Data != 0 || (Y != 0x3E && Y != 0x3F));
                default: return false;
            }
        }
    }

    internal sealed class Macro
    {
        internal const int MaxEvents = 500000;
        internal const int MaxDuration = 3600000; // One hour per recording; playback can repeat indefinitely.
        internal const int MaxRepeats = 999;
        internal static readonly int[] Speeds = { 25, 50, 75, 100, 125, 150, 200, 300, 500, 0 };

        internal readonly RecordedInput[] Events;
        internal readonly int Duration, Speed, Repeats;

        internal Macro(RecordedInput[] events, int duration, int speed, int repeats)
        {
            Events = events;
            Duration = duration;
            Speed = speed; // Percent; zero means skip timing waits.
            Repeats = repeats; // Zero means continuous playback.
        }

        internal Macro WithOptions(int speed, int repeats)
        {
            return new Macro(Events, Duration, speed, repeats);
        }
    }

    internal static class MacroFile
    {
        private static readonly byte[] Magic = Encoding.ASCII.GetBytes("TASKTAPE");
        private const int HeaderSize = 28, EventSize = 17;
        internal const int MaxBytes = HeaderSize + EventSize * Macro.MaxEvents;

        internal static void Write(Stream target, Macro macro)
        {
            using (var writer = new BinaryWriter(target, Encoding.UTF8, true))
            {
                writer.Write(Magic);
                writer.Write(1);
                writer.Write(macro.Duration);
                writer.Write(macro.Speed);
                writer.Write(macro.Repeats);
                writer.Write(macro.Events.Length);
                foreach (RecordedInput input in macro.Events)
                {
                    writer.Write(input.At);
                    writer.Write((byte)input.Kind);
                    writer.Write(input.X);
                    writer.Write(input.Y);
                    writer.Write(input.Data);
                }
            }
        }

        internal static Macro Read(Stream source, long length)
        {
            if (length < HeaderSize || length > MaxBytes)
                throw new InvalidDataException("This is not a valid TaskTape recording.");

            using (var reader = new BinaryReader(source, Encoding.UTF8, true))
            {
                foreach (byte b in Magic)
                    if (reader.ReadByte() != b)
                        throw new InvalidDataException("Choose a TaskTape recording (.tasktape), not a TinyTask .rec file.");
                if (reader.ReadInt32() != 1)
                    throw new InvalidDataException("This recording uses an unsupported TaskTape format.");

                int duration = reader.ReadInt32(), speed = reader.ReadInt32(), repeats = reader.ReadInt32(), count = reader.ReadInt32();
                if (duration < 0 || duration > Macro.MaxDuration || Array.IndexOf(Macro.Speeds, speed) < 0 ||
                    repeats < 0 || repeats > Macro.MaxRepeats || count < 1 || count > Macro.MaxEvents ||
                    length != HeaderSize + (long)EventSize * count)
                    throw new InvalidDataException("This recording has invalid settings or is damaged.");

                var events = new RecordedInput[count];
                int previous = 0;
                for (int i = 0; i < count; i++)
                {
                    var input = new RecordedInput(reader.ReadInt32(), (InputKind)reader.ReadByte(),
                        reader.ReadInt32(), reader.ReadInt32(), reader.ReadInt32());
                    if (input.At < previous || input.At > duration || !input.IsValid())
                        throw new InvalidDataException("This recording contains an invalid input event.");
                    previous = input.At;
                    events[i] = input;
                }
                return new Macro(events, duration, speed, repeats);
            }
        }

        internal static void WriteSafely(string path, Action<Stream> write)
        {
            string fullPath = Path.GetFullPath(path);
            string temp = Path.Combine(Path.GetDirectoryName(fullPath), ".tasktape-" + Guid.NewGuid().ToString("N") + ".tmp");
            try
            {
                using (var file = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                    write(file);
                if (File.Exists(fullPath))
                    File.Replace(temp, fullPath, null);
                else
                    File.Move(temp, fullPath);
            }
            finally
            {
                // A failed save should neither truncate an existing tape nor leave input data in a temp file.
                try { File.Delete(temp); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }

    internal static class PortableMacro
    {
        // The Windows PE loader ignores the overlay. The footer locates and verifies the tape
        // without changing the executable's code or requiring a compiler on the recipient's PC.
        private static readonly byte[] Footer = Encoding.ASCII.GetBytes("TAPE-END");
        private const int HashLength = 32, FooterSize = HashLength + sizeof(int) + 8;

        internal static Macro Read(string executable, out long programLength)
        {
            using (var file = File.OpenRead(executable))
            using (var reader = new BinaryReader(file, Encoding.UTF8, true))
            {
                programLength = file.Length;
                if (programLength < FooterSize) return null;
                file.Seek(-Footer.Length, SeekOrigin.End);
                foreach (byte b in Footer)
                    if (reader.ReadByte() != b) return null;

                file.Seek(-FooterSize, SeekOrigin.End);
                byte[] expected = reader.ReadBytes(HashLength);
                int length = reader.ReadInt32();
                long offset = file.Length - FooterSize - length;
                if (length <= 0 || length > MacroFile.MaxBytes || offset <= 0)
                    throw new InvalidDataException("The embedded TaskTape recording is damaged.");
                programLength = offset;
                file.Position = offset;
                byte[] payload = reader.ReadBytes(length);
                using (var sha = SHA256.Create())
                {
                    byte[] actual = sha.ComputeHash(payload);
                    for (int i = 0; i < HashLength; i++)
                        if (actual[i] != expected[i])
                            throw new InvalidDataException("The embedded TaskTape recording failed its integrity check.");
                }
                using (var tape = new MemoryStream(payload, false))
                    return MacroFile.Read(tape, length);
            }
        }

        internal static void Write(string destination, string executable, long programLength, Macro macro)
        {
            if (string.Equals(Path.GetFullPath(destination), Path.GetFullPath(executable), StringComparison.OrdinalIgnoreCase))
                throw new IOException("Save the exported macro under a different name than the running app.");
            byte[] payload, hash;
            using (var tape = new MemoryStream())
            {
                MacroFile.Write(tape, macro);
                payload = tape.ToArray();
            }
            using (var sha = SHA256.Create()) hash = sha.ComputeHash(payload);

            MacroFile.WriteSafely(destination, delegate(Stream target)
            {
                using (var program = File.OpenRead(executable))
                {
                    byte[] buffer = new byte[8192];
                    long remaining = programLength;
                    while (remaining > 0)
                    {
                        int read = program.Read(buffer, 0, (int)Math.Min(buffer.Length, remaining));
                        if (read == 0) throw new EndOfStreamException();
                        target.Write(buffer, 0, read);
                        remaining -= read;
                    }
                }
                using (var writer = new BinaryWriter(target, Encoding.UTF8, true))
                {
                    writer.Write(payload);
                    writer.Write(hash);
                    writer.Write(payload.Length);
                    writer.Write(Footer);
                }
            });
        }
    }
}
