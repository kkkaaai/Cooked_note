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
pnpm run typecheck
```
- Runs `tsc --noEmit` across all workspaces via Turbo
- Catches type errors, missing imports, incorrect function signatures
- **Must pass with zero errors** before moving on

### 2. Unit Tests
```bash
pnpm run test
```
- Runs Vitest across all workspaces (shared + web) via Turbo
- **After implementing a feature, write tests for it** — cover:
  - Utility/library functions (validation, transformations, helpers)
  - API route handlers (request/response, error cases)
  - Zustand stores (state transitions, actions)
  - React components (rendering, user interactions, edge cases)
- Test files live next to the code they test: `foo.ts` → `foo.test.ts`
- **All tests must pass** before moving on

### 3. Build Check (periodic)
```bash
pnpm run build
```
- Run after completing a full feature (not every small change)
- Catches Next.js-specific issues (server/client boundaries, dynamic imports)

### Workflow Summary
```
Implement feature → Write tests → pnpm run typecheck → pnpm run test → (pnpm run build if full feature)
```
If any check fails, fix the issue before continuing to the next task.

### Testing Stack
- **Test Runner**: Vitest (v4+)
- **Component Testing**: @testing-library/react + @testing-library/jest-dom
- **Environment**: jsdom
- **Shared config**: `packages/shared/vitest.config.ts`
- **Web config**: `apps/web/vitest.config.ts`
- **Web setup**: `apps/web/src/test/setup.ts` (loads jest-dom matchers)

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

## File Structure (Turborepo Monorepo)
```
goodnotes-clone/
├── apps/web/                    # Next.js web app
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/sign-in, sign-up
│   │   │   ├── (dashboard)/dashboard, document/[id]
│   │   │   └── api/ (documents, annotations, ai, folders, conversations)
│   │   ├── components/ (ui/, pdf/, ai/, folders/, history/, layout/)
│   │   ├── lib/ (db, auth, pdf, ai, ai-client, annotations, screenshot, storage)
│   │   ├── hooks/ (use-ai-chat, use-keyboard-shortcuts, use-region-select, use-text-selection, use-toast)
│   │   ├── stores/ (folder-store, conversation-store)
│   │   └── middleware.ts
│   ├── prisma/ (schema.prisma, migrations/)
│   ├── public/ (pdf.worker.min.mjs)
│   ├── next.config.mjs, tailwind.config.ts, vitest.config.ts
│   └── package.json (@cookednote/web)
├── packages/shared/             # Cross-platform business logic
│   └── src/
│       ├── types/index.ts       # All TypeScript interfaces and constants
│       ├── stores/              # pdf-store, annotation-store, ai-store (+tests)
│       └── lib/                 # utils (cn), ai-prompts (pure prompt builders)
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.json                # Base TS config
├── package.json                 # Root workspace (cookednote)
├── claude.md
└── commands/, docs/
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
- [x] Build highlight tool UI
- [x] Implement text selection detection
- [x] Create annotation storage
- [x] Add color picker and editing

### Phase 4: AI Integration (Week 3-4)
- [x] Set up Claude API integration
- [x] Implement PDF text extraction
- [x] Build AI sidebar component
- [x] Create context management
- [x] Add streaming responses

### Phase 5: Polish & Testing (Week 4)
- [x] Use Playwright MCP for UX review
- [x] Implement loading states
- [x] Add error handling
- [ ] Optimize performance
- [ ] Deploy to Vercel

