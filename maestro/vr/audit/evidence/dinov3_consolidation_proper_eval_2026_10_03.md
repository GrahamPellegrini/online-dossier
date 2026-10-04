# DINOv3 consolidation: corrected evaluation, 2026-10-03

**Recommendation: do not adopt DINOv3 in production now. Keep DINOv2 for re-ID, retain SigLIP, and keep automatic mesh matching disabled.** The smaller models really are lighter than the existing pair. Foreground DINOv3-B improves retrieval substantially, but still confuses two genuinely absent objects with library identities. Its negative scores overlap a real bottle match. It does not yet fix reliable automatic mesh assignment. This supersedes the earlier ViT-L-only note and its invalid self-crop re-ID proxy; it is not a claim that DINOv3 has no research value.

## Actual recovery, before measurement

Called the current production `server.ope_runner.worker.process_one()` inside `maestro-ope`: Hands23 service precompute, SAM2, Qwen, model_free/PointCloudPCA, unchanged `--no-mesh-resolve`. Intercepted only uploader and success/display callbacks to stage results. Backed up all existing artifacts locally and to MinIO; validated staged records and unchanged original ETags before original uploader published them. Read back objects byte-for-byte. Raw recordings were preserved. These were actual pipeline runs, not invented records or offline inference substituted for recovery.

| Recording | Reason | Regenerated objects | World poses |
|---|---|---:|---:|
| ep036 | requested stale-empty restore | 1 rolling pin | 153 |
| ep024 | requested stale-empty restore | 1 flower clock | 98 |
| ep042 | requested stale-empty restore | 1 detergent/toilet cleaner | 138 |
| ep029 | requested stale-empty restore | 1 remote | 108 |
| ep049 | requested stale-empty restore | 1 remote | 77 |
| ep040 | additional empty positive discovered in cohort audit | 1 clock | 221 |
| ep044 | stored mask covered keyboard, not the Stanley | 1 Stanley | 83 |
| ep046 | stored mask covered background | 1 pen-labelled record | 42 |

All eight are non-empty JSONL, finite seven-component world poses with unit quaternions, recording-bounded timestamps, episode/frame metadata agreement and saved masks. ep040 contains two overlapping hand-track segments concatenated rather than time sorted: 221 poses, 111 mask files, one backwards timestamp transition. This is preserved production output, valid for image matching but not claimed replay-order correctness. ep046's fresh run still segments the background curtain: structurally valid output is not proof of a correct object mask. This defect was not concealed, fixed with fabricated data, or broadened into a SAM2 refactor.

Evidence: `archive/dinov3-proper-eval-2026-10-03/restoration.json`, `validation.json`, `restored/<ep>/{before,staged}/`. MinIO `recovery/dinov3-proper-eval-2026-10-03/<ep>/{before,verified}/`. Restoration validation records SHA256s and frame/mask counts.

## Cohort and ground truth audit

The old memory says 21 sessions; its original recorded sweep and `/tmp/redownload_episodes.py` actually enumerate **23**. Asked Graham which 21 he intended; no reply before proceeding with the documented cohort. Did not manufacture a 21-member selection.

- Historical scored 11: ep022,024,025,029,031,036,039,042,044,046,049; six known-library identities and five absent-library identities.
- Four additional genuine object recordings: ep030,037,040,048. Total 15 genuine pipeline queries: nine known-library and six absent-library.
- Seven empty recordings: ep027,028,038,041,045,047,050. They supply no image query and are **not counted as successful encoder rejections**.
- ep043 is a deliberate fake but has a non-empty bottle output. Reported separately as a detection failure; not treated as a legitimate absent-object retrieval negative. Foreground B would assign `obottle01` at 0.7142; an encoder cannot establish whether the bottle was actually held.
- ep022 has a spurious watch record and an existing, explicitly authorized, visually verified Hands23/SAM2 rolling-pin mask record. Deterministic highest-confidence selection uses the verified mask (confidence 1), not the watch (0.21). No new manual mask was invented. The rolling-pin thumbnail itself comes from ep022: exclude that episode from the source-independent comparison.
- ep046 remains a background mask after the actual rerun: exclude it from the clean-crop comparison as well. The clean holdout has 13 queries: eight known-library, five absent-library.

Identities come from Graham's batch ground-truth notes and later confirmed Stanley correction, not Qwen labels. Library frozen to the original `oclock01`, `obottle01`, `orollingpin01`, with actual photographed thumbnails and hashes. New clock/candle entries were not added mid-comparison. This tests image-to-library identity retrieval, not geometric registration or mesh quality; old oversized mesh geometry was not repaired.

## Proper hand-to-hand re-ID

