/* global window, document, MutationObserver */
/**
 * Arena Re-skin Engine
 * ====================
 *
 * Replaces a web app's *interface* with a different one without breaking its
 * behaviour. The trick is that we never copy or re-implement anything:
 *
 *   1. We find the site's own elements (composer, message list, send button…)
 *      and **move the real DOM nodes** into our new layout.
 *   2. Because they are the same nodes, every event listener, React handler,
 *      internal state and network call keeps working exactly as before.
 *   3. We record where each node came from, so `unmount()` puts the page back
 *      byte-for-byte.
 *
 * What this CAN do:  take over layout, hierarchy, typography, spacing, and
 *                    re-order the pieces into a different design language.
 * What this CANNOT do: invent functionality the site doesn't have, or change
 *                    how a site's own components are composed internally.
 *
 * No dependencies. Runs in the page's main world (or under jsdom in tests).
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';

  /** Where each adopted node came from, so we can restore it exactly. */
  function recordOrigin(node) {
    return {
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling,
      // Record the raw attributes, not the computed state: restoring them is
      // exact even if the site or the framework also edits them.
      hadStyleAttr: node.hasAttribute ? node.hasAttribute('style') : false,
      originalDisplay: node.style ? node.style.display : '',
      originalClassAttr: node.hasAttribute && node.hasAttribute('class')
        ? node.getAttribute('class')
        : null
    };
  }

  function restoreOrigin(record) {
    const { node, parent, nextSibling } = record;
    if (!parent) return;
    try {
      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(node, nextSibling);
      } else {
        parent.appendChild(node);
      }
      if (node.style) node.style.display = record.originalDisplay;

      if (record.addedAttr && node.hasAttribute(record.addedAttr)) {
        node.removeAttribute(record.addedAttr);
      }

      // Classes: put back exactly what was there. A browser normalises an empty
      // classList to class="", so restore the original attribute verbatim, and
      // drop the attribute entirely when the site never had one.
      if (node.className !== undefined) {
        if (record.originalClassAttr === null) {
          node.removeAttribute('class');
        } else {
          node.setAttribute('class', record.originalClassAttr);
        }
      }

      // Inline styles we blanked must not leave style="" behind.
      if (node.style && !record.hadStyleAttr && node.getAttribute('style') === '') {
        node.removeAttribute('style');
      }
    } catch {
      /* the page may have removed the parent; nothing sensible to do */
    }
  }

  /**
   * Resolve a selector to the first visible element.
   * Sites often render several hidden duplicates; we want the live one.
   */
  function queryFirst(scope, selector) {
    if (!selector) return null;
    let list;
    try {
      list = scope.querySelectorAll(selector);
    } catch {
      return null; // invalid selector typed by a user
    }
    for (const el of list) {
      if (el.offsetParent !== null || el.getClientRects().length > 0) return el;
    }
    return list[0] || null;
  }

  class ReskinEngine {
    constructor(options = {}) {
      this.doc = options.doc || (typeof document !== 'undefined' ? document : null);
      this.win = options.win || (this.doc && this.doc.defaultView) || null;
      this.onChange = options.onChange || (() => {});
      this.profile = null;
      this.mapping = {};
      this.mounted = false;
      this.roots = { overlay: null, host: null };
      this.origins = new Map();   // node -> record
      this._addedAttrs = new Map(); // node -> attribute name we introduced
      this._touched = new Set();    // every node we changed, for exact restore
      this.slots = new Map();     // role -> element
      this._inPlace = new Set();  // roles satisfied inside an adopted container
      this._formHosts = new Map(); // role -> <form> adopted on its behalf
      this._formRoles = new Map(); // <form> -> roles that stay inside it
      this.observers = [];
      this.stats = { adopted: 0, messages: 0, since: null };
      this._messageObserver = null;
      this._debounce = null;
    }

    /* ------------------------------------------------------------ helpers */

    el(tag, cls, text) {
      const node = this.doc.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    /** Look up the live element for a role, falling back to the profile. */
    resolve(role) {
      if (!this.doc) return null;
      const mapped = this.mapping[role];
      if (mapped) {
        const found = queryFirst(this.doc, mapped);
        if (found) return found;
      }
      const selector = this.profile && this.profile.selectors[role];
      return selector ? queryFirst(this.doc, selector) : null;
    }

    /**
     * Auto-detect the parts of an unfamiliar page.
     * Order matters: the most specific signals win.
     */
    autoMap() {
      const doc = this.doc;
      const found = {};

      const pick = (selectors) => {
        for (const sel of selectors) {
          const el = queryFirst(doc, sel);
          if (el) return selectorFor(el);
        }
        return null;
      };

      // Composer: the thing users type into.
      found.composer = pick([
        'textarea[placeholder]',
        'form textarea',
        'textarea',
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"]'
      ]);

      // Send button: an accessible name or a submit inside the composer's form.
      const composerEl = found.composer ? queryFirst(doc, found.composer) : null;
      const sendCandidates = [
        'button[aria-label*="send" i]',
        'button[type="submit"]',
        '[data-testid*="send" i]',
        'form button:not([type="button"])'
      ];
      found.send = null;
      for (const sel of sendCandidates) {
        const scope = composerEl ? (composerEl.closest('form') || doc) : doc;
        const btn = queryFirst(scope, sel);
        if (btn) { found.send = selectorFor(btn); break; }
      }

      // Conversation: pick the ancestor that holds the most repeated siblings.
      const container = findMessageContainer(doc);
      if (container) found.messages = selectorFor(container);

      // "New chat" / "New session": an explicit control, so parity survives
      // the re-skin (the site's own button is moved, not re-created).
      const newChatSel = ['[data-testid*="new" i]', 'a[href="/"]', 'button'];
      let newChat = null;
      for (const sel of newChatSel) {
        for (const el of doc.querySelectorAll(sel)) {
          // Lower-case the whole label: appending .toLowerCase() to the last
          // template literal only would leave the visible text untouched.
          const label = (
            `${el.textContent || ''} ${el.getAttribute('aria-label') || ''} ` +
            `${el.getAttribute('title') || ''}`
          ).toLowerCase();
          if (/new (chat|conversation|session|thread)|start (a )?(new|over)|\+ ?new/.test(label)) {
            newChat = el;
            break;
          }
        }
        if (newChat) break;
      }
      if (newChat) found.newChat = selectorFor(newChat);

      // Header / nav: the first bar-like element at the top.
      found.header = pick([
        'header',
        '[role="banner"]',
        'nav'
      ]);

      // The session list: the nav-ish container that we did NOT pick as the
      // transcript (containers holding many links and little prose).
      const msgEl = found.messages ? queryFirst(doc, found.messages) : null;
      for (const el of doc.querySelectorAll('nav, aside, [role="navigation"]')) {
        if (msgEl && (el.contains(msgEl) || msgEl.contains(el))) continue;
        if (el.querySelectorAll('a, li').length >= 2) { found.sidebar = selectorFor(el); break; }
      }

      this.mapping = found;
      return { ...found };
    }

    /* ------------------------------------------------------------- mount */

    mount(profile, mapping) {
      if (!this.doc || !this.win) return { ok: false, error: 'No document to mount into.' };
      if (this.mounted) this.unmount();

      this.profile = profile;
      this.mapping = { ...(profile.selectors || {}), ...(mapping || {}) };
      this.stats = { adopted: 0, messages: 0, since: Date.now() };
      this._inPlace = new Set();

      const body = this.doc.body;
      if (!body) return { ok: false, error: 'Document has no body yet.' };

      // Root overlay. It sits above the original page but is transparent to
      // layout, so the page keeps its own scroll container.
      const overlay = this.el('div', `arena-reskin arena-reskin--${profile.id}`);
      overlay.setAttribute('data-arena-reskin', VERSION);

      const host = this.el('div', 'arena-rs-host');
      overlay.appendChild(host);

      this.roots = { overlay, host };

      // Attach the overlay *before* building the layout. Slots are resolved
      // against the live document, so a detached host would make every role
      // after the first appear to have vanished.
      body.appendChild(overlay);

      this.groupForms(this.rolesInLayout(profile.layout));
      this.buildLayout(profile.layout, host);

      // Hide the original chrome, keeping the message list alive inside us.
      this.hideOriginals();

      this.mounted = true;
      this.watchMessages();
      this.report();
      return { ok: true, stats: this.stats };
    }

    /** Remember a node's original attributes before the first change to it. */
    touch(node) {
      if (!node) return;
      if (!this._touched.has(node)) this._touched.add(node);
      if (!this.origins.has(node)) {
        const record = recordOrigin(node);
        record.isOriginal = true; // not moved, only styled
        this.origins.set(node, record);
      }
    }

    hideOriginals() {
      const body = this.doc.body;
      for (const child of Array.from(body.children)) {
        if (child === this.roots.overlay) continue;
        // Never hide the node we just adopted (it may still be a body child
        // until the move completes) or our own style tag.
        if (this.origins.has(child)) continue;
        if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE' || child.tagName === 'LINK') continue;
        this.touch(child);
        child.style.display = 'none';
      }
    }

    /** Every role a layout asks for, in layout order. */
    rolesInLayout(layout, acc = []) {
      for (const spec of layout || []) {
        if (spec.slot) acc.push(spec.slot);
        if (spec.children) this.rolesInLayout(spec.children, acc);
      }
      return acc;
    }

    /**
     * Recursively build the replacement UI.
     * Layout nodes: { tag, cls, text, slot, children }
     */
    buildLayout(node, parent) {
      for (const spec of node || []) {
        const element = this.el(spec.tag || 'div', spec.cls || '');
        if (spec.text !== undefined) element.textContent = spec.text;

        if (spec.slot) {
          // A role that is part of a form group is covered by the form slot
          // that is adopted for the first role of the group.
          const formHost = this._formHosts && this._formHosts.get(spec.slot);
          const source = formHost || this.resolve(spec.slot);
          element.setAttribute('data-arena-slot', spec.slot);
          if (!formHost && source && this.isInsideAdopted(source)) {
            // The role lives *inside* a container we already adopted (a "new
            // chat" button inside the site header, say). Pulling it out would
            // tear a hole in that container, so leave it in place and mark the
            // slot as satisfied rather than moving it.
            element.classList.add('arena-rs-inplace');
            element.setAttribute('data-arena-inplace', spec.slot);
            this._inPlace.add(spec.slot);
          } else if (source) {
            if (formHost) {
              // The form is what we move; the roles inside it keep their own
              // identity so a profile can still style "the composer" and the
              // "send button" as such. Mark them BEFORE adopting, while they
              // are still reachable from the document.
              const group = [spec.slot, ...(this._formRoles.get(formHost) || [])];
              for (const role of group) {
                this._inPlace.add(role);
                this.markRole(this.resolve(role), role);
              }
              this.adopt(source, element, `${spec.slot}-form`);
              element.classList.add('arena-rs-formslot');
            } else {
              this.adopt(source, element, spec.slot);
            }
          } else {
            element.classList.add('arena-rs-missing');
            element.setAttribute('data-arena-missing', spec.slot);
            element.textContent = spec.placeholder || '';
          }
        }

        if (spec.attr) {
          for (const [k, v] of Object.entries(spec.attr)) element.setAttribute(k, v);
        }

        parent.appendChild(element);
        this.slots.set(spec.slot || spec.cls || '', element);

        if (spec.children) this.buildLayout(spec.children, element);
      }
    }

    /**
     * Some controls only work as a group: a <textarea> and its submit button
     * inside a <form> rely on the form for Enter-to-send and implicit
     * submission. Moving the children out of the form one by one would break
     * that. So if several roles live in the same <form>, we adopt the form
     * itself for the first of them and leave the rest inside it.
     */
    groupForms(roles) {
      this._formHosts = new Map(); // role -> form element to adopt instead
      this._formRoles = new Map(); // form -> roles that stay inside
      const resolved = new Map();
      for (const role of roles) {
        const el = this.resolve(role);
        if (!el) continue;
        const form = el.closest ? el.closest('form') : null;
        if (!form) continue;
        resolved.set(role, form);
      }

      const byForm = new Map();
      for (const [role, form] of resolved) {
        if (!byForm.has(form)) byForm.set(form, []);
        byForm.get(form).push(role);
      }
      for (const [form, group] of byForm) {
        if (group.length < 2) continue; // a lone control is safe to move
        const [host, ...rest] = group;
        this._formHosts.set(host, form);
        this._formRoles.set(form, rest);
      }
    }

    /** Tag a node with a role without moving it, remembering to undo that. */
    markRole(node, role) {
      if (!node || !node.setAttribute) return;
      this.touch(node);
      if (!node.hasAttribute('data-arena-role')) this._addedAttrs.set(node, 'data-arena-role');
      node.setAttribute('data-arena-role', role);
    }

    /** True when `node` already sits inside a container we have adopted. */
    isInsideAdopted(node) {
      let cur = node && node.parentElement;
      while (cur) {
        if (cur.hasAttribute && cur.hasAttribute('data-arena-role')) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    /** Move a real site node into our layout and remember where it was. */
    adopt(source, target, role) {
      if (!this.origins.has(source)) {
        this.origins.set(source, recordOrigin(source));
      }
      target.appendChild(source);
      this.touch(source);
      if (source.classList) source.classList.add('arena-adopted');
      // Remember whether the site already used this attribute before we did.
      if (!source.hasAttribute('data-arena-role')) {
        this._addedAttrs.set(source, 'data-arena-role');
      }
      source.setAttribute('data-arena-role', role);
      this.stats.adopted += 1;
      return source;
    }

    /* ------------------------------------------------- dynamic messages */

    /**
     * Chat UIs append messages after mount. We restyle each new child of the
     * message container as it appears, so the look stays consistent without
     * re-rendering anything ourselves.
     */
    watchMessages() {
      const container = this.resolve('messages');
      // MutationObserver belongs to the *page's* window, not necessarily to the
      // global scope this script runs in (e.g. under jsdom in tests).
      const MO = (this.win && this.win.MutationObserver) ||
        (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
      if (!container || !MO) return;

      // Count each top-level turn once, but style the nested wrappers too.
      const decorate = (node) => {
        if (!node || node.nodeType !== 1) return;
        this.touch(node);
        if (node.classList) node.classList.add('arena-rs-message');
      };
      const countTurn = () => { this.stats.messages += 1; };

      // Some apps wrap every turn twice (row > bubble); styling the deepest
      // first child keeps the gutter aligned with the visible text.
      //
      // A short, element-free first child is a speaker label ("You",
      // "Assistant") rather than message content. Marking it lets a profile
      // style the label separately while keeping the text itself untouched.
      const decorateTree = (node) => {
        decorate(node);
        for (const child of Array.from(node.children)) decorate(child);
        const first = node.firstElementChild;
        if (first && first !== node && first.children.length === 0) {
          const label = (first.textContent || '').trim();
          if (label.length > 0 && label.length <= 40 && node.children.length > 1) {
            first.classList.add('arena-rs-author');
          }
        }
      };
      for (const child of Array.from(container.children)) { decorateTree(child); countTurn(); }

      const observer = new MO((records) => {
        let changed = false;
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) {
              decorateTree(node);
              countTurn();
              changed = true;
            }
          }
        }
        if (changed) this.report();
      });

      observer.observe(container, { childList: true });
      this._messageObserver = observer;
    }

    /* ------------------------------------------------------------ report */

    report() {
      const payload = this.status();
      try {
        this.onChange(payload);
      } catch {
        /* listener errors must never break the page */
      }
      return payload;
    }

    status() {
      return {
        version: VERSION,
        mounted: this.mounted,
        profile: this.profile ? this.profile.id : null,
        profileName: this.profile ? this.profile.name : null,
        slots: [...this.slots.entries()].map(([role, el]) => ({
          role,
          filled: !el.classList.contains('arena-rs-missing'),
          inPlace: this._inPlace.has(role)
        })),
        inPlace: [...this._inPlace],
        missing: [...this.slots.entries()]
          .filter(([, el]) => el.classList.contains('arena-rs-missing'))
          .map(([role]) => role),
        stats: { ...this.stats }
      };
    }

    /* ---------------------------------------------------------- unmount */

    unmount() {
      if (!this.mounted) return { ok: true, restored: 0 };

      this._inPlace = new Set();
      if (this._messageObserver) {
        this._messageObserver.disconnect();
        this._messageObserver = null;
      }
      for (const observer of this.observers) observer.disconnect();
      this.observers = [];

      // Put every adopted node back before tearing down the overlay.
      let restored = 0;
      for (const [node, record] of this.origins.entries()) {
        record.addedAttr = this._addedAttrs.get(node) || null;
        if (record.isOriginal) {
          // Never moved: undo styling in place.
          if (node.style) node.style.display = record.originalDisplay;
          if (node.getAttribute && !record.hadStyleAttr && node.getAttribute('style') === '') {
            node.removeAttribute('style');
          }
          if (record.originalClassAttr === null) node.removeAttribute && node.removeAttribute('class');
          else if (node.setAttribute) node.setAttribute('class', record.originalClassAttr);
          if (record.addedAttr && node.hasAttribute(record.addedAttr)) node.removeAttribute(record.addedAttr);
        } else {
          restoreOrigin(record);
        }
        restored += 1;
      }
      this.origins.clear();
      this._addedAttrs.clear();
      this._touched.clear();

      if (this.roots.overlay && this.roots.overlay.parentNode) {
        this.roots.overlay.parentNode.removeChild(this.roots.overlay);
      }
      this.roots = { overlay: null, host: null };
      this.slots.clear();
      this.mounted = false;
      this.report();
      return { ok: true, restored };
    }
  }

  /* -------------------------------------------------------------------- */
  /* helpers exported for tests + mapping UI                              */
  /* -------------------------------------------------------------------- */

  /** A short, unique-ish CSS path for an element (used when the user maps). */
  function selectorFor(element) {
    if (!element || element.nodeType !== 1) return '';
    if (element.id) return `#${cssEscape(element.id)}`;

    const parts = [];
    let node = element;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${cssEscape(node.id)}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(' > ');
  }

  function cssEscape(value) {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
    return String(value).replace(/([^\w-])/g, '\\$1');
  }

  /**
   * Find the element that most looks like a message list:
   * an ancestor whose children are numerous and structurally similar.
   */
  function findMessageContainer(doc, minChildren = 2) {
    const candidates = doc.querySelectorAll('main, [role="log"], [role="list"], div, section, ul');
    let best = null;
    let bestScore = 0;

    for (const el of candidates) {
      const children = Array.from(el.children);
      // A single child is fine when the container is explicitly a log/list or
      // is the <main> element: those are named by the app itself.
      const named = el.getAttribute('role') === 'log'
        || el.getAttribute('role') === 'list'
        || el.tagName === 'MAIN';
      if (children.length < minChildren && !(named && children.length >= 1)) continue;

      // Group children by tag+class signature; repetition means "list".
      const sigs = new Map();
      for (const child of children) {
        const sig = `${child.tagName}.${String(child.className || '').split(' ')[0]}`;
        sigs.set(sig, (sigs.get(sig) || 0) + 1);
      }
      const repeated = Math.max(...sigs.values());
      if (repeated < minChildren) continue;

      // Prefer containers that hold text and are not the whole page.
      const text = (el.textContent || '').trim();
      if (text.length < 20) continue;

      // A transcript is long-form prose; a list of links is a sidebar. Counting
      // visible characters per child separates the two without relying on any
      // class names.
      let proseChars = 0;
      for (const child of children) proseChars += (child.textContent || '').trim().length;
      const perChild = proseChars / children.length;
      // A container the app itself labels as a log/list is authoritative, even
      // when its turns are short ("OK", "Done").
      if (!named && perChild < 24) continue;

      let score = repeated * 10 + children.length + Math.min(60, perChild / 6);
      if (el.getAttribute('role') === 'log') score += 50;
      if (el.tagName === 'MAIN') score += 25;
      // Penalise enormous wrappers (they usually contain the header too).
      if (children.length > 40) score -= 30;
      // A container holding a textarea or a submit button is a page shell with
      // the composer inside, not a transcript.
      if (!named) {
        if (el.querySelector('textarea, [contenteditable="true"], button[type="submit"]')) score -= 60;
        // Nav/link-heavy containers are session lists, not conversations.
        if (el.querySelectorAll('a').length > children.length) score -= 45;
      }

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  const api = {
    VERSION,
    ReskinEngine,
    selectorFor,
    findMessageContainer,
    queryFirst
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ArenaReskinEngine = api;
}(typeof window !== 'undefined' ? window : globalThis));
