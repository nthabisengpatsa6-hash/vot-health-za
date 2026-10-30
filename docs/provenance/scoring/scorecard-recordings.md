# Recording scoring

10 recordings; 10 expected cards. Made-up scenarios read by volunteers.
No recording-derived value or word appears in this file. Local grouped timings measure this connection, not the deployed region or a production target.
Recording repeats: 3. Corrected expected fields: 2. Missing results: 0.

## Configuration provenance

| Configuration | Voice model | Audio model | Audio effort | Card model | Card effort | Extraction hash | Configuration hash | Git commit | Dirty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | muse-voice-transcribe-1.0 | muse-spark-1.2 | low | muse-spark-1.3 | low | cddb48328a27f866 | a5e766b19a8be293 | 44a37d3e315c42721ca92b734ddbbb24c34c618c | false |
| A | muse-voice-transcribe-1.0 | muse-spark-1.2 | low | muse-spark-1.3 | low | 0504c523c212791e | 0504c523c212791e | 44a37d3e315c42721ca92b734ddbbb24c34c618c | false |
| A-min | muse-voice-transcribe-1.0 | muse-spark-1.2 | minimal | muse-spark-1.3 | low | 3d699146f8542e8f | 3d699146f8542e8f | 44a37d3e315c42721ca92b734ddbbb24c34c618c | false |
| B | muse-voice-transcribe-1.0 | muse-spark-1.3 | minimal | muse-spark-1.3 | low | d56a3579d44ab5c0 | d56a3579d44ab5c0 | 44a37d3e315c42721ca92b734ddbbb24c34c618c | false |

## Call records and unavailable components

Saved records: 420. Pipeline summaries are not additional API calls. Identical card requests may serve multiple configurations.

| Provider | Kind | Stage | Records |
| --- | --- | --- | --- |
| meta | preflight | keyword-check | 1 |
| meta | preflight | effort-check | 2 |
| baseten | preflight | slug-check | 1 |
| none | manifest | manifest | 1 |
| meta | recording | audio | 90 |
| meta | recording | voice | 60 |
| meta | recording | card | 113 |
| none | recording | pipeline | 120 |
| meta | fixture | card | 32 |

| Provider | ID | Run | Configuration | Stage | Outcome | HTTP status | Attempts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseten | authored-probe | 0 | shared | slug-check | http | 404 | 1 |
| meta | n10 | 2 | B | audio | cancelled | unavailable | 1 |

A completed pipeline can use one ear when the other is unavailable; the component failures above remain recorded.

## Per-recording field outcomes