Used existing saved **pre-dedup, independently seeded left/right SAM2 candidate crops** from the later valid capture, not the earlier self-box experiment. Each pair has two different hand/object IDs, timestamps, PNG hashes and pixel arrays. Capture ran real Hands23/SAM2 with dummy pose provider and labeller none; pose estimation is irrelevant to this encoder comparison. Reused this valid completed crop capture rather than repeat it.

Shared production-style resize 224x224, OpenCV bilinear, ImageNet normalization, unit-normalized CLS cosine; native current DINOv2-S checkpoint versus actual cached/downloaded DINOv3-S and B. Different timestamps are close keyframes of each hand event, not necessarily the same video frame. No threshold tuning.

| Same physical object, two hands | DINOv2-S/14 | DINOv3-S/16 | DINOv3-B/16 |
|---|---:|---:|---:|
| ep030 rolling pin | 0.908074 | 0.868051 | 0.849891 |
| ep037 rolling pin | 0.130545 | 0.126036 | 0.055651 |
| ep048 pen | 0.831158 | 0.571294 | 0.496582 |
| ep053 marker | 0.893873 | 0.922620 | 0.912666 |
| Positive visual pairs >= existing 0.82 | 3/4 | 2/4 | 2/4 |
| Different-object crop pairs >= 0.82 | 4/20 | 1/20 | 2/20 |

The 20 negatives are cross-recording pin-versus-pen/marker and pen-versus-marker crop pairs from the same eight saved crops. They test specificity, but are correlated and do not measure full pipeline false merges of simultaneous held objects. Descriptive positive/negative AUC is 0.725 / 0.725 / 0.700 respectively. Positives exceeding every negative score: 1/4, 2/4, 1/4. Thus S is not universally worse at every possible threshold, but neither S nor B is a demonstrated drop-in improvement at the current operating point. These are encoder scores, not full production spatial/time-gated cluster outcomes.

Visual audit: ep037's second crop is only a tiny pin fragment; pen/marker masks are small. No crop was silently replaced to improve a model's results. Input hashes, candidate IDs and timestamps: `reid-input-manifest.json`; scores: `reid-results.json`, `reid-specificity-diagnostic.json`.

## Dense image matching, positives AND negatives

SigLIP is image-only cosine using its existing image processor and image encoder; no labels/text blending. This differs from the old historical 65% image/35% text matcher. DINOv3 uses the 196 normalized patch tokens, excluding CLS and four registers. Fixed primary score from the prior evaluation: mean of the two directional top-quartile nearest-patch cosine means. No learned projection, fitting or threshold sweep.

Foreground sensitivity uses the same predeclared rule for S and B: 224 image, patch coverage by non-black pixels >=25%, at least one retained patch. It removes blank-mask background matches but is an exploratory variant, not independently calibrated production code. Current identity threshold 0.55 is shown unchanged for all methods; cosine scales differ across encoders, so this is a current-operating-point comparison, not calibrated equal-risk probabilities.

**Correct decisions include correct identity matches and correct absent-library rejections. An accepted wrong mesh is never a hit.**

| Method | Historical 11 correct/total | All 15 genuine queries correct/total | Source-independent 14 correct/total | Clean 13 correct/total |
|---|---:|---:|---:|---:|
| SigLIP image-only | 4/11 | 7/15 | 6/14 | 6/13 |
| DINOv3-S dense | 5/11 | 8/15 | 7/14 | 7/13 |
| DINOv3-B dense | 5/11 | 7/15 | 6/14 | 6/13 |
| DINOv3-S foreground sensitivity | 6/11 | 9/15 | 8/14 | 8/13 |
| DINOv3-B foreground sensitivity | 10/11 | 13/15 | 12/14 | 11/13 |

All-15 positive top-1 identities: SigLIP 7/9, S dense 8/9, B dense 7/9, S foreground 9/9, B foreground 9/9. Absent-library rejections: 0/6 for SigLIP, S dense, B dense and S foreground; **4/6 for B foreground**. Even the best variant falsely accepts ep048 pen -> rolling pin at **0.627606**, and ep049 remote -> rolling pin at **0.574410**, while the correct ep025 bottle score is **0.556643**. There is no single threshold that retains all these true matches and rejects both false assignments.

Excluding source episode ep022 and background-mask ep046 does not rescue this: B foreground gets 8/8 known identities and rejects 3/5 absent identities, hence 11/13 correct; the same two false assignments remain. The zero-false-positive descriptive frontier retains 4/8 clean positive matches for B foreground vs 2/8 SigLIP. This is an optimistic diagnostic using these negatives, not a validated production threshold or independently held-out result.

