# Cohort correction

The original `PLAYER_INPUT_FEASIBILITY_SUPPLEMENT.md` remains byte-unchanged at SHA-256 `103fc6217edfb46b22b030cfb0325f383d7d5b2914dbae0aaec67015ed1bd1ba`. Its selector feasibility finding motivated the experiment, but its T16/T17 bindings and Korenici timing describe the rejected 705 cohort.

For the accepted P03 704 cohort, Korenici is RBiH at both T16 and T39, while the 712 reference expects RS. It is already one of the three baseline losses. The rejected cohort changes Korenici from RBiH at T16 to RS at T39. Therefore a plan to capture Korenici is directionally wrong for the accepted cohort and would worsen fit. The accepted bindings are T16 `861d4e34...`, T17 `32d5b1bb...`, and T39 `623cbaed...`; V3 separately proved exact T16→T17 fidelity.
