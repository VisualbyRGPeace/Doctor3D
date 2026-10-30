/* ============ Doctor3D · Mini Notes App ============ */
"use strict";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

const NOTE_COLORS = {
  default: "#6366f1", yellow: "#f59e0b", green: "#10b981",
  blue: "#3b82f6", pink: "#ec4899", purple: "#8b5cf6"
};

let notes = store.get("doctor3d_notes", []);
let todos = store.get("doctor3d_todos", []);
let editingNoteId = null;
let noteColor = "default";
let todoFilter = "all";

/* ---------- Theme ---------- */
function initTheme() {
  const saved = store.get("doctor3d_theme", null);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? "dark" : "light");
}
$("#themeToggle").addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme;
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  store.set("doctor3d_theme", next);
});

/* ---------- Tabs ---------- */
$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach((b) => b.classList.remove("active"));
    $$(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* ---------- Notes ---------- */
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderNotes() {
  const q = $("#noteSearch").value.trim().toLowerCase();
  const grid = $("#notesGrid");
  const list = notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));

  $("#notesCount").textContent = notes.length;
  $("#notesEmpty").classList.toggle("hidden", list.length > 0);

  grid.innerHTML = list.map((n) => `
    <article class="note-card" data-id="${n.id}" style="--note-color:${NOTE_COLORS[n.color] || NOTE_COLORS.default}">
      <h3>${esc(n.title) || "Không tiêu đề"}</h3>
      <p>${esc(n.body)}</p>
      <div class="note-meta">
        <span class="note-date">${fmtDate(n.updatedAt)}</span>
        <button class="note-del" data-del="${n.id}" title="Xóa ghi chú">🗑️</button>
      </div>
    </article>`).join("");
}

$("#notesGrid").addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    e.stopPropagation();
    if (confirm("Xóa ghi chú này?")) {
      notes = notes.filter((n) => n.id !== delBtn.dataset.del);
      store.set("doctor3d_notes", notes);
      renderNotes();
    }
    return;
  }
  const card = e.target.closest(".note-card");
  if (card) openNoteModal(card.dataset.id);
});

$("#noteSearch").addEventListener("input", renderNotes);

function openNoteModal(id = null) {
  editingNoteId = id;
  const n = id ? notes.find((x) => x.id === id) : null;
  $("#modalTitle").textContent = n ? "Sửa ghi chú" : "Ghi chú mới";
  $("#noteTitle").value = n ? n.title : "";
  $("#noteBody").value = n ? n.body : "";
  noteColor = n ? n.color : "default";
  $$("#colorRow .color-dot").forEach((d) =>
    d.classList.toggle("selected", d.dataset.color === noteColor));
  $("#noteModal").classList.remove("hidden");
  setTimeout(() => $("#noteTitle").focus(), 50);
}
function closeNoteModal() { $("#noteModal").classList.add("hidden"); }

$("#addNoteBtn").addEventListener("click", () => openNoteModal());
$("#cancelNote").addEventListener("click", closeNoteModal);
$("#noteModal").addEventListener("click", (e) => {
  if (e.target.id === "noteModal") closeNoteModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNoteModal();
});

$$("#colorRow .color-dot").forEach((d) => {
  d.addEventListener("click", () => {
    noteColor = d.dataset.color;
    $$("#colorRow .color-dot").forEach((x) => x.classList.remove("selected"));
    d.classList.add("selected");
  });
});

$("#saveNote").addEventListener("click", () => {
  const title = $("#noteTitle").value.trim();
  const body = $("#noteBody").value.trim();
  if (!title && !body) { $("#noteTitle").focus(); return; }
  if (editingNoteId) {
    const n = notes.find((x) => x.id === editingNoteId);
    if (n) { n.title = title; n.body = body; n.color = noteColor; n.updatedAt = Date.now(); }
  } else {
    notes.push({ id: "n" + Date.now(), title, body, color: noteColor, updatedAt: Date.now() });
  }
  store.set("doctor3d_notes", notes);
  renderNotes();
  closeNoteModal();
});

/* ---------- Todos ---------- */
function renderTodos() {
  const list = $("#todoList");
  const done = todos.filter((t) => t.done).length;
  const total = todos.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $("#todosCount").textContent = todos.filter((t) => !t.done).length;
  $("#progressText").textContent = `${done} / ${total} hoàn thành`;
  $("#progressPct").textContent = pct + "%";
  $("#progressFill").style.width = pct + "%";

  const visible = todos.filter((t) =>
    todoFilter === "all" || (todoFilter === "done" ? t.done : !t.done));

  $("#todosEmpty").classList.toggle("hidden", visible.length > 0);

  list.innerHTML = visible.map((t) => `
    <li class="todo-item ${t.done ? "done" : ""}" data-id="${t.id}">
      <button class="todo-check" data-check="${t.id}" title="Đánh dấu xong">${t.done ? "✓" : ""}</button>
      <span class="todo-text">${esc(t.text)}</span>
      <button class="todo-del" data-tdel="${t.id}" title="Xóa">✕</button>
    </li>`).join("");
}

$("#todoList").addEventListener("click", (e) => {
  const check = e.target.closest("[data-check]");
  const del = e.target.closest("[data-tdel]");
  if (check) {
    const t = todos.find((x) => x.id === check.dataset.check);
    if (t) { t.done = !t.done; store.set("doctor3d_todos", todos); renderTodos(); }
  } else if (del) {
    todos = todos.filter((x) => x.id !== del.dataset.tdel);
    store.set("doctor3d_todos", todos); renderTodos();
  }
});

$("#todoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("#todoInput").value.trim();
  if (!text) return;
  todos.unshift({ id: "t" + Date.now(), text, done: false });
  $("#todoInput").value = "";
  store.set("doctor3d_todos", todos);
  renderTodos();
});

$$(".filters .chip[data-filter]").forEach((c) => {
  c.addEventListener("click", () => {
    $$(".filters .chip[data-filter]").forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    todoFilter = c.dataset.filter;
    renderTodos();
  });
});

$("#clearDone").addEventListener("click", () => {
  if (!todos.some((t) => t.done)) return;
  if (confirm("Xóa tất cả việc đã hoàn thành?")) {
    todos = todos.filter((t) => !t.done);
    store.set("doctor3d_todos", todos);
    renderTodos();
  }
});

/* ---------- Init ---------- */
initTheme();
renderNotes();
renderTodos();
