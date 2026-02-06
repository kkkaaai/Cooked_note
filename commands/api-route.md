# API Route Command

---

description: Create a Next.js API route with proper structure, validation, and error handling

argument-hint: Route path | HTTP methods and purpose

---

## Context

Parse $ARGUMENTS to get:

- [path]: API route path (e.g., "documents", "annotations/[id]")
- [methods]: HTTP methods and purposes

## Task

Create a Next.js API route with this structure:

### File Location
- Path: `src/app/api/[path]/route.ts`
- Use dynamic segments for IDs: `[id]/route.ts`

### Route Structure
```typescript
import { auth } from '@clerk/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema
const schema = z.object({
  // Define validation rules
});

// GET handler
export async function GET(
  req: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const data = await db.[model].findMany({
      where: { userId },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[ROUTE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// POST handler
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = schema.parse(body);

    const result = await db.[model].create({
      data: {
        ...validatedData,
        userId,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[ROUTE_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// PATCH handler
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();

    const existing = await db.[model].findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== userId) {
      return new NextResponse('Not found', { status: 404 });
    }

    const updated = await db.[model].update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ROUTE_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// DELETE handler
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const existing = await db.[model].findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== userId) {
      return new NextResponse('Not found', { status: 404 });
    }

    await db.[model].delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ROUTE_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
```

### Best Practices
- Always authenticate first
- Validate inputs with Zod
- Check ownership for user-specific data
- Use proper status codes:
  - 200: Success
  - 201: Created
  - 204: No content
  - 400: Bad request
  - 401: Unauthorized
  - 404: Not found
  - 500: Internal error
- Log errors with route prefix
- Use TypeScript throughout

## Example

Input: `/api-route documents | GET to list, POST to create`

Output: Creates `src/app/api/documents/route.ts` with GET/POST handlers, validation, auth checks
