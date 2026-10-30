# A2 card-only scoring

10 recordings; 10 expected cards; three runs. Recording-derived values and excerpts never appear here.
Candidate extraction hash: d6bf8dd00961399c. Source ears: saved A-min, muse-spark-1.2 minimal and Voice with 53 keywords. New ear calls: zero. Rule off.
Local corrected expected fields: 2. Missing logical results: 0.

## Call provenance

| Provider | Model | Effort | Extraction hash | Git commit | Dirty |
| --- | --- | --- | --- | --- | --- |
| meta | muse-spark-1.3 | low | d6bf8dd00961399c | a5ee0e8b22cc0a893cbe4e2af8069630210e2177 | false |
| baseten | meta-models/muse-spark-open-1026 | low | d6bf8dd00961399c | a5ee0e8b22cc0a893cbe4e2af8069630210e2177 | true |
| baseten | meta-models/muse-spark-open-1026 | low | 0504c523c212791e | a5ee0e8b22cc0a893cbe4e2af8069630210e2177 | true |
| baseten | meta-models/muse-spark-open-1026 | unavailable | 0504c523c212791e | a5ee0e8b22cc0a893cbe4e2af8069630210e2177 | true |
The dirty flag describes the whole working tree; a dirty-file list was not captured by the runner.

## Revision records and recorded cost

| Provider | Planned logical calls | Saved call records | Successful | Unavailable | Recorded USD |
| --- | --- | --- | --- | --- | --- |
| meta | 49 | 49 | 49 | 0 | 0.49115875000000003 |
| baseten | 15 | 15 | 15 | 0 | 0.10923425000000002 |
Derived pipeline summaries: 30; these are not extra calls. Shared-ledger recorded total USD 2.282037. Successful responses with missing usage pause the runner.

Meta runner saved counter: 79 = 49 call records + 30 derived pipeline summaries.
Baseten runner saved counter: 34 = 19 previously saved Meta authored reference records + 15 Baseten call records. The separate Baseten log duplicates metadata for its 15 calls; it adds no calls.

## Recording outcome totals

| Configuration | Valid pipelines | CW | Caught | Unnecessary | Missed | Extra | Extra cards | Missing cards | Name leaks | JSON failures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | 30 | 4 | 6 | 8 | 5 | 0 | 0 | 0 | 0 | 0 |
| A | 30 | 2 | 6 | 11 | 3 | 0 | 0 | 0 | 0 | 0 |
| A-min | 30 | 0 | 8 | 12 | 3 | 0 | 0 | 0 | 0 | 0 |
| A2 | 30 | 1 | 6 | 8 | 3 | 0 | 0 | 0 | 0 | 0 |

## Field outcome variation across runs

| Configuration | Fields with differing outcomes |
| --- | --- |
| Baseline | 11 |
| A | 13 |
| A-min | 8 |
| A2 | 6 |
Counts compare outcome labels for each recording/card/field across repeats; they do not reveal field values.

## n05 key-term outcomes

| Run | Key term 1 | Key term 2 |
| --- | --- | --- |
| 1 | correct | correct |
| 2 | correct | correct |
| 3 | correct | correct |

## Per-recording outcomes

