# Capture Protocol — Place + Thing Validator PoC

## Recommendation
For the first PoC, use guided multi-photo capture as the primary method.
Do not make video the default in v1.

## Why photo-first
- easier to standardize
- easier to evaluate
- lower processing and storage cost
- less motion blur and noise
- simpler for reproducible testing

## When to test video
Video should be a later comparison experiment for Stage 1 place capture.
Use it only after the photo workflow works.

## Stage 1 place capture protocol
Each place should ideally have 3 to 4 images.

### Required images
1. Overview
   - captures the whole place or most of it
2. Alternate angle
   - captures the same place from another position
3. Context/detail
   - captures local texture, layout, surrounding cues

### Optional image
4. Hard-mode shot
   - includes clutter, partial obstruction, difficult lighting, or a more realistic retrieval-like angle

## Guidance for good variance
The app should actively guide the tester to capture variance across:
- angle
- distance
- lighting
- clutter
- partial occlusion
- neighboring context

### Example prompts
- Take one wide overview.
- Now move slightly left or right and take a second angle.
- Take a more realistic everyday view, not too clean.
- If this place is often cluttered, capture one cluttered angle.

## Stage 2 object capture protocol
Each object should have at least 1 image, preferably 2.

### Required image
1. Object in context
   - object clearly visible
   - surrounding location also visible

### Optional image
2. Closer or alternate angle
   - helpful for difficult objects or repeated similar items

## Important rule
Stage 2 images must preserve enough background context for place matching.
Do not optimize purely for object crop.

## Capture quality checks
The app should warn if:
- image is too blurry
- image is too dark
- place context is mostly missing
- object is fully occluded
- all Stage 1 images are nearly identical

## Video stance
### Not default for v1
Short place-scan video can be powerful, but it adds:
- heavier storage
- frame extraction complexity
- more noisy inputs
- harder QA

### Best role for video later
- optional Stage 1 experiment
- compare video-derived place memory vs photo-derived place memory
- decide later whether video improves coverage enough to justify complexity
