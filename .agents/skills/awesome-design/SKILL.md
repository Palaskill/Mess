---
name: awesome-design
description: Design systems, micro-interactions, aesthetic styling, color harmonies, and modern UI component patterns for premium web applications.
metadata:
  author: community
  version: 1.0.0
---

# Awesome Design System & Premium UI Patterns

Comprehensive guide for crafting distinctive, polished, world-class user interfaces that avoid generic boilerplate aesthetics.

## Design Philosophy

1. **Intention over Default**: Reject plain stock templates and uninspired defaults. Choose deliberate typography pairings, nuanced elevations, and cohesive color schemes tailored to the brand domain.
2. **Atmospheric Lighting & Depth**: Use layered translucency (`backdrop-blur-md`), subtle perimeter highlights (`ring-1 ring-white/10`), and radial spotlight gradients rather than harsh flat borders.
3. **Fluid Micro-Interactions**: Interface elements should react organically to interaction—subtle hover elevations, tactile `active:scale-[0.98]` depressions, and spring-eased transitions.

---

## 1. Color Harmony & Surface Palette

### Dark Mode Elevation Palette (Slate / Obsidian)
- **Base Background**: `bg-slate-950` (#020617) or deep obsidian `bg-zinc-950`.
- **Primary Card Surface**: `bg-slate-900/90` with border `border-slate-800/80`.
- **Secondary Card Surface**: `bg-slate-800/70` with border `border-slate-700/60`.
- **Elevated Modals / Popovers**: `bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl`.
- **Spotlight Glow Overlays**: `rgba(59, 130, 246, 0.15)` for primary actions; `rgba(16, 185, 129, 0.15)` for financial/success states; `rgba(245, 158, 11, 0.15)` for alerts/food sharing.

### Semantic Accents
- **Primary Action (Electric Blue)**: `bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 text-white`.
- **Success / Money / Totals (Emerald)**: `bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`.
- **Warm / Social / Food (Amber / Sunset)**: `bg-amber-500/15 text-amber-300 border border-amber-500/30`.
- **Destructive / Closes (Rose)**: `bg-rose-500/15 text-rose-400 border border-rose-500/30`.

---

## 2. Micro-Interactions & Motion Design

### GSAP & CSS Transition Hierarchy
- **Staggered Page / Card Entrances**:
  ```ts
  gsap.fromTo(
    '.card-item',
    { y: 16, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity,transform' }
  );
  ```
- **Interactive Pill Sliding Controls**:
  - Use absolute positioned pills inside relative parent containers.
  - Smooth transform easing: `transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`.
  - Handle RTL translations dynamically: `isRTL ? -100% : 100%`.
- **Button Feedback**:
  - `transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer`.

---

## 3. High-Conversion Mobile Patterns

### Segmented Controls (iOS Style)
- Container: `relative grid p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-inner`.
- Sliding Indicator: `absolute rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md ring-1 ring-white/20`.

### Bottom Sheet Modals
- Grab handle: `w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden`.
- Backdrop: `bg-black/85 backdrop-blur-sm animate-fade-in`.
- Content Container: `rounded-t-3xl sm:rounded-3xl max-h-[85dvh] overscroll-contain pb-[max(6rem,env(safe-area-inset-bottom))]`.

### Spotlight Glow Cards
- Use radial gradients centered on cursor/touch coordinates to illuminate borders and surfaces dynamically.
