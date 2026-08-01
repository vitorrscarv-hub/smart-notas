/* ============================================================
   folders.js — coluna de pastas
   Criação, renomeação, exclusão e reordenação por arrasto
   (funciona com toque e com mouse, via Pointer Events).
   ============================================================ */

import { state, update, uid } from './store.js';
import { save } from './storage.js';

const ITEM_H = 46; // altura fixa de cada linha de pasta
let drag = null;   // { index, startY, moved }
let renamingId = null;

export function initFolders() {
  document.getElementById('btnNewFolder').addEventListener('click', showNewFolder);
  document.getElementById('btnConfirmFolder').addEventListener('click', createFolder);
  document.getElementById('newFolderName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createFolder();
    if (e.key === 'Escape') hideNewFolder();
  });
  document.getElementById('btnSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('hidden');
  });
}

export function showNewFolder() {
  document.getElementById('newFolderRow').classList.remove('hidden');
  document.getElementById('newFolderName').focus();
}

function hideNewFolder() {
  document.getElementById('newFolderRow').classList.add('hidden');
  document.getElementById('newFolderName').value = '';
}

function createFolder() {
  const input = document.getElementById('newFolderName');
  const name = input.value.trim();
  if (!name) return;
  const folder = { id: uid(), name };
  update((s) => {
    s.folders.push(folder);
    s.notes[folder.id] = [];
    s.selectedFolder = folder.id;
    s.openNote = null;
  });
  hideNewFolder();
  save();
}

function deleteFolder(id) {
  if (!confirm('Excluir esta pasta e todas as notas dela?')) return;
  update((s) => {
    s.folders = s.folders.filter((f) => f.id !== id);
    delete s.notes[id];
    if (s.selectedFolder === id) s.selectedFolder = null;
    if (s.openNote && s.openNote.folderId === id) s.openNote = null;
  });
  save();
}

/* ---------- renderização ---------- */
export function renderFolders() {
  const list = document.getElementById('folderList');
  const empty = document.getElementById('sideEmpty');
  list.innerHTML = '';
  empty.classList.toggle('hidden', state.folders.length > 0);

  state.folders.forEach((folder, index) => {
    const row = document.createElement('div');
    row.className = 'folder-row' + (state.selectedFolder === folder.id ? ' active' : '');
    row.dataset.index = index;

    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.title = 'Arraste para reordenar';
    handle.textContent = '⠿';
    handle.addEventListener('pointerdown', (e) => startDrag(e, index));
    row.appendChild(handle);

    if (renamingId === folder.id) {
      const input = document.createElement('input');
      input.className = 'folder-input';
      input.style.flex = '1';
      input.value = folder.name;
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
      });
      input.addEventListener('blur', () => {
        const name = input.value.trim();
        renamingId = null;
        if (name) {
          update((s) => {
            const f = s.folders.find((x) => x.id === folder.id);
            if (f) f.name = name;
          });
          save();
        } else {
          update(() => {});
        }
      });
      row.appendChild(input);
      requestAnimationFrame(() => input.focus());
    } else {
      const name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = folder.name;
      row.appendChild(name);

      const count = document.createElement('span');
      count.className = 'folder-count';
      count.textContent = (state.notes[folder.id] || []).length;
      row.appendChild(count);

      const actions = document.createElement('span');
      actions.className = 'row-actions';

      const btnRen = document.createElement('button');
      btnRen.className = 'tiny-btn';
      btnRen.title = 'Renomear';
      btnRen.textContent = '✎';
      btnRen.addEventListener('click', (e) => {
        e.stopPropagation();
        renamingId = folder.id;
        update(() => {});
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'tiny-btn';
      btnDel.title = 'Excluir pasta';
      btnDel.textContent = '×';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFolder(folder.id);
      });

      actions.appendChild(btnRen);
      actions.appendChild(btnDel);
      row.appendChild(actions);
    }

    row.addEventListener('click', () => {
      if (drag && drag.moved) return;
      update((s) => {
        s.selectedFolder = folder.id;
        s.openNote = null;
      });
      save();
      // em telas pequenas, fecha a coluna ao escolher a pasta
      if (window.matchMedia('(max-width: 640px)').matches) {
        document.getElementById('sidebar').classList.add('hidden');
      }
    });

    list.appendChild(row);
  });
}

/* ---------- arrastar e soltar ---------- */
function startDrag(e, index) {
  if (renamingId) return;
  e.preventDefault();
  drag = { index, startY: e.clientY, moved: false };
  const rows = () => [...document.querySelectorAll('.folder-row')];
  rows()[index].classList.add('dragging');

  const onMove = (ev) => {
    if (!drag) return;
    const off = ev.clientY - drag.startY;
    if (Math.abs(off) > 4) drag.moved = true;
    const target = clampTarget(drag.index + Math.round(off / ITEM_H));
    rows().forEach((row, i) => {
      if (i === drag.index) {
        row.style.transform = `translateY(${off}px) scale(1.02)`;
      } else {
        let shift = 0;
        if (drag.index < target && i > drag.index && i <= target) shift = -ITEM_H;
        if (drag.index > target && i < drag.index && i >= target) shift = ITEM_H;
        row.style.transform = `translateY(${shift}px)`;
      }
    });
  };

  const onUp = (ev) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (drag) {
      const off = ev.clientY - drag.startY;
      const from = drag.index;
      const to = clampTarget(from + Math.round(off / ITEM_H));
      const moved = drag.moved;
      drag = null;
      if (to !== from) {
        update((s) => {
          const [item] = s.folders.splice(from, 1);
          s.folders.splice(to, 0, item);
        });
        save();
      } else {
        update(() => {}); // redesenha e limpa transformações
      }
      // impede o clique fantasma após o arrasto
      if (moved) setTimeout(() => (drag = null), 0);
    }
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function clampTarget(i) {
  return Math.max(0, Math.min(state.folders.length - 1, i));
}
