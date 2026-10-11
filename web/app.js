(() => {
  const DATA = window.__HABITS__;
  if (!DATA || !DATA.habits) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:system-ui'>Missing habits data. Run build.py.</p>";
    return;
  }

  const STORE_KEY = "habit-streaks-v1";
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function startOfWeek(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function weekKey(d) {
    const s = startOfWeek(d);
    return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
  }

  function dateKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function parseYMD(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function fmtWeekRange(wk) {
    const start = parseYMD(wk);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const opts = { month: "short", day: "numeric" };
    const yOpts = { month: "short", day: "numeric", year: "numeric" };
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, yOpts)}`;
  }

  function dayKeyForDate(d) {
    const day = d.getDay();
    return DAY_KEYS[day === 0 ? 6 : day - 1];
  }

  function datesInWeek(wk) {
    const start = parseYMD(wk);
    return DAY_KEYS.map((_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { key: DAY_KEYS[i], label: DAY_LABELS[i], date: d, ymd: dateKey(d) };
    });
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  let store = loadStore();
  let currentWeek = weekKey(new Date());
  if (!store.checks) store.checks = {}; // habitId|ymd -> true
  if (!store.freezes) store.freezes = {}; // ymd -> true
  if (!store.demoSeeded) store.demoSeeded = false;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function checkKey(habitId, ymd) {
    return `${habitId}|${ymd}`;
  }

  function isChecked(habitId, ymd) {
    return !!store.checks[checkKey(habitId, ymd)];
  }

  function setChecked(habitId, ymd, on) {
    const k = checkKey(habitId, ymd);
    if (on) store.checks[k] = true;
    else delete store.checks[k];
    saveStore(store);
  }

  function isFrozen(ymd) {
    return !!store.freezes[ymd];
  }

  function freezesInRolling7(fromYmd) {
    const end = parseYMD(fromYmd);
    let n = 0;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
      const ymd = dateKey(d);
      if (isFrozen(ymd)) {
        n++;
        days.push(ymd);
      }
    }
    return { n, days };
  }

  function canFreeze(ymd) {
    if (isFrozen(ymd)) return false;
    return freezesInRolling7(ymd).n < 1;
  }

  function setFreeze(ymd, on) {
    if (on) {
      if (!canFreeze(ymd) && !isFrozen(ymd)) return false;
      store.freezes[ymd] = true;
    } else {
      delete store.freezes[ymd];
    }
    saveStore(store);
    return true;
  }

  /** Streak: consecutive days ending today where habit checked OR day frozen */
  function streakFor(habitId) {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const ymd = dateKey(d);
      if (isChecked(habitId, ymd) || isFrozen(ymd)) streak++;
      else break;
    }
    return streak;
  }

  function weekDoneCount(habitId, wk) {
    return datesInWeek(wk).filter((d) => isChecked(habitId, d.ymd)).length;
  }

  function todayYmd() {
    return dateKey(new Date());
  }

  function seedDemoIfNeeded() {
    if (store.demoSeeded) return;
    // Soft EXAMPLE history for screenshots: check a few days for first 3 habits
    const today = new Date();
    const habits = DATA.habits.slice(0, 3);
    for (let i = 1; i <= 4; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const ymd = dateKey(d);
      for (const h of habits) {
        if (i % 2 === 1 || h.id === "walk-20") setChecked(h.id, ymd, true);
      }
    }
    // freeze one day 5 days ago as EXAMPLE
    const f = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
    store.freezes[dateKey(f)] = true;
    store.demoSeeded = true;
    saveStore(store);
  }

  function renderStats() {
    const row = $("#statRow");
    if (!row) return;
    const today = todayYmd();
    const doneToday = DATA.habits.filter((h) => isChecked(h.id, today)).length;
    const best = Math.max(0, ...DATA.habits.map((h) => streakFor(h.id)));
    const fr = freezesInRolling7(today);
    const freezeReady = fr.n < 1;
    row.innerHTML = `
      <div class="stat"><span class="n">${doneToday}/${DATA.habits.length}</span><span class="l">Today</span></div>
      <div class="stat"><span class="n">${best}</span><span class="l">Best streak</span></div>
      <div class="stat"><span class="n">${freezeReady ? "1" : "0"}</span><span class="l">Freeze left</span></div>
      <div class="stat"><span class="n">${DATA.habits.length}</span><span class="l">Habits</span></div>
    `;
    const fp = $("#freezePill");
    if (fp) {
      if (isFrozen(today)) {
        fp.textContent = "❄ Today frozen";
      } else if (freezeReady) {
        fp.textContent = "❄ Freeze ready";
      } else {
        fp.textContent = "❄ Freeze used";
      }
    }
  }

  function renderBoard() {
    const root = $("#boardRoot");
    if (!root) return;
    const today = todayYmd();
    const frozenToday = isFrozen(today);

    // Group by category
    const cats = [...new Set(DATA.habits.map((h) => h.category))];
    root.innerHTML = cats
      .map((cat) => {
        const habits = DATA.habits.filter((h) => h.category === cat);
        const cards = habits
          .map((h) => {
            const on = isChecked(h.id, today);
            const streak = streakFor(h.id);
            const cls = frozenToday ? "frozen" : on ? "done" : "";
            return `<article class="habit-card ${cls}">
              <div class="habit-emoji" style="background:${h.color}22">${h.emoji}</div>
              <div class="habit-body">
                <h3>${escapeHtml(h.label)} ${h.example ? '<span class="ex-label">EXAMPLE</span>' : ""}</h3>
                <p class="habit-meta">${escapeHtml(h.category)} · ${escapeHtml(h.hint || "")}</p>
              </div>
              <div class="habit-actions">
                <button type="button" class="check ${on ? "on" : ""}" data-check="${h.id}" aria-pressed="${on}" aria-label="Toggle ${escapeHtml(h.label)}" ${frozenToday ? "disabled title=\"Day frozen\"" : ""}></button>
                <span class="streak-chip">${streak} day${streak === 1 ? "" : "s"}</span>
              </div>
            </article>`;
          })
          .join("");
        return `<div>
          <p class="eyebrow" style="margin:0.5rem 0 0.4rem">${escapeHtml(cat)}</p>
          ${cards}
        </div>`;
      })
      .join("");
  }

  function renderHeat() {
    const root = $("#heatRoot");
    if (!root) return;
    const days = datesInWeek(currentWeek);
    const today = todayYmd();
    const heads = days
      .map((d) => `<th class="${d.ymd === today ? "today-col" : ""}">${d.label}</th>`)
      .join("");
    const rows = DATA.habits
      .map((h) => {
        const cells = days
          .map((d) => {
            let cls = "heat-cell";
            if (isFrozen(d.ymd)) cls += " freeze";
            else if (isChecked(h.id, d.ymd)) cls += " on";
            if (d.ymd === today) cls += " today";
            return `<td><div class="${cls}" title="${d.ymd}"></div></td>`;
          })
          .join("");
        return `<tr>
          <td class="habit-col">${h.emoji} ${escapeHtml(h.label)} ${h.example ? '<span class="ex-label">EXAMPLE</span>' : ""}</td>
          ${cells}
        </tr>`;
      })
      .join("");
    root.innerHTML = `<table class="heat-grid" aria-label="Week heatmap">
      <thead><tr><th class="habit-col">Habit</th>${heads}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderFreeze() {
    const rule = DATA.freezeRule || {};
    const title = $("#freezeTitle");
    const body = $("#freezeBody");
    if (title) title.textContent = rule.title || "Freeze-day rule";
    if (body) body.textContent = rule.body || "";
    const today = todayYmd();
    const fr = freezesInRolling7(today);
    const hint = $("#freezeHint");
    if (hint) {
      if (isFrozen(today)) hint.textContent = `Today (${today}) is frozen — streaks hold.`;
      else if (fr.n >= 1)
        hint.textContent = `Freeze already used in the last 7 days (${fr.days.join(", ")}). Clears as days roll.`;
      else hint.textContent = "You have 1 freeze available in the rolling 7-day window.";
    }
    const log = $("#freezeLog");
    if (log) {
      const recent = Object.keys(store.freezes)
        .sort()
        .reverse()
        .slice(0, 8);
      log.innerHTML = recent.length
        ? `<strong>Recent freezes</strong><ul>${recent.map((d) => `<li>${escapeHtml(d)}${d === today ? " (today)" : ""}</li>`).join("")}</ul>`
        : `<p class="hint">No freezes logged yet.</p>`;
    }
  }

  function renderPrint() {
    const wrap = $("#printSheets");
    if (!wrap) return;
    const days = datesInWeek(currentWeek);
    const boxesHeader = days.map((d) => d.label[0]).join(" ");
    wrap.innerHTML = `<article class="sheet">
      <div class="sheet-head">
        <h2>Habit Streaks · Boyd</h2>
        <div>${fmtWeekRange(currentWeek)}</div>
      </div>
      <p class="hint" style="margin-top:0">EXAMPLE habits · freeze protects streak · ${boxesHeader}</p>
      ${DATA.habits
        .map((h) => {
          const boxes = days
            .map((d) => {
              const on = isChecked(h.id, d.ymd) || isFrozen(d.ymd);
              return `<span class="sheet-box ${on ? "on" : ""}" title="${d.ymd}"></span>`;
            })
            .join("");
          return `<div class="sheet-row">
            <div>${h.emoji} <strong>${escapeHtml(h.label)}</strong> ${h.example ? '<span class="ex-label">EXAMPLE</span>' : ""} <span class="hint" style="margin:0">· ${escapeHtml(h.category)}</span></div>
            <div class="sheet-boxes">${boxes}</div>
          </div>`;
        })
        .join("")}
      <div class="sheet-foot">
        <span>Freeze rule: 1 per rolling 7 days</span>
        <span>TokenMax · port 4318</span>
      </div>
    </article>`;
  }

  function updateChrome() {
    const pill = $("#weekPill");
    if (pill) pill.textContent = fmtWeekRange(currentWeek);
    const label = $("#weekLabel");
    if (label) label.textContent = fmtWeekRange(currentWeek);
    const foot = $("#footStat");
    if (foot) {
      const best = Math.max(0, ...DATA.habits.map((h) => streakFor(h.id)));
      foot.textContent = `best streak ${best} · ${Object.keys(store.freezes).length} freezes logged`;
    }
  }

  function renderAll() {
    renderStats();
    renderBoard();
    renderHeat();
    renderFreeze();
    renderPrint();
    updateChrome();
  }

  function shiftWeek(delta) {
    if (delta === 0) currentWeek = weekKey(new Date());
    else {
      const s = parseYMD(currentWeek);
      s.setDate(s.getDate() + delta * 7);
      currentWeek = weekKey(s);
    }
    renderAll();
  }

  const VIEWS = ["board", "heatmap", "freeze", "print", "about"];

  function showView(name) {
    if (!VIEWS.includes(name)) name = "board";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (name === "print") renderPrint();
    if (name === "heatmap") renderHeat();
    if (name === "freeze") renderFreeze();
    const hash = `#${name}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
    document.body.classList.toggle("print-mode", name === "print");
  }

  function routeFromHash() {
    const h = (location.hash || "#board").replace("#", "").toLowerCase();
    showView(VIEWS.includes(h) ? h : "board");
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) {
      showView(tab.dataset.view);
      return;
    }
    const weekBtn = e.target.closest("[data-week]");
    if (weekBtn) {
      shiftWeek(Number(weekBtn.dataset.week));
      return;
    }
    const chk = e.target.closest("[data-check]");
    if (chk) {
      if (isFrozen(todayYmd())) return;
      const id = chk.dataset.check;
      const on = !chk.classList.contains("on");
      setChecked(id, todayYmd(), on);
      renderAll();
    }
  });

  $("#btnFreezeToday")?.addEventListener("click", () => {
    const today = todayYmd();
    if (isFrozen(today)) {
      $("#freezeHint").textContent = "Already frozen today.";
      return;
    }
    if (!canFreeze(today)) {
      $("#freezeHint").textContent = "Freeze already used in the rolling 7-day window.";
      renderFreeze();
      return;
    }
    setFreeze(today, true);
    renderAll();
    showView("freeze");
  });

  $("#btnUnfreeze")?.addEventListener("click", () => {
    setFreeze(todayYmd(), false);
    renderAll();
  });

  $("#btnPrint")?.addEventListener("click", () => {
    showView("print");
    setTimeout(() => window.print(), 120);
  });
  $("#btnDoPrint")?.addEventListener("click", () => window.print());

  $("#btnExport")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `habit-streaks-save-${todayYmd()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "Save JSON downloaded.";
  });

  $("#btnReset")?.addEventListener("click", () => {
    if (!confirm(`Clear checks for week ${fmtWeekRange(currentWeek)}?`)) return;
    for (const d of datesInWeek(currentWeek)) {
      for (const h of DATA.habits) delete store.checks[checkKey(h.id, d.ymd)];
      delete store.freezes[d.ymd];
    }
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "This week reset.";
  });

  $("#btnResetAll")?.addEventListener("click", () => {
    if (!confirm("Reset ALL habit streak data on this device?")) return;
    store = { checks: {}, freezes: {}, demoSeeded: false };
    saveStore(store);
    seedDemoIfNeeded();
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "All data cleared (EXAMPLE demo re-seeded).";
  });

  window.addEventListener("hashchange", routeFromHash);

  seedDemoIfNeeded();
  renderAll();
  routeFromHash();
})();
