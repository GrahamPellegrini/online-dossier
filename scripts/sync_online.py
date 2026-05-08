#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "online.config.json"


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def render_index(config: dict) -> str:
    entries = "\n".join(
        f'''      <a href="{entry["href"]}">
        <strong>{entry["title"]}</strong>
        <span>{entry["kind"]}</span>
      </a>'''
        for entry in config["entries"]
    )
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{config["site"]["title"]}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@600;700&family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{{box-sizing:border-box}}
    :root{{--paper:#faf8f0;--ink:#171511;--muted:#706c63;--line:rgba(23,21,17,.14);--red:#9f1730}}
    html,body{{margin:0;min-height:100%;background:var(--paper);color:var(--ink)}}
    body{{
      font-family:Inter,system-ui,sans-serif;
      background:
        linear-gradient(90deg,rgba(23,21,17,.035) 1px,transparent 1px),
        linear-gradient(0deg,rgba(23,21,17,.03) 1px,transparent 1px),
        var(--paper);
      background-size:72px 72px;
      display:grid;
      place-items:center;
      padding:8vw;
    }}
    main{{width:min(980px,100%)}}
    .kicker{{color:var(--red);font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:22px}}
    .directory{{margin-top:30px;border-top:1px solid var(--line);display:grid}}
    a{{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:26px 0;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--line)}}
    a strong{{font-family:"EB Garamond",Garamond,Georgia,serif;font-size:clamp(2rem,3.4vw,3.4rem);line-height:1;letter-spacing:-.035em}}
    a span{{color:var(--red);font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}}
    a:hover strong{{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:7px}}
    .note{{margin-top:22px;color:var(--muted);font-size:14px;line-height:1.5}}
    @media(max-width:720px){{body{{padding:28px}}a{{grid-template-columns:1fr}}}}
  </style>
</head>
<body>
  <main>
    <div class="kicker">Directory list</div>
    <nav class="directory" aria-label="Shared files and decks">
{entries}
    </nav>
    <p class="note">Shared dossier materials. Add future decks and documents here under the same public link.</p>
  </main>
</body>
</html>
'''


def sync_copy(item: dict) -> None:
    src = (ROOT / item["source"]).resolve()
    dst = ROOT / item["destination"]
    if not src.exists():
        raise FileNotFoundError(f"Missing source: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    rewrite = item.get("rewrite")
    if rewrite:
        text = src.read_text(encoding="utf-8")
        for old, new in rewrite.items():
            text = text.replace(old, new)
        write_text(dst, text)
    else:
        shutil.copy2(src, dst)


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    write_text(ROOT / "index.html", render_index(config))
    write_text(ROOT / ".nojekyll", "")
    write_text(
        ROOT / "README.md",
        "# Online Dossier\n\nPublic GitHub Pages hub for selected dossier materials.\n",
    )
    for item in config["copies"]:
        sync_copy(item)


if __name__ == "__main__":
    main()
