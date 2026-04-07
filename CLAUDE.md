# Workflow Gate Rules

1. All generated documents must be saved under `./doc/`.
2. Never save planning or analysis documents to `docs/superpowers/plans/`; user preference overrides skill defaults.
3. Each session invocation may handle exactly one stage only.
4. Each stage may produce exactly one primary output file.
5. After finishing the current stage, stop immediately and wait for the next instruction.
6. During audit / clarification / decision / planning stages, do not modify source code.
7. If uncertainty remains, record it in the current stage document and stop; do not advance stages automatically.
8. For any file write, propose the exact target path first if needed, then write only after approval.