# UI Component Command

---

description: Create a React/TypeScript UI Component with proper structure and best practices

argument-hint: Component name | Component purpose/description

---

## Context

Parse $ARGUMENTS to get the following values:

- [name]: Component name from $ARGUMENTS, converted to PascalCase
- [description]: Component purpose/description from $ARGUMENTS

## Task

Create a React TypeScript component following these guidelines:

1. **File Location**:
   - Core UI components: `src/components/ui/[name]/[name].tsx`
   - PDF-related: `src/components/pdf/[name].tsx`
   - AI-related: `src/components/ai/[name].tsx`
   - Layout components: `src/components/layout/[name].tsx`

2. **Component Structure**:
```typescript
   'use client';

   import React from 'react';

   interface [name]Props {
     // Define props with JSDoc comments
   }

   export function [name]({ ...props }: [name]Props) {
     // Component logic

     return (
       // JSX
     );
   }
```

3. **Best Practices**:
   - Use TypeScript with explicit types
   - Include 'use client' directive if using hooks/interactivity
   - Export as named export
   - Add JSDoc comments for complex props
   - Use Tailwind CSS for styling
   - Follow shadcn/ui patterns
   - Include accessibility attributes (aria-labels, roles)

4. **State Management**:
   - Use useState for local state
   - Use Zustand store for global state
   - Keep components focused and single-responsibility

5. **Naming Conventions**:
   - Component name: PascalCase
   - Props interface: [Name]Props
   - Event handlers: handleXyz format
   - Boolean props: isXyz, hasXyz, shouldXyz

6. **Reference**: Use the [description] to guide functionality

## Example

Input: `/ui-component PDFToolbar | Toolbar with zoom, highlight, and AI mode controls`

Output: Creates `src/components/pdf/PDFToolbar.tsx` with zoom controls, highlight picker, AI toggle, proper types, and accessible controls
