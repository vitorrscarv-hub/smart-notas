/* ============================================================
   store.js — estado central do Smart Notas
   ============================================================ */

export const FONTS = [
  { id: 'sistema', label: 'Sistema', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: 'claude',  label: 'Claude (serifada)', stack: "'Lora', Georgia, serif" },
  { id: 'gemini',  label: 'Gemini (Google Sans)', stack: "'Outfit', 'Segoe UI', sans-serif" },
  { id: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'times',   label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { id: 'arial',   label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'mono',    label: 'Monoespaçada', stack: "'Courier New', Courier, monospace" },
];

export const state = {
  folders: [],          // [{ id, name }]
  notes: {},            // { folderId: [{ id, title, html, font, updatedAt }] }
  selectedFolder: null, // pasta aberta
  openNote: null,       // { folderId, noteId } | null
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const listeners = [];

/** Registra uma função chamada a cada mudança de estado. */
export function subscribe(fn) {
  listeners.push(fn);
}

/** Aplica mudanças ao estado e notifica a interface. */
export function update(mutator) {
  mutator(state);
  listeners.forEach((fn) => fn());
}

/** Retorna a nota aberta no momento (ou null). */
export function currentNote() {
  if (!state.openNote) return null;
  const list = state.notes[state.openNote.folderId] || [];
  return list.find((n) => n.id === state.openNote.noteId) || null;
}

/** Fonte (stack CSS) da nota aberta. */
export function currentFontStack() {
  const n = currentNote();
  const f = FONTS.find((x) => x.id === (n && n.font)) || FONTS[0];
  return f.stack;
}
