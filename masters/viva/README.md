# Viva deck

Edit slides in `src/slides/<slug>.html` (first line = meta: class, ribbon topic, num="1" to number it).
Order and backups: `src/order.txt`. Archived slides: `src/archive/` (listed in `src/archive-order.txt`).
Build: `python3 build.py` (writes index.html; numbering, footers and nav are automatic).
Options: `--archive` also builds archive/index.html, `--shot slug1,slug2` screenshots to _shots/, `--pdf` exports viva-deck.pdf.
Rendering needs Node Playwright (`NODE_PATH` pointing at it). Never edit index.html by hand.
Rollback: `_backup/2026-11-15-pre-mock-viva/` or git tag `viva-pre-mock-2026-11-15`.
