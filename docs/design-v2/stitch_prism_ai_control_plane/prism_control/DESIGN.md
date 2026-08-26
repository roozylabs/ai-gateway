---
name: Prism Control
colors:
  surface: '#0e1416'
  surface-dim: '#0e1416'
  surface-bright: '#343a3c'
  surface-container-lowest: '#090f11'
  surface-container-low: '#171d1e'
  surface-container: '#1b2122'
  surface-container-high: '#252b2d'
  surface-container-highest: '#303638'
  on-surface: '#dee3e6'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dee3e6'
  inverse-on-surface: '#2b3133'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb873'
  on-tertiary: '#4b2800'
  tertiary-container: '#e89337'
  on-tertiary-container: '#5b3200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#ffb873'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3b00'
  background: '#0e1416'
  on-background: '#dee3e6'
  surface-variant: '#303638'
  bg-base: '#08090A'
  bg-card: '#0F1115'
  bg-elevated: '#14171D'
  border-subtle: '#242832'
  status-healthy: '#10B981'
  status-warning: '#F59E0B'
  status-critical: '#EF4444'
  data-pink: '#EC4899'
typography:
  display-metrics:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
spacing:
  unit: 4px
  gutter: 16px
  margin-page: 24px
  sidebar-expanded: 248px
  sidebar-collapsed: 72px
  row-height-dense: 32px
  row-height-default: 48px
---

## Brand & Style

The design system is an ultra-dense, technical command center for AI infrastructure management. It adopts an **Experimental Brutalist** direction, stripping away decorative gradients and soft edges in favor of a raw, developer-first terminal aesthetic. The visual narrative is built on the concept of "Obsidian Clarity"—using deep black foundations and sharp hairline borders to create a high-contrast environment where operational data is the primary focus.

The atmosphere is one of precision and authority. It avoids the friendly, rounded aesthetic of consumer SaaS, instead opting for a "Control Plane" look that feels like a mission-critical operating system. Every pixel is dedicated to scannability; color is used strictly as a functional signal to highlight system health, cost anomalies, and model performance within a sea of monochrome telemetry.

## Colors

The palette is anchored by `#08090A` (Base) and `#0F1115` (Container), creating a "Dark-First" hierarchy that minimizes eye strain during long monitoring sessions. While the seed color provides a technical cyan for model metadata, the system utilizes **Prism Violet** (`#8B5CF6`) as the primary interactive accent for brand actions and intelligence features.

**Functional Color Logic:**
- **Semantic Signals:** Emerald (`#10B981`) for healthy streams, Amber (`#F59E0B`) for rate-limiting, and Red (`#EF4444`) for circuit-breaker failures.
- **Data Domains:** Cyan is reserved for model parameters and API paths. Pink (`#EC4899`) is used exclusively for financial/token-cost metrics to ensure budgetary data is never confused with system health.
- **Borders:** A single, sharp border color (`#242832`) is used to define the grid, ensuring high-density layouts remain structured without visual noise.

## Typography

This design system uses a dual-font strategy to separate narrative UI from technical data. 
- **JetBrains Mono** is the "Source of Truth" font. It is used for all headlines, metrics, IDs, token counts, and terminal logs. It reinforces the terminal-inspired aesthetic and ensures that numerical data is perfectly aligned in tabular views.
- **Geist** is the "Interface" font. Its clean, geometric sans-serif proportions provide high legibility for body copy, labels, and descriptions, balancing the technicality of the monospaced elements.

For headlines, negative letter-spacing is applied to maintain a compact, "engineered" feel. Labels and status chips use uppercase JetBrains Mono with expanded tracking to ensure maximum character recognition at small sizes.

## Layout & Spacing

The layout philosophy is based on a **Fixed Grid** model optimized for high-density information display. The system prioritizes vertical efficiency, allowing operators to monitor dozens of concurrent streams.

**Key Layout Rules:**
- **Sidebar:** A persistent navigation rail that can collapse from 248px to 72px.
- **The 4px Grid:** All internal padding and component spacing follow a 4px baseline rhythm.
- **Information Density:** Page margins are kept to a strict 24px, while internal card gutters are 16px to maximize the "data-to-ink" ratio.
- **Adaptive Reflow:** On mobile, high-density tables transition to horizontal scroll containers with sticky "ID" columns to maintain context, while dashboard metrics stack into a single column.

## Elevation & Depth

This design system rejects traditional shadows and ambient occlusion. Depth is communicated through **Tonal Layering** and **Bold Outlines**.

- **Level 0 (Canvas):** The base background at `#08090A`.
- **Level 1 (Containers):** Cards and panels use `#0F1115` with a sharp 1px border of `#242832`.
- **Level 2 (Interaction):** Hover states use `#181C23`. Active selections or "pressed" states use `#1C2028`.
- **Level 3 (Overlays):** Modals and dropdowns use `#14171D` with a slightly higher contrast border (`#343A46`). 

No blurs or glassmorphism are permitted. The UI should feel like a solid, physical console made of dark, matte materials. Focus states are indicated by a 1px solid border of the primary accent color rather than a shadow.

## Shapes

The design system strictly adheres to **0px roundedness** (Sharp). This choice reinforces the brutalist, terminal-inspired aesthetic and maximizes screen real estate. Every container, button, input field, and status tag is a perfect rectangle. This architectural rigidity suggests stability, technical precision, and a no-nonsense approach to infrastructure management.

## Components

### Buttons & Inputs
Buttons are strictly rectangular with 1px borders. Primary actions use the seed color or Prism Violet with black text for high legibility. Input fields are dark (`#0B0D10`) with sharp corners and use JetBrains Mono for entered text to emphasize data entry precision.

### Status Chips & Telemetry
Status indicators must pair a semantic color with a 1px border of the same hue at 30% opacity. They use uppercase JetBrains Mono. For example, a "Healthy" tag has a `#10B981` border and text on a dark transparent background.

### Cards & Metrics
Metric cards are border-heavy containers. The primary KPI is displayed in 32px JetBrains Mono. Trend indicators (up/down arrows) are placed inline with the secondary label, never larger than the primary metric.

### Lists & Tables
Tables are the heart of the system. They use horizontal separators only. Every second row uses a subtle `#0B0D10` background (zebra striping) to aid horizontal scanning. Columns containing IDs, Latency, or Costs must use the monospace font and be right-aligned for numerical comparison.

### Prism Auto Badge
Special AI-routed elements are identified by a "Prism Auto" badge which features a subtle, 1px Violet/Cyan dual-border to distinguish automated intelligence from static system configurations.