### Phase 6: Extended Features
- [x] Folder management system (create, rename, delete, nested, color-coded, drag-and-drop)
- [x] LaTeX math rendering in AI responses (KaTeX + react-markdown + remark-math)
- [x] Conversation persistence & history (save, list, reopen, badges on PDF pages)
- [x] Conversation history page (/dashboard/conversations)
- [x] Mobile responsive fixes for folder sidebar

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
Phase: Monorepo migration — complete
- **Turborepo monorepo**: `apps/web/` (Next.js) + `packages/shared/` (cross-platform logic)
- **Package manager**: pnpm (replaced npm)
- **Shared package** (`@cookednote/shared`): types, stores (pdf, annotation, ai), lib/utils, lib/ai-prompts
- **Import convention**: `@cookednote/shared/types`, `@cookednote/shared/stores/pdf-store`, etc.
- **No build step for shared**: Next.js `transpilePackages` consumes raw TypeScript
- All Phase 1-6 features intact (auth, upload, PDF viewer, highlights, AI, folders, conversations, LaTeX)
- 229 tests passing (105 shared + 124 web) across 19 test files
- Build passes cleanly via `pnpm run build` (Turbo)

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
- 2026-02-06: Annotation positions stored as normalized rects (0-1 range) in `{ rects: [...] }` format for multi-line support
- 2026-02-06: Zustand selector with `.filter()` causes infinite re-renders — get full array from store, filter in component with `useMemo`
- 2026-02-06: react-pdf `<Page>` accepts children rendered inside its `position: relative` container — used for HighlightLayer overlay
- 2026-02-06: `mixBlendMode: "multiply"` gives natural highlighter pen appearance on PDF text
- 2026-02-07: AI streaming uses Anthropic SDK `client.messages.stream()` with SSE format (`data: {"text":"delta"}\n\n`)
- 2026-02-07: Smart context chunking sends target page + adjacent pages within 8000 char budget to Claude
- 2026-02-07: Cross-store coordination (AI ↔ highlight mode) uses callback pattern to avoid circular imports between Zustand stores
- 2026-02-07: `scrollIntoView?.()` with optional chaining needed for jsdom compatibility in tests
- 2026-02-07: AI sidebar uses `next/dynamic` with `ssr: false` (same pattern as PDFCanvas) for client-only rendering
- 2026-02-07: Replaced text-selection AI with screenshot-based AI — draw box on PDF → capture region → send to Claude vision API
- 2026-02-07: Deleted `/api/ai/explain` route — consolidated all AI into `/api/ai/chat` with vision support
- 2026-02-07: Screenshot capture uses canvas `.width`/`.height` (pixel dims, not CSS) for correct DPR handling
- 2026-02-07: Base64 screenshots downscaled to max 1200px longest side to keep API payloads reasonable
- 2026-02-07: Region selection hook uses mousedown/move/up with normalized 0-1 coords, min 10px threshold
- 2026-02-07: `<img>` used for base64 screenshots instead of `next/image` (data URLs can't use next/image optimization)
- 2026-02-07: `@testing-library/react` uses `getByAltText` (not `getByAlt`) for querying by alt attribute
- 2026-02-07: Continuous scroll uses IntersectionObserver for page tracking + virtualization buffer of +/-2 pages
- 2026-02-07: `usePDFStore.setState({ currentPage })` used directly (not `setCurrentPage`) from observer to avoid setting scrollTarget
- 2026-02-07: IntersectionObserver not in jsdom — mock with class (not vi.fn arrow) since it needs `new` constructor
- 2026-02-07: `NodeListOf<Element>` can't be iterated with `for...of` in TS default target — use `Array.from()` first
- 2026-02-08: Folder model uses self-referential relation `@relation("FolderNesting")` for parent/children nesting
- 2026-02-08: Document.folderId uses `onDelete: SetNull` — deleting folder doesn't delete documents
- 2026-02-08: Folder deletion reparents children to parent folder (or root) and moves documents to root
- 2026-02-08: Conversation screenshots stored as JSON string in DB, parsed on client
- 2026-02-08: LaTeX rendering uses `react-markdown` + `remark-math` + `rehype-katex` with `katex/dist/katex.min.css` import
- 2026-02-08: Conversation reopen from history uses query params `?conversation={id}&page={num}` on document URL
- 2026-02-08: Folder sidebar hidden on mobile (`hidden md:block`) — mobile nav uses shorter labels
- 2026-02-08: `prisma db push` used instead of `prisma migrate dev` due to Supabase shadow database limitations
- 2026-02-09: Monorepo migration — Turborepo with pnpm workspaces (`apps/web/` + `packages/shared/`)
- 2026-02-09: Shared package uses subpath exports (`@cookednote/shared/types`, `@cookednote/shared/stores/*`, etc.)
- 2026-02-09: No build step for shared — Next.js `transpilePackages: ["@cookednote/shared"]` consumes raw TS
- 2026-02-09: ai.ts split — pure prompt builders in shared, `getAnthropicClient()` stays in web with re-exports
- 2026-02-09: Prisma stays in `apps/web/` (server-only, can extract to packages/db later)
- 2026-02-09: pnpm requires `onlyBuiltDependencies` in root package.json for native deps (prisma, esbuild, clerk)
- 2026-02-09: Turbo requires `packageManager` field in root package.json