| Recording | Card | Field | Run | Outcome |
| --- | --- | --- | --- | --- |
| n01 | n01 | symptomGroup | 1 | correct |
| n01 | n01 | caseCount | 1 | correct |
| n01 | n01 | comparedWithUsual | 1 | correct |
| n01 | n01 | ageGroup | 1 | correct |
| n01 | n01 | area | 1 | correct |
| n01 | n01 | onset | 1 | correct |
| n01 | n01 | exposureTypes:water | 1 | correct |
| n01 | n01 | exposureKeyTerms:1 | 1 | correct |
| n01 | n01 | symptomGroup | 2 | correct |
| n01 | n01 | caseCount | 2 | correct |
| n01 | n01 | comparedWithUsual | 2 | correct |
| n01 | n01 | ageGroup | 2 | correct |
| n01 | n01 | area | 2 | correct |
| n01 | n01 | onset | 2 | correct |
| n01 | n01 | exposureTypes:water | 2 | correct |
| n01 | n01 | exposureKeyTerms:1 | 2 | correct |
| n01 | n01 | symptomGroup | 3 | correct |
| n01 | n01 | caseCount | 3 | correct |
| n01 | n01 | comparedWithUsual | 3 | correct |
| n01 | n01 | ageGroup | 3 | correct |
| n01 | n01 | area | 3 | correct |
| n01 | n01 | onset | 3 | correct |
| n01 | n01 | exposureTypes:water | 3 | correct |
| n01 | n01 | exposureKeyTerms:1 | 3 | correct |
| n02 | n02 | symptomGroup | 1 | correct |
| n02 | n02 | caseCount | 1 | caught by ask |
| n02 | n02 | comparedWithUsual | 1 | correct |
| n02 | n02 | ageGroup | 1 | correct |
| n02 | n02 | area | 1 | correct |
| n02 | n02 | onset | 1 | correct |
| n02 | n02 | exposureTypes:water | 1 | correct |
| n02 | n02 | exposureKeyTerms:1 | 1 | correct |
| n02 | n02 | symptomGroup | 2 | correct |
| n02 | n02 | caseCount | 2 | unnecessary ask |
| n02 | n02 | comparedWithUsual | 2 | correct |
| n02 | n02 | ageGroup | 2 | correct |
| n02 | n02 | area | 2 | correct |
| n02 | n02 | onset | 2 | correct |
| n02 | n02 | exposureTypes:water | 2 | correct |
| n02 | n02 | exposureKeyTerms:1 | 2 | correct |
| n02 | n02 | symptomGroup | 3 | correct |
| n02 | n02 | caseCount | 3 | confidently wrong |
| n02 | n02 | comparedWithUsual | 3 | correct |
| n02 | n02 | ageGroup | 3 | correct |
| n02 | n02 | area | 3 | correct |
| n02 | n02 | onset | 3 | correct |
| n02 | n02 | exposureTypes:water | 3 | correct |
| n02 | n02 | exposureKeyTerms:1 | 3 | correct |
| n03 | n03 | symptomGroup | 1 | correct |
| n03 | n03 | caseCount | 1 | correct |
| n03 | n03 | comparedWithUsual | 1 | correct |
| n03 | n03 | ageGroup | 1 | correct |
| n03 | n03 | area | 1 | correct |
| n03 | n03 | onset | 1 | correct |
| n03 | n03 | symptomGroup | 2 | correct |
| n03 | n03 | caseCount | 2 | correct |
| n03 | n03 | comparedWithUsual | 2 | correct |
| n03 | n03 | ageGroup | 2 | correct |
| n03 | n03 | area | 2 | correct |
| n03 | n03 | onset | 2 | correct |
| n03 | n03 | symptomGroup | 3 | correct |
| n03 | n03 | caseCount | 3 | correct |
| n03 | n03 | comparedWithUsual | 3 | correct |
| n03 | n03 | ageGroup | 3 | correct |
| n03 | n03 | area | 3 | correct |
| n03 | n03 | onset | 3 | correct |
| n04 | n04 | symptomGroup | 1 | correct |
| n04 | n04 | caseCount | 1 | correct |
| n04 | n04 | comparedWithUsual | 1 | correct |
| n04 | n04 | ageGroup | 1 | correct |
| n04 | n04 | area | 1 | correct |
| n04 | n04 | onset | 1 | correct |
| n04 | n04 | symptomGroup | 2 | correct |
| n04 | n04 | caseCount | 2 | correct |
| n04 | n04 | comparedWithUsual | 2 | correct |
| n04 | n04 | ageGroup | 2 | correct |
| n04 | n04 | area | 2 | correct |
| n04 | n04 | onset | 2 | correct |
| n04 | n04 | symptomGroup | 3 | correct |
| n04 | n04 | caseCount | 3 | correct |
| n04 | n04 | comparedWithUsual | 3 | correct |
| n04 | n04 | ageGroup | 3 | correct |
| n04 | n04 | area | 3 | correct |
| n04 | n04 | onset | 3 | correct |
| n05 | n05 | symptomGroup | 1 | correct |
| n05 | n05 | caseCount | 1 | correct |
| n05 | n05 | comparedWithUsual | 1 | correct |
| n05 | n05 | ageGroup | 1 | correct |
| n05 | n05 | area | 1 | unnecessary ask |
| n05 | n05 | onset | 1 | correct |
| n05 | n05 | exposureTypes:food | 1 | correct |
| n05 | n05 | observations:moreSevere | 1 | missed |
| n05 | n05 | exposureKeyTerms:1 | 1 | correct |
| n05 | n05 | exposureKeyTerms:2 | 1 | correct |
| n05 | n05 | symptomGroup | 2 | correct |
| n05 | n05 | caseCount | 2 | correct |
| n05 | n05 | comparedWithUsual | 2 | correct |
| n05 | n05 | ageGroup | 2 | correct |
| n05 | n05 | area | 2 | correct |
| n05 | n05 | onset | 2 | caught by ask |
| n05 | n05 | exposureTypes:food | 2 | correct |
| n05 | n05 | observations:moreSevere | 2 | missed |
| n05 | n05 | exposureKeyTerms:1 | 2 | correct |
| n05 | n05 | exposureKeyTerms:2 | 2 | correct |
| n05 | n05 | symptomGroup | 3 | correct |
| n05 | n05 | caseCount | 3 | correct |
| n05 | n05 | comparedWithUsual | 3 | correct |
| n05 | n05 | ageGroup | 3 | correct |
| n05 | n05 | area | 3 | correct |
| n05 | n05 | onset | 3 | correct |
| n05 | n05 | exposureTypes:food | 3 | correct |
| n05 | n05 | observations:moreSevere | 3 | missed |
| n05 | n05 | exposureKeyTerms:1 | 3 | correct |
| n05 | n05 | exposureKeyTerms:2 | 3 | correct |
| n06 | n06 | symptomGroup | 1 | correct |
| n06 | n06 | caseCount | 1 | correct |
| n06 | n06 | comparedWithUsual | 1 | correct |
| n06 | n06 | ageGroup | 1 | correct |
| n06 | n06 | area | 1 | unnecessary ask |
| n06 | n06 | onset | 1 | correct |
| n06 | n06 | exposureTypes:school | 1 | correct |
| n06 | n06 | exposureKeyTerms:1 | 1 | correct |
| n06 | n06 | symptomGroup | 2 | correct |
| n06 | n06 | caseCount | 2 | correct |
| n06 | n06 | comparedWithUsual | 2 | correct |
| n06 | n06 | ageGroup | 2 | caught by ask |
| n06 | n06 | area | 2 | unnecessary ask |
| n06 | n06 | onset | 2 | correct |
| n06 | n06 | exposureTypes:school | 2 | correct |
| n06 | n06 | exposureKeyTerms:1 | 2 | correct |
| n06 | n06 | symptomGroup | 3 | correct |
| n06 | n06 | caseCount | 3 | correct |
| n06 | n06 | comparedWithUsual | 3 | correct |
| n06 | n06 | ageGroup | 3 | correct |
| n06 | n06 | area | 3 | unnecessary ask |
| n06 | n06 | onset | 3 | correct |
| n06 | n06 | exposureTypes:school | 3 | correct |
| n06 | n06 | exposureKeyTerms:1 | 3 | correct |
| n07 | n07 | symptomGroup | 1 | unnecessary ask |
| n07 | n07 | caseCount | 1 | correct |
| n07 | n07 | comparedWithUsual | 1 | correct |
| n07 | n07 | ageGroup | 1 | correct |
| n07 | n07 | area | 1 | correct |
| n07 | n07 | onset | 1 | caught by ask |
| n07 | n07 | observations:notResponding | 1 | correct |
| n07 | n07 | observations:shortOfSupplies | 1 | correct |
| n07 | n07 | symptomGroup | 2 | unnecessary ask |
| n07 | n07 | caseCount | 2 | correct |
| n07 | n07 | comparedWithUsual | 2 | correct |
| n07 | n07 | ageGroup | 2 | correct |
| n07 | n07 | area | 2 | correct |
| n07 | n07 | onset | 2 | caught by ask |
| n07 | n07 | observations:notResponding | 2 | correct |
| n07 | n07 | observations:shortOfSupplies | 2 | correct |
| n07 | n07 | symptomGroup | 3 | correct |
| n07 | n07 | caseCount | 3 | unnecessary ask |
| n07 | n07 | comparedWithUsual | 3 | correct |
| n07 | n07 | ageGroup | 3 | correct |
| n07 | n07 | area | 3 | correct |
| n07 | n07 | onset | 3 | caught by ask |
| n07 | n07 | observations:notResponding | 3 | correct |
| n07 | n07 | observations:shortOfSupplies | 3 | correct |
| n08 | n08 | symptomGroup | 1 | correct |
| n08 | n08 | caseCount | 1 | correct |
| n08 | n08 | comparedWithUsual | 1 | correct |
| n08 | n08 | ageGroup | 1 | correct |
| n08 | n08 | area | 1 | correct |
| n08 | n08 | onset | 1 | correct |
| n08 | n08 | symptomGroup | 2 | correct |
| n08 | n08 | caseCount | 2 | correct |
| n08 | n08 | comparedWithUsual | 2 | correct |
| n08 | n08 | ageGroup | 2 | correct |
| n08 | n08 | area | 2 | correct |
| n08 | n08 | onset | 2 | correct |
| n08 | n08 | symptomGroup | 3 | correct |
| n08 | n08 | caseCount | 3 | correct |
| n08 | n08 | comparedWithUsual | 3 | correct |
| n08 | n08 | ageGroup | 3 | correct |
| n08 | n08 | area | 3 | correct |
| n08 | n08 | onset | 3 | correct |
| n09 | n09a | symptomGroup | 1 | correct |
| n09 | n09a | caseCount | 1 | correct |
| n09 | n09a | comparedWithUsual | 1 | correct |
| n09 | n09a | ageGroup | 1 | correct |
| n09 | n09a | area | 1 | correct |
| n09 | n09a | onset | 1 | correct |
| n09 | n09b | symptomGroup | 1 | correct |
| n09 | n09b | caseCount | 1 | correct |
| n09 | n09b | comparedWithUsual | 1 | correct |
| n09 | n09b | ageGroup | 1 | correct |
| n09 | n09b | area | 1 | correct |
| n09 | n09b | onset | 1 | correct |
| n09 | n09a | symptomGroup | 2 | correct |
| n09 | n09a | caseCount | 2 | correct |
| n09 | n09a | comparedWithUsual | 2 | correct |
| n09 | n09a | ageGroup | 2 | correct |
| n09 | n09a | area | 2 | correct |
| n09 | n09a | onset | 2 | correct |
| n09 | n09b | symptomGroup | 2 | correct |
| n09 | n09b | caseCount | 2 | correct |
| n09 | n09b | comparedWithUsual | 2 | correct |
| n09 | n09b | ageGroup | 2 | correct |
| n09 | n09b | area | 2 | correct |
| n09 | n09b | onset | 2 | correct |
| n09 | n09a | symptomGroup | 3 | correct |
| n09 | n09a | caseCount | 3 | correct |
| n09 | n09a | comparedWithUsual | 3 | correct |
| n09 | n09a | ageGroup | 3 | correct |
| n09 | n09a | area | 3 | correct |
| n09 | n09a | onset | 3 | correct |
| n09 | n09b | symptomGroup | 3 | correct |
| n09 | n09b | caseCount | 3 | correct |
| n09 | n09b | comparedWithUsual | 3 | correct |
| n09 | n09b | ageGroup | 3 | correct |
| n09 | n09b | area | 3 | correct |
| n09 | n09b | onset | 3 | correct |

