# Maestro VR code continuity

Updated 2026-10-03. Project files remain authoritative. Read `HANDOVER.md`
for standing rules and `docs/bridge/seed-code.md` for this worker's scope.

## Reconciled state

- Root handover is dated October 1; October 3 evaluations and the corrections below are newer.
  Their full evidence lives in
  `/home/graham/.claude/projects/-home-graham/memory/`:
  `dinov3_consolidation_proper_eval_2026_10_03.md` (supersedes the earlier
  invalid self-crop/L-only evaluation) and
  `pointcloudpca_task_route_demo_readiness_2026_10_03.md`.
- Corrected DINOv3 S/B evaluation is complete. Do not adopt in production:
  real hand-to-hand re-ID passes 3/4 for DINOv2 vs 2/4 for S and B at 0.82.
  Foreground B improves retrieval but still falsely assigns absent pen/remote.
  Both smaller variants are measured lighter than the 225.2M existing pair.
  Civilian industrial use is permitted conditionally by Meta’s custom licence.
  Keep DINOv2, retain SigLIP, leave mesh matching disabled.
- PointCloudPCA demo-readiness evaluation is complete. Slow candle is clean;
  fast clock has a 1.053m jump; table-contact Stanley has a 0.738m excursion.
  Task pose tracking needs measured physical rejection/constraints before
  robust natural-motion replay can be claimed. The requested >0.5m grip
  hand-distance guard is now implemented and deployed; details below.
- Grip-first orbit's two metric mesh successes and OOM retry are completed
  work. Do not repeat them. Option D remains parked.
- Existing modified/untracked files predate this continuation. Preserve them;
  do not blanket-commit or reset them.

## Initial verification, before recovery and demo fixes

- `pytest tests/`: 462 passed, 1 skipped, 2 warnings, 37.44s.
- Compose services running: ingestion, ope-runner, Hands23, FoundationPose,
  PostgreSQL and MinIO. Worker startup logs show October 3 restarts.
- Live DB: 125 sessions `done`, 1 `uploading`, none queued/processing.
- ep058 (`01cef780-557b-4bec-82e4-d7de8c75af82`) is marked `done`, retry_count 0.
  Its empty persisted output is reported by the October 3 readiness evaluation;
  this continuation did not independently reread that MinIO object.
- Host and `/app` mounted sources both show `process_one()` calling
  `_precompute_hands23()` before `_run_ope()`. Missing detections raise
  `Hands23NotPrecomputedError`. This is source inspection, not proof of the
  running process's loaded modules or a successful live inference.
- No pipeline edits, worker restart, DB mutation or reprocessing performed.

## ep058 recovery completed, 2026-10-03

- Exact original failure: September 30's automatic run used the Hands23
  candidate source before worker precompute was wired in. Missing detections
  returned no candidates, so empty output was uploaded with status `done`.
- The October 3 readiness note's claimed reprocess did NOT run: the prior
  transcript shows `docker exec maestro-ope python - <<'PY'` without `-i`.
  Docker did not forward the script to Python; the command returned no output.
  The subsequently read missing-precompute log was still September 30's log.
  MinIO timestamps independently confirm no October 3 overwrite at that time.
  Evidence: frendo rollout `01a0f727-ad41-7372-98ab-d555be45b016`, command at
  `2026-10-03T12:35:33.429Z` and its empty output.
- No production code change or worker restart was needed. Ran current
  `worker.process_one()` inside `maestro-ope` with stdin forwarded via `-i`.
  Only publication/success metadata were intercepted to stage the result;
  Hands23, SAM2, Qwen and model-free pose tracking ran unchanged. This was a
  fresh worker invocation, not the polling loop. Hands23 produced 128 records.
- Backed up all 257 original artifacts locally and in MinIO before running.
  Validated staged output before publishing via the unchanged worker uploader.
  Then read back and byte-compared all 114 published result files. Every raw
  input retained its original ETag/size. Session remains `done`, retries cleared.
- New `objects.jsonl`: 20,727 bytes, one object `o01e208c8`, 112 finite,
  chronological world-frame poses with unit quaternions and matching masks.
  Metadata matches episode_058/task/right hand/128 frames/7.6 seconds. Visual
  spot-checks at frames 16/40/85/127 follow the actual bottle, including release.
- Caveats for evaluation: Qwen labels the detergent bottle `glue bottle`.
  `mask_frames` lists 113 frames but frame 15 has no pose/saved mask (existing
  pose-first save behavior); all 112 exported poses have saved masks. Align by
  timestamps, not array offsets. Late masks are partial. Max position jump
  0.306m, none over 0.5m; this is not a claim of ground-truth pose accuracy.
- ep058 is now usable for pending model evaluation. Do not repeat recovery or
  quote its historical 81% containment as a newly measured value.
