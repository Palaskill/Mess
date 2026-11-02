---
name: playwright-cli
description: Automate browser interactions, take token-efficient accessibility snapshots, test web pages, and manage Playwright end-to-end test suites.
metadata:
  author: microsoft
  version: 1.0.0
---

# Playwright CLI & Browser Automation Skill

Token-efficient browser automation, page snapshot inspection, interaction execution, and automated testing for modern web applications.

## Key Capabilities

1. **Snapshot-Based Navigation**: Instead of streaming heavy raw DOM trees into context, take compact accessibility snapshots that assign terse references (`e1`, `e2`, `e5`) to interactive elements.
2. **Session Persistence**: Preserve browser cookies, auth headers, and `localStorage` states across multi-step user journeys.
3. **Responsive Emulation**: Emulate mobile viewports (e.g., iPhone 15 Pro, 393×852, DPR 3, touch events) to verify mobile layouts.

---

## 1. Quick Start & Common Workflow

```bash
# 1. Launch a browser session and navigate to target URL
playwright-cli open http://localhost:3000

# 2. Take a snapshot to discover element references
playwright-cli snapshot

# Output example:
# [e1] button "Nouvelle Session"
# [e2] button "FR | عربي | EN"
# [e3] input "Nom de la session"

# 3. Interact using snapshot references
playwright-cli click e1
playwright-cli fill e3 "Soirée Vendredi"
playwright-cli click e4

# 4. Take another snapshot to verify UI update
playwright-cli snapshot

# 5. Close session when complete
playwright-cli close
```

---

## 2. Core CLI Commands

- `playwright-cli open [url]` — Launches a browser instance (defaults to Chromium).
- `playwright-cli goto <url>` — Navigates current page to a URL.
- `playwright-cli snapshot` — Prints concise accessibility tree with element references.
- `playwright-cli click <ref>` — Clicks the targeted element.
- `playwright-cli fill <ref> <text>` — Clears and fills an input or textarea.
- `playwright-cli type <text>` — Types characters into the focused element.
- `playwright-cli press <key>` — Dispatches a keyboard event (`Enter`, `Escape`, `Tab`).
- `playwright-cli screenshot [path]` — Captures a full-page or viewport screenshot.
- `playwright-cli evaluate "<code>"` — Executes an inline JavaScript snippet in the page context.
- `playwright-cli close` — Closes current browser session.

---

## 3. End-to-End Test Automation (Playwright Tests)

### Running Test Suites
```bash
npx playwright test
npx playwright test --project=mobile-safari
npx playwright test --ui
```

### Best Practices for Writing Resilient Tests
1. **User-Facing Locators**: Prefer `getByRole('button', { name: ... })`, `getByLabel(...)`, and `getByText(...)` over brittle CSS/XPath selectors.
2. **Web-First Assertions**: Use `expect(locator).toBeVisible()` or `expect(locator).toHaveText(...)` which automatically wait and retry.
3. **Avoid Hardcoded Sleeps**: Never use arbitrary delays (`waitForTimeout`). Rely on auto-waiting locators and event promises.