## Card-step timing only

The A2 ears are reused: no new conversion, Voice, audio-ear, both-ears or end-to-end timing is claimed.

| Configuration | Run | Samples | Median milliseconds | Maximum milliseconds |
| --- | --- | --- | --- | --- |
| A-min | all | 30 | 6666 | 16862 |
| A-min | 1 | 10 | 6304 | 12350 |
| A-min | 2 | 10 | 6559.5 | 16862 |
| A-min | 3 | 10 | 7896.5 | 13047 |
| A2 | all | 30 | 8801 | 17095 |
| A2 | 1 | 10 | 8941 | 17095 |
| A2 | 2 | 10 | 9014 | 16923 |
| A2 | 3 | 10 | 8637.5 | 11778 |

## Authored special fixtures

| Fixture | Run | Outcome |
| --- | --- | --- |
| D4-1 | 1 | pass |
| D4-1 | 2 | pass |
| D4-2 | 1 | pass |
| D4-2 | 2 | pass |
| D4-1 | 3 | pass |
| D4-2 | 3 | pass |
| NEAR-MISS | 1 | pass |
| NEAR-MISS | 2 | pass |
| NEAR-MISS | 3 | pass |

## Existing authored fixtures

| Fixture | Outcome | Listed-word insertion failure |
| --- | --- | --- |
| n01 | ok | false |
| n02 | ok | false |
| n04 | ok | false |
| n03 | ok | false |
| n05 | ok | false |
| n06 | ok | false |
| n08 | ok | false |
| n07 | ok | false |
| n10 | ok | false |
| n09 | ok | false |

