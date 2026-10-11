# Habit Streaks

Calm personal habit streak board for **Boyd** — AI-ops daily, family logistics, fitness — with gentle streaks and a freeze-day rule. Not another skill forge. TokenMax burn build.

EXAMPLE habits (Fleet health glance, Miranda calendar sync, Walk 20 min, …). Checkmarks in `localStorage`. Week heatmap. One freeze day per rolling 7 days.

## Screens

1. **Today** — check-in cards by category  
2. **Week heat** — Mon–Sun density grid  
3. **Freeze rule** — explained + apply/clear today  
4. **Print** — desk one-pager  
5. **About** — export / reset

Hash routes: `#board` · `#heatmap` · `#freeze` · `#print` · `#about`

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4318/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/habit-streaks.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/habits.json` — EXAMPLE habits + freeze rule (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/habit-streaks` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
