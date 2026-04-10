# Codex Build Brief — Place + Thing Validator PoC

## 1. Objective
Build a small, mobile-friendly web PoC that validates a 2-stage multimodal retrieval concept.

The app must test whether:
1. users can first create a visual memory of places
2. later object-in-context photos can be matched back to those places
3. place memory improves retrieval quality and trust

This is a validation app, not a production inventory system.

## 2. Build goal
Create the smallest working app that supports:
- Stage 1 place mapping
- Stage 2 object-in-place capture
- place-aware inference
- retrieval testing
- evaluation reporting

## 3. Core product model
### Stage 1: Place memory creation
The user scans known places such as:
- workshop
- cellar
- shelves
- cabinets
- drawers
- workbench zones

The system stores multiple images per place and builds a place memory index.

### Stage 2: Object-in-place capture
The user photographs an object where it is stored.
The system should infer:
- likely object
- likely known place based on background context
- confidence and ambiguity

Then the app should support retrieval tests against this indexed data.

## 4. Product principles
- mobile-first
- link-openable web app
- one clear action per screen
- evidence over polish
- visible confidence and ambiguity
- local-first where practical
- traceable outputs

## 5. Recommended stack
### Frontend
- Next.js with App Router
- React
- TypeScript
- simple responsive UI
- browser camera capture

### Backend
- Next.js server routes or lightweight backend inside the app
- API endpoints for run/place/object/inference actions

### Storage
- SQLite for structured data
- local file storage for uploaded images
- exportable JSON bundle per run

### AI integration
- OpenAI API
- GPT-5.4 as primary multimodal evaluator

## 6. Non-goals
Do not build:
- auth
- collaboration
- notifications
- voice
- polished design system
- cloud-scale infra
- production deployment hardening
- complex permissions

## 7. Required user flows
### Flow A: Create run
User can:
- create a run
- name it
- set environment type
- add notes

### Flow B: Add places and map them
User can:
- create a place
- choose place type
- assign optional parent
- capture required place images
- review and retake images
- mark place as complete

### Flow C: Capture object in place
User can:
- create object record
- take object-in-context photo
- optionally add second image
- enter or confirm human truth
- run inference
- review predicted object/place/confidence
- correct if needed

### Flow D: Challenge and retrieval
User can:
- enter a natural language query
- view ranked results
- see confidence and image evidence
- score whether result was correct and trustworthy

### Flow E: Results review
User can:
- see run metrics
- inspect confusions
- view trust scores
- export run data

## 8. Capture requirements
### Stage 1 place capture
Primary method: guided multi-photo capture.
Each place should require:
- overview shot
- alternate angle shot
- context/detail shot
Optional:
- hard-mode shot

### Stage 2 object capture
Each object should require:
- object-in-context photo
Optional:
- closer or alternate image

### Capture quality guidance
The UI should instruct users to create variance in:
- angle
- distance
- lighting
- clutter
- partial occlusion

The UI should discourage:
- overly cropped object shots in Stage 2
- identical Stage 1 photos
- blurry or too-dark images

## 9. Data model to implement
Implement the following entities:
- Run
- Place
- ObjectRecord
- Asset
- Inference
- QueryTest
- EvaluationResult

Minimum fields should align with `DATA_SCHEMA.md` in this spec pack.

## 10. App sections
Implement these views or routes:
- Home
- New Run
- Run Detail
- Place Capture
- Object Capture
- Challenge Mode
- Results
- Export

## 11. MVP functional requirements
### Runs
- create run
- list runs
- resume run

### Places
- create/edit place
- set hierarchy
- upload/capture images
- preview/retake
- mark mapped

### Objects
- create/edit object record
- capture image(s)
- link to actual place
- store notes

### Inference
- send image(s) plus context to model
- store raw response
- normalize response to schema
- link inference to source assets

### Retrieval
- accept NL query
- return ranked results
- show place + object + evidence

### Evaluation
- mark correct/incorrect
- rate trust
- store notes
- compute summary metrics

## 12. Inference behavior
### Place mapping inference
On Stage 1 place capture completion, optionally generate:
- place description
- visible context cues
- normalized label hints

### Object-in-place inference
Given Stage 2 image and known places, the model should return:
- predicted place
- place alternatives
- predicted object
- object alternatives
- confidence overall
- ambiguity flags
- whether the answer should hedge

## 13. Prompting constraints
Prompts must enforce:
- separation of place and object
- no fake precision
- multiple candidates
- explicit uncertainty
- indication when evidence is insufficient

Store prompt version with each inference.

## 14. Retrieval approach
For PoC, use a hybrid retrieval approach:
- normalized structured labels
- generated retrieval descriptors
- simple text similarity and/or heuristic matching
- optional embedding layer if useful

Do not over-engineer vector infrastructure in v1.

## 15. Metrics to compute
At minimum compute:
- place top-1 accuracy
- place top-3 accuracy
- object top-1 accuracy
- object top-3 accuracy
- joint retrieval top-1 accuracy
- joint retrieval top-3 accuracy
- average trust score
- overconfident wrong-answer rate

## 16. Build order
### Milestone 1
Project skeleton, routing, storage, base UI

### Milestone 2
Run creation and place management

### Milestone 3
Stage 1 guided place capture

### Milestone 4
Stage 2 object capture

### Milestone 5
OpenAI inference integration

### Milestone 6
Challenge mode and retrieval

### Milestone 7
Results dashboard and export

## 17. Implementation priorities if time is tight
Protect these first:
1. Stage 1 place mapping
2. Stage 2 object-in-context capture
3. place-aware inference
4. retrieval testing
5. evaluation dashboard

Everything else is secondary.

## 18. Suggested technical structure
Possible app structure:
- `app/`
- `components/`
- `lib/db/`
- `lib/inference/`
- `lib/retrieval/`
- `lib/evaluation/`
- `lib/schema/`
- `public/uploads/` or local storage path

## 19. Output quality standard
Before calling the app usable for testing, ensure:
- mobile flow is workable on phone
- Stage 1 and Stage 2 can be completed end-to-end
- inference outputs are stored and inspectable
- results page shows meaningful metrics
- the tester can actually validate the hypothesis

## 20. Stop point
Do not start adding extra product features after the core loop works.
Stop after the PoC can validate:
- place memory creation
- place matching from object context
- retrieval quality
- trust

That is the build target.
