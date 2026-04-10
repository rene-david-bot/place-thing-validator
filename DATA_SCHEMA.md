# Data Schema — Place + Thing Validator PoC

## Core entities
- Run
- Place
- ObjectRecord
- Asset
- Inference
- QueryTest
- EvaluationResult

## Run
```json
{
  "id": "run_001",
  "name": "Workshop and cellar test",
  "environmentType": "home_storage",
  "status": "active",
  "createdAt": "2026-04-10T07:00:00Z",
  "promptVersion": "v1",
  "modelVersion": "gpt-5.4"
}
```

## Place
```json
{
  "id": "place_001",
  "runId": "run_001",
  "name": "Electronics cabinet drawer 2",
  "placeType": "drawer",
  "parentPlaceId": "place_000",
  "description": "middle drawer with adapters and test tools",
  "status": "mapped"
}
```

## ObjectRecord
```json
{
  "id": "obj_001",
  "runId": "run_001",
  "placeId": "place_001",
  "name": "black cable tester",
  "category": "electronics_tool",
  "notes": "small rectangular tester",
  "status": "captured"
}
```

## Asset
```json
{
  "id": "asset_001",
  "entityType": "place",
  "entityId": "place_001",
  "captureType": "overview",
  "imageUri": "/data/run_001/place_001_overview.jpg",
  "createdAt": "2026-04-10T07:05:00Z"
}
```

## Inference
```json
{
  "id": "inf_001",
  "assetId": "asset_010",
  "model": "gpt-5.4",
  "type": "object_in_place_analysis",
  "normalized": {
    "predictedPlaceId": "place_001",
    "predictedObjectLabel": "black cable tester",
    "confidenceOverall": 0.78,
    "ambiguityFlags": ["similar tools nearby"]
  }
}
```

## QueryTest
```json
{
  "id": "qt_001",
  "runId": "run_001",
  "queryText": "find the black cable tester from the electronics cabinet",
  "queryType": "joint",
  "expectedPlaceId": "place_001",
  "expectedObjectId": "obj_001"
}
```

## EvaluationResult
```json
{
  "id": "ev_001",
  "queryTestId": "qt_001",
  "returnedRank": 1,
  "returnedPlaceId": "place_001",
  "returnedObjectId": "obj_001",
  "confidence": 0.82,
  "correct": true,
  "trustScore": 4,
  "notes": "good match, evidence clear"
}
```

## Design requirements
- every inference links to source assets
- every evaluation links to expected ground truth
- prompts and model versions must be stored
- corrected human labels should be preserved, not overwritten