## A2 checks and marker counts

| Recording | Run | Cards | Count check | Names check | Transcript name count | Condition check | Advice flag check | Advice check | Markers found | Mapped | Unmapped | Recording suspects | Capital suspects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n01 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n01 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n01 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n02 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n02 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n02 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n03 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n03 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n03 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n04 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n04 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n04 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n05 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n05 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n05 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n06 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n06 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n06 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n07 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n07 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 1 | 0 |
| n07 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n08 | 1 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n08 | 2 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n08 | 3 | 1 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n09 | 1 | 2 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n09 | 2 | 2 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n09 | 3 | 2 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n10 | 1 | 0 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n10 | 2 | 0 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |
| n10 | 3 | 0 | true | true | 0 | true | true | true | 0 | 0 | 0 | 0 | 0 |

## Baseten

Exact example probe: ok; HTTP 200; attempts 1. No reasoning text is retained.

| Fixture | Provider | Outcome | CW | Caught | Unnecessary | Extra cards | Missing cards | JSON failure | Schema failure | Milliseconds | Input tokens | Output tokens including reasoning | Reasoning tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D4-1 | meta | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 11533 | 2737 | 2244 | 1988 |
| D4-1 | baseten | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 8199 | 2146 | 2218 | 1365 |
| D4-2 | meta | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 4234 | 2741 | 746 | 482 |
| D4-2 | baseten | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 4725 | 2150 | 1271 | 1002 |
| NEAR-MISS | meta | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 7792 | 2749 | 1572 | 1311 |
| NEAR-MISS | baseten | pass | unavailable | unavailable | unavailable | unavailable | unavailable | false | false | 5112 | 2158 | 1034 | 592 |
| n03 | meta | ok | 0 | 0 | 0 | 0 | 0 | false | false | 8039 | 2793 | 1524 | 1211 |
| n03 | baseten | ok | 0 | 0 | 0 | 2 | 0 | false | false | 3906 | 2202 | 1065 | 347 |
| n09 | meta | ok | 0 | 0 | 0 | 0 | 0 | false | false | 8787 | 2749 | 1473 | 1027 |
| n09 | baseten | ok | 0 | 0 | 0 | 0 | 0 | false | false | 3572 | 2158 | 835 | 454 |
| n08 | meta | ok | 0 | 0 | 0 | 0 | 0 | false | false | 5483 | 2755 | 1038 | 766 |
| n08 | baseten | ok | 0 | 0 | 0 | 1 | 0 | false | false | 2999 | 2164 | 767 | 331 |
| n10 | meta | ok | 0 | 0 | 0 | 0 | 0 | false | false | 1895 | 2715 | 223 | 159 |
| n10 | baseten | ok | 0 | 0 | 0 | 0 | 0 | false | false | 2085 | 2124 | 393 | 335 |
| n04 | meta | ok | 0 | 0 | 0 | 0 | 0 | false | false | 6054 | 2775 | 1414 | 1109 |
| n04 | baseten | ok | 0 | 0 | 0 | 1 | 0 | false | false | 2787 | 2184 | 717 | 279 |