| Recording | Configuration | Run | Card | Field | Outcome |
| --- | --- | --- | --- | --- | --- |
| n01 | Baseline | 1 | n01 | symptomGroup | correct |
| n01 | Baseline | 1 | n01 | caseCount | correct |
| n01 | Baseline | 1 | n01 | comparedWithUsual | correct |
| n01 | Baseline | 1 | n01 | ageGroup | correct |
| n01 | Baseline | 1 | n01 | area | correct |
| n01 | Baseline | 1 | n01 | onset | correct |
| n01 | Baseline | 1 | n01 | exposureTypes:water | correct |
| n01 | Baseline | 1 | n01 | exposureKeyTerms:1 | correct |
| n01 | A | 1 | n01 | symptomGroup | correct |
| n01 | A | 1 | n01 | caseCount | correct |
| n01 | A | 1 | n01 | comparedWithUsual | correct |
| n01 | A | 1 | n01 | ageGroup | correct |
| n01 | A | 1 | n01 | area | correct |
| n01 | A | 1 | n01 | onset | correct |
| n01 | A | 1 | n01 | exposureTypes:water | correct |
| n01 | A | 1 | n01 | exposureKeyTerms:1 | correct |
| n01 | A-min | 1 | n01 | symptomGroup | correct |
| n01 | A-min | 1 | n01 | caseCount | correct |
| n01 | A-min | 1 | n01 | comparedWithUsual | correct |
| n01 | A-min | 1 | n01 | ageGroup | correct |
| n01 | A-min | 1 | n01 | area | correct |
| n01 | A-min | 1 | n01 | onset | correct |
| n01 | A-min | 1 | n01 | exposureTypes:water | correct |
| n01 | A-min | 1 | n01 | exposureKeyTerms:1 | correct |
| n01 | B | 1 | n01 | symptomGroup | correct |
| n01 | B | 1 | n01 | caseCount | correct |
| n01 | B | 1 | n01 | comparedWithUsual | correct |
| n01 | B | 1 | n01 | ageGroup | correct |
| n01 | B | 1 | n01 | area | correct |
| n01 | B | 1 | n01 | onset | correct |
| n01 | B | 1 | n01 | exposureTypes:water | correct |
| n01 | B | 1 | n01 | exposureKeyTerms:1 | correct |
| n01 | A-min | 2 | n01 | symptomGroup | correct |
| n01 | A-min | 2 | n01 | caseCount | correct |
| n01 | A-min | 2 | n01 | comparedWithUsual | correct |
| n01 | A-min | 2 | n01 | ageGroup | correct |
| n01 | A-min | 2 | n01 | area | correct |
| n01 | A-min | 2 | n01 | onset | correct |
| n01 | A-min | 2 | n01 | exposureTypes:water | correct |
| n01 | A-min | 2 | n01 | exposureKeyTerms:1 | correct |
| n01 | A | 2 | n01 | symptomGroup | correct |
| n01 | A | 2 | n01 | caseCount | correct |
| n01 | A | 2 | n01 | comparedWithUsual | correct |
| n01 | A | 2 | n01 | ageGroup | correct |
| n01 | A | 2 | n01 | area | correct |
| n01 | A | 2 | n01 | onset | correct |
| n01 | A | 2 | n01 | exposureTypes:water | correct |
| n01 | A | 2 | n01 | exposureKeyTerms:1 | correct |
| n01 | Baseline | 2 | n01 | symptomGroup | correct |
| n01 | Baseline | 2 | n01 | caseCount | correct |
| n01 | Baseline | 2 | n01 | comparedWithUsual | correct |
| n01 | Baseline | 2 | n01 | ageGroup | correct |
| n01 | Baseline | 2 | n01 | area | correct |
| n01 | Baseline | 2 | n01 | onset | correct |
| n01 | Baseline | 2 | n01 | exposureTypes:water | correct |
| n01 | Baseline | 2 | n01 | exposureKeyTerms:1 | correct |
| n01 | B | 2 | n01 | symptomGroup | correct |
| n01 | B | 2 | n01 | caseCount | correct |
| n01 | B | 2 | n01 | comparedWithUsual | correct |
| n01 | B | 2 | n01 | ageGroup | correct |
| n01 | B | 2 | n01 | area | unnecessary ask |
| n01 | B | 2 | n01 | onset | correct |
| n01 | B | 2 | n01 | exposureTypes:water | correct |
| n01 | B | 2 | n01 | exposureKeyTerms:1 | correct |
| n01 | A | 3 | n01 | symptomGroup | correct |
| n01 | A | 3 | n01 | caseCount | correct |
| n01 | A | 3 | n01 | comparedWithUsual | correct |
| n01 | A | 3 | n01 | ageGroup | correct |
| n01 | A | 3 | n01 | area | correct |
| n01 | A | 3 | n01 | onset | correct |
| n01 | A | 3 | n01 | exposureTypes:water | correct |
| n01 | A | 3 | n01 | exposureKeyTerms:1 | correct |
| n01 | A-min | 3 | n01 | symptomGroup | correct |
| n01 | A-min | 3 | n01 | caseCount | correct |
| n01 | A-min | 3 | n01 | comparedWithUsual | correct |
| n01 | A-min | 3 | n01 | ageGroup | correct |
| n01 | A-min | 3 | n01 | area | correct |
| n01 | A-min | 3 | n01 | onset | correct |
| n01 | A-min | 3 | n01 | exposureTypes:water | correct |
| n01 | A-min | 3 | n01 | exposureKeyTerms:1 | correct |
| n01 | Baseline | 3 | n01 | symptomGroup | correct |
| n01 | Baseline | 3 | n01 | caseCount | correct |
| n01 | Baseline | 3 | n01 | comparedWithUsual | correct |
| n01 | Baseline | 3 | n01 | ageGroup | correct |
| n01 | Baseline | 3 | n01 | area | correct |
| n01 | Baseline | 3 | n01 | onset | correct |
| n01 | Baseline | 3 | n01 | exposureTypes:water | correct |
| n01 | Baseline | 3 | n01 | exposureKeyTerms:1 | correct |
| n01 | B | 3 | n01 | symptomGroup | correct |
| n01 | B | 3 | n01 | caseCount | correct |
| n01 | B | 3 | n01 | comparedWithUsual | correct |
| n01 | B | 3 | n01 | ageGroup | correct |
| n01 | B | 3 | n01 | area | correct |
| n01 | B | 3 | n01 | onset | correct |
| n01 | B | 3 | n01 | exposureTypes:water | correct |
| n01 | B | 3 | n01 | exposureKeyTerms:1 | correct |
| n02 | A-min | 1 | n02 | symptomGroup | correct |
| n02 | A-min | 1 | n02 | caseCount | caught by ask |
| n02 | A-min | 1 | n02 | comparedWithUsual | correct |
| n02 | A-min | 1 | n02 | ageGroup | correct |
| n02 | A-min | 1 | n02 | area | correct |
| n02 | A-min | 1 | n02 | onset | correct |
| n02 | A-min | 1 | n02 | exposureTypes:water | correct |
| n02 | A-min | 1 | n02 | exposureKeyTerms:1 | correct |
| n02 | B | 1 | n02 | symptomGroup | correct |
| n02 | B | 1 | n02 | caseCount | caught by ask |
| n02 | B | 1 | n02 | comparedWithUsual | correct |
| n02 | B | 1 | n02 | ageGroup | correct |
| n02 | B | 1 | n02 | area | correct |
| n02 | B | 1 | n02 | onset | correct |
| n02 | B | 1 | n02 | exposureTypes:water | correct |
| n02 | B | 1 | n02 | exposureKeyTerms:1 | correct |
| n02 | Baseline | 1 | n02 | symptomGroup | correct |
| n02 | Baseline | 1 | n02 | caseCount | confidently wrong |
| n02 | Baseline | 1 | n02 | comparedWithUsual | correct |
| n02 | Baseline | 1 | n02 | ageGroup | unnecessary ask |
| n02 | Baseline | 1 | n02 | area | correct |
| n02 | Baseline | 1 | n02 | onset | correct |
| n02 | Baseline | 1 | n02 | exposureTypes:water | correct |
| n02 | Baseline | 1 | n02 | exposureKeyTerms:1 | correct |
| n02 | A | 1 | n02 | symptomGroup | correct |
| n02 | A | 1 | n02 | caseCount | confidently wrong |
| n02 | A | 1 | n02 | comparedWithUsual | correct |
| n02 | A | 1 | n02 | ageGroup | unnecessary ask |
| n02 | A | 1 | n02 | area | correct |
| n02 | A | 1 | n02 | onset | correct |
| n02 | A | 1 | n02 | exposureTypes:water | correct |
| n02 | A | 1 | n02 | exposureKeyTerms:1 | correct |
| n02 | Baseline | 2 | n02 | symptomGroup | correct |
| n02 | Baseline | 2 | n02 | caseCount | confidently wrong |
| n02 | Baseline | 2 | n02 | comparedWithUsual | correct |
| n02 | Baseline | 2 | n02 | ageGroup | correct |
| n02 | Baseline | 2 | n02 | area | correct |
| n02 | Baseline | 2 | n02 | onset | correct |
| n02 | Baseline | 2 | n02 | exposureTypes:water | correct |
| n02 | Baseline | 2 | n02 | exposureKeyTerms:1 | correct |
| n02 | A-min | 2 | n02 | symptomGroup | correct |
| n02 | A-min | 2 | n02 | caseCount | unnecessary ask |
| n02 | A-min | 2 | n02 | comparedWithUsual | correct |
| n02 | A-min | 2 | n02 | ageGroup | correct |
| n02 | A-min | 2 | n02 | area | correct |
| n02 | A-min | 2 | n02 | onset | correct |
| n02 | A-min | 2 | n02 | exposureTypes:water | correct |
| n02 | A-min | 2 | n02 | exposureKeyTerms:1 | correct |
| n02 | A | 2 | n02 | symptomGroup | correct |
| n02 | A | 2 | n02 | caseCount | caught by ask |
| n02 | A | 2 | n02 | comparedWithUsual | correct |
| n02 | A | 2 | n02 | ageGroup | correct |
| n02 | A | 2 | n02 | area | correct |
| n02 | A | 2 | n02 | onset | correct |
| n02 | A | 2 | n02 | exposureTypes:water | correct |
| n02 | A | 2 | n02 | exposureKeyTerms:1 | correct |
| n02 | B | 2 | n02 | symptomGroup | correct |
| n02 | B | 2 | n02 | caseCount | unnecessary ask |
| n02 | B | 2 | n02 | comparedWithUsual | correct |
| n02 | B | 2 | n02 | ageGroup | correct |
| n02 | B | 2 | n02 | area | correct |
| n02 | B | 2 | n02 | onset | correct |
| n02 | B | 2 | n02 | exposureTypes:water | correct |
| n02 | B | 2 | n02 | exposureKeyTerms:1 | correct |
| n02 | A-min | 3 | n02 | symptomGroup | correct |
| n02 | A-min | 3 | n02 | caseCount | caught by ask |
| n02 | A-min | 3 | n02 | comparedWithUsual | correct |
| n02 | A-min | 3 | n02 | ageGroup | correct |
| n02 | A-min | 3 | n02 | area | correct |
| n02 | A-min | 3 | n02 | onset | correct |
| n02 | A-min | 3 | n02 | exposureTypes:water | correct |
| n02 | A-min | 3 | n02 | exposureKeyTerms:1 | correct |
| n02 | A | 3 | n02 | symptomGroup | correct |
| n02 | A | 3 | n02 | caseCount | caught by ask |
| n02 | A | 3 | n02 | comparedWithUsual | correct |
| n02 | A | 3 | n02 | ageGroup | correct |
| n02 | A | 3 | n02 | area | correct |
| n02 | A | 3 | n02 | onset | correct |
| n02 | A | 3 | n02 | exposureTypes:water | correct |
| n02 | A | 3 | n02 | exposureKeyTerms:1 | correct |
| n02 | B | 3 | n02 | symptomGroup | correct |
| n02 | B | 3 | n02 | caseCount | caught by ask |
| n02 | B | 3 | n02 | comparedWithUsual | correct |
| n02 | B | 3 | n02 | ageGroup | correct |
| n02 | B | 3 | n02 | area | correct |
| n02 | B | 3 | n02 | onset | correct |
| n02 | B | 3 | n02 | exposureTypes:water | correct |
| n02 | B | 3 | n02 | exposureKeyTerms:1 | correct |
| n02 | Baseline | 3 | n02 | symptomGroup | correct |
| n02 | Baseline | 3 | n02 | caseCount | caught by ask |
| n02 | Baseline | 3 | n02 | comparedWithUsual | correct |
| n02 | Baseline | 3 | n02 | ageGroup | correct |
| n02 | Baseline | 3 | n02 | area | correct |
| n02 | Baseline | 3 | n02 | onset | correct |
| n02 | Baseline | 3 | n02 | exposureTypes:water | correct |
| n02 | Baseline | 3 | n02 | exposureKeyTerms:1 | correct |
| n03 | B | 1 | n03 | symptomGroup | correct |
| n03 | B | 1 | n03 | caseCount | correct |
| n03 | B | 1 | n03 | comparedWithUsual | correct |
| n03 | B | 1 | n03 | ageGroup | correct |
| n03 | B | 1 | n03 | area | correct |
| n03 | B | 1 | n03 | onset | correct |
| n03 | A-min | 1 | n03 | symptomGroup | correct |
| n03 | A-min | 1 | n03 | caseCount | correct |
| n03 | A-min | 1 | n03 | comparedWithUsual | correct |
| n03 | A-min | 1 | n03 | ageGroup | correct |
| n03 | A-min | 1 | n03 | area | correct |
| n03 | A-min | 1 | n03 | onset | correct |
| n03 | Baseline | 1 | n03 | symptomGroup | correct |
| n03 | Baseline | 1 | n03 | caseCount | correct |
| n03 | Baseline | 1 | n03 | comparedWithUsual | correct |
| n03 | Baseline | 1 | n03 | ageGroup | correct |
| n03 | Baseline | 1 | n03 | area | correct |
| n03 | Baseline | 1 | n03 | onset | correct |
| n03 | A | 1 | n03 | symptomGroup | correct |
| n03 | A | 1 | n03 | caseCount | correct |
| n03 | A | 1 | n03 | comparedWithUsual | correct |
| n03 | A | 1 | n03 | ageGroup | correct |
| n03 | A | 1 | n03 | area | correct |
| n03 | A | 1 | n03 | onset | correct |
| n03 | A-min | 2 | n03 | symptomGroup | correct |
| n03 | A-min | 2 | n03 | caseCount | correct |
| n03 | A-min | 2 | n03 | comparedWithUsual | correct |
| n03 | A-min | 2 | n03 | ageGroup | correct |
| n03 | A-min | 2 | n03 | area | correct |
| n03 | A-min | 2 | n03 | onset | correct |
| n03 | Baseline | 2 | n03 | symptomGroup | correct |
| n03 | Baseline | 2 | n03 | caseCount | correct |
| n03 | Baseline | 2 | n03 | comparedWithUsual | correct |
| n03 | Baseline | 2 | n03 | ageGroup | correct |
| n03 | Baseline | 2 | n03 | area | correct |
| n03 | Baseline | 2 | n03 | onset | correct |
| n03 | A | 2 | n03 | symptomGroup | unnecessary ask |
| n03 | A | 2 | n03 | caseCount | unnecessary ask |
| n03 | A | 2 | n03 | comparedWithUsual | correct |
| n03 | A | 2 | n03 | ageGroup | correct |
| n03 | A | 2 | n03 | area | unnecessary ask |
| n03 | A | 2 | n03 | onset | correct |
| n03 | B | 2 | n03 | symptomGroup | unnecessary ask |
| n03 | B | 2 | n03 | caseCount | unnecessary ask |
| n03 | B | 2 | n03 | comparedWithUsual | correct |
| n03 | B | 2 | n03 | ageGroup | correct |
| n03 | B | 2 | n03 | area | unnecessary ask |
| n03 | B | 2 | n03 | onset | correct |
| n03 | A | 3 | n03 | symptomGroup | correct |
| n03 | A | 3 | n03 | caseCount | correct |
| n03 | A | 3 | n03 | comparedWithUsual | correct |
| n03 | A | 3 | n03 | ageGroup | correct |
| n03 | A | 3 | n03 | area | correct |
| n03 | A | 3 | n03 | onset | correct |
| n03 | B | 3 | n03 | symptomGroup | correct |
| n03 | B | 3 | n03 | caseCount | correct |
| n03 | B | 3 | n03 | comparedWithUsual | correct |
| n03 | B | 3 | n03 | ageGroup | correct |
| n03 | B | 3 | n03 | area | correct |
| n03 | B | 3 | n03 | onset | correct |
| n03 | Baseline | 3 | n03 | symptomGroup | correct |
| n03 | Baseline | 3 | n03 | caseCount | correct |
| n03 | Baseline | 3 | n03 | comparedWithUsual | correct |
| n03 | Baseline | 3 | n03 | ageGroup | correct |
| n03 | Baseline | 3 | n03 | area | correct |
| n03 | Baseline | 3 | n03 | onset | correct |
| n03 | A-min | 3 | n03 | symptomGroup | unnecessary ask |
| n03 | A-min | 3 | n03 | caseCount | unnecessary ask |
| n03 | A-min | 3 | n03 | comparedWithUsual | correct |
| n03 | A-min | 3 | n03 | ageGroup | correct |
| n03 | A-min | 3 | n03 | area | unnecessary ask |
| n03 | A-min | 3 | n03 | onset | correct |
| n04 | A-min | 1 | n04 | symptomGroup | correct |
| n04 | A-min | 1 | n04 | caseCount | correct |
| n04 | A-min | 1 | n04 | comparedWithUsual | correct |
| n04 | A-min | 1 | n04 | ageGroup | correct |
| n04 | A-min | 1 | n04 | area | correct |
| n04 | A-min | 1 | n04 | onset | correct |
| n04 | Baseline | 1 | n04 | symptomGroup | correct |
| n04 | Baseline | 1 | n04 | caseCount | correct |
| n04 | Baseline | 1 | n04 | comparedWithUsual | correct |
| n04 | Baseline | 1 | n04 | ageGroup | correct |
| n04 | Baseline | 1 | n04 | area | correct |
| n04 | Baseline | 1 | n04 | onset | correct |
| n04 | A | 1 | n04 | symptomGroup | correct |
| n04 | A | 1 | n04 | caseCount | correct |
| n04 | A | 1 | n04 | comparedWithUsual | correct |
| n04 | A | 1 | n04 | ageGroup | correct |
| n04 | A | 1 | n04 | area | correct |
| n04 | A | 1 | n04 | onset | correct |
| n04 | B | 1 | n04 | symptomGroup | unnecessary ask |
| n04 | B | 1 | n04 | caseCount | correct |
| n04 | B | 1 | n04 | comparedWithUsual | unnecessary ask |
| n04 | B | 1 | n04 | ageGroup | correct |
| n04 | B | 1 | n04 | area | correct |
| n04 | B | 1 | n04 | onset | unnecessary ask |
| n04 | A | 2 | n04 | symptomGroup | correct |
| n04 | A | 2 | n04 | caseCount | correct |
| n04 | A | 2 | n04 | comparedWithUsual | correct |
| n04 | A | 2 | n04 | ageGroup | correct |
| n04 | A | 2 | n04 | area | correct |
| n04 | A | 2 | n04 | onset | correct |
| n04 | B | 2 | n04 | symptomGroup | correct |
| n04 | B | 2 | n04 | caseCount | correct |
| n04 | B | 2 | n04 | comparedWithUsual | correct |
| n04 | B | 2 | n04 | ageGroup | correct |
| n04 | B | 2 | n04 | area | correct |
| n04 | B | 2 | n04 | onset | correct |
| n04 | A-min | 2 | n04 | symptomGroup | correct |
| n04 | A-min | 2 | n04 | caseCount | correct |
| n04 | A-min | 2 | n04 | comparedWithUsual | correct |
| n04 | A-min | 2 | n04 | ageGroup | correct |
| n04 | A-min | 2 | n04 | area | correct |
| n04 | A-min | 2 | n04 | onset | correct |
| n04 | Baseline | 2 | n04 | symptomGroup | correct |
| n04 | Baseline | 2 | n04 | caseCount | correct |
| n04 | Baseline | 2 | n04 | comparedWithUsual | correct |
| n04 | Baseline | 2 | n04 | ageGroup | correct |
| n04 | Baseline | 2 | n04 | area | correct |
| n04 | Baseline | 2 | n04 | onset | correct |
| n04 | Baseline | 3 | n04 | symptomGroup | correct |
| n04 | Baseline | 3 | n04 | caseCount | correct |
| n04 | Baseline | 3 | n04 | comparedWithUsual | correct |
| n04 | Baseline | 3 | n04 | ageGroup | correct |
| n04 | Baseline | 3 | n04 | area | correct |
| n04 | Baseline | 3 | n04 | onset | correct |
| n04 | A-min | 3 | n04 | symptomGroup | correct |
| n04 | A-min | 3 | n04 | caseCount | correct |
| n04 | A-min | 3 | n04 | comparedWithUsual | correct |
| n04 | A-min | 3 | n04 | ageGroup | correct |
| n04 | A-min | 3 | n04 | area | correct |
| n04 | A-min | 3 | n04 | onset | correct |
| n04 | A | 3 | n04 | symptomGroup | correct |
| n04 | A | 3 | n04 | caseCount | correct |
| n04 | A | 3 | n04 | comparedWithUsual | correct |
| n04 | A | 3 | n04 | ageGroup | correct |
| n04 | A | 3 | n04 | area | correct |
| n04 | A | 3 | n04 | onset | correct |
| n04 | B | 3 | n04 | symptomGroup | correct |
| n04 | B | 3 | n04 | caseCount | correct |
| n04 | B | 3 | n04 | comparedWithUsual | correct |
| n04 | B | 3 | n04 | ageGroup | correct |
| n04 | B | 3 | n04 | area | correct |
| n04 | B | 3 | n04 | onset | correct |
| n05 | Baseline | 1 | n05 | symptomGroup | correct |
| n05 | Baseline | 1 | n05 | caseCount | correct |
| n05 | Baseline | 1 | n05 | comparedWithUsual | correct |
| n05 | Baseline | 1 | n05 | ageGroup | correct |
| n05 | Baseline | 1 | n05 | area | unnecessary ask |
| n05 | Baseline | 1 | n05 | onset | caught by ask |
| n05 | Baseline | 1 | n05 | exposureTypes:food | correct |
| n05 | Baseline | 1 | n05 | observations:moreSevere | missed |
| n05 | Baseline | 1 | n05 | exposureKeyTerms:1 | correct |
| n05 | Baseline | 1 | n05 | exposureKeyTerms:2 | correct |
| n05 | A-min | 1 | n05 | symptomGroup | correct |
| n05 | A-min | 1 | n05 | caseCount | correct |
| n05 | A-min | 1 | n05 | comparedWithUsual | correct |
| n05 | A-min | 1 | n05 | ageGroup | correct |
| n05 | A-min | 1 | n05 | area | unnecessary ask |
| n05 | A-min | 1 | n05 | onset | caught by ask |
| n05 | A-min | 1 | n05 | exposureTypes:food | correct |
| n05 | A-min | 1 | n05 | observations:moreSevere | missed |
| n05 | A-min | 1 | n05 | exposureKeyTerms:1 | correct |
| n05 | A-min | 1 | n05 | exposureKeyTerms:2 | correct |
| n05 | A | 1 | n05 | symptomGroup | correct |
| n05 | A | 1 | n05 | caseCount | correct |
| n05 | A | 1 | n05 | comparedWithUsual | correct |
| n05 | A | 1 | n05 | ageGroup | correct |
| n05 | A | 1 | n05 | area | unnecessary ask |
| n05 | A | 1 | n05 | onset | caught by ask |
| n05 | A | 1 | n05 | exposureTypes:food | correct |
| n05 | A | 1 | n05 | observations:moreSevere | missed |
| n05 | A | 1 | n05 | exposureKeyTerms:1 | correct |
| n05 | A | 1 | n05 | exposureKeyTerms:2 | correct |
| n05 | B | 1 | n05 | symptomGroup | correct |
| n05 | B | 1 | n05 | caseCount | correct |
| n05 | B | 1 | n05 | comparedWithUsual | correct |
| n05 | B | 1 | n05 | ageGroup | correct |
| n05 | B | 1 | n05 | area | unnecessary ask |
| n05 | B | 1 | n05 | onset | caught by ask |
| n05 | B | 1 | n05 | exposureTypes:food | unnecessary ask |
| n05 | B | 1 | n05 | observations:moreSevere | missed |
| n05 | B | 1 | n05 | exposureKeyTerms:1 | unnecessary ask |
| n05 | B | 1 | n05 | exposureKeyTerms:2 | unnecessary ask |
| n05 | A | 2 | n05 | symptomGroup | correct |
| n05 | A | 2 | n05 | caseCount | correct |
| n05 | A | 2 | n05 | comparedWithUsual | correct |
| n05 | A | 2 | n05 | ageGroup | correct |
| n05 | A | 2 | n05 | area | correct |
| n05 | A | 2 | n05 | onset | correct |
| n05 | A | 2 | n05 | exposureTypes:food | correct |
| n05 | A | 2 | n05 | observations:moreSevere | missed |
| n05 | A | 2 | n05 | exposureKeyTerms:1 | confidently wrong |
| n05 | A | 2 | n05 | exposureKeyTerms:2 | correct |
| n05 | Baseline | 2 | n05 | symptomGroup | correct |
| n05 | Baseline | 2 | n05 | caseCount | correct |
| n05 | Baseline | 2 | n05 | comparedWithUsual | correct |
| n05 | Baseline | 2 | n05 | ageGroup | correct |
| n05 | Baseline | 2 | n05 | area | correct |
| n05 | Baseline | 2 | n05 | onset | caught by ask |
| n05 | Baseline | 2 | n05 | exposureTypes:food | correct |
| n05 | Baseline | 2 | n05 | observations:moreSevere | missed |
| n05 | Baseline | 2 | n05 | exposureKeyTerms:1 | confidently wrong |
| n05 | Baseline | 2 | n05 | exposureKeyTerms:2 | correct |
| n05 | A-min | 2 | n05 | symptomGroup | correct |
| n05 | A-min | 2 | n05 | caseCount | correct |
| n05 | A-min | 2 | n05 | comparedWithUsual | correct |
| n05 | A-min | 2 | n05 | ageGroup | correct |
| n05 | A-min | 2 | n05 | area | correct |
| n05 | A-min | 2 | n05 | onset | caught by ask |
| n05 | A-min | 2 | n05 | exposureTypes:food | correct |
| n05 | A-min | 2 | n05 | observations:moreSevere | missed |
| n05 | A-min | 2 | n05 | exposureKeyTerms:1 | correct |
| n05 | A-min | 2 | n05 | exposureKeyTerms:2 | correct |
| n05 | B | 2 | n05 | symptomGroup | correct |
| n05 | B | 2 | n05 | caseCount | correct |
| n05 | B | 2 | n05 | comparedWithUsual | correct |
| n05 | B | 2 | n05 | ageGroup | correct |
| n05 | B | 2 | n05 | area | correct |
| n05 | B | 2 | n05 | onset | caught by ask |
| n05 | B | 2 | n05 | exposureTypes:food | correct |
| n05 | B | 2 | n05 | observations:moreSevere | missed |
| n05 | B | 2 | n05 | exposureKeyTerms:1 | confidently wrong |
| n05 | B | 2 | n05 | exposureKeyTerms:2 | correct |
| n05 | A-min | 3 | n05 | symptomGroup | correct |
| n05 | A-min | 3 | n05 | caseCount | correct |
| n05 | A-min | 3 | n05 | comparedWithUsual | correct |
| n05 | A-min | 3 | n05 | ageGroup | correct |
| n05 | A-min | 3 | n05 | area | correct |
| n05 | A-min | 3 | n05 | onset | caught by ask |
| n05 | A-min | 3 | n05 | exposureTypes:food | correct |
| n05 | A-min | 3 | n05 | observations:moreSevere | missed |
| n05 | A-min | 3 | n05 | exposureKeyTerms:1 | correct |
| n05 | A-min | 3 | n05 | exposureKeyTerms:2 | correct |
| n05 | Baseline | 3 | n05 | symptomGroup | correct |
| n05 | Baseline | 3 | n05 | caseCount | correct |
| n05 | Baseline | 3 | n05 | comparedWithUsual | correct |
| n05 | Baseline | 3 | n05 | ageGroup | correct |
| n05 | Baseline | 3 | n05 | area | correct |
| n05 | Baseline | 3 | n05 | onset | caught by ask |
| n05 | Baseline | 3 | n05 | exposureTypes:food | correct |
| n05 | Baseline | 3 | n05 | observations:moreSevere | missed |
| n05 | Baseline | 3 | n05 | exposureKeyTerms:1 | confidently wrong |
| n05 | Baseline | 3 | n05 | exposureKeyTerms:2 | correct |
| n05 | A | 3 | n05 | symptomGroup | correct |
| n05 | A | 3 | n05 | caseCount | correct |
| n05 | A | 3 | n05 | comparedWithUsual | correct |
| n05 | A | 3 | n05 | ageGroup | correct |
| n05 | A | 3 | n05 | area | correct |
| n05 | A | 3 | n05 | onset | caught by ask |
| n05 | A | 3 | n05 | exposureTypes:food | correct |
| n05 | A | 3 | n05 | observations:moreSevere | missed |
| n05 | A | 3 | n05 | exposureKeyTerms:1 | correct |
| n05 | A | 3 | n05 | exposureKeyTerms:2 | correct |
| n05 | B | 3 | n05 | symptomGroup | unnecessary ask |
| n05 | B | 3 | n05 | caseCount | unnecessary ask |
| n05 | B | 3 | n05 | comparedWithUsual | correct |
| n05 | B | 3 | n05 | ageGroup | unnecessary ask |
| n05 | B | 3 | n05 | area | unnecessary ask |
| n05 | B | 3 | n05 | onset | unnecessary ask |
| n05 | B | 3 | n05 | exposureTypes:food | unnecessary ask |
| n05 | B | 3 | n05 | observations:moreSevere | missed |
| n05 | B | 3 | n05 | exposureKeyTerms:1 | unnecessary ask |
| n05 | B | 3 | n05 | exposureKeyTerms:2 | unnecessary ask |
| n06 | A-min | 1 | n06 | symptomGroup | correct |
| n06 | A-min | 1 | n06 | caseCount | correct |
| n06 | A-min | 1 | n06 | comparedWithUsual | correct |
| n06 | A-min | 1 | n06 | ageGroup | correct |
| n06 | A-min | 1 | n06 | area | unnecessary ask |
| n06 | A-min | 1 | n06 | onset | correct |
| n06 | A-min | 1 | n06 | exposureTypes:school | correct |
| n06 | A-min | 1 | n06 | exposureKeyTerms:1 | correct |
| n06 | Baseline | 1 | n06 | symptomGroup | correct |
| n06 | Baseline | 1 | n06 | caseCount | correct |
| n06 | Baseline | 1 | n06 | comparedWithUsual | correct |
| n06 | Baseline | 1 | n06 | ageGroup | correct |
| n06 | Baseline | 1 | n06 | area | unnecessary ask |
| n06 | Baseline | 1 | n06 | onset | correct |
| n06 | Baseline | 1 | n06 | exposureTypes:school | correct |
| n06 | Baseline | 1 | n06 | exposureKeyTerms:1 | correct |
| n06 | A | 1 | n06 | symptomGroup | correct |
| n06 | A | 1 | n06 | caseCount | correct |
| n06 | A | 1 | n06 | comparedWithUsual | correct |
| n06 | A | 1 | n06 | ageGroup | correct |
| n06 | A | 1 | n06 | area | unnecessary ask |
| n06 | A | 1 | n06 | onset | correct |
| n06 | A | 1 | n06 | exposureTypes:school | correct |
| n06 | A | 1 | n06 | exposureKeyTerms:1 | correct |
| n06 | B | 1 | n06 | symptomGroup | correct |
| n06 | B | 1 | n06 | caseCount | correct |
| n06 | B | 1 | n06 | comparedWithUsual | correct |
| n06 | B | 1 | n06 | ageGroup | correct |
| n06 | B | 1 | n06 | area | unnecessary ask |
| n06 | B | 1 | n06 | onset | correct |
| n06 | B | 1 | n06 | exposureTypes:school | correct |
| n06 | B | 1 | n06 | exposureKeyTerms:1 | correct |
| n06 | A-min | 2 | n06 | symptomGroup | correct |
| n06 | A-min | 2 | n06 | caseCount | correct |
| n06 | A-min | 2 | n06 | comparedWithUsual | correct |
| n06 | A-min | 2 | n06 | ageGroup | correct |
| n06 | A-min | 2 | n06 | area | unnecessary ask |
| n06 | A-min | 2 | n06 | onset | correct |
| n06 | A-min | 2 | n06 | exposureTypes:school | correct |
| n06 | A-min | 2 | n06 | exposureKeyTerms:1 | correct |
| n06 | B | 2 | n06 | symptomGroup | correct |
| n06 | B | 2 | n06 | caseCount | correct |
| n06 | B | 2 | n06 | comparedWithUsual | correct |
| n06 | B | 2 | n06 | ageGroup | correct |
| n06 | B | 2 | n06 | area | unnecessary ask |
| n06 | B | 2 | n06 | onset | correct |
| n06 | B | 2 | n06 | exposureTypes:school | correct |
| n06 | B | 2 | n06 | exposureKeyTerms:1 | correct |
| n06 | A | 2 | n06 | symptomGroup | correct |
| n06 | A | 2 | n06 | caseCount | correct |
| n06 | A | 2 | n06 | comparedWithUsual | correct |
| n06 | A | 2 | n06 | ageGroup | correct |
| n06 | A | 2 | n06 | area | correct |
| n06 | A | 2 | n06 | onset | correct |
| n06 | A | 2 | n06 | exposureTypes:school | correct |
| n06 | A | 2 | n06 | exposureKeyTerms:1 | correct |
| n06 | Baseline | 2 | n06 | symptomGroup | correct |
| n06 | Baseline | 2 | n06 | caseCount | correct |
| n06 | Baseline | 2 | n06 | comparedWithUsual | correct |
| n06 | Baseline | 2 | n06 | ageGroup | correct |
| n06 | Baseline | 2 | n06 | area | correct |
| n06 | Baseline | 2 | n06 | onset | correct |
| n06 | Baseline | 2 | n06 | exposureTypes:school | correct |
| n06 | Baseline | 2 | n06 | exposureKeyTerms:1 | correct |
| n06 | A | 3 | n06 | symptomGroup | correct |
| n06 | A | 3 | n06 | caseCount | correct |
| n06 | A | 3 | n06 | comparedWithUsual | correct |
| n06 | A | 3 | n06 | ageGroup | correct |
| n06 | A | 3 | n06 | area | unnecessary ask |
| n06 | A | 3 | n06 | onset | correct |
| n06 | A | 3 | n06 | exposureTypes:school | correct |
| n06 | A | 3 | n06 | exposureKeyTerms:1 | correct |
| n06 | A-min | 3 | n06 | symptomGroup | correct |
| n06 | A-min | 3 | n06 | caseCount | correct |
| n06 | A-min | 3 | n06 | comparedWithUsual | correct |
| n06 | A-min | 3 | n06 | ageGroup | correct |
| n06 | A-min | 3 | n06 | area | unnecessary ask |
| n06 | A-min | 3 | n06 | onset | correct |
| n06 | A-min | 3 | n06 | exposureTypes:school | correct |
| n06 | A-min | 3 | n06 | exposureKeyTerms:1 | correct |
| n06 | B | 3 | n06 | symptomGroup | correct |
| n06 | B | 3 | n06 | caseCount | correct |
| n06 | B | 3 | n06 | comparedWithUsual | correct |
| n06 | B | 3 | n06 | ageGroup | correct |
| n06 | B | 3 | n06 | area | unnecessary ask |
| n06 | B | 3 | n06 | onset | correct |
| n06 | B | 3 | n06 | exposureTypes:school | correct |
| n06 | B | 3 | n06 | exposureKeyTerms:1 | correct |
| n06 | Baseline | 3 | n06 | symptomGroup | correct |
| n06 | Baseline | 3 | n06 | caseCount | correct |
| n06 | Baseline | 3 | n06 | comparedWithUsual | correct |
| n06 | Baseline | 3 | n06 | ageGroup | correct |
| n06 | Baseline | 3 | n06 | area | unnecessary ask |
| n06 | Baseline | 3 | n06 | onset | correct |
| n06 | Baseline | 3 | n06 | exposureTypes:school | correct |
| n06 | Baseline | 3 | n06 | exposureKeyTerms:1 | correct |
| n07 | A | 1 | n07 | symptomGroup | correct |
| n07 | A | 1 | n07 | caseCount | correct |
| n07 | A | 1 | n07 | comparedWithUsual | correct |
| n07 | A | 1 | n07 | ageGroup | correct |
| n07 | A | 1 | n07 | area | correct |
| n07 | A | 1 | n07 | onset | correct |
| n07 | A | 1 | n07 | observations:notResponding | correct |
| n07 | A | 1 | n07 | observations:shortOfSupplies | correct |
| n07 | Baseline | 1 | n07 | symptomGroup | correct |
| n07 | Baseline | 1 | n07 | caseCount | correct |
| n07 | Baseline | 1 | n07 | comparedWithUsual | correct |
| n07 | Baseline | 1 | n07 | ageGroup | correct |
| n07 | Baseline | 1 | n07 | area | correct |
| n07 | Baseline | 1 | n07 | onset | unnecessary ask |
| n07 | Baseline | 1 | n07 | observations:notResponding | correct |
| n07 | Baseline | 1 | n07 | observations:shortOfSupplies | correct |
| n07 | B | 1 | n07 | symptomGroup | correct |
| n07 | B | 1 | n07 | caseCount | unnecessary ask |
| n07 | B | 1 | n07 | comparedWithUsual | correct |
| n07 | B | 1 | n07 | ageGroup | correct |
| n07 | B | 1 | n07 | area | correct |
| n07 | B | 1 | n07 | onset | caught by ask |
| n07 | B | 1 | n07 | observations:notResponding | correct |
| n07 | B | 1 | n07 | observations:shortOfSupplies | correct |
| n07 | A-min | 1 | n07 | symptomGroup | unnecessary ask |
| n07 | A-min | 1 | n07 | caseCount | correct |
| n07 | A-min | 1 | n07 | comparedWithUsual | correct |
| n07 | A-min | 1 | n07 | ageGroup | correct |
| n07 | A-min | 1 | n07 | area | correct |
| n07 | A-min | 1 | n07 | onset | caught by ask |
| n07 | A-min | 1 | n07 | observations:notResponding | correct |
| n07 | A-min | 1 | n07 | observations:shortOfSupplies | correct |
| n07 | Baseline | 2 | n07 | symptomGroup | correct |
| n07 | Baseline | 2 | n07 | caseCount | unnecessary ask |
| n07 | Baseline | 2 | n07 | comparedWithUsual | correct |
| n07 | Baseline | 2 | n07 | ageGroup | correct |
| n07 | Baseline | 2 | n07 | area | correct |
| n07 | Baseline | 2 | n07 | onset | caught by ask |
| n07 | Baseline | 2 | n07 | observations:notResponding | correct |
| n07 | Baseline | 2 | n07 | observations:shortOfSupplies | correct |
| n07 | B | 2 | n07 | symptomGroup | correct |
| n07 | B | 2 | n07 | caseCount | correct |
| n07 | B | 2 | n07 | comparedWithUsual | correct |
| n07 | B | 2 | n07 | ageGroup | correct |
| n07 | B | 2 | n07 | area | correct |
| n07 | B | 2 | n07 | onset | caught by ask |
| n07 | B | 2 | n07 | observations:notResponding | correct |
| n07 | B | 2 | n07 | observations:shortOfSupplies | correct |
| n07 | A-min | 2 | n07 | symptomGroup | unnecessary ask |
| n07 | A-min | 2 | n07 | caseCount | correct |
| n07 | A-min | 2 | n07 | comparedWithUsual | correct |
| n07 | A-min | 2 | n07 | ageGroup | correct |
| n07 | A-min | 2 | n07 | area | unnecessary ask |
| n07 | A-min | 2 | n07 | onset | caught by ask |
| n07 | A-min | 2 | n07 | observations:notResponding | correct |
| n07 | A-min | 2 | n07 | observations:shortOfSupplies | correct |
| n07 | A | 2 | n07 | symptomGroup | correct |
| n07 | A | 2 | n07 | caseCount | unnecessary ask |
| n07 | A | 2 | n07 | comparedWithUsual | correct |
| n07 | A | 2 | n07 | ageGroup | correct |
| n07 | A | 2 | n07 | area | correct |
| n07 | A | 2 | n07 | onset | caught by ask |
| n07 | A | 2 | n07 | observations:notResponding | correct |
| n07 | A | 2 | n07 | observations:shortOfSupplies | correct |
| n07 | A | 3 | n07 | symptomGroup | correct |
| n07 | A | 3 | n07 | caseCount | correct |
| n07 | A | 3 | n07 | comparedWithUsual | correct |
| n07 | A | 3 | n07 | ageGroup | correct |
| n07 | A | 3 | n07 | area | correct |
| n07 | A | 3 | n07 | onset | caught by ask |
| n07 | A | 3 | n07 | observations:notResponding | correct |
| n07 | A | 3 | n07 | observations:shortOfSupplies | correct |
| n07 | A-min | 3 | n07 | symptomGroup | correct |
| n07 | A-min | 3 | n07 | caseCount | unnecessary ask |
| n07 | A-min | 3 | n07 | comparedWithUsual | correct |
| n07 | A-min | 3 | n07 | ageGroup | correct |
| n07 | A-min | 3 | n07 | area | correct |
| n07 | A-min | 3 | n07 | onset | caught by ask |
| n07 | A-min | 3 | n07 | observations:notResponding | correct |
| n07 | A-min | 3 | n07 | observations:shortOfSupplies | correct |
| n07 | B | 3 | n07 | symptomGroup | unnecessary ask |
| n07 | B | 3 | n07 | caseCount | correct |
| n07 | B | 3 | n07 | comparedWithUsual | correct |
| n07 | B | 3 | n07 | ageGroup | correct |
| n07 | B | 3 | n07 | area | unnecessary ask |
| n07 | B | 3 | n07 | onset | correct |
| n07 | B | 3 | n07 | observations:notResponding | correct |
| n07 | B | 3 | n07 | observations:shortOfSupplies | correct |
| n07 | Baseline | 3 | n07 | symptomGroup | unnecessary ask |
| n07 | Baseline | 3 | n07 | caseCount | correct |
| n07 | Baseline | 3 | n07 | comparedWithUsual | correct |
| n07 | Baseline | 3 | n07 | ageGroup | correct |
| n07 | Baseline | 3 | n07 | area | correct |
| n07 | Baseline | 3 | n07 | onset | caught by ask |
| n07 | Baseline | 3 | n07 | observations:notResponding | missed |
| n07 | Baseline | 3 | n07 | observations:shortOfSupplies | missed |
| n08 | A-min | 1 | n08 | symptomGroup | correct |
| n08 | A-min | 1 | n08 | caseCount | correct |
| n08 | A-min | 1 | n08 | comparedWithUsual | correct |
| n08 | A-min | 1 | n08 | ageGroup | correct |
| n08 | A-min | 1 | n08 | area | correct |
| n08 | A-min | 1 | n08 | onset | correct |
| n08 | Baseline | 1 | n08 | symptomGroup | correct |
| n08 | Baseline | 1 | n08 | caseCount | correct |
| n08 | Baseline | 1 | n08 | comparedWithUsual | correct |
| n08 | Baseline | 1 | n08 | ageGroup | correct |
| n08 | Baseline | 1 | n08 | area | correct |
| n08 | Baseline | 1 | n08 | onset | correct |
| n08 | B | 1 | n08 | symptomGroup | correct |
| n08 | B | 1 | n08 | caseCount | correct |
| n08 | B | 1 | n08 | comparedWithUsual | correct |
| n08 | B | 1 | n08 | ageGroup | correct |
| n08 | B | 1 | n08 | area | correct |
| n08 | B | 1 | n08 | onset | correct |
| n08 | A | 1 | n08 | symptomGroup | correct |
| n08 | A | 1 | n08 | caseCount | correct |
| n08 | A | 1 | n08 | comparedWithUsual | correct |
| n08 | A | 1 | n08 | ageGroup | correct |
| n08 | A | 1 | n08 | area | correct |
| n08 | A | 1 | n08 | onset | correct |
| n08 | Baseline | 2 | n08 | symptomGroup | correct |
| n08 | Baseline | 2 | n08 | caseCount | correct |
| n08 | Baseline | 2 | n08 | comparedWithUsual | correct |
| n08 | Baseline | 2 | n08 | ageGroup | correct |
| n08 | Baseline | 2 | n08 | area | correct |
| n08 | Baseline | 2 | n08 | onset | correct |
| n08 | A | 2 | n08 | symptomGroup | correct |
| n08 | A | 2 | n08 | caseCount | correct |
| n08 | A | 2 | n08 | comparedWithUsual | correct |
| n08 | A | 2 | n08 | ageGroup | correct |
| n08 | A | 2 | n08 | area | correct |
| n08 | A | 2 | n08 | onset | correct |
| n08 | A-min | 2 | n08 | symptomGroup | correct |
| n08 | A-min | 2 | n08 | caseCount | correct |
| n08 | A-min | 2 | n08 | comparedWithUsual | correct |
| n08 | A-min | 2 | n08 | ageGroup | correct |
| n08 | A-min | 2 | n08 | area | correct |
| n08 | A-min | 2 | n08 | onset | correct |
| n08 | B | 2 | n08 | symptomGroup | correct |
| n08 | B | 2 | n08 | caseCount | correct |
| n08 | B | 2 | n08 | comparedWithUsual | correct |
| n08 | B | 2 | n08 | ageGroup | correct |
| n08 | B | 2 | n08 | area | correct |
| n08 | B | 2 | n08 | onset | correct |
| n08 | A-min | 3 | n08 | symptomGroup | correct |
| n08 | A-min | 3 | n08 | caseCount | correct |
| n08 | A-min | 3 | n08 | comparedWithUsual | correct |
| n08 | A-min | 3 | n08 | ageGroup | correct |
| n08 | A-min | 3 | n08 | area | correct |
| n08 | A-min | 3 | n08 | onset | correct |
| n08 | B | 3 | n08 | symptomGroup | correct |
| n08 | B | 3 | n08 | caseCount | correct |
| n08 | B | 3 | n08 | comparedWithUsual | correct |
| n08 | B | 3 | n08 | ageGroup | correct |
| n08 | B | 3 | n08 | area | correct |
| n08 | B | 3 | n08 | onset | correct |
| n08 | A | 3 | n08 | symptomGroup | correct |
| n08 | A | 3 | n08 | caseCount | correct |
| n08 | A | 3 | n08 | comparedWithUsual | correct |
| n08 | A | 3 | n08 | ageGroup | correct |
| n08 | A | 3 | n08 | area | correct |
| n08 | A | 3 | n08 | onset | correct |
| n08 | Baseline | 3 | n08 | symptomGroup | correct |
| n08 | Baseline | 3 | n08 | caseCount | correct |
| n08 | Baseline | 3 | n08 | comparedWithUsual | correct |
| n08 | Baseline | 3 | n08 | ageGroup | correct |
| n08 | Baseline | 3 | n08 | area | correct |
| n08 | Baseline | 3 | n08 | onset | correct |
| n09 | A-min | 1 | n09a | symptomGroup | correct |
| n09 | A-min | 1 | n09a | caseCount | correct |
| n09 | A-min | 1 | n09a | comparedWithUsual | correct |
| n09 | A-min | 1 | n09a | ageGroup | correct |
| n09 | A-min | 1 | n09a | area | correct |
| n09 | A-min | 1 | n09a | onset | correct |
| n09 | A-min | 1 | n09b | symptomGroup | correct |
| n09 | A-min | 1 | n09b | caseCount | correct |
| n09 | A-min | 1 | n09b | comparedWithUsual | correct |
| n09 | A-min | 1 | n09b | ageGroup | correct |
| n09 | A-min | 1 | n09b | area | correct |
| n09 | A-min | 1 | n09b | onset | correct |
| n09 | Baseline | 1 | n09a | symptomGroup | correct |
| n09 | Baseline | 1 | n09a | caseCount | correct |
| n09 | Baseline | 1 | n09a | comparedWithUsual | correct |
| n09 | Baseline | 1 | n09a | ageGroup | correct |
| n09 | Baseline | 1 | n09a | area | correct |
| n09 | Baseline | 1 | n09a | onset | correct |
| n09 | Baseline | 1 | n09b | symptomGroup | correct |
| n09 | Baseline | 1 | n09b | caseCount | correct |
| n09 | Baseline | 1 | n09b | comparedWithUsual | correct |
| n09 | Baseline | 1 | n09b | ageGroup | correct |
| n09 | Baseline | 1 | n09b | area | unnecessary ask |
| n09 | Baseline | 1 | n09b | onset | correct |
| n09 | A | 1 | n09a | symptomGroup | correct |
| n09 | A | 1 | n09a | caseCount | correct |
| n09 | A | 1 | n09a | comparedWithUsual | correct |
| n09 | A | 1 | n09a | ageGroup | correct |
| n09 | A | 1 | n09a | area | correct |
| n09 | A | 1 | n09a | onset | correct |
| n09 | A | 1 | n09b | symptomGroup | correct |
| n09 | A | 1 | n09b | caseCount | correct |
| n09 | A | 1 | n09b | comparedWithUsual | correct |
| n09 | A | 1 | n09b | ageGroup | correct |
| n09 | A | 1 | n09b | area | unnecessary ask |
| n09 | A | 1 | n09b | onset | correct |
| n09 | B | 1 | n09a | symptomGroup | correct |
| n09 | B | 1 | n09a | caseCount | correct |
| n09 | B | 1 | n09a | comparedWithUsual | correct |
| n09 | B | 1 | n09a | ageGroup | correct |
| n09 | B | 1 | n09a | area | correct |
| n09 | B | 1 | n09a | onset | correct |
| n09 | B | 1 | n09b | symptomGroup | correct |
| n09 | B | 1 | n09b | caseCount | correct |
| n09 | B | 1 | n09b | comparedWithUsual | correct |
| n09 | B | 1 | n09b | ageGroup | correct |
| n09 | B | 1 | n09b | area | correct |
| n09 | B | 1 | n09b | onset | correct |
| n09 | B | 2 | n09a | symptomGroup | correct |
| n09 | B | 2 | n09a | caseCount | correct |
| n09 | B | 2 | n09a | comparedWithUsual | correct |
| n09 | B | 2 | n09a | ageGroup | correct |
| n09 | B | 2 | n09a | area | correct |
| n09 | B | 2 | n09a | onset | correct |
| n09 | B | 2 | n09b | symptomGroup | correct |
| n09 | B | 2 | n09b | caseCount | correct |
| n09 | B | 2 | n09b | comparedWithUsual | correct |
| n09 | B | 2 | n09b | ageGroup | correct |
| n09 | B | 2 | n09b | area | correct |
| n09 | B | 2 | n09b | onset | correct |
| n09 | Baseline | 2 | n09a | symptomGroup | correct |
| n09 | Baseline | 2 | n09a | caseCount | correct |
| n09 | Baseline | 2 | n09a | comparedWithUsual | correct |
| n09 | Baseline | 2 | n09a | ageGroup | correct |
| n09 | Baseline | 2 | n09a | area | correct |
| n09 | Baseline | 2 | n09a | onset | correct |
| n09 | Baseline | 2 | n09b | symptomGroup | correct |
| n09 | Baseline | 2 | n09b | caseCount | correct |
| n09 | Baseline | 2 | n09b | comparedWithUsual | correct |
| n09 | Baseline | 2 | n09b | ageGroup | correct |
| n09 | Baseline | 2 | n09b | area | correct |
| n09 | Baseline | 2 | n09b | onset | correct |
| n09 | A-min | 2 | n09a | symptomGroup | correct |
| n09 | A-min | 2 | n09a | caseCount | correct |
| n09 | A-min | 2 | n09a | comparedWithUsual | correct |
| n09 | A-min | 2 | n09a | ageGroup | correct |
| n09 | A-min | 2 | n09a | area | correct |
| n09 | A-min | 2 | n09a | onset | correct |
| n09 | A-min | 2 | n09b | symptomGroup | correct |
| n09 | A-min | 2 | n09b | caseCount | correct |
| n09 | A-min | 2 | n09b | comparedWithUsual | correct |
| n09 | A-min | 2 | n09b | ageGroup | correct |
| n09 | A-min | 2 | n09b | area | correct |
| n09 | A-min | 2 | n09b | onset | correct |
| n09 | A | 2 | n09a | symptomGroup | correct |
| n09 | A | 2 | n09a | caseCount | correct |
| n09 | A | 2 | n09a | comparedWithUsual | correct |
| n09 | A | 2 | n09a | ageGroup | correct |
| n09 | A | 2 | n09a | area | correct |
| n09 | A | 2 | n09a | onset | correct |
| n09 | A | 2 | n09b | symptomGroup | correct |
| n09 | A | 2 | n09b | caseCount | correct |
| n09 | A | 2 | n09b | comparedWithUsual | correct |
| n09 | A | 2 | n09b | ageGroup | correct |
| n09 | A | 2 | n09b | area | unnecessary ask |
| n09 | A | 2 | n09b | onset | correct |
| n09 | A-min | 3 | n09a | symptomGroup | correct |
| n09 | A-min | 3 | n09a | caseCount | correct |
| n09 | A-min | 3 | n09a | comparedWithUsual | correct |
| n09 | A-min | 3 | n09a | ageGroup | correct |
| n09 | A-min | 3 | n09a | area | correct |
| n09 | A-min | 3 | n09a | onset | correct |
| n09 | A-min | 3 | n09b | symptomGroup | correct |
| n09 | A-min | 3 | n09b | caseCount | correct |
| n09 | A-min | 3 | n09b | comparedWithUsual | correct |
| n09 | A-min | 3 | n09b | ageGroup | correct |
| n09 | A-min | 3 | n09b | area | correct |
| n09 | A-min | 3 | n09b | onset | correct |
| n09 | Baseline | 3 | n09a | symptomGroup | correct |
| n09 | Baseline | 3 | n09a | caseCount | correct |
| n09 | Baseline | 3 | n09a | comparedWithUsual | correct |
| n09 | Baseline | 3 | n09a | ageGroup | correct |
| n09 | Baseline | 3 | n09a | area | correct |
| n09 | Baseline | 3 | n09a | onset | correct |
| n09 | Baseline | 3 | n09b | symptomGroup | correct |
| n09 | Baseline | 3 | n09b | caseCount | correct |
| n09 | Baseline | 3 | n09b | comparedWithUsual | correct |
| n09 | Baseline | 3 | n09b | ageGroup | correct |
| n09 | Baseline | 3 | n09b | area | correct |
| n09 | Baseline | 3 | n09b | onset | correct |
| n09 | B | 3 | n09a | symptomGroup | unnecessary ask |
| n09 | B | 3 | n09a | caseCount | unnecessary ask |
| n09 | B | 3 | n09a | comparedWithUsual | correct |
| n09 | B | 3 | n09a | ageGroup | unnecessary ask |
| n09 | B | 3 | n09a | area | unnecessary ask |
| n09 | B | 3 | n09a | onset | unnecessary ask |
| n09 | B | 3 | n09b | symptomGroup | unnecessary ask |
| n09 | B | 3 | n09b | caseCount | unnecessary ask |
| n09 | B | 3 | n09b | comparedWithUsual | correct |
| n09 | B | 3 | n09b | ageGroup | correct |
| n09 | B | 3 | n09b | area | unnecessary ask |
| n09 | B | 3 | n09b | onset | unnecessary ask |
| n09 | A | 3 | n09a | symptomGroup | correct |
| n09 | A | 3 | n09a | caseCount | correct |
| n09 | A | 3 | n09a | comparedWithUsual | correct |
| n09 | A | 3 | n09a | ageGroup | correct |
| n09 | A | 3 | n09a | area | unnecessary ask |
| n09 | A | 3 | n09a | onset | correct |
| n09 | A | 3 | n09b | symptomGroup | correct |
| n09 | A | 3 | n09b | caseCount | correct |
| n09 | A | 3 | n09b | comparedWithUsual | correct |
| n09 | A | 3 | n09b | ageGroup | correct |
| n09 | A | 3 | n09b | area | correct |
| n09 | A | 3 | n09b | onset | correct |

