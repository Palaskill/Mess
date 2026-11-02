---
name: web-design-guidelines
description: Review and enforce Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check site against best practices".
metadata:
  author: vercel
  version: 1.0.0
---

# Web Interface Guidelines & Design Audit

Audit user interface source code against modern Web Interface Guidelines, accessibility (WCAG AA/AAA), visual balance, responsive ergonomics, and touch friendliness.

## Core Audit Principles

### 1. Typography & Hierarchy
- **Scale Consistency**: Restrict type sizes to a standard modular scale (e.g., `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px)).
- **Font Weight Purpose**:
  - `font-black` / `font-extrabold`: Key screen titles, financial grand totals, brand marks.
  - `font-bold`: Section titles, card headers, primary button labels.
  - `font-semibold` / `font-medium`: Badges, metadata, secondary buttons.
  - `font-normal`: Body copy, descriptions, helper text.
- **Tabular Figures**: Always apply tabular numbers (`tabular-nums` / `font-mono`) to currency values, timers, counters, and quantity counts to prevent layout jitter during updates.

### 2. Spacing, Alignment & Grid
- **8pt Grid Discipline**: Spacings, margins, paddings, and heights must adhere strictly to multiples of 4px/8px (`p-2`, `p-3`, `p-4`, `p-6`, `gap-2`, `gap-3`, `gap-4`).
- **Responsive Layout**:
  - Mobile: Full width with safe inset margins (`px-4`, `max-w-xl mx-auto`).
  - Tablet/Desktop: Grid columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- **Border Radius**:
  - Small pills/badges: `rounded-full` or `rounded-xl` (12px).
  - Cards & containers: `rounded-2xl` (16px) or `rounded-3xl` (24px).
  - Modals & bottom sheets: `rounded-t-3xl sm:rounded-3xl` (24-32px).

### 3. Touch Ergonomics & Mobile (iPhone / Android)
- **Minimum Tap Target**: Interactive controls (buttons, icon buttons, inputs, pills, cards) must have an active hit target of at least **44×44px** (Apple HIG) or **48×48px** (Material Design).
- **Touch Manipulation**: Apply `touch-manipulation` to interactive elements to eliminate the 300ms tap delay on mobile WebKit/Blink browsers.
- **Safe Area Insets**: Always incorporate `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for fixed headers, floating action buttons (FABs), and bottom sheets.
- **Active State Feedback**: Include tactile feedback like `active:scale-95` or `active:scale-[0.98]` and smooth transitions (`transition-all duration-200`).

### 4. Accessibility (WCAG 2.1 AA/AAA)
- **Contrast Ratios**:
  - Normal text: Minimum 4.5:1 against the background.
  - Large text / Badges: Minimum 3:1.
  - Slate dark backgrounds (`bg-slate-900` / `bg-slate-800`): Use `text-white`, `text-slate-200`, or `text-slate-300` for primary content; avoid faint grays (`text-slate-500` on dark) for readable text.
- **Icon-Only Buttons**: Always provide explicit `aria-label` or `title` on buttons without visible text (e.g., `<button aria-label="Supprimer la commande"> <Trash2 /> </button>`).
- **Modals & Dialogs**:
  - Set `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  - Include an accessible close button with `aria-label="Fermer"`.
  - Trap or control scrolling on mobile when open.
- **Internationalization & RTL**:
  - Support Right-to-Left languages (e.g. Arabic) by pairing directional classes (`rtl:rotate-180`, `ltr:right-0 rtl:left-0`).

### 5. Review Format
When auditing code, output concise findings in the standard format:
```text
path/to/file.tsx:<line> - [Issue Type]: Description and actionable fix.
```
