# M.AI.ESTRO VR — Handover to Codex

Written 2026-10-01 by cluster_vr (Claude), because Graham is near his weekly
Claude usage limit and the main working session is moving to Codex, supervised
by a lightweight relay with no independent judgement. **Everything a capable
model would normally catch by instinct has to be a rule here instead.** Read
the "Standing rules" section before touching anything — it is the part that
actually matters.

Full history lives in `/home/graham/.claude/projects/-home-graham/memory/*.md`
(one file per topic/date, cross-linked with `[[name]]`). This document is a
map and a rulebook, not a replacement — follow the links for the evidence
behind any claim below. `MEMORY.md` in that directory is the index; start
there if a link below goes stale.

## What the system is

Quest 3 headset → ingestion → OPE (object/pose extraction) pipeline →
mesh/replay. Two distinct ways an object gets into the system:

1. **Task mode**: the user manipulates an object naturally; the pipeline
   detects grips and tracks the object's pose through the episode. This is
   the main data-collection mode.
2. **Orbit / capture mode**: a dedicated short recording whose purpose is to
   build a 3D mesh of one object, via photogrammetry (COLMAP). Two routes
   exist here — grip-first (current, working, below) and a parked
   alternative (Option D, world-space persistence seeding — do not build
   further without Graham's explicit instruction, see
   [[orbit_seeder_investigation_2026_09_30]]).

## What is proven working, with numbers and dates

- **Hands23 is live-wired into both task mode and capture mode.**
  `server/ope/pipeline.py` + `server/ope_runner/worker.py`'s
  `_precompute_hands23`, commit `6ba34a8`, 2026-09-30. Before this, Hands23
  was adopted as the default candidate source but never actually callable
  from the live worker — see [[validation_harness_vs_production_path_2026_09_30]]
  for the incident this fixed.
- **The grip-first orbit route produces real, metric, registrable meshes.**
  Grip briefly at orbit start, then orbit — Hands23 detects the grip, SAM2
  propagates the mask across the rest of the clip, masked COLMAP + Open3D
  build the mesh, Quest head poses give it real-world scale.
  - ep066 (candle), 2026-09-30: registered as `ocandle01`. Mask IoU median
    0.712, Quest-alignment residual mean 6.4mm. Extent [0.097, 0.100,
    0.106]m — physically correct.
  - ep067 (clock), 2026-10-01: registered as `oclock02`. Mask IoU median
    0.960, residual mean 4.9mm — close to the best manual result ever
    measured (0.973 IoU). Extent [0.125, 0.221, 0.089]m — correct.
  - Full detail: [[orbit_grip_first_route_2026_09_30]],
    [[orbit_batch5_ground_truth_2026_09_30]].
- **The orbit capture rule is empirically derived, not guessed**: grip the
  object FIRST, then keep orbiting — at least one full slow circuit, ideally
  two — for the **entire rest of the clip**. Reconstruction only ever sees
  grip-time-to-end-of-clip; anything recorded before the grip is wasted.
  Confirmed against measured camera-path data across 5 sessions:
  [[orbit_capture_rule_2026_10_01]].
- **Transient-GPU-OOM retry/backoff**, `server/ope_runner/worker.py`,
  2026-10-01: a session that fails purely from another tenant's job
  saturating this shared box's GPU now retries itself (5 attempts, 1/5/15/
  30/60 min backoff) instead of requiring a human to notice and requeue.
  Confirmed working live the same day (ep072 self-recovered from two real
  OOMs with zero manual intervention). Tests: `tests/test_worker_oom_retry.py`.
- **Acceptance batch 4 (ep061-065) passed**: the first-ever real headset
  recordings to produce task-mode objects with nobody running anything by
  hand. See [[acceptance_test_batch4_2026_09_30]].

## What is broken or unresolved, each with its evidence

- **The detergent bottle and the rolling pin cannot be photogrammetried by
  this pipeline at all — confirmed, not assumed.** ep072 re-recorded the
  same bottle with deliberately excellent coverage (88s, 12.64m camera path,
  3 full circuits — the best-covered capture in the whole project) and
  COLMAP still produced zero sparse points. Root cause confirmed by direct
  measurement, not guessed: median verified feature matches between
  **adjacent** frames is exactly 0 for the bottle (both attempts) and the
  rolling pin, vs. 28-355 for every known success — a genuine low-texture-
  surface problem, visible from the first few dozen frames, not a capture
  or code defect. [[colmap_preflight_feature_density_2026_10_01]].
- **The bowl (ep069) also fails reconstruction, but for a DIFFERENT,
  unrelated reason.** Its pairwise frame-matching is statistically
  indistinguishable from a successful reconstruction (median 30 matches/
  adjacent-pair, same ballpark as the candle) — the failure is downstream,
  in global multi-view consistency, most plausibly from its concave/open
  shape. **Do not conflate the bowl and bottle failures** — they need
  different fixes if either is ever pursued, per
  [[colmap_preflight_feature_density_2026_10_01]].
