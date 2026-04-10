# Walkthrough Spec — Place + Thing Validator PoC

## Goal
Guide the tester through a clean 2-stage validation flow with minimal friction and high-quality evidence collection.

## Entry points
- Start new validation run
- Resume run
- View results

## Run creation
Fields:
- run name
- environment type
- notes

## Stage 1 — Build place memory
This stage captures locations only.
The app should guide the user to scan places before any retrieval testing.

### Stage 1 steps
1. Introduction
   - explain that this stage maps locations, not objects
   - explain that multiple views are needed

2. Add a place
   - place name
   - place type
   - optional parent place
   - optional description

3. Guided capture for each place
   - overview shot
   - alternate angle shot
   - context/detail shot
   - optional hard-mode shot

4. Capture review
   - preview images
   - show missing coverage hints
   - allow retake

5. Mark place complete
   - confirm place scan is done
   - move to next place

### Supported place types
- room
- zone
- shelf
- cabinet
- drawer
- bench
- box
- bin

## Stage 2 — Capture object in place
This stage captures objects while leveraging background context from Stage 1.

### Stage 2 steps
1. Select or start object capture
2. Take object-in-context photo
3. Optional second photo
   - closer object shot
   - alternate angle
4. Enter or confirm human ground truth
   - object name
   - actual place
   - optional notes
5. Run inference
6. Review prediction
   - predicted object
   - predicted place
   - confidence
   - alternatives
7. Confirm or correct

## Challenge mode
After enough objects are captured, the app should support retrieval tests.

### Challenge task types
- object only
- place only
- object + place
- ambiguous query
- similar object disambiguation
- similar place disambiguation
- negative query

## Results flow
The app should show:
- correct vs incorrect
- confidence behavior
- strongest matches
- biggest confusions
- trust score
- final recommendation

## UX principles
- one task per screen
- large touch targets
- clear progress indicators
- plain language instructions
- visible uncertainty
- easy retake and correction
