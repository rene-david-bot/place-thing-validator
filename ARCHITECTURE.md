# Architecture — Place + Thing Validator PoC

## Recommended stack
### Frontend
- Next.js
- React
- responsive mobile-first UI
- PWA-style behavior if useful

### Backend
- lightweight app backend using Next.js server routes or similar
- simple inference orchestration
- local-friendly persistence

### Storage
- SQLite for structured records
- local file storage for images in PoC
- exportable JSON per run

## Why this stack
- easy to run locally
- easy to open via link on phone and desktop
- low operational complexity
- enough structure for reproducible testing

## Core modules
- run manager
- place capture module
- object capture module
- inference engine
- place memory index
- retrieval engine
- challenge engine
- evaluation dashboard
- export module

## Core flow
1. Create run
2. Capture Stage 1 place images
3. Build place memory index
4. Capture Stage 2 object-in-place images
5. Run object + place inference
6. Execute retrieval tests
7. Score outcomes and show results

## Storage requirements
The system should store:
- source images
- place hierarchy
- ground truth labels
- raw model outputs
- normalized outputs
- query tests
- evaluation outcomes
- prompt/model versions

## Architecture stance on video
Do not optimize the first version around video.
Allow video later only as an experimental extension for Stage 1 place capture.
