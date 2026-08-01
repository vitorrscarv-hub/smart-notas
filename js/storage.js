/* ============================================================
   storage.js — persistência local com salvamento automático
   Tudo é gravado em localStorage: nada se perde.
   ============================================================ */

import { state } from './store.js';

const KEY = 'smartnotas:v1';
let saveTimer = null;

/** Carrega os dados gravados. Retorna { folders, notes, session }. */
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Falha ao carregar dados', e);
  }
  return { folders: [], notes: {}, session: null };
}

/** Grava imediatamente estado + sessão. */
export function saveNow() {
  const payload = {
    folders: state.folders,
    notes: state.notes,
    session: {
      selectedFolder: state.selectedFolder,
      openNote: state.openNote,
      lastActive: Date.now(),
    },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
    setSaveTag('Salvo ✓');
  } catch (e) {
    console.error('Falha ao salvar', e);
    setSaveTag('Erro ao salvar');
  }
}

/** Grava com pequeno atraso (evita gravar a cada tecla). */
export function save() {
  setSaveTag('Salvando…');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}

function setSaveTag(text) {
  const el = document.getElementById('saveTag');
  if (el) el.textContent = text;
}
