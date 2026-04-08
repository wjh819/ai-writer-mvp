# Project Code Map

## 1. Project Summary
- Project name:
- Primary purpose:
- Current audit scope:
- Audit date:
- Audit status: in-progress / partial / relatively complete

## 2. What a New Assistant Should Read First
Recommended order:

1. `...`
2. `...`
3. `...`
4. `...`

Why this order:
- ...
- ...
- ...

## 3. Entry Points and Startup Chain
### Confirmed entry points
- `...`
- `...`

### Startup / bootstrap chain
Describe the startup chain from entry to main runtime path.

Example format:
- app entry -> page/container -> runtime hook/service -> graph/editor state -> API layer

### Confidence
- confirmed:
- probable:
- unknown:

## 4. Codebase Grouping
Group files by responsibility, not just by folder.

### 4.1 Page / Container layer
- `path`
  - responsibility:
  - inputs:
  - outputs:
  - depends on:

### 4.2 Runtime / orchestration layer
- `path`
  - responsibility:
  - inputs:
  - outputs:
  - depends on:

### 4.3 Graph / editor state layer
- `path`
  - responsibility:
  - inputs:
  - outputs:
  - depends on:

### 4.4 API / transport layer
- `path`
  - responsibility:
  - request/response contract:
  - depends on:

### 4.5 Domain model / types / schema layer
- `path`
  - responsibility:
  - source-of-truth status:
  - depends on:

### 4.6 Compatibility / legacy layer
- `path`
  - legacy marker:
  - why it still exists:
  - deletion risk:

## 5. Main Runtime Flow
Write the main runtime flow in sequence.

Example:
1. user action enters `...`
2. state is normalized in `...`
3. graph/editor model is transformed in `...`
4. request is assembled in `...`
5. backend result returns to `...`
6. UI consumes result in `...`

## 6. Data and Contract Map
### Core models
- model name:
  - defined in:
  - used by:
  - notes:

### Request/response contracts
- contract name:
  - defined in:
  - consumed in:
  - notes:

### Important naming drifts
- old name -> new/preferred name
- old field -> new/preferred field

## 7. File Relationship Notes
Describe the real dependency chain.

### High-level relationship
- `A` drives `B`
- `B` reads from `C`
- `C` sends data to `D`
- `D` returns result to `A`

### Known split boundaries
- UI boundary:
- orchestration boundary:
- transport boundary:
- domain boundary:

## 8. Legacy / Compatibility / Cleanup Signals
List only things that look genuinely transitional.

- file/path:
  - signal:
  - why it looks legacy:
  - confidence:
- file/path:
  - signal:
  - why it looks legacy:
  - confidence:

## 9. High-risk Areas
List areas where changes would likely have large blast radius.

- area:
  - affected files:
  - risk:
  - reason:

## 10. Uncertain Points
This section is mandatory.

- question:
  - why uncertain:
  - what file or evidence is missing:
  - what should be requested next:

## 11. Files That Should Be Requested Next
This section is written for a future assistant in any chat environment.

Priority order:
1. `path` — needed to confirm ...
2. `path` — needed to confirm ...
3. `path` — needed to confirm ...

## 12. Fast Handoff Summary
Write this section so another assistant can onboard quickly.

### Current understanding in one paragraph
...

### Source-of-truth files right now
- `...`
- `...`
- `...`

### Files most likely to matter next
- `...`
- `...`
- `...`

### Things not yet safe to conclude
- ...
- ...
- ...

## 13. Next Assistant Instructions
You are continuing an audit, not starting from zero.

Please do the following:
1. Read this document first.
2. Do not restate the whole project from scratch.
3. Request only the missing files listed above.
4. Update this document instead of creating a parallel summary.
5. Mark every new conclusion as confirmed / probable / unknown.
6. Do not jump into implementation until uncertainty is reduced.