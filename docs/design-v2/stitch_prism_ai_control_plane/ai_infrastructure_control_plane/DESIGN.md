---
name: AI Infrastructure Control Plane
colors:
  surface: '#15121b'
  surface-dim: '#15121b'
  surface-bright: '#3b3742'
  surface-container-lowest: '#0f0d15'
  surface-container-low: '#1d1a23'
  surface-container: '#211e27'
  surface-container-high: '#2c2832'
  surface-container-highest: '#37333d'
  on-surface: '#e7e0ed'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e7e0ed'
  inverse-on-surface: '#322f39'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb869'
  on-tertiary: '#482900'
  tertiary-container: '#ca801e'
  on-tertiary-container: '#3f2300'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#15121b'
  on-background: '#e7e0ed'
  surface-variant: '#37333d'
  bg-base: '#08090A'
  bg-card: '#0F1115'
  bg-hover: '#181C23'
  border-subtle: '#1B1F27'
  border-default: '#242832'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '450'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid-unit: 4px
  margin-sm: 12px
  margin-md: 20px
  gutter: 16px
  sidebar-width: 248px
---

# RoozyLabs Prism — Design System

> **AI Infrastructure Control Plane**
> A high-density, dark-first design system for operating AI gateways, models, credentials, agents, routing, governance, and infrastructure.

---

## 1. Design Direction
- **Technical & Premium**: Feels like a cloud console or developer tool (AWS, Cloudflare, Datadog).
- **High Density**: 60-70% info density. Minimal whitespace, maximum scannability.
- **Precision**: 4px grid, sharp edges (6px radius), subtle borders.

## 2. Color System (Dark-First)
- `prism-bg-base`: `#08090A` (Deepest black)
- `prism-bg-card`: `#0F1115` (Slightly lighter surface)
- `prism-bg-hover`: `#181C23`
- `border-subtle`: `#1B1F27`
- `border-default`: `#242832`
- `prism-violet`: `#8B5CF6` (Signature intelligence accent)
- `prism-cyan`: `#06B6D4` (Supporting tech accent)

## 3. Typography
- **UI Text**: Inter (clean, readable)
- **Data & Metrics**: JetBrains Mono (monospaced for IDs, costs, latency, code)

## 4. Components
- **Sidebar**: 248px width, dark-tinted active states with violet indicator.
- **Cards**: Flat, subtle borders, no shadows, 8px radius.
- **Tables**: Dense (48px row height), monospace metrics, sticky headers.
- **Status Icons**: Dot + Label (● Healthy, ● Degraded).

## 5. Navigation Hierarchy
1. **CORE**: Dashboard
2. **AI INFRASTRUCTURE**: Providers, Credentials, Models, Routing
3. **GATEWAYS**: Tool, Resource, MCP, Agent
4. **GOVERNANCE**: Policies, Audit Trail
5. **OPERATIONS**: Logs, Budgets, Playground