- **Two library entries are ~10x oversized and unrepaired right now**:
  `oclock01` (extent ~1.2×2.1×1.7m — should be ~15-20cm) and `obottle01`
  (extent ~0.83×2.0×1.4m — should be ~20-30cm), both in
  `local_library/catalog.jsonl`. Cause: the wrong (non-metric) mesh variant
  was registered at the time. The underlying selection bug in
  `scripts/local_library_add.py` (`_select_mesh_file`) was fixed on
  2026-09-24 — new registrations (`ocandle01`, `oclock02`) are correct — but
  these two old entries were never re-registered. Either re-run onboarding
  for their source sessions or remove them; do not trust them as-is.
- **Mesh matching (local_library retrieval) is deliberately disabled in live
  runs** (`--no-mesh-resolve` / `OPE_MESH_RESOLVE_ENABLED=0`), because a
  2026-09-29 measurement found SigLIP similarity was ranking by render style
  (photo vs. CAD-flat) rather than object identity — 6 of 11 real matches
  went to the wrong object. Every live `objects.jsonl` record since then is
  `model_free`/`PointCloudPCA` regardless of what a match would have found.
  **Do not read any post-2026-09-29 run as evidence mesh matching works or
  doesn't** — it isn't running. See `scripts/local_library_add.py`'s own
  docstring for the fix already applied to the thumbnail pipeline.
- **The pen's "accidental grip" texture test has not actually run** (ep070):
  Hands23 found zero candidates on it, so the predicted texture failure
  remains untested. Do not manufacture a test clip for this — wait for a
  deliberate recording.
- **Option D (world-space persistence seeder)** is at 1/24 against the
  oracle, real bugs found and fixed, but not wired into the pipeline and not
  to be built further without Graham's explicit go-ahead — it is a parked
  research track, not the default route. [[orbit_seeder_investigation_2026_09_30]].
- **No migration framework.** Every schema change
  (`capture_status`/`capture_out_dir`, `capture_mode`, and now
  `retry_count`/`retry_after`) has been a manual `ALTER TABLE` against the
  live DB plus a matching `Column(...)` in `server/ingestion/models.py`.
  `create_all()` only creates brand-new tables — it will NOT add these
  columns to an existing `sessions` table. If the DB is ever rebuilt from
  the ORM models alone, these ALTERs must be reapplied by hand.

## Standing rules (these are not optional, and nothing here enforces them but you)

1. **Tests before changes. Run the full suite before and after any edit**
   (`pytest tests/` from the repo root). Never trade a working, tested
   module for an unproven one — if a new approach isn't clearly better on
   real data, keep the old one and park the new one as a documented
   alternative instead of swapping it in.
2. **Always distinguish three outcomes, never collapse to two**: for any
   detector, service, or pipeline stage, "it ran and found nothing" and "it
   failed to run at all" must produce **visibly different states** — a
   different status, a different exception, a different log shape. Never
   let an empty/absent result and a crash look the same on the wire. This
   exact conflation caused a 4-day silent production outage
   ([[validation_harness_vs_production_path_2026_09_30]]) and nearly hid a
   real GPU-OOM-vs-defect distinction today until it was built out
   explicitly.
3. **Verify against the live deployment, not just the harness or the
   test.** A fix that only runs through a manual script, an offline
   validation harness, or a unit test has not been shown to work in
   production — trace the EXACT call path a real upload goes through
   (ingestion → `worker.py` → pipeline) before trusting any number. Five
   separate defects today were code that existed, was even tested, and
   never actually executed on the path that mattered. See
   [[validation_harness_vs_production_path_2026_09_30]] for all five, in
   detail — read it before trusting any "this is fixed" claim.
4. **Spot-check any alarming or surprising aggregate by hand before
   reporting it or acting on it.** Three separate measurement errors today
   were in the measuring code itself, not in the system being measured
   (a utilization-vs-memory GPU check that gave a false "free" reading; an
   angular-coverage calculation that needed checking two independent ways;
   a feature-density metric that looked clean on one aggregation and
   meaningless on another). If a number looks damning or looks too good,
   read the actual underlying data before it goes in a report.
5. **Persist results to MinIO before registering them anywhere, and before
   any container recreate.** This has destroyed real reconstruction output
   three times. The rule, no exceptions: run reconstruction → upload the
   full bundle to MinIO → THEN register into `local_library` → THEN read
   the registered copy back to confirm the write is what it claims to be.
   Never skip straight to registration from a local `/tmp` directory.
