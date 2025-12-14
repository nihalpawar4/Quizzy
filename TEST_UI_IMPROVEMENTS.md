# Test Interface Mobile Optimization - TODO

## Current Issues to Fix:
1. **Mobile Layout** - Test interface not responsive on mobile
2. **Fixed Header** - Header should be sticky/fixed at top
3. **Scrollable Questions** - Questions area needs independent scroll
4. **Submit Button Position** - Should be in top-right corner
5. **Review Before Submit** - Show summary modal before final submit
6. **Anti-Cheat Improvements** - Strengthen copy/paste prevention

## Proposed Changes:

### 1. Layout Structure
```tsx
<div className="min-h-screen flex flex-col">
  {/* FIXED HEADER */}
  <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-4">
        <h1>{test.title}</h1>
        <Timer />
      </div>
      <button>Submit</button> {/* Top right */}
    </div>
  </header>

  {/* SCROLLABLE CONTENT */}
  <main className="flex-1 overflow-y-auto p-4">
    <QuestionCard />
  </main>

  {/* FIXED FOOTER NAVIGATION */}
  <footer className="sticky bottom-0 bg-white dark:bg-gray-900 border-t p-4">
    <div className="flex justify-between">
      <button>Previous</button>
      <span>Question {current}/{total}</span>
      <button>Next</button>
    </div>
  </footer>
</div>
```

### 2. Submit Review Modal
```tsx
<ReviewModal>
  <h2>Review Your Test</h2>
  <Stats>
    - Attempted: X/{total}
    - Unattempted: Y
    - Time Remaining: Z
  </Stats>
  <QuestionGrid>
    {/* Show all questions with status */}
  </QuestionGrid>
  <Actions>
    <button>Go Back</button>
    <button>Submit Test</button>
  </Actions>
</ReviewModal>
```

### 3. Mobile Responsiveness
- Touch-friendly buttons (min 44px height)
- Proper spacing for thumb zones
- Readable text sizes on small screens
- Prevent accidental taps
- Swipe gestures for next/previous

### 4. Anti-Cheat Enhancements
- Better clipboard event handling
- Prevent text selection with CSS
- Blur detection
- Focus loss tracking
- Screenshot detection (if possible)

## Implementation Priority:
1. ✅ Fixed header with submit button
2. ✅ Review modal before submit
3. ✅ Mobile-responsive layout
4. ✅ Scrollable question area
5. ✅ Enhanced anti-cheat

## Files to Modify:
- `/src/app/test/[id]/page.tsx` (main test page - 1206 lines)

## Status:
- 📋 Documented
- ⏸️ Implementation pending (large file, needs careful refactoring)

Due to the file size (1206 lines) and complexity, this requires a focused session for complete implementation. Current commit includes documentation and preparation.
