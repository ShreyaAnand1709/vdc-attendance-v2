---
name: Academic Excellence System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424752'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#727783'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db7'
  primary: '#004d99'
  on-primary: '#ffffff'
  primary-container: '#1565c0'
  on-primary-container: '#dae5ff'
  inverse-primary: '#a9c7ff'
  secondary: '#00629d'
  on-secondary: '#ffffff'
  secondary-container: '#4fafff'
  on-secondary-container: '#004069'
  tertiary: '#005c15'
  on-tertiary: '#ffffff'
  tertiary-container: '#25752b'
  on-tertiary-container: '#a5f99e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a9c7ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#00468c'
  secondary-fixed: '#cfe5ff'
  secondary-fixed-dim: '#99cbff'
  on-secondary-fixed: '#001d34'
  on-secondary-fixed-variant: '#004a78'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 57px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  margin-mobile: 16px
  margin-tablet: 24px
  margin-desktop: 32px
  gutter: 16px
  touch-target: 48px
---

## Brand & Style

The design system is engineered for educators, balancing the rigorous demands of academic administration with a premium, approachable interface. It adopts a **Modern Corporate** aesthetic with a strong emphasis on **Minimalism**, ensuring that high-density information remains legible and stress-free.

The visual narrative focuses on trust, stability, and clarity. By utilizing expansive whitespace and a structured information hierarchy, the design system transforms complex teacher workflows into a streamlined, professional experience. The interface feels like a high-end productivity tool—evoking the reliability of Google Workspace with the thoughtful, refined touch of a specialized academic instrument.

## Colors

This design system utilizes a sophisticated palette rooted in academic tradition. The **Primary Royal Blue** provides a sense of authority and institutional trust, while the **Sky Blue secondary** acts as a fresh accent for interactive elements and highlighting.

The background is a purposeful **Cool Grey-White (#F8FAFC)**, which reduces eye strain during long grading sessions and creates a subtle contrast with the pure **White (#FFFFFF) surfaces** of cards and modals. Semantic colors for Success, Warning, and Error are saturated enough to ensure immediate recognition while maintaining a professional tone that avoids looking "alarming."

## Typography

The system relies exclusively on **Inter** to provide a highly readable, systematic, and utilitarian feel. The hierarchy is intentionally "top-heavy," using bold, large headlines to ground the user within deep navigational stacks.

Key principles:
- **Scalability:** Large headings should collapse gracefully on mobile devices.
- **Data Density:** `body-md` is the workhorse for student lists and gradebooks, providing a balance between legibility and information density.
- **Emphasis:** Use `title-md` for interactive labels and card headers to differentiate them from static body text.

## Layout & Spacing

This design system follows a **Fluid Grid** model based on an 8px square system. On mobile devices, a 4-column layout is used with 16px side margins. Tablet and desktop layouts scale to 12 columns, allowing for side-by-side viewports (e.g., student list on the left, profile on the right).

Spacing rules:
- **Touch Targets:** All interactive elements (buttons, checkboxes, chips) must maintain a minimum 48x48dp tap area to ensure accessibility for teachers on the move.
- **Padding:** Use consistent inner padding for cards (24px) to create a spacious, "premium" feel.
- **Rhythm:** Vertical spacing between related groups should be 24px, while internal element spacing should be 8px or 16px.

## Elevation & Depth

To maintain a clean and professional look, the design system utilizes **Tonal Layers** supplemented by **Ambient Shadows**. Instead of heavy, dark shadows, use soft, diffused blurs with a slight blue tint (`#1565C0` at 4-8% opacity) to ground elements.

- **Level 0 (Background):** #F8FAFC. No shadow.
- **Level 1 (Cards/Surface):** #FFFFFF. 4px blur, 2px offset, 5% opacity blue-tinted shadow.
- **Level 2 (Modals/Floating Action Buttons):** #FFFFFF. 12px blur, 6px offset, 8% opacity blue-tinted shadow.

Navigation bars and app bars should use a subtle 1px border (`#E2E8F0`) instead of a shadow when scrolled to maintain a flat, modern profile.

## Shapes

The shape language is defined by **Softness and Approachability**. While standard buttons use an 8px radius, primary containers and cards use a more generous 16px to 24px radius to feel modern and friendly.

- **Small Components:** 8px (Buttons, Input Fields, Tooltips)
- **Medium Components:** 16px (Cards, Dialogs, Bottom Sheets)
- **Large Components:** 28px or Full Circle (FABs, Chips, Avatars)

## Components

### Buttons
- **Primary:** Filled with Primary Blue, 8px radius, All-caps or Title Case with 500 weight.
- **Secondary:** Outlined with Primary Blue, no fill, 1px stroke.
- **Tertiary:** Text only, used for "Cancel" or "Dismiss" actions.

### Input Fields
- **Style:** Outlined Material Design style.
- **Corners:** 8px roundedness.
- **State:** Active state uses 2px Primary Blue border. Error state uses Crimson Red.

### Cards
- **Style:** White background, 16px to 24px radius. 
- **Content:** Headline (Title-lg) followed by Body-md. Padding should be a consistent 24px on all sides.

### Chips
- **Usage:** Subject tags, student status (Present/Absent).
- **Style:** Pill-shaped, light Sky Blue background for active states, Neutral Grey for inactive.

### Lists
- **Item Height:** Minimum 72dp for items with subtext.
- **Dividers:** 1px width, #E2E8F0 color. Use only between distinct content groups, not every single item.

### Floating Action Button (FAB)
- **Style:** Large, Rounded-square (28px radius).
- **Color:** Primary Blue background with White icon.
- **Role:** High-frequency actions like "Add Attendance" or "New Note."