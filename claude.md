# GoodNotes Clone - AI-Enhanced PDF Annotator

## Session Continuity Rules
**IMPORTANT**: At the end of every work session (or after completing a significant task), you MUST:
1. Update the **Current Status** section below to reflect what was accomplished and what comes next
2. Update the **Development Phases** checkboxes to mark completed items
3. Add any important decisions to the **Decisions Log** with the date
4. Update `~/.claude/projects/-Users-kai-goodnotes-clone/memory/MEMORY.md` with any new learnings, gotchas, or patterns discovered
5. If a new file/pattern was established, note it in memory so future sessions don't have to re-discover it

This ensures the next Claude Code session can pick up exactly where we left off.

## Quality Gates (MANDATORY)
**IMPORTANT**: After implementing every new feature or significant code change, you MUST run these checks before considering the work done:

### 1. TypeScript Type Check
```bash
npm run typecheck
```
- Runs `tsc --noEmit` across the entire codebase
- Catches type errors, missing imports, incorrect function signatures
- **Must pass with zero errors** before moving on

### 2. Unit Tests
```bash
npm run test
```
- Runs Vitest on all `*.test.{ts,tsx}` files in `src/`
- **After implementing a feature, write tests for it** — cover:
  - Utility/library functions (validation, transformations, helpers)
  - API route handlers (request/response, error cases)
  - Zustand stores (state transitions, actions)
  - React components (rendering, user interactions, edge cases)
- Test files live next to the code they test: `foo.ts` → `foo.test.ts`
- **All tests must pass** before moving on

### 3. Build Check (periodic)
```bash
npm run build
```
- Run after completing a full feature (not every small change)
- Catches Next.js-specific issues (server/client boundaries, dynamic imports)

### Workflow Summary
```
Implement feature → Write tests → npm run typecheck → npm run test → (npm run build if full feature)
```
If any check fails, fix the issue before continuing to the next task.

### Testing Stack
- **Test Runner**: Vitest (v4+)
- **Component Testing**: @testing-library/react + @testing-library/jest-dom
- **Environment**: jsdom
- **Config**: `vitest.config.ts` at project root
- **Setup**: `src/test/setup.ts` (loads jest-dom matchers)

## Project Vision
An intelligent PDF annotation tool combining the smooth UX of GoodNotes with AI-powered contextual explanations. Users can upload PDFs, highlight text with drag-and-drop, and get instant AI explanations of selected content with full document context awareness.

## Core Value Proposition
- **Seamless PDF Experience**: Smooth, intuitive PDF viewing and annotation
- **AI-Powered Learning**: Context-aware explanations via Claude API
- **Simple & Focused**: Login → Upload → Annotate → Learn

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **PDF Rendering**: React-PDF (PDF.js wrapper)

### Backend
- **API**: Next.js API Routes
- **Authentication**: Clerk
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **File Storage**: Supabase Storage

### AI Integration
- **Primary AI**: Anthropic Claude API (Sonnet 4.5)
- **PDF Text Extraction**: pdfjs-dist
- **Context Management**: Custom chunking strategy

## Database Schema

### Users
- id (UUID)
- clerkId (string, unique)
- email (string)
- name (string)
- createdAt, updatedAt (DateTime)

### Documents
- id (UUID)
- userId (UUID, foreign key)
- title, fileName, fileUrl (string)
- fileSize, pageCount (number)
- uploadedAt, lastOpenedAt (DateTime)

### Annotations
- id (UUID)
- documentId, userId (UUID, foreign keys)
- type (enum: 'highlight', 'note', 'ai_explanation')
- pageNumber (number)
- color (string)
- position (JSON) // {x, y, width, height}
- selectedText, content (text)
- createdAt, updatedAt (DateTime)

### AIContexts
- id (UUID)
- documentId (UUID, foreign key)
- extractedText (text) // Full document text
- chunkMetadata (JSON)
- createdAt (DateTime)

## Core Features & User Flows

### 1. Authentication
- Flow: Landing page → Sign in with Clerk → Dashboard
- Pages: `/`, `/sign-in`, `/sign-up`, `/dashboard`

### 2. PDF Upload
- Flow: Dashboard → Upload button → File picker → Processing → Document list
- Validation: PDF only, max 50MB
- Processing: Extract text, count pages, save to storage

### 3. PDF Viewer
- Flow: Click document → Full-screen viewer
- Features: Page navigation, zoom controls, thumbnails

### 4. Highlight Tool
- Flow: Click highlight button → Drag across text → Text highlighted
- Features: Color picker, multi-select, edit/delete, persist

### 5. AI Mode
- Flow: Toggle AI mode → Select text → Sidebar shows AI explanation
- Features: Streaming responses, context-aware, conversation history

## UI/UX Design Principles

### Visual Design
- Clean & minimal white/light gray background
- PDF takes center stage
- Smooth animations (200-300ms transitions)
- Color palette: Blue primary, translucent highlights

### Interaction Patterns
- Clear hover/active states
- Skeleton loading screens
- Inline error messages
- Encouraging empty states

## File Structure
```
goodnotes-clone/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── document/[id]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── documents/
│   │   │   ├── annotations/
│   │   │   └── ai/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── pdf/
│   │   ├── ai/
│   │   └── layout/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── pdf.ts
│   │   ├── ai.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── middleware.ts
├── prisma/
│   └── schema.prisma
├── commands/
├── docs/
├── claude.md
└── .env
```