- Durable local evidence/scripts: `archive/ep058-recovery-2026-10-03/`.
  MinIO: `recovery/ep058-2026-10-03/before/`, `verified/`, `validation.json`.
  Production result: `raw/01cef780-557b-4bec-82e4-d7de8c75af82/objects.jsonl`.
  SHA256: `11c9dcaaeb8b7c2c2992f4b3a0cf0520e7ca7a8e838845f6524f125c3280b1ff`.

## Remaining work

The pending model evaluation can now include ep058. Recovery did not change
tracking, labelling or mask-saving behavior.

Other backlog: oversized `oclock01`/`obottle01` repair; oracle fixture additions
for ep070/071 (non-urgent). Architecture decisions and Option D implementation
remain parked as specified in the root handover.

## Monday demo blockers completed, 2026-10-03

- `server/ope/pose_estimator.py`: PointCloudPCA guard transforms each camera
  estimate to world and rejects it as no-pose beyond 0.5m from every available
  wrist/palm during confirmed grip. `server/ope/pipeline.py` invokes it with
  current-frame landmarks from both hands and the actual grip interval, not
  the capture interval extended through orbit end. No-pose frames are omitted
  from emitted tracks/clouds/masks. Missing landmarks cannot be checked.
- Tests added only in `tests/test_ope_pose_estimator.py` and
  `tests/test_ope_pipeline.py`: good/boundary/outlier, unheld, missing landmarks,
  world transform, real task/orbit call-path rejection. Baseline 462 passed,
  1 skipped; new guard cases failed before implementation; after 469 passed,
  1 skipped. Worker restarted 2026-10-03T21:00:11.94909724Z.
- ep067 ONLY: `534ec2eb-8df4-4426-9964-9f941b7ee27f`, `o17bb2035`.
  bbox_m lives in persisted MinIO objects JSONL, not a DB column. Corrected
  (.1548,.1714,.111)m to served mesh extents
  (.2226111665,.1166360788,.0831406154)m, and bumped this session’s DB
  metadata revision. Preserved all other JSON bytes and backed up old output.
  Sorted normalized shape ratios improve (.5767,.5801,1) -> (1,1,1).
  Live API verified HTTP200 and non-null `meshes/oclock02/mesh.glb` after fix
  and again after evaluation restores. Headset rendering was not physically
  checked. Evidence: `archive/demo-blockers-2026-10-03/ep067-bbox-fix.json`.

## Corrected consolidation evaluation completed, 2026-10-03

- Restored ep036,024,042,029,049 through current `worker.process_one()`;
  staged and validated before publishing. Audit also restored empty ep040
  and wrong-mask ep044/046. All eight are non-empty finite world-track outputs
  and published bytes match verified results; raw inputs unchanged. ep040
  concatenates overlapping hand tracks unsorted; ep046 still masks background.
  Those are recorded limitations, not silently repaired data.
- Source cohort actually enumerates 23, not the old note’s 21: 15 genuine
  object queries, seven empty/no-query recordings, one fake ep043 with a false
  detection. Historical 11 reported separately. ep022 uses an existing
  verified rolling-pin mask, not its spurious watch record; exclude it for
  thumbnail-source leakage, and exclude ep046 for clean-crop analysis.
- Correct mesh decisions at unchanged 0.55, historical11/all15:
  SigLIP image 4/11,7/15; S dense 5/11,8/15; B dense 5/11,7/15.
  Foreground B sensitivity 10/11,13/15; clean holdout 11/13, with TWO absent
  objects wrongly assigned despite perfect 8/8 known-object ranking. Negative
  scores overlap a true bottle score: reliable automatic matching not fixed.
- Real paired re-ID crops, input hashes, model counts/timings, licence,
  full caveats and recommendation are in the NEW indexed memory file
  `dinov3_consolidation_proper_eval_2026_10_03.md`. Do not repeat completed
  recovery or substitute the superseded self-crop result. No production
  encoder change or mesh-matching activation was made.
- Durable evidence: `archive/dinov3-proper-eval-2026-10-03/` and
  `archive/dinov3-proper-eval-host-2026-10-03/`. MinIO restoration backups/verified bundles: `recovery/dinov3-proper-eval-2026-10-03/`.
- Evaluation baseline suite: 469 passed, 1 skipped, 2 warnings, 42.79s.
  Final completed suite: 469 passed, 1 skipped, 2 warnings, 39.70s.
  Evaluation scoring archive is local; its optional MinIO mirror was not
  performed before the user steered back to the two demo blockers.
- Repeated Monday-blocker request was a read-only recheck: deployed worker
  unchanged, ep067 API HTTP200/non-null mesh URI confirmed again; no new
  session mutation or reprocessing.
