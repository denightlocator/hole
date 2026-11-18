using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace TaskTape
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            Native.EnablePhysicalCoordinates();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (var window = new TapeWindow(args.Length == 1 ? args[0] : null))
                Application.Run(window);
        }
    }

    internal sealed class TapeWindow : Form
    {
        private const int PlayId = 421, RecordId = 422;
        private static readonly Color Canvas = Color.FromArgb(246, 247, 252), Ink = Color.FromArgb(26, 28, 51),
            Muted = Color.FromArgb(81, 85, 115), Accent = Color.FromArgb(76, 58, 211),
            Line = Color.FromArgb(221, 224, 237), Red = Color.FromArgb(161, 37, 65);

        private readonly Button _record, _play, _open, _save, _export;
        private readonly ComboBox _speed;
        private readonly NumericUpDown _repeats;
        private readonly CheckBox _continuous;
        private readonly Label _mode, _detail, _hint;
        private readonly ToolTip _tips = new ToolTip();
        private readonly System.Windows.Forms.Timer _timer = new System.Windows.Forms.Timer { Interval = 100 };
        private readonly Icon _appIcon;
        private readonly string _startupPath;
        private long _programLength;
        private bool _f4, _f5, _built, _closeWhenStopped, _dialogOpen;
        private Macro _tape;
        private Recorder _recorder;
        private CancellationTokenSource _run;
        private PlaybackStopKeys _stopKeys;
        private int _pass;
        private string _message = "Focus your target window, then press F5 to start recording.";

        internal TapeWindow(string startupPath)
        {
            _startupPath = startupPath;
            Text = "TaskTape";
            _appIcon = CreateIcon();
            Icon = _appIcon;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleDimensions = new SizeF(96, 96);
            AutoScaleMode = AutoScaleMode.Dpi;
            Font = new Font("Segoe UI", 10f);
            BackColor = Canvas;
            ForeColor = Ink;
            ClientSize = new Size(564, 328);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;

            var root = Grid(new[] { 100 });
            root.Padding = new Padding(20, 12, 20, 10);
            foreach (int height in new[] { 62, 62, 53, 43, 45 }) root.RowStyles.Add(new RowStyle(SizeType.Absolute, height));
            root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            root.RowCount = 6;
            Controls.Add(root);

            var header = Grid(new[] { 9, 66, 25 });
            var brand = new BrandMark { Dock = DockStyle.Fill, Margin = new Padding(0, 0, 10, 6) };
            header.Controls.Add(brand, 0, 0);
            var titleStack = Grid(new[] { 100 });
            titleStack.RowCount = 2;
            titleStack.RowStyles.Add(new RowStyle(SizeType.Absolute, 35));
            titleStack.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            titleStack.Controls.Add(LabelFor("TaskTape", 23, Ink, true, ContentAlignment.MiddleLeft), 0, 0);
            titleStack.Controls.Add(LabelFor("WINDOWS MACRO RECORDER", 8, Muted, true, ContentAlignment.TopLeft), 0, 1);
            header.Controls.Add(titleStack, 1, 0);
            header.Controls.Add(LabelFor("FREE  /  OFFLINE", 8, Accent, true, ContentAlignment.MiddleRight), 2, 0);
            root.Controls.Add(header, 0, 0);

            var status = Grid(new[] { 100 });
            status.BackColor = Color.FromArgb(235, 237, 251);
            status.Margin = new Padding(0, 0, 0, 5);
            status.Padding = new Padding(12, 5, 12, 5);
            status.RowCount = 2;
            status.RowStyles.Add(new RowStyle(SizeType.Absolute, 21));
            status.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            _mode = LabelFor("", 8.5f, Accent, true, ContentAlignment.MiddleLeft);
            _detail = LabelFor("", 9.5f, Ink, false, ContentAlignment.MiddleLeft);
            _detail.AutoEllipsis = true;
            status.Controls.Add(_mode, 0, 0);
            status.Controls.Add(_detail, 0, 1);
            root.Controls.Add(status, 0, 1);

            var actions = Grid(new[] { 50, 50 });
            _record = MakeButton("Record  ·  F5", Color.FromArgb(251, 232, 237), Red, new Padding(0, 4, 4, 5));
            _play = MakeButton("Play  ·  F4", Accent, Color.White, new Padding(4, 4, 0, 5));
            _record.Click += delegate { ToggleRecord(); };
            _play.Click += delegate { TogglePlay(); };
            actions.Controls.Add(_record, 0, 0);
            actions.Controls.Add(_play, 1, 0);
            root.Controls.Add(actions, 0, 2);

            var options = Grid(new[] { 10, 24, 13, 17, 36 });
            _speed = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Anchor = AnchorStyles.Left | AnchorStyles.Right,
                Margin = new Padding(0, 0, 12, 0), AccessibleName = "Playback speed" };
            foreach (int speed in Macro.Speeds)
                _speed.Items.Add(speed == 0 ? "Fastest" : (speed / 100m).ToString("0.##") + "×");
            _speed.SelectedIndex = Array.IndexOf(Macro.Speeds, 100);
            _repeats = new NumericUpDown { Minimum = 1, Maximum = Macro.MaxRepeats, Value = 1,
                Anchor = AnchorStyles.Left | AnchorStyles.Right, Margin = new Padding(0, 0, 12, 0), AccessibleName = "Repeat count" };
            _continuous = new CheckBox { Text = "Continuous", Anchor = AnchorStyles.Left, AutoSize = true };
            _continuous.CheckedChanged += delegate { RefreshState(); };
            options.Controls.Add(LabelFor("Speed", 9, Muted, false, ContentAlignment.MiddleLeft), 0, 0);
            options.Controls.Add(_speed, 1, 0);
            options.Controls.Add(LabelFor("Repeats", 9, Muted, false, ContentAlignment.MiddleLeft), 2, 0);
            options.Controls.Add(_repeats, 3, 0);
            options.Controls.Add(_continuous, 4, 0);
            root.Controls.Add(options, 0, 3);

            var files = Grid(new[] { 33, 34, 33 });
            _open = MakeButton("Open…", Color.White, Ink, new Padding(0, 4, 6, 5));
            _save = MakeButton("Save…", Color.White, Ink, new Padding(2, 4, 2, 5));
            _export = MakeButton("Export EXE…", Color.White, Ink, new Padding(6, 4, 0, 5));
            _open.Click += delegate { OpenTape(); };
            _save.Click += delegate { SaveTape(false); };
            _export.Click += delegate { SaveTape(true); };
            files.Controls.Add(_open, 0, 0);
            files.Controls.Add(_save, 1, 0);
            files.Controls.Add(_export, 2, 0);
            root.Controls.Add(files, 0, 4);

            var footer = Grid(new[] { 72, 28 });
            _hint = LabelFor("", 8, Muted, false, ContentAlignment.MiddleLeft);
            var top = new CheckBox { Text = "Always on top", Font = new Font("Segoe UI", 8.5f),
                Anchor = AnchorStyles.Right, AutoSize = true, Margin = new Padding(0) };
            top.CheckedChanged += delegate { TopMost = top.Checked; };
            footer.Controls.Add(_hint, 0, 0);
            footer.Controls.Add(top, 1, 0);
            root.Controls.Add(footer, 0, 5);

            _tips.SetToolTip(_record, "Record whatever you do next. Press F5 again to stop.");
            _tips.SetToolTip(_play, "Plays into the current desktop. F4 or Esc stops playback.");
            _tips.SetToolTip(_continuous, "Repeat until you stop playback.");
            _tips.SetToolTip(_export, "Make a separate Windows app with this tape already loaded. It waits for you to press Play.");
            _timer.Tick += delegate
            {
                if (_recorder != null && _recorder.StopReason != null) FinishRecord(_recorder.StopReason);
                else if (_recorder != null || _run != null) RefreshState();
            };
            _built = true;
            if (IsHandleCreated) BindHotkeys();
            RefreshState();
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            try
            {
                Macro embedded = PortableMacro.Read(Application.ExecutablePath, out _programLength);
                if (embedded != null) LoadTape(embedded, "Embedded macro loaded");
                if (_startupPath != null) ReadTape(_startupPath);
            }
            catch (Exception error) { SetMessage("Couldn't open recording: " + error.Message); }
            _timer.Start();
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            if (_built) BindHotkeys();
        }

        private void BindHotkeys()
        {
            _f4 = Native.RegisterHotKey(Handle, PlayId, Native.NoRepeat, Native.F4);
            _f5 = Native.RegisterHotKey(Handle, RecordId, Native.NoRepeat, Native.F5);
            RefreshState();
        }

        protected override void OnHandleDestroyed(EventArgs e)
        {
            if (_f4) Native.UnregisterHotKey(Handle, PlayId);
            if (_f5) Native.UnregisterHotKey(Handle, RecordId);
            _f4 = _f5 = false;
            base.OnHandleDestroyed(e);
        }

        protected override void WndProc(ref Message message)
        {
            if (message.Msg == Native.HotkeyMessage)
            {
                int id = message.WParam.ToInt32();
                if (id == PlayId && _f4) { TogglePlay(); return; }
                if (id == RecordId && _f5) { ToggleRecord(); return; }
            }
            else if (message.Msg == PlaybackStopKeys.Message)
            {
                if (message.WParam == IntPtr.Zero && _run != null) { _run.Cancel(); RefreshState(); }
                else if (_run == null && _stopKeys != null && !_stopKeys.WaitingForRelease) ClearStopKeys();
                return;
            }
            base.WndProc(ref message);
        }

        private bool IsOverApp(int x, int y)
        {
            if (!IsHandleCreated || WindowState == FormWindowState.Minimized) return false;
            IntPtr underCursor = Native.WindowFromPoint(new Native.Point(x, y));
            return underCursor == Handle || Native.IsChild(Handle, underCursor);
        }

        private void ToggleRecord()
        {
            if (_run != null || _dialogOpen) return;
            if (_recorder != null) { FinishRecord(null); return; }
            var recorder = new Recorder(IsOverApp);
            try
            {
                recorder.Start();
                _recorder = recorder;
                RefreshState();
            }
            catch (Exception error)
            {
                recorder.Dispose();
                SetMessage("Couldn't start recording: " + error.Message);
            }
        }

        private void FinishRecord(string reason)
        {
            Macro newTape = _recorder.Finish();
            _recorder = null;
            string prefix = reason == null ? "" : reason + " ";
            if (newTape.Events.Length > 0)
            {
                _tape = newTape;
                SetMessage(prefix + "Recorded " + Summary(_tape) + ".");
            }
            else SetMessage(prefix + (_tape == null ? "No input captured." : "No input captured; previous tape kept."));
        }

        private Macro CurrentTape()
        {
            return _tape.WithOptions(Macro.Speeds[_speed.SelectedIndex], _continuous.Checked ? 0 : (int)_repeats.Value);
        }

        private async void TogglePlay()
        {
            if (_run != null) { _run.Cancel(); RefreshState(); return; }
            if (_recorder != null || _tape == null || _dialogOpen) return;

            Macro tape = CurrentTape();
            var run = new CancellationTokenSource();
            _run = run;
            Volatile.Write(ref _pass, 1);
            try
            {
                ClearStopKeys();
                _stopKeys = new PlaybackStopKeys(Handle, _f4);
                // Leave keyboard focus and the screen area free if Play was invoked in the toolbar.
                if ((_f4 || _stopKeys.Available) && Native.GetForegroundWindow() == Handle) WindowState = FormWindowState.Minimized;
                RefreshState();
                await Task.Run(delegate { Player.Run(tape, new WindowsOutput(), run.Token, delegate(int pass) { Volatile.Write(ref _pass, pass); }); });
                _message = "Playback complete.  " + Summary(tape);
            }
            catch (OperationCanceledException) { _message = "Playback stopped.  " + Summary(tape); }
            catch (Exception error) { _message = "Playback stopped: " + error.Message; }
            finally
            {
                if (_stopKeys != null)
                {
                    _stopKeys.EndPlayback();
                    if (!_stopKeys.WaitingForRelease) ClearStopKeys();
                }
                _run = null;
                run.Dispose();
                if (!IsDisposed) { RefreshState(); if (_closeWhenStopped) Close(); }
            }
        }

        private void ClearStopKeys()
        {
            if (_stopKeys != null) { _stopKeys.Dispose(); _stopKeys = null; }
        }

        private DialogResult ShowFileDialog(CommonDialog dialog)
        {
            _dialogOpen = true;
            try { return dialog.ShowDialog(this); }
            finally { _dialogOpen = false; }
        }

        private void OpenTape()
        {
            using (var dialog = new OpenFileDialog { Filter = "TaskTape recording (*.tasktape)|*.tasktape|All files (*.*)|*.*",
                Title = "Open a TaskTape recording", RestoreDirectory = true })
            {
                if (ShowFileDialog(dialog) != DialogResult.OK) return;
                try { ReadTape(dialog.FileName); }
                catch (Exception error) { ShowFileError("Couldn't open recording", error); }
            }
        }

        private void ReadTape(string path)
        {
            using (var stream = File.OpenRead(path))
                LoadTape(MacroFile.Read(stream, stream.Length), "Opened " + Path.GetFileName(path));
        }

        private void LoadTape(Macro tape, string caption)
        {
            _tape = tape;
            _speed.SelectedIndex = Array.IndexOf(Macro.Speeds, tape.Speed);
            _repeats.Value = Math.Max(tape.Repeats, 1);
            _continuous.Checked = tape.Repeats == 0;
            SetMessage(caption + "  ·  " + Summary(tape));
        }

        private void SaveTape(bool portable)
        {
            if (_tape == null) return;
            string ext = portable ? "exe" : "tasktape";
            using (var dialog = new SaveFileDialog { DefaultExt = ext, AddExtension = true, RestoreDirectory = true,
                Filter = portable ? "Portable Windows macro (*.exe)|*.exe" : "TaskTape recording (*.tasktape)|*.tasktape",
                Title = portable ? "Export a portable macro" : "Save your recording", FileName = "My macro." + ext })
            {
                if (ShowFileDialog(dialog) != DialogResult.OK) return;
                try
                {
                    Macro tape = CurrentTape();
                    if (portable)
                        PortableMacro.Write(dialog.FileName, Application.ExecutablePath, _programLength, tape);
                    else
                        MacroFile.WriteSafely(dialog.FileName, delegate(Stream file) { MacroFile.Write(file, tape); });
                    SetMessage((portable ? "Exported " : "Saved ") + Path.GetFileName(dialog.FileName) + "  ·  " + Summary(tape));
                }
                catch (Exception error) { ShowFileError(portable ? "Couldn't export macro" : "Couldn't save recording", error); }
            }
        }

        private void ShowFileError(string action, Exception error)
        {
            SetMessage(action + ": " + error.Message);
            _dialogOpen = true;
            try { MessageBox.Show(this, error.Message, action, MessageBoxButtons.OK, MessageBoxIcon.Warning); }
            finally { _dialogOpen = false; }
        }

        private void SetMessage(string text)
        {
            _message = text;
            _tips.SetToolTip(_detail, text);
            RefreshState();
        }

        private void RefreshState()
        {
            bool recording = _recorder != null, playing = _run != null, idle = !recording && !playing;
            _record.Enabled = !playing;
            _play.Enabled = !recording && (playing || _tape != null);
            _open.Enabled = _speed.Enabled = _continuous.Enabled = idle;
            _repeats.Enabled = idle && !_continuous.Checked;
            _save.Enabled = _export.Enabled = idle && _tape != null;
            _record.Text = recording ? "Stop recording  ·  F5" : "Record  ·  F5";
            _play.Text = playing ? "Stop playback  ·  F4" : "Play  ·  F4";
            Text = recording ? "Recording — TaskTape" : playing ? "Playing — TaskTape" : "TaskTape";
            _mode.ForeColor = recording ? Red : Accent;
            _mode.Text = recording ? "●  RECORDING" : playing ? "▶  PLAYING" : _tape == null ? "○  STANDING BY" : "●  TAPE READY";
            if (recording) _detail.Text = FormatTime(_recorder.Elapsed) + "   ·   " + _recorder.Count.ToString("N0") + " events   ·   F5 stops";
            else if (playing)
            {
                string passes = Volatile.Read(ref _pass).ToString("N0") + (_continuous.Checked ? "  ·  Continuous" : " of " + _repeats.Value);
                string stopKeys = _f4 ? (_stopKeys != null && _stopKeys.Available ? "F4 or Esc stops" : "F4 stops") :
                    (_stopKeys != null && _stopKeys.Available ? "Esc stops" : "Use the Stop button");
                _detail.Text = _run.IsCancellationRequested ? "Stopping playback…" : "Repeat " + passes + "   ·   " + stopKeys;
            }
            else _detail.Text = _message;
            _hint.Text = _f4 && _f5 ? "F4 and F5 work across windows" :
                (!_f4 && !_f5 ? "F4 and F5 are unavailable" : (!_f4 ? "F4 is unavailable" : "F5 is unavailable")) + "  ·  Toolbar still works";
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            base.OnFormClosing(e);
            if (_run != null)
            {
                _run.Cancel();
                if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; _closeWhenStopped = true; }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _timer.Dispose();
                _tips.Dispose();
                if (_recorder != null) _recorder.Dispose();
                ClearStopKeys();
                if (_run != null) _run.Cancel();
            }
            base.Dispose(disposing);
            if (disposing && _appIcon != null) _appIcon.Dispose();
        }

        private static string FormatTime(int ms)
        {
            return string.Format("{0}:{1:00}.{2}", ms / 60000, ms / 1000 % 60, ms / 100 % 10);
        }

        private static string Summary(Macro tape)
        {
            return tape.Events.Length.ToString("N0") + " events  ·  " + FormatTime(tape.Duration);
        }

        private static TableLayoutPanel Grid(int[] widths)
        {
            var grid = new TableLayoutPanel { ColumnCount = widths.Length, RowCount = 1, Dock = DockStyle.Fill, Margin = new Padding(0) };
            foreach (int width in widths) grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, width));
            return grid;
        }

        private static Label LabelFor(string text, float size, Color color, bool bold, ContentAlignment alignment)
        {
            return new Label { Text = text, Dock = DockStyle.Fill, Margin = new Padding(0), TextAlign = alignment,
                ForeColor = color, Font = new Font("Segoe UI", size, bold ? FontStyle.Bold : FontStyle.Regular), UseMnemonic = false };
        }

        private static Button MakeButton(string text, Color background, Color foreground, Padding margin)
        {
            var button = new Button { Text = text, Dock = DockStyle.Fill, Margin = margin, BackColor = background,
                ForeColor = foreground, FlatStyle = FlatStyle.Flat, UseVisualStyleBackColor = false };
            button.FlatAppearance.BorderColor = background == Color.White ? Line : background;
            return button;
        }

        private static Icon CreateIcon()
        {
            using (var bitmap = new Bitmap(32, 32))
            {
                using (Graphics graphics = Graphics.FromImage(bitmap)) PaintBrand(graphics, new Rectangle(0, 0, 32, 32));
                IntPtr handle = bitmap.GetHicon();
                try { using (Icon icon = Icon.FromHandle(handle)) return (Icon)icon.Clone(); }
                finally { Native.DestroyIcon(handle); }
            }
        }

        private static void PaintBrand(Graphics graphics, Rectangle bounds)
        {
            graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (var brush = new SolidBrush(Accent)) graphics.FillEllipse(brush, bounds);
            float x = bounds.X, y = bounds.Y, d = bounds.Width;
            graphics.FillPolygon(Brushes.White, new[] { new PointF(x + d * .40f, y + d * .29f),
                new PointF(x + d * .73f, y + d * .50f), new PointF(x + d * .40f, y + d * .71f) });
            graphics.FillEllipse(Brushes.White, x + d * .24f, y + d * .45f, d * .10f, d * .10f);
        }

        private sealed class BrandMark : Control
        {
            protected override void OnPaint(PaintEventArgs e)
            {
                base.OnPaint(e);
                int size = Math.Min(Width - 1, Height - 1);
                if (size > 0) PaintBrand(e.Graphics, new Rectangle(0, (Height - size) / 2, size, size));
            }
        }
    }
}
