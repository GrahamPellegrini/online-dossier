# M.AI.ESTRO VR audit dossier

Start with [the HTML review](findings.html) or [the PDF](findings.pdf).
The refined pipeline is embedded and explained in both. The PDF uses A4 text
pages plus an A3 landscape page for the complete diagram; text is selectable.

## Source and version

`FINDINGS.md` is the original 1 October 2026 review snapshot, preserved unchanged.
All eight supplied files were moved byte-for-byte from the development repo's
`docs/audit/`; SHA256s and original paths are in `source-manifest.json`.
The HTML/PDF adds a clearly dated 3 October update. Historical DINOv3 logs are
retained as provenance and must not replace the corrected S/B measurements.
The old development-repo folder contains a relocation pointer.

## Edit and rebuild

Edit `FINDINGS.md` for the main findings. The dated addendum and diagram guide
are in `build_audit.py`; audit-specific styling is in `assets/audit-overrides.css`. The generator reuses
the approved DGP0959 document CSS/navigation and shared `page_controls.py`;
`assets/audit.css` is the generated stylesheet.

```sh
python3 /home/graham/dossier/MAESTRO/VR/audit/build_audit.py
```

Dependencies: Python Markdown, BeautifulSoup, Playwright and its Chromium
browser. The template follows the DGP0959 roadmap's document style, with
Maestro audit labels and no lecture/course content.

The local online mirror is under `online/maestro/vr/audit/` and configured in
`online/online.config.json`. Future `online/scripts/sync_online.py` runs retain
this section. Local preparation does not publish the dossier to GitHub Pages.
Source memory/handover snapshots are in `evidence/`.

Public listing is HTML-first: one System audit entry, with PDF download inside
the HTML page. Navigation uses compact far-left numbered circles and a mobile
bottom strip; accessible icon controls and navigation are hidden in print.
