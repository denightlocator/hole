"""Sprout native desktop client. Run with a Tk-enabled Python installation."""
import json
import os
import subprocess
import sys
import queue
import re
import uuid
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk
from tkinter.scrolledtext import ScrolledText
from server import answer
from study import relevant

DATA = Path(os.getenv('LOCALAPPDATA') or Path.home()) / 'Sprout' / 'journal.json'
BG, PANEL, TEXT, MUTED, ACCENT = '#141414', '#1c1c1c', '#e8e6e3', '#a6a3a0', '#e39979'


EXPORTS = DATA.parent / 'Files'
FENCE = re.compile(r'^```([^`\n]*)\n(.*?)^```[ \t]*(?:\n|$)', re.M | re.S)
EXT = {'python': 'py', 'javascript': 'js', 'json': 'json', 'markdown': 'md',
       'html': 'html', 'css': 'css', 'csv': 'csv', 'text': 'txt', 'sql': 'sql'}


FILE_LIMIT = 100
LIMIT_MESSAGE = '100-file limit reached. Move a file out of Sprout/Files to save more.'


def file_count(folder):
    return sum(p.is_file() or p.is_symlink() for p in folder.iterdir()) if folder.exists() else 0


def export_blocks(text, folder):
    names = []
    blocks = list(FENCE.finditer(text))
    if blocks and file_count(folder) + len(blocks) > FILE_LIMIT:
        raise OSError("Not enough room under the 100-file limit; no blocks saved.")
    for match in blocks:
        folder.mkdir(parents=True, exist_ok=True)
        language = match[1].strip().lower()
        path = folder / ('sprout-' + uuid.uuid4().hex[:12] + '.' + EXT.get(language, 'txt'))
        with path.open('x', encoding='utf-8') as out:
            out.write(match[2])
        names.append(path.name)
    return names