## Card counts and checks

| Recording | Configuration | Run | Cards | Report | Count | Names | Transcript name count | Condition | Advice flag | Advice check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| n01 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n01 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n01 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n01 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n01 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n01 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n01 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n01 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n01 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n01 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n01 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n01 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n02 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n02 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n02 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n02 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n02 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n02 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n02 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n02 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n02 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n02 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n02 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n02 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n03 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n03 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n03 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n03 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n03 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n03 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n03 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n03 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n03 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n03 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n03 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n03 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n04 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n04 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n04 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n04 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n04 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n04 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n04 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n04 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n04 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n04 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n04 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n04 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n05 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n05 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n05 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n05 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n05 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n05 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n05 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n05 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n05 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n05 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n05 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n05 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n06 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n06 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n06 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n06 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n06 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n06 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n06 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n06 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n06 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n06 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n06 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n06 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n07 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n07 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n07 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n07 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n07 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n07 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n07 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n07 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n07 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n07 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n07 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n07 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n08 | A-min | 1 | 1 | true | true | true | 0 | true | true | true |
| n08 | Baseline | 1 | 1 | true | true | true | 0 | true | true | true |
| n08 | B | 1 | 1 | true | true | true | 0 | true | true | true |
| n08 | A | 1 | 1 | true | true | true | 0 | true | true | true |
| n08 | Baseline | 2 | 1 | true | true | true | 0 | true | true | true |
| n08 | A | 2 | 1 | true | true | true | 0 | true | true | true |
| n08 | A-min | 2 | 1 | true | true | true | 0 | true | true | true |
| n08 | B | 2 | 1 | true | true | true | 0 | true | true | true |
| n08 | A-min | 3 | 1 | true | true | true | 0 | true | true | true |
| n08 | B | 3 | 1 | true | true | true | 0 | true | true | true |
| n08 | A | 3 | 1 | true | true | true | 0 | true | true | true |
| n08 | Baseline | 3 | 1 | true | true | true | 0 | true | true | true |
| n09 | A-min | 1 | 2 | true | true | true | 0 | true | true | true |
| n09 | Baseline | 1 | 2 | true | true | true | 0 | true | true | true |
| n09 | A | 1 | 2 | true | true | true | 0 | true | true | true |
| n09 | B | 1 | 2 | true | true | true | 0 | true | true | true |
| n09 | B | 2 | 2 | true | true | true | 0 | true | true | true |
| n09 | Baseline | 2 | 2 | true | true | true | 0 | true | true | true |
| n09 | A-min | 2 | 2 | true | true | true | 0 | true | true | true |
| n09 | A | 2 | 2 | true | true | true | 0 | true | true | true |
| n09 | A-min | 3 | 2 | true | true | true | 0 | true | true | true |
| n09 | Baseline | 3 | 2 | true | true | true | 0 | true | true | true |
| n09 | B | 3 | 2 | true | true | true | 0 | true | true | true |
| n09 | A | 3 | 2 | true | true | true | 0 | true | true | true |
| n10 | B | 1 | 0 | true | true | true | 0 | true | true | true |
| n10 | Baseline | 1 | 0 | true | true | true | 0 | true | true | true |
| n10 | A | 1 | 0 | true | true | true | 0 | true | true | true |
| n10 | A-min | 1 | 0 | true | true | true | 0 | true | true | true |
| n10 | Baseline | 2 | 0 | true | true | true | 0 | true | true | true |
| n10 | A | 2 | 0 | true | true | true | 0 | true | true | true |
| n10 | A-min | 2 | 0 | true | true | true | 0 | true | true | true |
| n10 | B | 2 | 0 | true | true | true | 0 | true | true | true |
| n10 | B | 3 | 0 | true | true | true | 0 | true | true | true |
| n10 | A-min | 3 | 0 | true | true | true | 0 | true | true | true |
| n10 | A | 3 | 0 | true | true | true | 0 | true | true | true |
| n10 | Baseline | 3 | 0 | true | true | true | 0 | true | true | true |

