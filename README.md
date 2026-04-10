# Place + Thing Validator

A mobile-friendly PoC for validating a 2-stage multimodal retrieval flow.

## Core concept
1. Map places first with guided, variance-aware capture.
2. Later capture objects in context and test whether known place memory improves retrieval.

## What this demo includes
- guided 2-stage walkthrough
- local persistence in browser storage
- challenge mode for retrieval testing
- evaluation summary and export

## Why it is static
This first deployed version is a safe front-end PoC for validating the workflow and data model without exposing any API key.

## Next build step
Replace the heuristic challenge scoring with real multimodal inference through a server-side proxy or secured backend, keeping secrets out of the repo.
