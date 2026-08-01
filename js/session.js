/* ============================================================
   session.js — regra dos 5 minutos
   • Ausência < 5 min: volta exatamente onde parou
   • Ausência ≥ 5 min: abre na tela inicial
   ============================================================ */

import { state } from './store.js';
import { saveNow } from './storage.js';

export const SESSION_LIMIT_MS = 5 * 60 * 1000;

/**
 * Decide o ponto de retomada a partir da sessão gravada.
 * Aplica selectedFolder/openNote no estado apenas se a
 * ausência foi menor que o limite.
 */
export function restore(session) {
  if (!session || !session.lastActive) return;
  const away = Date.now() - session.lastActive;
  if (away < SESSION_LIMIT_MS) {
    state.selectedFolder = session.selectedFolder || null;
    state.openNote = session.openNote || null;
  }
  // ausência longa: estado permanece na tela inicial
}

/**
 * Mantém o "batimento" da sessão: grava lastActive
 * periodicamente e sempre que o app perde o foco.
 */
export function startHeartbeat() {
  setInterval(saveNow, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
  window.addEventListener('pagehide', saveNow);
}