## Authored field outcome comparison

Meta uses muse-spark-1.3 low with A2, run 1. Special fixtures use only their explicit authored assertions; other fields have no expectations and are not scored.

| Fixture | Card | Field | Meta outcome | Baseten outcome |
| --- | --- | --- | --- | --- |
| D4-1 | D4-1 | exposureKeyTerms:1 | correct | correct |
| D4-1 | D4-1 | exposureKeyTerms:2 | correct | correct |
| D4-1 | D4-1 | forbiddenTerms:1 | correct | correct |
| D4-1 | D4-1 | area | correct | correct |
| D4-1 | D4-1 | exposureTypes | correct | correct |
| D4-2 | D4-2 | exposureKeyTerms:1 | correct | correct |
| D4-2 | D4-2 | exposureKeyTerms:2 | correct | correct |
| D4-2 | D4-2 | exposureKeyTerms:3 | correct | correct |
| D4-2 | D4-2 | forbiddenTerms:1 | correct | correct |
| D4-2 | D4-2 | forbiddenTerms:2 | correct | correct |
| D4-2 | D4-2 | area | correct | correct |
| NEAR-MISS | NEAR-MISS | exposureKeyTerms:1 | correct | correct |
| NEAR-MISS | NEAR-MISS | noListedTerms | correct | correct |
| n03 | n03 | symptomGroup | correct | correct |
| n03 | n03 | caseCount | correct | correct |
| n03 | n03 | comparedWithUsual | correct | correct |
| n03 | n03 | ageGroup | correct | correct |
| n03 | n03 | area | correct | correct |
| n03 | n03 | onset | correct | correct |
| n03 | n03 | check:isReport | correct | correct |
| n03 | n03 | check:cardCount | correct | fail |
| n03 | n03 | check:names | correct | correct |
| n03 | n03 | check:transcriptNames | correct | correct |
| n03 | n03 | check:notifiable | correct | correct |
| n03 | n03 | check:adviceRequested | correct | correct |
| n03 | n03 | check:advice | correct | correct |
| n03 | n03:extra:1 | card | unavailable | extra card |
| n03 | n03:extra:2 | card | unavailable | extra card |
| n09 | n09a | symptomGroup | correct | correct |
| n09 | n09a | caseCount | correct | correct |
| n09 | n09a | comparedWithUsual | correct | correct |
| n09 | n09a | ageGroup | correct | correct |
| n09 | n09a | area | correct | correct |
| n09 | n09a | onset | correct | correct |
| n09 | n09b | symptomGroup | correct | correct |
| n09 | n09b | caseCount | correct | correct |
| n09 | n09b | comparedWithUsual | correct | correct |
| n09 | n09b | ageGroup | correct | correct |
| n09 | n09b | area | correct | correct |
| n09 | n09b | onset | correct | correct |
| n09 | n09 | check:isReport | correct | correct |
| n09 | n09 | check:cardCount | correct | correct |
| n09 | n09 | check:names | correct | correct |
| n09 | n09 | check:transcriptNames | correct | correct |
| n09 | n09 | check:notifiable | correct | correct |
| n09 | n09 | check:adviceRequested | correct | correct |
| n09 | n09 | check:advice | correct | correct |
| n08 | n08 | symptomGroup | correct | correct |
| n08 | n08 | caseCount | correct | correct |
| n08 | n08 | comparedWithUsual | correct | correct |
| n08 | n08 | ageGroup | correct | correct |
| n08 | n08 | area | correct | correct |
| n08 | n08 | onset | correct | correct |
| n08 | n08 | check:isReport | correct | correct |
| n08 | n08 | check:cardCount | correct | fail |
| n08 | n08 | check:names | correct | correct |
| n08 | n08 | check:transcriptNames | correct | correct |
| n08 | n08 | check:notifiable | correct | correct |
| n08 | n08 | check:adviceRequested | correct | correct |
| n08 | n08 | check:advice | correct | correct |
| n08 | n08:extra:1 | card | unavailable | extra card |
| n10 | n10 | check:isReport | correct | correct |
| n10 | n10 | check:cardCount | correct | correct |
| n10 | n10 | check:names | correct | correct |
| n10 | n10 | check:transcriptNames | correct | correct |
| n10 | n10 | check:notifiable | correct | correct |
| n10 | n10 | check:adviceRequested | correct | correct |
| n10 | n10 | check:advice | correct | correct |
| n04 | n04 | symptomGroup | correct | correct |
| n04 | n04 | caseCount | correct | correct |
| n04 | n04 | comparedWithUsual | correct | correct |
| n04 | n04 | ageGroup | correct | correct |
| n04 | n04 | area | correct | correct |
| n04 | n04 | onset | correct | correct |
| n04 | n04 | check:isReport | correct | correct |
| n04 | n04 | check:cardCount | correct | fail |
| n04 | n04 | check:names | correct | correct |
| n04 | n04 | check:transcriptNames | correct | correct |
| n04 | n04 | check:notifiable | correct | correct |
| n04 | n04 | check:adviceRequested | correct | correct |
| n04 | n04 | check:advice | correct | correct |
| n04 | n04:extra:1 | card | unavailable | extra card |

