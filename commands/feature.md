# Feature Command

---

description: Implement a complete feature with all necessary files (components, API routes, hooks, types)

argument-hint: Feature name | Feature description and requirements

---

## Context

Parse $ARGUMENTS to get the following values:

- [name]: Feature name from $ARGUMENTS
- [requirements]: Detailed feature description from $ARGUMENTS

## Task

Implement a complete feature following this structured approach:

### 1. Analysis Phase
Identify:
- Required components
- API endpoints needed
- Custom hooks
- State management requirements
- Database schema changes
- Type definitions

### 2. Implementation Order
Create files in this order:

1. **Types** (`src/types/[name].ts`)
   - Define TypeScript interfaces and types

2. **Database Schema** (`prisma/schema.prisma`)
   - Add/update models if needed

3. **API Routes** (`src/app/api/[name]/route.ts`)
   - Implement POST, GET, PATCH, DELETE as needed
   - Add validation and error handling
   - Include authentication checks

4. **Utility Functions** (`src/lib/[name].ts`)
   - Business logic
   - Helper functions

5. **Custom Hooks** (`src/hooks/use[Name].ts`)
   - Data fetching hooks
   - State management hooks

6. **Zustand Store** (`src/stores/[name]Store.ts`) - if needed
   - Global state and actions

7. **Components** (`src/components/[category]/[Component].tsx`)
   - Start with leaf components
   - Build up to container components

8. **Page Integration** (`src/app/[route]/page.tsx`)
   - Wire everything together

### 3. Best Practices
- **Error Handling**: Every API route needs try-catch
- **Loading States**: Show loading indicators
- **Type Safety**: No 'any' types
- **Validation**: Validate on client and server
- **Security**: Check authentication/authorization
- **Documentation**: Add JSDoc comments

### 4. Code Standards

API Route Pattern:
```typescript
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    // Validation and business logic

    return NextResponse.json(data);
  } catch (error) {
    console.error('[FEATURE_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
```

Custom Hook Pattern:
```typescript
import { useState, useEffect } from 'react';

export function useFeature(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch logic
  }, [id]);

  return { data, loading, error };
}
```

### 5. Deliverables
Provide:
- List of created/modified files
- Brief explanation of how components work together
- Any environment variables needed
- Next steps or integration instructions

## Example

Input: `/feature pdf-upload | Allow users to upload PDFs (max 50MB, PDF only), store in Supabase, extract metadata, save to database`

Output: Creates types, API route, utilities, hooks, upload component, and integration instructions
