# run-display package boundary (in-repo candidate package)

This folder is treated as the package-candidate boundary inside the current repository.

## Allowed in boundary

- Run transport DTO -> display model mappers.
- Display model/types for run presentation.
- Reusable run presentation components (direct run, live snapshot, batch item display).
- Pure display helpers used only by run presentation.

## Not allowed in boundary

- Host `src/components/workflow-page/*` page assembly and ownership logic.
- Polling, page-level selection state, or page-level stale orchestration.
- Host workflow runtime controllers.
- Host shared component primitives and host shared workflow state owner.

## Dependency direction

- Host modules in `src/*` must consume run-display through `@aiwriter/run-display`.
- Host modules must not deep-import `@aiwriter/run-display/*` or `packages/run-display/src/*`.
- `packages/run-display/src/run-display/*` must not import host workflow-page/runtime/shared modules.

## Public entries

- Public package entry: `@aiwriter/run-display`.

## Ownership

- Shared rendering primitives for run-display are owned inside `packages/run-display/src/run-display/RunValueBlock.tsx`.
- Workflow state contract for run-display is owned in `packages/run-display/src/run/runDisplayContracts.ts`.

## Package artifact pipeline

- Package root: `frontend-react/packages/run-display/`
- JS build config: `frontend-react/packages/run-display/vite.config.ts`
- Type declaration config: `frontend-react/packages/run-display/tsconfig.types.json`
- Build command: `npm --prefix frontend-react run build:run-display-package`
