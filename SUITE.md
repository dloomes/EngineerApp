# Dynamics Platform — Suite Architecture

> **Monorepo root document.** Read this before working on any app in the suite. It describes how apps relate to each other, what they share, and the conventions all apps must follow.

---

## 1. What this platform is

A suite of Progressive Web Apps (PWAs) connecting to Dynamics 365, built for field engineers and office staff at Involve. Apps share a common Dynamics backend proxy, design system, and type library — but are otherwise independent and can be developed and deployed separately.

### Apps in the suite

| App | Status | Audience | Primary device |
|---|---|---|---|
| Installation (`apps/installation/`) | In development | Field engineers | iOS + desktop |
| [Future app 2] | Planned | TBD | TBD |
| [Future app N] | Planned | TBD | TBD |

Each app has its own `SPEC.md`. This document covers only the shared foundations.

---

## 2. Separate from the scheduling platform

This Dynamics platform is a **separate monorepo** from the field engineer scheduling platform (React Native + Next.js + Supabase). The two platforms are independent — they do not share code, infrastructure, or a repository.

If data ever needs to flow between Dynamics and Supabase (e.g. job assignments feeding into the installation app), a dedicated sync layer would be built at that point. Do not build this prematurely.

---

## 3. Dynamics 365 environment

All apps in this suite connect to the same Dynamics environment.

| Item | Value |
|---|---|
| Organisation URL | `https://involveproduction.crm11.dynamics.com` |
| API base URL | `https://involveproduction.crm11.dynamics.com/api/data/v9.2/` |
| Token scope | `https://involveproduction.crm11.dynamics.com/.default` |
| Auth method | S2S — Azure AD App Registration (client credentials) |
| Licence cost | None — single app identity, no per-user licence |

---

## 4. Shared Azure Function proxy (`api/dynamics/`)

All Dynamics API calls from all apps go through a single Azure Function app. No app ever calls Dynamics directly.

**Why shared:**
- Single place to manage the client secret
- Token caching shared across all apps
- New apps add their own function routes without duplicating auth logic

**Structure:**

```
api/dynamics/
  shared/
    dynamicsClient.ts    ← token cache + authenticated fetch wrapper
    types.ts             ← re-exports from packages/shared
  functions/
    installation/        ← routes for the installation app
      getJob/
      getJobLines/
      getSites/
      getRooms/
      createSite/
      updateSite/
      createRoom/
      updateRoom/
      createAsset/
    [future-app]/        ← new apps add routes here
  host.json
  package.json
```

**Token management:**
- Fetch token using client credentials flow against `https://involveproduction.crm11.dynamics.com/.default`
- Cache in memory, refresh 60 seconds before expiry
- Never fetch a new token per request

**CORS:**
- Allow each app's production Static Web Apps domain
- Allow `http://localhost:5173` (and other local ports) during development
- Manage via `ALLOWED_ORIGINS` environment variable (comma-separated list)

**Azure Function Application Settings (never in source control):**
```
DYNAMICS_URL=https://involveproduction.crm11.dynamics.com
TENANT_ID=<azure-ad-tenant-id>
CLIENT_ID=<app-registration-client-id>
CLIENT_SECRET=<app-registration-client-secret>
ALLOWED_ORIGINS=https://app1.azurestaticapps.net,https://app2.azurestaticapps.net
```

---

## 5. Authentication

Single Azure AD App Registration shared across all apps in the suite.

- **Type:** S2S / client credentials (no user login in any app)
- **Permission:** `Dynamics CRM → user_impersonation` (application permission, admin consent granted)
- **Secret:** Stored only in Azure Function Application Settings
- **Application User:** One Application User in Dynamics 365, assigned a security role per app's requirements

Each app's `SPEC.md` defines the specific Dynamics security role privileges it needs. The Application User holds a combined role covering all apps, or separate roles per app — whichever is easier to maintain.

---

## 6. Monorepo structure

