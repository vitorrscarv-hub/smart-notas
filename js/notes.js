/* ============================================================
   notes.js — área principal
   Tela inicial, lista de notas da pasta e editor rico
   com troca de fonte e salvamento automático.
   ============================================================ */

import { state, update, uid, currentNote, currentFontStack, FONTS } from './store.js';
import { save } from './storage.js';
import { showNewFolder } from './folders.js';

const TOOLBAR = [
  { label: 'B', cls: 'b', title: 'Negrito', cmd: 'bold' },
  { label: 'I', cls: 'i', title: 'Itálico', cmd: 'italic' },
  { label: 'U', cls: 'u', title: 'Sublinhado', cmd: 'underline' },
  { label: 'S', cls: 's', title: 'Tachado', cmd: 'strikeThrough' },
  { sep: true },
  { label: 'T¹', title: 'Título', cmd: 'formatBlock', val: '<h2>' },
  { label: 'T²', title: 'Subtítulo', cmd: 'formatBlock', val: '<h3>' },
  { label: '¶', title: 'Texto normal', cmd: 'formatBlock', val: '<p>' },
  { sep: true },
  { label: '•', title: 'Lista', cmd: 'insertUnorderedList' },
  { label: '1.', title: 'Lista numerada', cmd: 'insertOrderedList' },
  { label: '❝', title: 'Citação', cmd: 'formatBlock', val: '<blockquote>' },
  { sep: true },
  { label: '⌫', title: 'Limpar formatação', cmd: 'removeFormat' },
];

export function renderMain() {
  const main = document.getElementById('main');
  main.innerHTML = '';
  const note = currentNote();

  if (note) return renderEditor(main, note);
  if (state.folders.length === 0) return renderNoFolders(main);
  if (!state.selectedFolder) return renderPickFolder(main);
  renderNoteList(main);
}

/* ---------- telas vazias ---------- */
function renderNoFolders(main) {
  main.appendChild(emptyScreen(
    'Comece por uma pasta',
    'Para escrever uma nota, primeiro crie uma pasta para guardá-la.',
    'Criar primeira pasta',
    showNewFolder
  ));
}

function renderPickFolder(main) {
  main.appendChild(emptyScreen(
    'Escolha uma pasta',
    'Selecione uma pasta à esquerda para ver as notas dela.'
  ));
}

function emptyScreen(title, text, btnLabel, onBtn) {
  const wrap = el('div', 'empty-center');
  wrap.appendChild(el('p', 'empty-title', title));
  wrap.appendChild(el('p', 'empty-text', text));
  if (btnLabel) {
    const btn = el('button', 'primary-btn', btnLabel);
    btn.addEventListener('click', onBtn);
    wrap.appendChild(btn);
  }
  return wrap;
}

/* ---------- lista de notas ---------- */
function renderNoteList(main) {
  const folder = state.folders.find((f) => f.id === state.selectedFolder);
  if (!folder) return;
  const wrap = el('div', 'note-list-wrap');

  const head = el('div', 'note-list-head');
  head.appendChild(el('h2', 'folder-title', folder.name));
  const btnNew = el('button', 'primary-btn', '+ Nova nota');
  btnNew.addEventListener('click', createNote);
  head.appendChild(btnNew);
  wrap.appendChild(head);

  const list = state.notes[folder.id] || [];
  if (list.length === 0) {
    wrap.appendChild(el('p', 'empty-text', 'Esta pasta está vazia. Crie a primeira nota.'));
  }

  list.forEach((n) => {
    const card = el('div', 'note-card');
    const body = el('div', 'note-card-body');
    body.appendChild(el('div', 'note-card-title', n.title || 'Sem título'));
    body.appendChild(el('div', 'note-card-prev', preview(n.html) || 'Nota vazia'));
    card.appendChild(body);

    const meta = el('div', 'note-card-meta');
    meta.appendChild(el('span', '', fmtDate(n.updatedAt)));
    const del = el('button', 'tiny-btn', '×');
    del.title = 'Excluir nota';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Excluir esta nota?')) return;
      update((s) => {
        s.notes[folder.id] = s.notes[folder.id].filter((x) => x.id !== n.id);
        if (s.openNote && s.openNote.noteId === n.id) s.openNote = null;
      });
      save();
    });
    meta.appendChild(del);
    card.appendChild(meta);

    card.addEventListener('click', () => {
      update((s) => { s.openNote = { folderId: folder.id, noteId: n.id }; });
      save();
    });
    wrap.appendChild(card);
  });

  main.appendChild(wrap);
}

function createNote() {
  if (!state.selectedFolder) return;
  const note = { id: uid(), title: '', html: '', font: 'sistema', updatedAt: Date.now() };
  update((s) => {
    s.notes[s.selectedFolder].unshift(note);
    s.openNote = { folderId: s.selectedFolder, noteId: note.id };
  });
  save();
}

/* ---------- editor ---------- */
function renderEditor(main, note) {
  const wrap = el('div', 'editor-wrap');

  // topo: voltar + fonte
  const top = el('div', 'editor-top');
  const back = el('button', 'back-btn', '← Voltar');
  back.addEventListener('click', () => {
    update((s) => { s.openNote = null; });
    save();
  });
  top.appendChild(back);

  const fontSel = el('select', 'font-select');
  FONTS.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.label;
    if (f.id === (note.font || 'sistema')) opt.selected = true;
    fontSel.appendChild(opt);
  });
  fontSel.title = 'Fonte da nota';
  fontSel.addEventListener('change', () => {
    patchNote({ font: fontSel.value });
    const stack = currentFontStack();
    title.style.fontFamily = stack;
    editor.style.fontFamily = stack;
  });
  top.appendChild(fontSel);
  wrap.appendChild(top);

  // título
  const title = document.createElement('input');
  title.className = 'title-input';
  title.placeholder = 'Título da nota';
  title.value = note.title;
  title.style.fontFamily = currentFontStack();
  title.addEventListener('input', () => patchNote({ title: title.value }));
  wrap.appendChild(title);

  // barra de formatação
  const bar = el('div', 'toolbar');
  TOOLBAR.forEach((t) => {
    if (t.sep) return bar.appendChild(el('span', 'tool-sep'));
    const btn = el('button', 'tool-btn' + (t.cls ? ' ' + t.cls : ''), t.label);
    btn.title = t.title;
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // preserva a seleção
    btn.addEventListener('click', () => {
      editor.focus();
      document.execCommand(t.cmd, false, t.val || null);
      patchNote({ html: editor.innerHTML });
    });
    bar.appendChild(btn);
  });
  wrap.appendChild(bar);

  // área de escrita
  const editor = el('div', 'editor');
  editor.contentEditable = 'true';
  editor.dataset.placeholder = 'Escreva aqui…';
  editor.innerHTML = note.html || '';
  editor.style.fontFamily = currentFontStack();
  editor.addEventListener('input', () => patchNote({ html: editor.innerHTML }));
  editor.addEventListener('blur', () => patchNote({ html: editor.innerHTML }));
  wrap.appendChild(editor);

  main.appendChild(wrap);
}

/** Atualiza a nota aberta sem redesenhar o editor (evita perder o cursor). */
function patchNote(patch) {
  if (!state.openNote) return;
  const list = state.notes[state.openNote.folderId] || [];
  const n = list.find((x) => x.id === state.openNote.noteId);
  if (!n) return;
  Object.assign(n, patch, { updatedAt: Date.now() });
  save();
}

/* ---------- utilidades ---------- */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function preview(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').trim().slice(0, 90);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}
