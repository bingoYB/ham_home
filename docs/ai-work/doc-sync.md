# Documentation Sync Rules

You are working in a pnpm monorepo (workspace-based) codebase.

RULE: Package-Scoped Component Documentation Sync (MANDATORY)

This repository uses pnpm workspaces.
Documentation MUST be scoped to the package (workspace) where the code lives.
Global or root-level documentation updates are NOT allowed unless explicitly requested.

Trigger conditions:
- A new component is created
- An existing component’s API is changed (props, events, slots, exposed methods)
- A component’s behavior or usage semantics are modified

Required actions:
1. Identify the workspace/package that the modified component belongs to
   - A package is defined by the nearest parent directory containing `package.json`
2. Locate the documentation directory inside THAT package
   - Preferred: `<package-root>/docs/components.md`
   - If not present, create it
3. Update the component documentation ONLY within that package

Documentation rules:
- Each component must have a dedicated section in the package’s documentation file
- Documentation must reflect the current implementation, not planned behavior
- Documentation updates are mandatory and must be included in the same response as the code changes

Each component section MUST include:
- Component name
- Short description / responsibility
- Props (table format: name | type | required | default | description)
- Usage example
- Behavior notes / edge cases (if applicable)

Output constraints:
- Code changes WITHOUT corresponding documentation updates are INVALID
- Documentation updates must be concrete file edits, not suggestions
- Explicitly state:
  - Which package (workspace) was affected
  - Which documentation file was updated
- Do NOT update root-level `/docs` or other packages’ documentation
- Do NOT say “documentation should be updated later”

Failure handling:
- If the package root or documentation location cannot be determined,
  STOP and request clarification before generating code.