## Development Phases

### Phase 1: Foundation (Week 1)
- [x] Initialize project structure
- [x] Set up authentication flow
- [x] Create basic layouts and routing
- [x] Configure database

### Phase 2: PDF Core (Week 2)
- [x] Implement PDF upload with validation
- [x] Create document list view
- [x] Build PDF viewer component
- [x] Add page navigation and zoom

### Phase 3: Annotation System (Week 2-3)
- [ ] Build highlight tool UI
- [ ] Implement text selection detection
- [ ] Create annotation storage
- [ ] Add color picker and editing

### Phase 4: AI Integration (Week 3-4)
- [ ] Set up Claude API integration
- [ ] Implement PDF text extraction
- [ ] Build AI sidebar component
- [ ] Create context management
- [ ] Add streaming responses

### Phase 5: Polish & Testing (Week 4)
- [ ] Use Playwright MCP for UX review
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Optimize performance
- [ ] Deploy to Vercel

## Technical Challenges & Solutions

### Challenge 1: Text Selection in PDF
**Problem**: PDF.js renders text in canvas/SVG, making selection tricky
**Solution**: Use PDF.js text layer API with custom selection logic

### Challenge 2: Highlight Persistence
**Problem**: Storing positions that work across zoom levels
**Solution**: Store normalized coordinates (0-1 range) relative to page

### Challenge 3: AI Context Management
**Problem**: Large PDFs exceed Claude's context window
**Solution**: Extract full text on upload, send relevant pages + context for queries

### Challenge 4: Real-time UX
**Problem**: Keep annotations smooth and responsive
**Solution**: Optimistic UI updates, debounced saves, Zustand for local state

### Challenge 5: PDF Rendering Performance
**Problem**: Large PDFs slow to render
**Solution**: Lazy load pages, cache rendered pages, use Web Workers

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload new PDF
- `GET /api/documents` - List user's documents
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete document

### Annotations
- `POST /api/annotations` - Create annotation
- `GET /api/annotations?documentId=[id]` - Get annotations
- `PATCH /api/annotations/[id]` - Update annotation
- `DELETE /api/annotations/[id]` - Delete annotation

### AI
- `POST /api/ai/explain` - Get AI explanation
- `POST /api/ai/chat` - Continue conversation

## Success Metrics

### MVP Success Criteria
- [ ] User can sign up and log in
- [ ] User can upload a PDF
- [ ] User can view PDF with smooth navigation
- [ ] User can highlight text in multiple colors
- [ ] User can select text and get AI explanation
- [ ] Highlights persist across sessions
- [ ] AI responses are contextually relevant

### Performance Targets
- Page load: < 2s
- PDF render: < 3s for 10-page doc
- Highlight response: < 100ms
- AI response start: < 1s (streaming)

## Review the Work

- **Invoke the ui-ux-reviewer subagent** to review your work and implement suggestions where needed
- Iterate on the review process when needed

## Current Status
Phase: Phase 2 Complete → Moving to Phase 3 (Annotation System)
- PDF upload to Supabase Storage with client-side + server-side validation (50MB, PDF-only)
- Document list on dashboard (responsive grid, delete with storage cleanup)
- PDF viewer with react-pdf (page rendering, text layer, annotation layer)
- Page navigation (prev/next, jump to page) + zoom controls (in/out, reset)
- Keyboard shortcuts (arrow keys for pages, +/- for zoom)
- Zustand store for PDF viewer state
- 23 tests passing (stores, utils, components)
- Build passes cleanly

## Decisions Log
- 2026-02-05: Chose Next.js App Router for better server components
- 2026-02-05: Chose Clerk over NextAuth for faster auth setup
- 2026-02-05: Using Supabase for database + storage (all-in-one)
- 2026-02-05: Desktop-first approach, mobile later
- 2026-02-05: Using React-PDF over PSPDFKit (cost-effective)
- 2026-02-05: Prisma 7 uses prisma-client (not prisma-client-js) with prisma.config.ts
- 2026-02-05: Supabase requires DIRECT_URL (port 5432) for Prisma CLI; pooled URL (port 6543) for runtime
- 2026-02-05: Clerk v6 requires `clerkMiddleware` (not deprecated `authMiddleware`), `auth()` must be awaited, imports from `@clerk/nextjs/server`
- 2026-02-05: Prisma 7 requires `@prisma/adapter-pg` driver adapter (no built-in query engine), import from `@/generated/prisma/client`
- 2026-02-05: Clerk sign-in/sign-up pages use `[[...sign-in]]` catch-all routes for multi-step auth flows
- 2026-02-06: PDF.js worker served from public/ (copied from node_modules) — webpack can't bundle .mjs worker files
- 2026-02-06: Server-side PDF processing uses `pdfjs-dist/legacy/build/pdf.mjs` (avoids DOMMatrix dependency)
- 2026-02-06: Supabase Storage uses service role key server-side, bucket "documents", path `{userId}/{timestamp}-{fileName}`
- 2026-02-06: @testing-library/react needs explicit cleanup() in vitest setup when globals: true not set
