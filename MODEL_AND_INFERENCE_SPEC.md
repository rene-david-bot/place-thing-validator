# Model and Inference Spec — Place + Thing Validator PoC

## Model role
Use the latest multimodal model primarily for:
- place understanding
- object understanding
- background-context matching
- structured extraction
- confidence and ambiguity reporting

## Primary model
- GPT-5.4 as the first multimodal evaluator

## Inference modes
### 1. Place mapping inference
Input: Stage 1 place images
Output:
- place descriptors
- place candidates / canonical label
- visible context cues
- ambiguity notes

### 2. Object-in-place inference
Input: Stage 2 object image plus access to known place memory
Output:
- predicted object
- predicted place
- alternative candidates
- confidence
- evidence summary
- ambiguity flags

### 3. Retrieval inference
Input: text query plus indexed place/object data
Output:
- ranked matches
- confidence
- explanation

## Key prompt rules
The model must:
- distinguish place from object
- not invent excessive specificity
- return candidates, not just one answer
- express uncertainty explicitly
- identify when the image is insufficient

## Required normalized output shape
```json
{
  "place": {
    "predictedLabel": "electronics cabinet drawer 2",
    "candidates": [
      {"label": "electronics cabinet drawer 2", "confidence": 0.84},
      {"label": "tool cabinet middle drawer", "confidence": 0.39}
    ]
  },
  "object": {
    "predictedLabel": "black cable tester",
    "category": "electronics tool",
    "candidates": [
      {"label": "black cable tester", "confidence": 0.78},
      {"label": "multimeter", "confidence": 0.42}
    ]
  },
  "scene": {
    "lighting": "dim",
    "clutter": "medium",
    "occlusion": "partial"
  },
  "retrieval": {
    "confidenceOverall": 0.74,
    "ambiguityFlags": ["similar tools nearby"],
    "shouldHedge": true
  }
}
```

## Stage 1 to Stage 2 relationship
This PoC must explicitly test whether Stage 1 place memory improves Stage 2 results.
The system should attempt place matching against the known place index, not treat Stage 2 as a standalone image tagging task.

## Inference logging
Store:
- prompt version
- model version
- raw response
- normalized response
- timestamp
- source assets