```
/                              ← repo root
  apps/
    installation/              ← PWA (React + Vite)
    [future-app-2]/            ← PWA (React + Vite)
  packages/
    shared/                    ← TypeScript types
      src/
        types.ts               ← all Dynamics entity interfaces
        index.ts               ← barrel export
    ui/                        ← shared React component library
      src/
        components/
          Layout/              ← responsive shell + nav
          LookupPanel/         ← bottom sheet (mobile) / side panel (desktop)
          SegmentedControl/
          Scanner/
          WarningBanner/
        lib/
          breakpoints.ts
        index.ts
    config/                    ← shared tsconfig, eslint, vite base config
  api/
    dynamics/                  ← Azure Function proxy
  turbo.json
  package.json
```

### Adding a new app

1. Create `apps/[new-app]/` following the same Vite + React + TypeScript scaffold
2. Add routes to `api/dynamics/functions/[new-app]/`
3. Add Dynamics entity types to `packages/shared/src/types.ts`
4. Add the new app's production domain to `ALLOWED_ORIGINS` in Azure Function settings
5. Create a `SPEC.md` in the app root following the same format as the installation app

---

## 7. Shared types (`packages/shared`)

Single source of truth for all Dynamics entity TypeScript interfaces. Every app and the API proxy imports from here.

All confirmed schema names for entities shared across multiple apps belong here. Entity types used only by one app can live in that app's own `src/types/` as local types — move to shared only when a second app needs them.

Current shared types: see `packages/shared/src/types.ts`.

---

## 8. Shared UI library (`packages/ui`)

All apps in the suite use the same component library. This ensures visual consistency without duplicating code.

### Design tokens

```typescript
// packages/ui/src/lib/tokens.ts
export const colors = {
  primary: '#1F5C9E',
  primaryLight: '#D6E4F3',
  success: '#2D7D3A',
  successLight: '#E8F5EA',
  warning: '#C45C00',
  warningLight: '#FFF3E0',
  error: '#B91C1C',
  errorLight: '#FEE2E2',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  white: '#FFFFFF',
}

export const breakpoints = {
  mobile: 0,
  desktop: 768,   // px
}

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
}

export const radii = {
  sm: 6, md: 8, lg: 12, xl: 16, full: 9999,
}
```

### Typography

Arial throughout. No external font dependencies.

### Touch targets

Minimum 44×44px on all interactive elements — iOS HIG standard, essential for field use.

### Core components

| Component | Purpose |
|---|---|
| `Layout` | Responsive shell — bottom nav (mobile), sidebar (desktop) |
| `LookupPanel` | Bottom sheet (mobile) / side panel (desktop) for lookup fields |
| `SegmentedControl` | Multi-option toggle (e.g. Scan / Manual / None) |
| `Scanner` | Camera viewfinder for barcode/QR scanning |
| `WarningBanner` | Contextual warning (e.g. before writing to Dynamics) |
| `StatusBadge` | Coloured pill for status display |
| `Button` | Primary, outline, destructive variants |
| `FormField` | Label + input + error message wrapper |

---

## 9. Responsive layout system

All apps must work on mobile (primary) and desktop (secondary). Use the shared `Layout` component from `packages/ui` — do not implement responsive logic per-screen.

| Element | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar | Left sidebar (240px) |
| Lookup picker | Bottom sheet | Right panel or inline dropdown |
| Forms | Full width, stacked | Two columns or max-width centred |
| Max content width | 100% | 480px centred for form-heavy screens |

---

## 10. Hosting

All apps hosted on **Azure Static Web Apps** in **UK South** region.

| Resource | Service | Region |
|---|---|---|
| Installation app | Azure Static Web Apps | UK South |
| Dynamics Function proxy | Azure Functions | UK South |
| [Future apps] | Azure Static Web Apps | UK South |

Use UK South for all new Azure resources — consistent region, reasonable latency for UK-based engineers.

---

## 11. Working with Claude Code across the suite

- **Always read `SPEC.md` and `SUITE.md` first** — start every session with: *"Read SPEC.md and SUITE.md before we begin."*
- **One app at a time** — do not make changes to other apps during a focused session
- **Shared code goes in packages** — if a component or type is needed by more than one app, it belongs in `packages/ui` or `packages/shared`
- **Update specs when decisions change** — if architecture changes mid-session, update the relevant SPEC.md in the same session
- **Use confirmed schema names** — all `involve_`, `preact_`, `msdyn_`, and `new_` prefixed names in the installation spec are confirmed. Never revert to placeholders.
- **Client secret never in frontend** — this rule applies to every app in the suite, not just installation
