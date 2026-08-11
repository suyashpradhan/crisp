# Hinglish Evaluation

Hinglish is evaluated before it is advertised. English (`en-IN`) remains the supported V0 transcription language.

## Evaluation set

Use consented, non-production recordings that cover:

- mixed commands: “Kal Rahul ko call karna at 5 PM”;
- corrections: “Pehla wala 3 PM kar do”;
- ordinal deletion: “Dusra delete kar do”;
- session clear and undo;
- Indian names, city names, numbers, and short pauses.

For each sample, record transcription quality, resulting `SessionOperation[]`, date/time normalization, and whether an unsafe permanent-task reference was rejected. A sample passes only when the validated reducer produces the expected temporary drafts and no permanent task changes.

## Decision rule

Do not broaden the language selector or change `languageCode` from `en-IN` until the corpus is reviewed for operation accuracy and the active-session safety boundary. Add unsupported utterances to this document; do not make the client guess silently.