## Baseten frozen-ranking comparison

| Input | Provider | Top source | Source order | Guard changes | Guard counts | Milliseconds | Input tokens | Output tokens including reasoning | Reasoning tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| seed-1 | meta | water:A | water:A, shop:Leeba View spaza shop, school:Leeba View Primary School | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 11852 | 5247 | 1664 | unavailable |
| seed-1 | baseten | water:A | water:A, shop:Leeba View spaza shop | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 3226 | 5228 | 541 | 374 |
| seed-2 | meta | shop:Leeba View spaza shop | shop:Leeba View spaza shop, school:Leeba View Primary School, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 12168 | 4356 | 1868 | unavailable |
| seed-2 | baseten | shop:Leeba View spaza shop | shop:Leeba View spaza shop, school:Leeba View Primary School, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 2696 | 4337 | 587 | 339 |
| seed-4 | meta | water:A | water:A, school:Leeba View Primary School, shop:Leeba View spaza shop | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 12040 | 4570 | 1894 | unavailable |
| seed-4 | baseten | water:A | water:A, school:Leeba View Primary School, shop:Leeba View spaza shop | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 4238 | 4551 | 1007 | 762 |
| seed-5 | meta | water:A | water:A, shop:Leeba View spaza shop, school:Leeba View Primary School | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 9724 | 4522 | 1872 | unavailable |
| seed-5 | baseten | shop:Leeba View spaza shop | shop:Leeba View spaza shop, water:A, school:Leeba View Primary School | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 2891 | 4503 | 578 | 289 |
| seed-8 | meta | school:Leeba View Primary School | school:Leeba View Primary School, shop:Leeba View spaza shop, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 10781 | 4100 | 1406 | unavailable |
| seed-8 | baseten | shop:Leeba View spaza shop | shop:Leeba View spaza shop, school:Leeba View Primary School, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 4185 | 4081 | 783 | 515 |
| seed-9 | meta | shop:Leeba View spaza shop | shop:Leeba View spaza shop, school:Leeba View Primary School, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 8947 | 4158 | 1357 | unavailable |
| seed-9 | baseten | school:Leeba View Primary School | school:Leeba View Primary School, shop:Leeba View spaza shop, water:A | 0 | {"invalidJson":0,"invalidShape":0,"unknownSource":0,"unknownCitation":0,"noSupporting":0,"invalidConfidence":0,"extraSources":0,"duplicateSource":0,"ranksRepaired":0,"bannedReason":0,"idInReason":0,"invalidReason":0} | 3974 | 4139 | 845 | 596 |

## Recommendation for review

recommend A2; gate met
All requested gate checks met.
Fallback compares A-min (A prompt at the chosen minimal effort) with A2. A-min wins an exact CW tie. Production settings remain unchanged until separately approved.
```json
{
  "resultsCollected": true,
  "recordingsComplete": true,
  "fixturesComplete": true,
  "specialPass": true,
  "insertionClear": true,
  "baselineCW": 4,
  "aMinCW": 0,
  "a2CW": 1,
  "consistentRuns": 3
}
```

## Unavailable records

| ID | Run | Provider | Stage | Outcome | HTTP status |
| --- | --- | --- | --- | --- | --- |

## Missing results

No missing logical results.