Thus dense foreground features improve known-object ranking and some rejection. They do **not** yet solve safe automatic mesh identity assertion, and the two smaller models do not satisfy both-task consolidation criteria. Preserve B foreground as a documented candidate for a future calibrated independent-negative evaluation; do not enable matching or replace production encoders on this evidence.

## Measured compute, no parameter estimates

Counts are sums of actual loaded parameter tensors. FP32 forward-only latency measured on NVIDIA L40S, CUDA_VISIBLE_DEVICES=2, 224x224, batch one, 20 warmups and 100 CUDA-event trials per operation, PyTorch 2.7.1+cu126. Shared machine, clocks not locked. Final run:

| Model/operation | Actual parameters | Median ms | P95 ms |
|---|---:|---:|---:|
| DINOv2-S alone | 22,056,576 | 4.861 | 5.295 |
| SigLIP-base alone, image branch | 203,155,970 | 5.563 | 5.664 |
| DINOv3-S alone | 21,596,544 | 4.798 | 4.867 |
| DINOv3-B alone | 85,660,416 | 5.707 | 5.778 |
| Current pair, image + re-ID forwards | 225,212,546 | 10.451 | 10.555 |
| Current pair, image + text + re-ID forwards | 225,212,546 | 14.740 | 14.982 |

SigLIP image submodel alone has 92,884,224 parameters; 203M counts the actually loaded image+text model, not a purported 203M image tower. Full current pair FP32 parameter bytes: 900,850,184; S 86,386,176; B 342,641,664. Cached weight-file sizes/hashes/revisions recorded in `model-manifest.json`.

Initial run timing medians were DINOv2 3.798ms, SigLIP image 3.249ms, S 4.381ms, B 4.300ms, pair image+re-ID 7.056ms; saved under `superseded-before-crop-audit/compute-results.json`. Timing variability on this shared host prevents claiming precise deployment speedups. Both measured runs show smaller models require less forward time than the combined pair. No end-to-end latency, decoding/preprocessing, dense pairwise scoring, network, CPU, FP16/BF16, peak activation VRAM or partner hardware measurements are claimed. Keeping DINOv2 plus B would load 107,716,992 parameters before any retained SigLIP model; that sum is arithmetic on measured tensors, not an implemented deployment.

## Licence, checked against primary sources

Official [DINOv3 licence](https://github.com/facebookresearch/dinov3/blob/main/LICENSE.md), last updated August 19, 2025; the cached S/B weights carry the same agreement. Royalty-free commercial use, modification and redistribution are permitted; no research-only restriction. Civilian industrial robotics appears compatible provided its use and distribution comply. This is a custom agreement, not an unrestricted permissive licence: redistribution carries its terms, research publications acknowledge use, applicable privacy/export rules apply, and specified controlled/military/nuclear/espionage/weapons end uses are restricted. It also contains reverse-engineering restrictions and indemnity obligations. The partner's exact end use and contractual acceptance were not reviewed. No licence-based ban on ordinary industrial robotics was found; partner compatibility is conditional rather than universally guaranteed.

## Reproducibility, tests and unchecked scope

No production encoder code/config changed. Small/B weights were genuinely loaded and measured. Evaluation inputs, results, model metadata and scripts are in `archive/dinov3-proper-eval-host-2026-10-03/`, The evaluation scoring archive remains local; an optional MinIO mirror was not performed before the user steered back to the demo blockers. Recovery backups and verified output bundles are already in MinIO. Main scoring command: `CUDA_VISIBLE_DEVICES=2 PYTHONPATH=/home/graham/projects/maestro-vr python3 archive/dinov3-proper-eval-host-2026-10-03/scripts/maestro_dinov3_proper_eval.py`. Existing snapshots suffice to reproduce scoring; recovery scripts intentionally refuse to overwrite an existing backup directory.

Before evaluation documentation changes: `pytest tests/ -q`: **469 passed, 1 skipped, 2 warnings, 42.79s**. The immediately preceding demo blocker change had baseline 462 passed/1 skipped, new guard/integration cases first failed as expected, then 469 passed/1 skipped. Final completed after suite: **469 passed, 1 skipped, 2 warnings, 39.70s**, recorded in `tests-after.log` and the continuity handoff.

Not checked: an independent calibration/test split, a true 21-session list (not available in recorded source), full DINOv3 pipeline clustering, simultaneous different-object negative re-ID recordings, all mesh library entries/multiple thumbnail pooling, tuned local-feature retrieval heads or geometric correspondence verification, ground-truth 3D pose accuracy, or industrial-partner deployment/licence acceptance. Bad/partial masks and ep043 false detection remain upstream limitations, explicitly separated from encoder evidence. Do not call all 11 crops semantically valid merely because all outputs are non-empty.
