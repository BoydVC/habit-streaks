#!/usr/bin/env python3
"""Inline web/ + data/habits.json into one offline file: dist/habit-streaks.html."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def main():
    data_path = os.path.join(HERE, "data", "habits.json")
    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)
    data_js = json.dumps(data, ensure_ascii=False)
    n = len(data.get("habits", []))
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__HABITS__*/ null /*__/HABITS__*/", data_js)
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "habit-streaks.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"built {out} ({os.path.getsize(out):,} bytes) · habits={n}")


if __name__ == "__main__":
    main()
