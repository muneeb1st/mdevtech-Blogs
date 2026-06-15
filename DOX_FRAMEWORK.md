# DOX Framework

DOX is the AGENTS.md hierarchy system used by this repo to make editing rules explicit, durable, and locally enforceable. Treat AGENTS.md files as binding work contracts for their subtrees.

## Core Rules

- AGENTS.md files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it.
- The root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index.
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index.
- Each parent explains direct children, scope, and what stays owned by the parent.
- The closer a doc is to the work, the more specific and practical it must be.
- If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX.

## Read Before Editing

1. Read the root AGENTS.md.
2. Identify every file or folder expected to be touched.
3. Walk from the repository root to each target path.
4. Read every AGENTS.md found along each route.
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there.
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules.

## Update After Editing

After meaningful changes, update the closest owning AGENTS.md when the change affects:

- Purpose, scope, ownership, or responsibilities.
- Durable structure, contracts, workflows, or operating rules.
- Required inputs, outputs, permissions, constraints, side effects, or artifacts.
- AGENTS.md creation, deletion, move, rename, or index contents.

## Child Doc Shape

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Closeout Checklist

- Re-check changed paths against the DOX chain.
- Update nearest owning AGENTS.md when needed.
- Update affected parent or child docs when needed.
- Refresh affected Child DOX Indexes.
- Remove stale or contradictory text.
- Run relevant verification.
