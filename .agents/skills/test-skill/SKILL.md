---
name: test-skill
description: Comprehensive testing, QA verification, edge-case validation, and automated test suite design for web applications.
metadata:
  author: qa-engineering
  version: 1.0.0
---

# UI Testing, Verification & QA Skill

Comprehensive runbook for planning, executing, and automating unit, integration, and user-journey acceptance tests for web applications.

## Testing Taxonomy

1. **Unit Testing**: Pure logic functions, calculation algorithms, currency formatting, date/time helpers.
2. **Component Testing**: Interactive states, conditional rendering, loading skeletons, error alerts.
3. **End-to-End Acceptance Testing**: Full user flows (creating session -> adding friends -> placing orders -> OCR scanning -> splitting bill -> password authentication).
4. **Visual & Responsive Testing**: Verifying layout across iPhone (393px), tablet (768px), and desktop viewports.

---

## 1. MEss Functional QA Checklist

### A. Session Lifecycle
- [ ] Create session with creator password and verify it opens immediately (`/session/[id]`).
- [ ] Check creator auth key saved in `localStorage` (`mess_auth_<id>`).
- [ ] Confirm read-only mode for non-creators: modification buttons locked, read-only banner visible.
- [ ] Unlock session using creator password and ensure immediate write capabilities.

### B. Order Placement & Item Assignment
- [ ] Add individual drinks and food items (manual entry and AI receipt scanner).
- [ ] Assign quantities to individual participants; verify unassigned counter decrements to 0.
- [ ] Test shared food items split evenly among all participants or a selected subset.
- [ ] Test weight/grammage items (price 0 DT) and verify price update flow.

### C. Bill Calculation & Tip Distribution
- [ ] Verify arithmetic: $\sum \text{Individual Bills} = \text{Total Consumed}$.
- [ ] Test fixed tip presets (1 DT, 2 DT, 3 DT, 5 DT, 10 DT) and custom tip inputs.
- [ ] Verify tip distribution among selected participants (All / None / Specific friends).
- [ ] Test WhatsApp / SMS summary text generator formatting and copy-to-clipboard behavior.

### D. Multilingual & RTL Verification
- [ ] Toggle between **FR** (Français), **AR** (العربية), and **EN** (English).
- [ ] Verify `dir="rtl"` is properly set on `<html>` for Arabic with reversed layout indicators.
- [ ] Ensure currency format (`DT` / `د.ت`) displays without numbers flipping incorrectly.

---

## 2. Test Execution Command Guide

```bash
# Run unit tests
npm test

# Run Playwright end-to-end tests
npx playwright test

# Run TypeScript compile validation
npm run build
```

## 3. QA Reporting Template
```markdown
### QA Test Report: [Feature Name]
- **Status**: PASSED / FAILED / BLOCKED
- **Test Scenarios**:
  1. [Scenario 1]: Expected vs Actual
  2. [Scenario 2]: Edge case handling
- **Regressions Found**: None / Details
- **Next Actions**: Production ready
```