## Configuration totals

| Configuration | CW | Caught | Unnecessary | Missed | Extra | Extra cards | Missing cards | Name leaks | JSON failures | Failed pipelines |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | 4 | 6 | 8 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| A | 2 | 6 | 11 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| A-min | 0 | 8 | 12 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| B | 1 | 6 | 35 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |

## Timings in milliseconds

| Configuration | Step | Comparable samples | Median | Maximum |
| --- | --- | --- | --- | --- |
| Baseline | conversionMs | 30 | 175.5 | 924 |
| Baseline | voiceMs | 30 | 9421 | 19856 |
| Baseline | audioMs | 30 | 9778 | 16922 |
| Baseline | bothEarsMs | 30 | 10036 | 19856 |
| Baseline | cardMs | 30 | 7330.5 | 19148 |
| Baseline | totalMs | 30 | 19102 | 35109 |
| A | conversionMs | 30 | 175.5 | 924 |
| A | voiceMs | 30 | 9246 | 19890 |
| A | audioMs | 30 | 9777 | 16921 |
| A | bothEarsMs | 30 | 9882.5 | 19890 |
| A | cardMs | 30 | 7899.5 | 21828 |
| A | totalMs | 30 | 18352 | 33986 |
| A-min | conversionMs | 30 | 175.5 | 924 |
| A-min | voiceMs | 30 | 9245 | 19890 |
| A-min | audioMs | 30 | 8734.5 | 16998 |
| A-min | bothEarsMs | 30 | 9395 | 19890 |
| A-min | cardMs | 30 | 6666 | 16862 |
| A-min | totalMs | 30 | 18335.5 | 30472 |
| B | conversionMs | 29 | 176 | 924 |
| B | voiceMs | 29 | 9246 | 19889 |
| B | audioMs | 29 | 12643 | 43730 |
| B | bothEarsMs | 29 | 12643 | 43730 |
| B | cardMs | 29 | 7106 | 15714 |
| B | totalMs | 29 | 20803 | 52524 |

