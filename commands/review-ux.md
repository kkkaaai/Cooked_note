# Review UX Command

---

description: Use Playwright MCP to test and review a user flow or feature for UX issues

argument-hint: Feature/flow name | Specific aspects to test

---

## Context

Parse $ARGUMENTS to get:

- [feature]: Feature or flow name
- [aspects]: Specific aspects to test

## Task

Use Playwright MCP to systematically test and review UX:

### 1. Pre-Test Setup
- Ensure dev server is running (http://localhost:3000)
- Identify URL to test
- List expected user interactions

### 2. Test Scenarios

#### A. Happy Path
- Primary user flow works as expected
- All buttons/controls functional
- Navigation works
- Data persists

#### B. Loading States
- Skeleton screens or spinners appear
- No layout shift when content loads
- User understands something is happening

#### C. Error Handling
- Invalid inputs show helpful messages
- Network failures handled gracefully
- User can recover from errors

#### D. Edge Cases
- Empty states (no data yet)
- Maximum data (full lists, long text)
- Slow connections
- Rapid clicking/interactions

#### E. Accessibility
- Keyboard navigation works
- Focus indicators visible
- ARIA labels present
- Color contrast sufficient

#### F. Visual Polish
- Animations smooth (no jank)
- Spacing consistent
- Hover states clear
- Active states visible

### 3. Playwright Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('[Feature] UX Review', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/[route]');
  });

  test('happy path: [describe flow]', async ({ page }) => {
    await page.click('[data-testid="action-button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });

  test('loading state appears and disappears', async ({ page }) => {
    await page.click('[data-testid="load-data"]');
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading"]')).toBeHidden();
  });

  test('error handling with invalid input', async ({ page }) => {
    await page.fill('[data-testid="input"]', 'invalid');
    await page.click('[data-testid="submit"]');
    await expect(page.locator('[data-testid="error"]')).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'first-button');
  });
});
```

### 4. Review Report Format
```markdown
## UX Review: [Feature]

**Test Date**: [Date]
**Test URL**: [URL]
**Tests Run**: X passed, Y failed

### Happy Path ✅
- User can [action] successfully
- Data persists correctly

### Issues Found 🐛

#### HIGH: Loading state missing on PDF upload
- **Location**: DocumentUpload component
- **Issue**: No feedback during upload
- **Recommendation**: Add progress bar
- **Code**: Add `useUploadProgress` hook

#### MEDIUM: Error message not helpful
- **Location**: Form validation
- **Issue**: Shows "Error" instead of specific issue
- **Recommendation**: Show "Please upload a PDF file under 50MB"

### Accessibility ♿
- ✅ Keyboard navigation works
- ⚠️ Missing aria-label on close button
- ⚠️ Color contrast low on disabled state

### Performance ⚡
- Initial load: 1.2s (Good)
- Time to interactive: 1.8s (Good)

### Next Steps
1. Fix HIGH severity issues
2. Add missing loading states
3. Improve error messages
```

## Example

Input: `/review-ux pdf-upload | Test loading states and error handling`

Output: Runs Playwright tests, focuses on loading and error scenarios, provides detailed UX review report with findings and recommendations
