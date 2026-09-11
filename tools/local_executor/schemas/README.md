# Reply schemas

Pass one with `--schema`. Ollama constrains decoding to it, so a reply that loses a brace or omits
a required field cannot be produced — this is strictly better than checking afterwards with
`--expect json`, which only tells you the damage happened.

Two rules learned the hard way:

- **Put the COUNT in the schema, not the prose.** A spec asking for 12 cases against a schema with
  no `minItems` returned 2, and the reply was perfectly valid. The schema is enforced; the prose
  is a suggestion.
- **A schema constrains SHAPE, never TRUTH.** Every field can be well-formed and every value still
  invented. Twelve schema-valid test cases once named twelve file paths, none of which existed in
  this repo, and all twelve exercised nothing. Anything whose truth lives in the repo — paths,
  identifiers, patterns, expected values — is supplied by the planner, not requested from the
  model.
