const list = document.getElementById("list");
const stats = document.getElementById("stats");
const form = document.getElementById("new-task");
const input = document.getElementById("title");
const errorBox = document.getElementById("error");

async function request(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Error inesperado");
  return body;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function render({ data, stats: s }) {
  list.replaceChildren(
    ...data.map((task) => {
      const li = document.createElement("li");
      li.className = task.done ? "done" : "";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = task.done;
      box.setAttribute("aria-label", `Completar ${task.title}`);
      box.addEventListener("change", () => update(task.id, { done: box.checked }));
      const label = document.createElement("span");
      label.textContent = task.title;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Eliminar";
      del.addEventListener("click", () => remove(task.id));
      li.append(box, label, del);
      return li;
    }),
  );
  stats.textContent = `${s.pending} pendientes · ${s.done} completadas`;
}

async function refresh() {
  try {
    render(await request("/api/tasks"));
    showError("");
  } catch (err) {
    showError(err.message);
  }
}

async function update(id, changes) {
  try {
    await request(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
  } catch (err) {
    showError(err.message);
  }
  refresh();
}

async function remove(id) {
  try {
    await request(`/api/tasks/${id}`, { method: "DELETE" });
  } catch (err) {
    showError(err.message);
  }
  refresh();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/tasks", { method: "POST", body: JSON.stringify({ title: input.value }) });
    input.value = "";
  } catch (err) {
    showError(err.message);
  }
  refresh();
});

refresh();
