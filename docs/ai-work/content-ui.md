# Rule: Content UI Portal Container Standard

## Scope
- Applies to all browser extension **content scripts / content UI pages**
- Applies to React components that use **Portal / createPortal / Radix Portal / shadcn/ui Portal**

## Requirement
In any **content page** of the plugin, **all Portal-related logic MUST use the container provided by `useContentUI()`**.

### Mandatory Pattern
Whenever a Portal is used, the container must be obtained and used as follows:

```ts
const { container: portalContainer } = useContentUI();
```