class Desktop:
    def __init__(self, root):
        self.root = root
        self.results = queue.Queue()
        self.busy = False
        self.chat, self.facts = [], []
        if DATA.exists():
            record = json.loads(DATA.read_text(encoding='utf8'))
            self.chat, self.facts = record['chat'], record['facts']
        root.title('Sprout Studio — Local workspace')
        root.geometry('1230x740')
        root.minsize(840, 540)
        root.configure(bg=BG)
        root.option_add('*Font', ('Segoe UI', 10))
        root.option_add('*Listbox.background', PANEL)
        root.option_add('*Listbox.foreground', TEXT)
        root.option_add('*Listbox.selectBackground', '#654237')
        root.option_add('*Button.background', '#303030')
        root.option_add('*Button.foreground', TEXT)
        root.option_add('*Button.relief', 'flat')
        def label(parent, text, bg=PANEL, fg=TEXT, **kw):
            return tk.Label(parent, text=text, bg=bg, fg=fg, **kw)
        top = tk.Frame(root, bg=PANEL, padx=12, pady=7)
        top.pack(fill='x')
        label(top, '✳   SPROUT STUDIO', fg=ACCENT).pack(side='left')
        label(top, '   /   Workspace', fg=MUTED, font=('Consolas', 10)).pack(side='left')
        label(top, '●   ON DEVICE', fg='#86efac').pack(side='right')
        self.study_run = None
        self.study_job = None
        self.studying = False
        self.study_count = 0
        self.study_button = tk.Button(top, text='▷  Start training', bg='#43594d', fg='#e1f7e9', padx=12, cursor='hand2', command=self.toggle_study)
        self.study_button.pack(side='right', padx=14)
        self.timer = None
        self.safe = tk.BooleanVar(value=True)
        self.safe_check = tk.Checkbutton(top, text='Safe session · 15 min', variable=self.safe, bg=PANEL, fg=TEXT, selectcolor=BG)
        self.safe_check.pack(side='right')
        root.protocol('WM_DELETE_WINDOW', self.close)
        root.bind('<Escape>', lambda _: self.stop_study() if self.studying else None)
        self.status = tk.StringVar(value='Ready')
        footer = tk.Frame(root, bg='#2e211d'); footer.pack(side='bottom', fill='x')
        label(footer, '  ✳  Sprout Studio    /    Local session', bg='#2e211d', fg=ACCENT).pack(side='left')
        tk.Label(footer, textvariable=self.status, bg='#2e211d', fg=TEXT).pack(side='right', padx=12)
        style = ttk.Style(root)
        style.theme_use('clam')
        style.configure('TNotebook', background=BG, borderwidth=0)
        style.configure('TNotebook.Tab', padding=(8, 7), foreground=MUTED, background=PANEL)
        style.map('TNotebook.Tab', background=[('selected', '#49372e')], foreground=[('selected', '#ffcea8')])
        # Keep all three work surfaces visible; tabs change only their own pane.
        split = tk.PanedWindow(root, orient='horizontal', bg='#373330', sashwidth=6, bd=0)
        split.pack(fill='both', expand=True, padx=6, pady=6)
        sidebar = ttk.Notebook(split, width=205); sidebar.enable_traversal()
        explorer, memory = [tk.Frame(sidebar, bg=PANEL, padx=8, pady=6) for _ in range(2)]
        sidebar.add(explorer, text='Files'); sidebar.add(memory, text='Memory')
        split.add(sidebar, minsize=150, stretch='never')
        middle = tk.PanedWindow(split, orient='vertical', bg='#373330', sashwidth=5, bd=0, width=490)
        split.add(middle, minsize=225, stretch='always')
        editor = tk.Frame(middle, bg=BG); middle.add(editor, minsize=140, stretch='always')
        activity = tk.Frame(middle, bg=PANEL); middle.add(activity, minsize=75, stretch='never')
        pane = tk.Frame(split, bg=PANEL, padx=12, pady=10); split.add(pane, minsize=290, stretch='always')
        self.capacity = label(explorer, 'Files', fg=ACCENT); self.capacity.pack(anchor='w', pady=8)
        self.files = tk.Listbox(explorer, width=29, relief='flat', exportselection=False, font=('Consolas', 10)); self.files.pack(fill='both', expand=True)
        self.files.bind('<<ListboxSelect>>', self.preview_file)
        if sys.platform == 'win32':
            tk.Button(explorer, text='Open files folder', command=self.open_folder).pack(fill='x', pady=6)
        label(memory, 'Remembered facts', fg=ACCENT, font=('Segoe UI', 16)).pack(anchor='w', pady=8)
        self.mem = tk.Listbox(memory, relief='flat'); self.mem.pack(fill='both', expand=True)
        tk.Button(memory, text='Forget selected fact', command=self.forget).pack(anchor='w', pady=8)
        head = tk.Frame(editor, bg=PANEL); head.pack(fill='x')
        label(head, '   WORKBENCH', fg=ACCENT).pack(side='left')
        self.close_tab = tk.Button(head, text='Close tab ×', command=self.close_document, state='disabled')
        self.close_tab.pack(side='right')
        self.documents = ttk.Notebook(editor, width=1); self.documents.pack(fill='both', expand=True)
        self.documents.enable_traversal()
        self.open_files = {}
        home = tk.Frame(self.documents, bg=BG, padx=16, pady=18)
        self.documents.add(home, text='Home')
        label(home, 'Your workbench', bg=BG, font=('Segoe UI', 17, 'bold')).pack(anchor='w')
        for hint in ('Select a file to open a reading tab.', 'Ask Sprout in the chat on the right.', 'Follow training in Activity below.', 'Drag the dividers to resize any pane.'):
            label(home, hint, bg=BG, fg=MUTED, wraplength=205, justify='left').pack(anchor='w', pady=5)
        self.documents.bind('<<NotebookTabChanged>>', self.document_changed)
        label(activity, '  ACTIVITY   /   Expand a run for details', fg=MUTED, anchor='w', pady=5).pack(fill='x')
        self.progress = ttk.Progressbar(activity, mode='indeterminate', maximum=100)
        self.progress.pack(fill='x')
        style.configure('Steps.Treeview', background=BG, fieldbackground=BG, foreground=TEXT, rowheight=25)
        self.output = ttk.Treeview(activity, show='tree', height=4, style='Steps.Treeview', selectmode='browse')
        scroll = ttk.Scrollbar(activity, orient='vertical', command=self.output.yview)
        scroll.pack(side='right', fill='y'); self.output.configure(yscrollcommand=scroll.set)
        self.output.pack(fill='both', expand=True)
        self.output.tag_configure('run', foreground=ACCENT, font=('Segoe UI', 10, 'bold'))
        self.output.tag_configure('detail', foreground=MUTED)
        self.output.insert('', 'end', text='Ready · waiting for a message or training session')
        self.active_run = None
        label(pane, 'SESSION   /   FIELD JOURNAL', fg=MUTED).pack(anchor='w')
        label(pane, '✳  Sprout', fg=ACCENT, font=('Segoe UI', 18, 'bold')).pack(anchor='w', pady=(10,0))
        label(pane, '●  Local · Qwen2.5 1.5B', fg='#86efac').pack(anchor='w')
        self.log = ScrolledText(pane, wrap='word', width=38, height=4, bg=PANEL, fg=TEXT, relief='flat', font=('Segoe UI', 11))
        self.log.pack(fill='both', expand=True, pady=12)
        self.log.tag_config('label', foreground=ACCENT, font=('Segoe UI', 9, 'bold'))
        self.log.tag_config('code', background=BG, foreground='#b8e6c2', font=('Consolas', 10), lmargin1=10, lmargin2=10)
        self.log.tag_config('codehead', foreground=ACCENT, font=('Consolas', 9, 'bold'))
        self.autosave, self.online = tk.BooleanVar(value=True), tk.BooleanVar()
        for title, var in [('Auto-save reply files', self.autosave), ('Wikipedia lookup for next message', self.online)]:
            tk.Checkbutton(pane, text=title, variable=var, bg=PANEL, fg=MUTED, selectcolor=BG, activebackground=PANEL, activeforeground=TEXT).pack(anchor='w')
        self.entry = tk.Text(pane, height=3, width=1, wrap='word', bg='#292929', fg=TEXT, insertbackground=TEXT, relief='flat', padx=8, pady=8); self.entry.pack(fill='x', pady=6)
        self.entry.bind('<Return>', lambda e: None if e.state & 1 else (self.send() or 'break'))
        row = tk.Frame(pane, bg=PANEL); row.pack(fill='x')
        self.profile = tk.StringVar(value='Balanced')
        menu = tk.OptionMenu(row, self.profile, 'Balanced', 'Coder', 'Creative'); menu.configure(bg='#303030', fg=TEXT, highlightthickness=0); menu.pack(side='left')
        self.button = tk.Button(row, text='Send ↑', bg=ACCENT, fg=BG, command=self.send); self.button.pack(side='right')
        self.refresh(); self.entry.focus_set()

    def toggle_study(self):
        if self.studying:
            self.stop_study()
        elif not self.busy:
            if file_count(EXPORTS) >= FILE_LIMIT:
                self.status.set(LIMIT_MESSAGE)
                return
            self.safe_check.configure(state='disabled')
            if self.safe.get():
                self.timer = self.root.after(15 * 60 * 1000, self.time_up)
            self.studying = True
            self.study_count = 0
            self.study_button.configure(text='■  Stop training', bg='#864c39')
            self.button.configure(state='disabled')
            self.begin_run('Training', 'Starting…')
            self.event('Training started · local notebook only. Esc to stop.')
            self.study_step()

    def study_step(self):
        self.study_job = None
        if not self.studying:
            return
        try:
            if file_count(EXPORTS) >= FILE_LIMIT:
                self.stop_study(LIMIT_MESSAGE)
                return
            if self.study_run is None:
                self.event(f'Generating lesson {self.study_count + 1}…')
                self.status.set(f'Studying · {self.study_count} notes written')
                self.study_run = subprocess.Popen(
                    [sys.executable, str(Path(__file__).with_name('study.py')), str(EXPORTS)],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                # Drain both pipes off the UI thread (Windows pipes can be small).
                process = self.study_run
                result = self.study_result = queue.Queue()
                threading.Thread(target=lambda: result.put(process.communicate()), daemon=True).start()
            try:
                out, err = self.study_result.get_nowait()
            except queue.Empty:
                self.study_job = self.root.after(150, self.study_step)
                return
            code = self.study_run.returncode
            self.study_run = None
            if code:
                raise ValueError(err.decode(errors='replace').strip().split('\n')[-1][:200])
            note = json.loads(out)
            EXPORTS.mkdir(parents=True, exist_ok=True)
            path = EXPORTS / ('sprout-study-%02d.md' % int(note['slot']))
            tmp = EXPORTS / ('.study-' + uuid.uuid4().hex)
            try:
                with tmp.open('x', encoding='utf8') as f:
                    f.write(note['text'] + '\n')
                tmp.replace(path)
            finally:
                if tmp.exists():
                    tmp.unlink()
            self.study_count += 1
            self.event(f"Reviewed {note['reviewed']} earlier cards on this topic")
            self.event('Generated · ' + note['topic'])
            self.event('Saved · ' + note['topic'] + ' → ' + path.name)
            self.update_files()
            if file_count(EXPORTS) >= FILE_LIMIT:
                self.stop_study(LIMIT_MESSAGE)
                return
            self.status.set(f'{self.study_count} notes written · next pass in 1s')
            self.study_job = self.root.after(1000, self.study_step)
        except (OSError, ValueError, KeyError) as exc:
            self.stop_study('Paused: ' + str(exc))

    def time_up(self):
        self.timer = None
        self.stop_study('15 minutes complete. Start a new session when ready.')

    def stop_study(self, reason='Training stopped'):
        if self.timer is not None:
            self.root.after_cancel(self.timer)
            self.timer = None
        self.safe_check.configure(state='normal')
        self.studying = False
        if self.study_job is not None:
            self.root.after_cancel(self.study_job)
            self.study_job = None
        if self.study_run is not None:
            self.study_run.kill()
            self.study_run = None
        self.study_button.configure(text='▷  Start training', bg='#43594d')
        self.button.configure(state='normal')
        self.status.set(reason)
        self.event(reason)
        self.finish_run(f'Stopped · {self.study_count} notes saved')

    def close(self):
        if self.studying:
            self.stop_study()
        self.root.destroy()

    def open_folder(self):
        try:
            EXPORTS.mkdir(parents=True, exist_ok=True)
            os.startfile(EXPORTS)
        except OSError as exc:
            messagebox.showwarning('Cannot open folder', str(exc))

    def begin_run(self, kind, phase):
        self.run_kind = kind
        self.run_start = time.monotonic()
        self.active_run = self.output.insert('', 0, text=f'{kind}  ·  {phase}', open=False, tags=('run',))
        self.output.see(self.active_run)
        self.progress.start(18)
        roots = self.output.get_children()
        if len(roots) > 40:
            self.output.delete(*roots[40:])

    def event(self, message):
        if self.active_run is None:
            return
        elapsed = int(time.monotonic() - self.run_start)
        self.output.insert(self.active_run, 'end', text=f'{elapsed // 60}:{elapsed % 60:02}   {message}', tags=('detail',))
        children = self.output.get_children(self.active_run)
        if len(children) > 120:
            self.output.delete(children[0])
        self.output.item(self.active_run, text=f'{self.run_kind}  ·  {message}')

    def finish_run(self, summary):
        self.event(summary)
        self.output.item(self.active_run, open=False)
        self.progress.stop()
        self.active_run = None

    def document_changed(self, event=None):
        home = self.documents.index('current') == 0
        self.close_tab.configure(state='disabled' if home else 'normal')

    def close_document(self):
        current = self.documents.select()
        for name, frame in list(self.open_files.items()):
            if str(frame) == current:
                self.documents.forget(frame)
                frame.destroy()
                del self.open_files[name]
                break

    def preview_file(self, event=None):
        selection = self.files.curselection()
        if not selection:
            return
        name = self.files.get(selection[0])
        if name in self.open_files:
            self.documents.select(self.open_files[name])
            return
        frame = tk.Frame(self.documents, bg=BG)
        self.open_files[name] = frame
        self.documents.add(frame, text=name[7:])
        self.documents.select(frame)
        tk.Label(frame, text=name, bg=BG, fg=ACCENT, anchor='w', padx=8).pack(fill='x')
        view = ScrolledText(frame, wrap='word', width=1, height=1, bg=BG, fg=TEXT,
                            relief='flat', font=('Consolas', 10), padx=8, pady=8)
        view.pack(fill='both', expand=True)
        view.tag_configure('number', foreground=MUTED)
        try:
            with (EXPORTS / name).open(encoding='utf8', errors='replace') as handle:
                text = handle.read(64000)
        except OSError as exc:
            text = str(exc)
        for n, line in enumerate(text.splitlines(), 1):
            view.insert('end', f'{n:>3}  ', 'number')
            view.insert('end', line + '\n')
        view.configure(state='disabled')

    def update_files(self):
        self.capacity.configure(text=f'Local files   {file_count(EXPORTS)} / {FILE_LIMIT}')
        self.files.delete(0, 'end')
        for path in sorted(EXPORTS.glob('sprout-*')):
            if path.is_file() and not path.is_symlink():
                self.files.insert('end', path.name)

    def refresh(self):
        self.update_files()
        self.mem.delete(0, 'end')
        for fact in self.facts:
            self.mem.insert('end', fact)
        self.log.configure(state='normal')
        self.log.delete('1.0', 'end')
        for who, text in self.chat or [('SPROUT', 'Tell me something to remember, or ask me a question.')]:
            self.log.insert('end', who + '\n', 'label')
            pos = 0
            for block in FENCE.finditer(text):
                self.log.insert('end', text[pos:block.start()])
                self.log.insert('end', '▣  ' + (block[1].strip() or 'text').upper() + '\n', 'codehead')
                self.log.insert('end', block[2], 'code')
                pos = block.end()
            self.log.insert('end', text[pos:] + '\n\n')
        self.log.see('end')
        self.log.configure(state='disabled')

    def save(self):
        try:
            DATA.parent.mkdir(exist_ok=True, parents=True)
            tmp = DATA.with_suffix('.tmp')
            tmp.write_text(json.dumps(dict(chat=self.chat, facts=self.facts)), encoding='utf8')
            tmp.replace(DATA)
        except OSError as exc:
            messagebox.showwarning('Journal not saved', str(exc))
        self.refresh()

    def forget(self):
        selected = self.mem.curselection()
        if selected:
            del self.facts[selected[0]]
            self.save()

    def send(self, event=None):
        text = self.entry.get('1.0', 'end-1c').strip()
        if self.busy or self.studying or not text:
            return
        match = re.match(r'remember\s+(.+)', text, re.I)
        fact = match[1] if match else text if re.match(r"(?:i |i['’]m |my |we )", text, re.I) and not text.endswith('?') else None
        if fact and fact not in self.facts:
            self.facts.append(fact)
        history, facts, online = self.chat[-8:], self.facts[:], self.online.get()
        profile = self.profile.get()
        self.begin_run('Chat', 'Preparing…')
        self.event(f'Context prepared · {len(history)} previous messages')
        self.event(profile + " · request started")
        self.online.set(False)
        self.chat.append(('YOU', text))
        self.entry.delete('1.0', 'end')
        self.study_button.configure(state='disabled')
        self.busy = True
        self.button.configure(state='disabled')
        self.status.set('Thinking…')
        self.save()

        def work():
            try:
                cards = relevant(EXPORTS, text)
                result = answer(text, facts, history, online, profile, cards)
                success = True
                reply = '\n'.join(filter(None, (result['reply'], result['source'], result['note'])))
                if cards:
                    reply += '\n\nNotebook context: ' + ', '.join(card.split(':', 1)[0] for card in cards)
            except Exception as exc:
                success = False
                reply = 'Could not get a reply. Check that Ollama is running.\n' + str(exc)
            self.results.put((success, reply))

        threading.Thread(target=work, daemon=True).start()
        self.root.after(100, self.poll)

    def poll(self):
        try:
            success, reply = self.results.get_nowait()
        except queue.Empty:
            self.root.after(100, self.poll)
            return
        self.event('Reply generated' if success else 'Model request failed')
        if success and self.autosave.get():
            try:
                names = export_blocks(reply, EXPORTS)
                if names:
                    self.event(f'Saved {len(names)} file(s) to Explorer.')
                    reply += '\n\nSaved in ' + str(EXPORTS) + ':\n' + '\n'.join(names)
            except OSError as exc:
                self.event('File save failed: ' + str(exc))
                reply += '\nFile save failed: ' + str(exc)
        self.chat.append(('SPROUT', reply))
        self.chat = self.chat[-80:]
        self.busy = False
        self.status.set('Ready')
        self.study_button.configure(state='normal')
        self.finish_run('Reply ready' if success else 'Request failed')
        self.button.configure(state='normal')
        self.save()


if __name__ == '__main__':
    window = tk.Tk()
    Desktop(window)
    window.mainloop()
