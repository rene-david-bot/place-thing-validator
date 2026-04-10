# Evaluation Plan — Place + Thing Validator PoC

## Goal
Determine whether a 2-stage place-memory approach materially improves real-world retrieval.

## Primary hypotheses
### H1
Stage 1 place scanning creates usable place memory.

### H2
Stage 2 object-in-context images can be matched to known places using background context.

### H3
Joint place+object retrieval performs better than object-only retrieval.

### H4
Confidence behavior is trustworthy, especially on ambiguous cases.

## Test conditions
### Condition A
Object-only inference

### Condition B
Place-memory-assisted inference

### Condition C
Manual label baseline

## Test classes
- place recognition
- object recognition
- joint retrieval
- similar object disambiguation
- similar place disambiguation
- ambiguous query
- negative query

## Metrics
### Accuracy
- place top-1 accuracy
- place top-3 accuracy
- object top-1 accuracy
- object top-3 accuracy
- joint retrieval top-1 accuracy
- joint retrieval top-3 accuracy

### Trust and calibration
- overconfident wrong-answer rate
- trust score average
- usefulness score average
- confidence appropriateness score

### UX
- run completion rate
- average capture time
- number of retakes
- confusion/drop-off points

## Suggested decision thresholds
### Go
- joint retrieval top-1 at or above 75%
- joint retrieval top-3 at or above 90%
- low overconfident wrong-answer rate
- tester trust average at or above 4/5
- clear uplift over object-only or manual baseline

### Refine
- signal is promising but inconsistent
- errors cluster around capture quality, place taxonomy, or prompt design

### Stop
- Stage 1 adds little or no value
- trust remains low
- wrong confident answers are frequent

## Evaluation design note
The PoC should not only test whether the model can guess correctly.
It should test whether Stage 1 place memory measurably improves retrieval quality and trust.