Resumed pipelines that reuse completed calls have no new comparable end-to-end measurement.

## Agreement and uncertainty markers

| Configuration | Fields with differing outcomes | Markers found | Mapped | Unmapped | CW caught by rule | Unnecessary asks added |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | 11 | 1 | 0 | 1 | 0 | 0 |
| A | 13 | 1 | 0 | 1 | 0 | 0 |
| A-min | 8 | 0 | 0 | 0 | 0 | 0 |
| B | 29 | 5 | 0 | 5 | 0 | 0 |

## Rule OFF and ON totals

| Configuration | Rule | CW | Caught | Unnecessary |
| --- | --- | --- | --- | --- |
| Baseline | OFF | 4 | 6 | 8 |
| Baseline | ON | 4 | 6 | 8 |
| A | OFF | 2 | 6 | 11 |
| A | ON | 2 | 6 | 11 |
| A-min | OFF | 0 | 8 | 12 |
| A-min | ON | 0 | 8 | 12 |
| B | OFF | 1 | 6 | 35 |
| B | ON | 1 | 6 | 35 |

## Authored word fixtures

| Fixture | Configuration | Run | Outcome |
| --- | --- | --- | --- |
| D4-1 | Baseline | 1 | fail |
| D4-2 | Baseline | 1 | pass |
| NEAR-MISS | Baseline | 1 | pass |
| D4-1 | A | 2 | fail |
| D4-1 | A | 1 | fail |
| D4-2 | A | 1 | pass |
| D4-2 | A | 2 | pass |
| D4-1 | A | 3 | pass |
| D4-2 | A | 3 | pass |
| NEAR-MISS | A | 1 | pass |
| NEAR-MISS | A | 2 | pass |
| NEAR-MISS | A | 3 | pass |

