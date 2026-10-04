# Reusable slide designs

**Active DGP0959 design: [07-themed-ribbon.html](07-themed-ribbon.html).**

The user approved prototype 07 on 3 October 2026. Its banner roles are fixed:

| Slide role | Section class | Banner colour |
|---|---|---|
| Introduction, section, chapter | `slide` | Red `#BA0C2F` |
| Syllabus, explanation, prompt, activity, recap | `slide material` | Dark / bluish black `#222831` |
| Case study | `slide case-blue` | Blue `#195D91` |

Only the banner changes colour. Typography, white background, body accents, panels, logo and footer remain those of prototype 05. Label the slide role in the banner as well as using colour. Orange is excluded from the active template.

## Library

1. `01-warm-academic.html` — original cream academic layout.
2. `02-simple-white.html` — white academic layout.
3. `03-workbench.html` — wide side rail and task panels.
4. `04-slim-rail.html` — narrow side rail.
5. `05-ribbon.html` — original red ribbon.
6. `06-dark-lab.html` — dark layout.
7. `07-themed-ribbon.html` — approved role-based ribbon.

Each design has a PDF preview. Text is replaced with bracketed placeholders; structural numbers are retained; institution names and logo images are placeholders. The historical course-content prototypes remain unchanged in `../prototypes/`.

## Reuse

Copy the chosen HTML, `assets/`, and `prototype-controls.js` into the lecture folder. Replace bracketed placeholders, then duplicate or remove whole `.slide` sections. Give every slide a unique `s0`, `s1`, … ID; update navigation links and footer totals. For 07, apply the role classes above.

Arrow keys, Page Up/Down, Home/End navigate; P toggles the pointer on templates using the shared controls. Keep text concise and inspect long titles and prompts for overflow. Templates use Google Fonts with local system-font fallbacks; placeholder images are local SVG assets.

PDF previews are exported in Chromium at 1536×864 with print backgrounds enabled and the CSS page size honoured. Check page count against slide count after editing. Template 01 uses its original fixed 1280×720 print geometry.

These are design starting points, not finished teaching material.

The library is published at the online dossier root under `design_templates/`. Template 07 also includes a teaching-image placeholder layout. Actual DGP0959 lectures should restore the supplied University logo from the original prototype assets.

## Case-study and take-home documents

`resource-document.html` and its A4 PDF provide the shared document style: compact banner, right-hand institution logo, numbered section navigation, and tutor footer. Replace the placeholders for a case study or homework sheet. The generator `../scripts/build_resources.py` builds actual course resources with UM branding and Graham Pellegrini’s name.

Approved document navigation: compact far-left numbered circles on every resource and the reusable document template. Labels animate on hover/keyboard focus; controls fade when idle. Phones use the bottom strip; PDFs hide navigation.
