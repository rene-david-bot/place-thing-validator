# Build Plan — Place + Thing Validator PoC

## Build objective
Create the smallest app that can validate the 2-stage hypothesis with a clean guided walkthrough.

## Phase 0 — Freeze specs
Before building:
- confirm 2-stage flow
- confirm capture protocol
- confirm schemas
- confirm evaluation logic

## Phase 1 — Skeleton app
Build:
- home screen
- new run flow
- place creation
- progress tracking
- local persistence

## Phase 2 — Stage 1 place capture
Build:
- guided place walkthrough
- multi-photo capture
- image review and retake
- place completion state

## Phase 3 — Stage 2 object capture
Build:
- object-in-context capture
- optional second image
- human truth entry
- save and review flow

## Phase 4 — Inference integration
Build:
- model calls
- normalized structured outputs
- raw response logging
- place-memory-aware matching

## Phase 5 — Retrieval and challenge mode
Build:
- natural language query input
- top result ranking
- evidence display
- challenge test workflow

## Phase 6 — Evaluation dashboard
Build:
- metrics view
- trust scoring
- confusion review
- go/refine/stop summary

## Phase 7 — Optional comparison experiment
Only after photo-first flow works:
- add short Stage 1 video capture experiment
- compare against photo workflow

## First implementation priority
If scope gets tight, protect these first:
- Stage 1 place mapping
- Stage 2 object-in-context capture
- place-aware inference
- retrieval evaluation

Everything else is secondary.