6. **A file edit does not take effect in a running worker.** Editing
   `server/ope_runner/worker.py`, `server/ope/pipeline.py`, or anything they
   import requires `docker compose restart ope-runner` before the change is
   live — the container's Python process has the old module in memory
   otherwise. This has caused real failures on 5 sessions in one day
   already. After restarting, requeue (don't re-record) whatever failed on
   stale code: `UPDATE sessions SET ope_status='queued' WHERE ...`.
7. **Hands23 needs its own service running and reachable**
   (`http://hands23-eval:8100` inside the compose network) — it is a
   separate Detectron2/torch-cuda11.7 container, not importable in-process.
   `_precompute_hands23` calls `/health` before `/infer` specifically so a
   downed service fails loudly and distinctly (see rule 2) rather than
   looking like "no grip found".
8. **A missing dependency must fail loudly, never silently degrade.**
   `scripts/spike_colmap_masked_mesh.py`'s COLMAP sub-model selection
   silently fell back to the wrong model for two weeks because a missing
   `pycolmap` import was swallowed by a generic `except Exception`. See
   `requirements.txt`'s own comment block on host-side script dependencies
   before assuming anything is installed on this host.
9. **Never guess ground truth about what a recording contains.** The app
   labels every episode "untitled" — Graham's own descriptions (recorded in
   the `calibration_batch*_ground_truth_*.md` / `orbit_batch5_ground_truth_*.md`
   files) are the ONLY record of what's actually in a given clip. Don't
   infer object identity from circumstantial evidence (this project
   explicitly declined to confirm a dog figurine's identity on exactly that
   basis) — ask, or leave it unconfirmed.

## File-path map

| What | Where |
|---|---|
| Live worker loop (polls DB, runs pipeline) | `server/ope_runner/worker.py` |
| OOM retry/backoff (new, 2026-10-01) | same file — `_schedule_oom_retry`, `_is_transient_gpu_oom`, `_claim_queued` |
| Main OPE pipeline (detection, SAM2, pose) | `server/ope/pipeline.py` |
| Hands23 HTTP client | `server/ope/hands23_client.py` |
| DB models (Session, CanonicalObject) | `server/ingestion/models.py` |
| Ingestion API (FastAPI) | `server/ingestion/app.py` |
| Standalone masked-COLMAP reconstruction | `scripts/spike_colmap_masked_mesh.py` (not pipeline-wired; run manually: `--session <uuid> --object <obj_id> --out-dir <dir> --gpu 3`) |
| Mesh bundle builder (Open3D mesh + Quest alignment) | `scripts/layer1_onboard.py` |
| Local mesh-library registration | `scripts/local_library_add.py` (needs `MINIO_ENDPOINT=localhost:19000` env override when run from host — its default doesn't match the bridge port) |
| Local mesh-library catalog | `local_library/catalog.jsonl` + `local_library/meshes/*/object_mesh.glb` (gitignored, regenerable) |
| Orbit seeder oracle (ground-truth test fixture) | `tests/fixtures/orbit_seeder_oracle/` |
| OOM retry tests | `tests/test_worker_oom_retry.py` |
| Hands23 precompute tests | `tests/test_worker_hands23_precompute.py` |
| COLMAP sub-model selection tests | `tests/test_colmap_submodel_selection.py` |
| `.env` (MinIO/Postgres creds) | repo root, gitignored — `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, `DATABASE_URL` (bridge port `localhost:15432`, bucket bridge `localhost:19000`) |
| Docker compose | `docker-compose.yml` — `ope-runner` service pinned to `NVIDIA_VISIBLE_DEVICES: "2"`, hands23-eval/foundation-pose-server to `"3"` |
| Memory / project history | `/home/graham/.claude/projects/-home-graham/memory/*.md`, index at `MEMORY.md` in that directory |

## Immediate queue, in priority order

1. **Nothing is currently blocking.** The last live session (ep072) completed
   and was reported; no in-flight work was left running.
2. **ep070's grip-free segment isolation** (for the orbit-seeder oracle) and
   **ep071's addition to that oracle fixture** — both explicitly parked as
   non-urgent, pick up when there's a natural gap. See
   [[orbit_batch5_ground_truth_2026_09_30]].
3. **Repair or remove the two oversized library entries** (`oclock01`,
   `obottle01`) — the fix for new registrations already exists
   (`local_library_add.py`'s `_select_mesh_file`), these two just need
   re-running or deleting.
4. **The open architecture question**: what the system should do when a
   user orbits an object that can't be photogrammetried (currently: nothing,
   silently). Not a task yet — a decision Graham/vr_planner need to make.
   See the "Open architecture question" section in
   [[maestro_pipeline_restructure_plan_2026_09_23]].
5. Everything else is tracked in [[maestro_pending_decisions_2026_09_25]]
   (9 numbered decisions, each with evidence + a recommendation) — these are
   Graham's calls to make, not default-implement.

**Before starting anything from this queue**: re-read whichever linked memory
file covers it in full. This document is intentionally short; the discipline
and the detail live in the links.
