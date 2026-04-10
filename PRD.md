# PRD — Place + Thing Validator PoC

## 1. Purpose
Build a small, mobile-friendly web app that validates a 2-stage multimodal retrieval concept.

The app should test whether creating a visual memory of places first improves later object-in-place recognition and retrieval.

## 2. Problem
People often remember things by a combination of:
- what the item is
- where it belongs
- what the surrounding environment looks like

Traditional approaches like folders, labels, and notes capture only part of that.
This PoC tests whether multimodal place memory can improve retrieval in messy real-world environments.

## 3. Core hypothesis
If a user first scans and maps locations, then later photographs objects within those locations, a multimodal system can use background context plus object cues to identify place and object more accurately and more trustworthily than object-only or manual methods.

## 4. Scope
### In scope
- link-openable web app
- mobile-first responsive UI
- guided 2-phase walkthrough
- Stage 1 place scanning
- Stage 2 object-in-place capture
- structured inference
- retrieval testing
- evaluation dashboard
- exportable run data

### Out of scope
- production inventory features
- user accounts
- collaboration
- notifications
- voice mode
- polished branding
- full deployment hardening

## 5. Primary user
Rene as the initial tester.
Later: a very small number of additional testers.

## 6. Primary environments
- workshop
- cellar
- shelves
- cabinets
- drawers
- workbenches
- bins and boxes
- desk zones

## 7. Product principles
- validate the USP, do not overbuild
- mobile-first
- one clear action per screen
- evidence over magic
- uncertainty must be visible
- local-first where practical
- every output should be traceable

## 8. Two-stage model
### Stage 1: Place memory creation
The user scans locations to build a place index.
Goal: create stable visual representations of known locations.

### Stage 2: Object-in-place capture
The user photographs objects in those locations.
Goal: infer both object and place, then test retrieval.

## 9. Success criteria
The PoC is successful if it demonstrates all of the following strongly enough:
- users can complete the guided flow without confusion
- place memory can be created from Stage 1 scans
- Stage 2 object photos can be matched to known places using background context
- joint retrieval is useful and trustworthy
- the system handles uncertainty honestly
- results are strong enough to justify an MVP

## 10. Decision gate
### Go
- clear evidence that place memory improves retrieval and trust

### Refine
- promising signal, but capture protocol, prompts, or schema need revision

### Stop
- weak place recognition, poor trust, or no meaningful uplift from Stage 1
