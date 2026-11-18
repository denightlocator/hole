"""Sprout native desktop client. Run with a Tk-enabled Python installation."""
import json
import os
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
PAPER, INK, MOSS = '#f8f7ef', '#21362e', '#305945'


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
        root.title('Sprout · Field station')
        root.geometry('900x600')
        root.minsize(620, 420)
        root.configure(bg=PAPER)
        side = tk.Frame(root, bg=INK, padx=16, pady=24)
        side.pack(side='left', fill='y')
        tk.Label(side, text='✳ Sprout', bg=INK, fg=PAPER, font=('Georgia', 24)).pack(anchor='w')
        tk.Label(side, text='MEMORY BANK', bg=INK, fg='#bed5aa', pady=15).pack(anchor='w')
        self.mem = tk.Listbox(side, width=23, bg=INK, fg=PAPER, selectbackground=MOSS, relief='flat')
        self.mem.pack(fill='both', expand=True)
        tk.Button(side, text='Forget selected note', command=self.forget).pack(fill='x')
        pane = tk.Frame(root, bg=PAPER, padx=20, pady=20)
        pane.pack(fill='both', expand=True)
        tk.Label(pane, text='Field journal', bg=PAPER, fg=INK, font=('Georgia', 26)).pack(anchor='w')
        self.status = tk.StringVar(value='LOCAL COMPANION  /  READY')
        tk.Label(pane, textvariable=self.status, bg=PAPER, fg=MOSS).pack(anchor='w')
        self.log = ScrolledText(pane, wrap='word', width=1, height=4, bg=PAPER, fg=INK, relief='flat', font=('Segoe UI', 11))
        self.log.pack(fill='both', expand=True, pady=12)
        self.log.tag_config('label', foreground=MOSS, font=('Segoe UI', 10, 'bold'))
        self.log.tag_config('code', background='#23362e', foreground='#e3efd4', font=('Consolas', 11), lmargin1=12, lmargin2=12)
        self.log.tag_config('codehead', foreground=MOSS, font=('Consolas', 9, 'bold'), spacing1=8)
        self.autosave = tk.BooleanVar(value=True)
        tk.Checkbutton(pane, text='Auto-save reply blocks to Files', variable=self.autosave, bg=PAPER).pack(anchor='w')
        self.online = tk.BooleanVar()
        tk.Checkbutton(pane, text='Look up next message on Wikipedia', variable=self.online, bg=PAPER).pack(anchor='w')
        row = tk.Frame(pane, bg=PAPER)
        row.pack(fill='x')
        self.entry = tk.Entry(row, font=('Segoe UI', 12))
        self.entry.pack(side='left', expand=True, fill='x', ipady=6)
        self.entry.bind('<Return>', self.send)
        self.button = tk.Button(row, text='Send ↑', bg=MOSS, fg='white', command=self.send)
        self.button.pack(side='left', padx=5)
        self.refresh()
        self.entry.focus_set()

    def refresh(self):
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
        text = self.entry.get().strip()
        if self.busy or not text:
            return
        match = re.match(r'remember\s+(.+)', text, re.I)
        fact = match[1] if match else text if re.match(r"(?:i |i['’]m |my |we )", text, re.I) and not text.endswith('?') else None
        if fact and fact not in self.facts:
            self.facts.append(fact)
        history, facts, online = self.chat[-8:], self.facts[:], self.online.get()
        self.online.set(False)
        self.chat.append(('YOU', text))
        self.entry.delete(0, 'end')
        self.busy = True
        self.button.configure(state='disabled')
        self.status.set('Thinking…')
        self.save()

        def work():
            try:
                result = answer(text, facts, history, online)
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
                    reply += '\n\nSaved in ' + str(EXPORTS) + ':\n' + '\n'.join(names)
            except OSError as exc:
                reply += '\nFile save failed: ' + str(exc)
        self.chat.append(('SPROUT', reply))
        self.chat = self.chat[-80:]
        self.busy = False
        self.status.set('LOCAL COMPANION  /  READY')
        self.button.configure(state='normal')
        self.save()


if __name__ == '__main__':
    window = tk.Tk()
    Desktop(window)
    window.mainloop()