## False insertions

| Configuration | Fixture failures | Recording suspects |
| --- | --- | --- |
| Baseline | 0 | 0 |
| A | 0 | 0 |
| A-min | 0 | 1 |
| B | 0 | 1 |

## Baseten authored comparison

Baseten: skipped after probe outcome http, HTTP 404, attempts 1. Requested model meta-models/muse-spark-open-1026, effort low, at https://inference.baseten.co/v1.

| Fixture | Provider | Outcome | CW | Caught | Unnecessary | JSON failure | Milliseconds | Input tokens | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D4-1 | meta | fail | unavailable | unavailable | unavailable | 0 | 10014 | 2659 | 2516 |
| D4-1 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| D4-2 | meta | pass | unavailable | unavailable | unavailable | 0 | 4313 | 2663 | 1132 |
| D4-2 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| NEAR-MISS | meta | pass | unavailable | unavailable | unavailable | 0 | 6834 | 2671 | 1684 |
| NEAR-MISS | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| n03 | meta | ok | 0 | 0 | 0 | 0 | 4837 | 2715 | 887 |
| n03 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| n09 | meta | ok | 0 | 0 | 0 | 0 | 5134 | 2671 | 1318 |
| n09 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| n08 | meta | ok | 0 | 0 | 0 | 0 | 4708 | 2677 | 975 |
| n08 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| n10 | meta | ok | 0 | 0 | 0 | 0 | 1470 | 2637 | 244 |
| n10 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |
| n04 | meta | ok | 0 | 0 | 0 | 0 | 3916 | 2697 | 946 |
| n04 | baseten | missing | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable | unavailable |

