"""Sprout native desktop client. Run with a Tk-enabled Python installation."""
import json
import os
import subprocess
import sys
import queue
import re
import uuid
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox
from tkinter.scrolledtext import ScrolledText
from server import answer

DATA = Path(os.getenv('LOCALAPPDATA') or Path.home()) / 'Sprout' / 'journal.json'
BG, PANEL, TEXT, MUTED, ACCENT = '#141414', '#1c1c1c', '#e8e6e3', '#a6a3a0', '#e39979'


EXPORTS = DATA.parent / 'Files'
FENCE = re.compile(r'^```([^`\n]*)\n(.*?)^```[ \t]*(?:\n|$)', re.M | re.S)
EXT = {'python': 'py', 'javascript': 'js', 'json': 'json', 'markdown': 'md',
       'html': 'html', 'css': 'css', 'csv': 'csv', 'text': 'txt', 'sql': 'sql'}


def export_blocks(text, folder):
    names = []
    for match in FENCE.finditer(text):
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
        root.protocol('WM_DELETE_WINDOW', self.close)
        root.bind('<Escape>', lambda _: self.stop_study() if self.studying else None)
        self.status = tk.StringVar(value='Ready')
        footer = tk.Frame(root, bg='#2e211d'); footer.pack(side='bottom', fill='x')
        label(footer, '  ✳  Sprout Studio    /    Local session', bg='#2e211d', fg=ACCENT).pack(side='left')
        tk.Label(footer, textvariable=self.status, bg='#2e211d', fg=TEXT).pack(side='right', padx=12)
        rail = tk.Frame(root, bg=BG, padx=3); rail.pack(side='left', fill='y')
        nav = tk.Frame(root, bg=PANEL, width=175); nav.pack(side='left', fill='y'); nav.pack_propagate(False)
        self.views = {}
        for title, icon in [('Explorer', '▤'), ('Memory', '◇')]:
            view = tk.Frame(nav, bg=PANEL, padx=8, pady=12)
            self.views[title] = view
            label(view, title.upper(), fg=MUTED).pack(anchor='w')
            tk.Button(rail, text=icon, fg=ACCENT, width=3, command=lambda t=title: self.show_view(t)).pack(pady=5)
        explorer = self.views['Explorer']; label(explorer, '⌄  Sprout / Files', fg=ACCENT).pack(anchor='w', pady=10)
        self.files = tk.Listbox(explorer, relief='flat', exportselection=False, font=('Consolas', 9)); self.files.pack(fill='both', expand=True)
        self.files.bind('<<ListboxSelect>>', self.preview_file)
        memory = self.views['Memory']; self.mem = tk.Listbox(memory, relief='flat'); self.mem.pack(fill='both', expand=True)
        tk.Button(memory, text='Forget selected', command=self.forget).pack(fill='x')
        self.show_view('Explorer')
        split = tk.PanedWindow(root, orient='horizontal', bg='#343434', sashwidth=5, bd=0); split.pack(fill='both', expand=True)
        editor = tk.Frame(split, bg=BG); split.add(editor, minsize=220, stretch='always')
        self.tab = label(editor, '   ✦   workspace.md   ', fg=ACCENT, pady=8); self.tab.pack(anchor='w')
        self.preview = ScrolledText(editor, bg=BG, fg=TEXT, insertbackground=TEXT, relief='flat', font=('Consolas', 11), wrap='none', width=38, height=10, padx=12, pady=16)
        self.preview.pack(fill='both', expand=True)
        self.preview.tag_config('number', foreground='#676767')
        self.render_file('# Your local workbench\n\n01  Compose   →   Ask Sprout in the chat panel.\n02  Explore   →   Select a saved file to read it.\n03  Study     →   Start training to grow a coding notebook.\n\nTraining stays on this PC. Press Esc to stop.')
        label(editor, '  OUTPUT   /   SESSION LOG', fg=MUTED, anchor='w', pady=7).pack(fill='x')
        self.output = tk.Text(editor, height=6, width=1, bg='#0d0d0d', fg='#86efac', font=('Consolas', 9), relief='flat', padx=10, pady=8, state='disabled'); self.output.pack(fill='x')
        self.event('Local workspace opened.')
        pane = tk.Frame(split, bg=PANEL, padx=13, pady=10); split.add(pane, minsize=305, stretch='always')
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
            self.studying = True
            self.study_count = 0
            self.study_button.configure(text='■  Stop training', bg='#864c39')
            self.button.configure(state='disabled')
            self.event('Training started · local notebook only. Esc to stop.')
            self.study_step()

    def study_step(self):
        self.study_job = None
        if not self.studying:
            return
        try:
            if self.study_run is None:
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
            self.event('Notebook · ' + note['topic'] + ' → ' + path.name)
            self.update_files()
            self.status.set(f'{self.study_count} notes written · next pass in 5s')
            self.study_job = self.root.after(5000, self.study_step)
        except (OSError, ValueError, KeyError) as exc:
            self.stop_study()
            self.event('Training paused: ' + str(exc))

    def stop_study(self):
        self.studying = False
        if self.study_job is not None:
            self.root.after_cancel(self.study_job)
            self.study_job = None
        if self.study_run is not None:
            self.study_run.kill()
            self.study_run = None
        self.study_button.configure(text='▷  Start training', bg='#43594d')
        self.button.configure(state='normal')
        self.status.set('Training stopped')
        self.event('Training stopped. Completed notes are kept.')

    def close(self):
        if self.studying:
            self.stop_study()
        self.root.destroy()

    def show_view(self, title):
        for view in self.views.values():
            view.pack_forget()
        self.views[title].pack(fill='both', expand=True)

    def event(self, message):
        self.output.configure(state='normal'); self.output.insert('end', '› ' + message + '\n'); 
        if int(self.output.index('end-1c').split('.')[0]) > 150:
            self.output.delete('1.0', '2.0')
        self.output.see('end'); self.output.configure(state='disabled')

    def render_file(self, text):
        self.preview.configure(state='normal'); self.preview.delete('1.0', 'end')
        for n, line in enumerate(text.splitlines(), 1):
            self.preview.insert('end', f'{n:>3}   ', 'number'); self.preview.insert('end', line + '\n')
        self.preview.configure(state='disabled')

    def preview_file(self, event=None):
        sel = self.files.curselection()
        if sel:
            path = EXPORTS / self.files.get(sel[0]); self.tab.configure(text='  ▤  ' + path.name)
            try:
                with path.open(encoding='utf8', errors='replace') as f:
                    self.render_file(f.read(64000))
            except OSError as exc:
                self.render_file(str(exc))

    def update_files(self):
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
                result = answer(text, facts, history, online, profile)
                reply = '\n'.join(filter(None, (result['reply'], result['source'], result['note'])))
            except Exception as exc:
                reply = 'Could not get a reply. Check that Ollama is running.\n' + str(exc)
            self.results.put(reply)

        threading.Thread(target=work, daemon=True).start()
        self.root.after(100, self.poll)

    def poll(self):
        try:
            reply = self.results.get_nowait()
        except queue.Empty:
            self.root.after(100, self.poll)
            return
        if self.autosave.get():
            try:
                names = export_blocks(reply, EXPORTS)
                if names:
                    self.event(f'Saved {len(names)} file(s) to Explorer.')
                    reply += '\n\nSaved in ' + str(EXPORTS) + ':\n' + '\n'.join(names)
            except OSError as exc:
                reply += '\nFile save failed: ' + str(exc)
        self.chat.append(('SPROUT', reply))
        self.chat = self.chat[-80:]
        self.busy = False
        self.status.set('Ready')
        self.study_button.configure(state='normal')
        self.event('Response received.')
        self.button.configure(state='normal')
        self.save()


if __name__ == '__main__':
    window = tk.Tk()
    Desktop(window)
    window.mainloop()
