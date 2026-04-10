# Place + Thing Validator

A mobile-friendly PoC for validating a 2-stage multimodal retrieval flow with **real photo capture**, **local browser storage**, and **user-supplied OpenAI API access**.

## Core concept
1. **Map places first** with guided, variance-aware capture.
2. **Capture objects in context** later and test whether known place memory improves place matching and retrieval.
3. **Score retrieval quality** through challenge mode and evaluation metrics.

## What this build includes
- guided 2-stage workflow
- browser camera / photo upload support
- local-first image + metadata persistence in the browser
- optional local-only OpenAI API key entry in the UI
- AI place analysis for Stage 1
- AI object-in-context inference for Stage 2
- challenge mode for retrieval testing
- evaluation summary and JSON export

## OpenAI key handling
This app is deployed as a static GitHub Pages site.

That means:
- **no API key is committed to the repo**
- the tester can paste their own OpenAI key into the UI
- the key can stay **memory-only** or be stored **locally in that browser**
- requests go directly from the browser to OpenAI

Important: this is still a **client-side key flow**, so only use a test key you control.

## Recommended usage flow
1. Open the live site.
2. Paste your OpenAI key in **Overview**.
3. Create a run.
4. Map a few places with overview / alternate / detail / hard-mode shots.
5. Run **Analyze with AI** on those places.
6. Capture objects in context.
7. Run **AI inference** on those objects.
8. Use **Challenge mode** and **Results** to judge whether the concept is good enough for MVP.

## Deployment
Push to `main` and GitHub Actions deploys the static site to GitHub Pages.

## Next sensible step
If the PoC signal is strong, the next version should move OpenAI calls behind a small secured backend or proxy so the tester no longer needs a client-side key.