## Baseten simulated ranking comparison

| Input | Provider | Ranking | Guard changes | JSON failure | Milliseconds | Input tokens | Output tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |

Baseten's published Muse Spark Open schema format is not enforced by its server. The dated slug is requested exactly. No recording or recording-derived transcript is sent there.

## Recommendations for review

Prompt and keywords: revise; do not ship. Effort: minimal. Audio ear: 1.2. Rule: OFF.
matched effort
Meta documents incomplete Spark 1.3 audio support.
Rule: 0 confidently wrong fields caught; 0 unnecessary asks added across 30 cards.
```json
{
  "prompt": {
    "d4All": false,
    "falseInsertionsClear": true,
    "baselineCW": 4,
    "candidateCW": 2,
    "consistentRuns": 3
  },
  "effort": {
    "minimalCW": 0,
    "lowCW": 2,
    "minimalEarsMs": 9395,
    "lowEarsMs": 9882.5,
    "consistentRuns": 2
  },
  "audio": {
    "referenceCW": 0,
    "candidateCW": 1,
    "referenceAsks": 20,
    "candidateAsks": 41,
    "consistentRuns": 0,
    "referenceTotalMs": 18335.5,
    "candidateTotalMs": 20803
  }
}
```

## Completion

Every expected logical pipeline/fixture result is present. Individual unavailable components are listed above.
