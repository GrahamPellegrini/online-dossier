#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "online.config.json"
GENERATED_DIRS = ("demo", "documents", "masters", "previews")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def rel_asset_path(page_path: str, asset_path: str) -> str:
    page_dir = Path(page_path).parent
    if str(page_dir) == ".":
      return asset_path
    depth = len(page_dir.parts)
    return "../" * depth + asset_path


def entry_attrs(entry: dict) -> str:
    attrs = []
    if entry.get("prefetch") or entry["kind"].lower() == "folder":
        attrs.append('data-prefetch')
    preview = entry.get("preview")
    if preview:
        attrs.append('data-preview')
        attrs.append(f'data-preview-src="{preview}"')
    return (" " + " ".join(attrs)) if attrs else ""


def render_breadcrumb(directory: dict) -> str:
    crumbs = directory.get("breadcrumb", [])
    if not crumbs:
        return '<div class="kicker">Directory list</div>'
    parts = [f'<a href="{crumb["href"]}">{crumb["label"]}</a>' for crumb in crumbs]
    parts.append(f'<span>{directory["title"]}</span>')
    return '<nav class="crumbs" aria-label="Breadcrumb">' + '<span>/</span>'.join(parts) + '</nav>'


def render_directory(config: dict, directory: dict) -> str:
    css = rel_asset_path(directory["path"], "assets/site.css")
    js = rel_asset_path(directory["path"], "assets/site.js")
    entries = "\n".join(
        f'''      <a class="entry" href="{entry["href"]}"{entry_attrs(entry)}>
        <strong>{entry["title"]}</strong>
        <span>{entry["kind"]}</span>
      </a>'''
        for entry in directory["entries"]
    )
    up = directory.get("up")
    up_attr = f'href="{up}"' if up else 'href="#" aria-disabled="true"'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{directory["title"]} | {config["site"]["title"]}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@600;700&family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{css}">
</head>
<body>
  <main>
    <div class="chrome">
      {render_breadcrumb(directory)}
      <div class="nav-buttons" aria-label="Navigation controls">
        <a class="nav-button" href="javascript:history.back()" aria-label="Back">←</a>
        <a class="nav-button" {up_attr} aria-label="Up">↑</a>
        <a class="nav-button" href="javascript:history.forward()" aria-label="Forward">→</a>
      </div>
    </div>
    <nav class="directory" aria-label="Shared files and folders">
{entries}
    </nav>
    <p class="note">Shared dossier materials. Hover entries to warm the next page or preview documents.</p>
  </main>
  <script src="{js}" defer></script>
</body>
</html>
'''


def clean_generated() -> None:
    for name in GENERATED_DIRS:
        target = ROOT / name
        if target.exists():
            shutil.rmtree(target)
    for filename in ("index.html", ".nojekyll", "README.md"):
        path = ROOT / filename
        if path.exists():
            path.unlink()


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


def collect_pdf_previews(config: dict) -> list[tuple[Path, Path]]:
    previews = []
    for directory in config["directories"]:
        page_dir = Path(directory["path"]).parent
        if str(page_dir) == ".":
            page_dir = Path("")
        for entry in directory["entries"]:
            if entry.get("preview") and entry.get("source"):
                source = (ROOT / entry["source"]).resolve()
                preview = ROOT / page_dir / entry["preview"]
                previews.append((source, preview))
    return previews


def generate_pdf_preview(source: Path, preview: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(f"Missing preview source: {source}")
    preview.parent.mkdir(parents=True, exist_ok=True)
    tmp_prefix = preview.with_suffix("")
    ppm_path = tmp_prefix.with_suffix(".png")
    subprocess.run(
        ["pdftoppm", "-png", "-singlefile", "-f", "1", "-scale-to-x", "520", "-scale-to-y", "-1", str(source), str(tmp_prefix)],
        check=True,
    )
    with Image.open(ppm_path) as img:
        img = img.convert("RGB")
        img.thumbnail((420, 560), Image.Resampling.LANCZOS)
        img.save(preview, "PNG", optimize=True)
    if ppm_path != preview and ppm_path.exists():
        ppm_path.unlink()


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    clean_generated()
    write_text(ROOT / ".nojekyll", "")
    write_text(
        ROOT / "README.md",
        "# Online Dossier\n\nPublic GitHub Pages hub for selected dossier materials.\n",
    )
    for directory in config["directories"]:
        write_text(ROOT / directory["path"], render_directory(config, directory))
    for item in config["copies"]:
        sync_copy(item)
    for source, preview in collect_pdf_previews(config):
        generate_pdf_preview(source, preview)


if __name__ == "__main__":
    main()
