# Installation App — Technical Specification

> **For use with Claude Code.** Save this file as `SPEC.md` in the root of the `installation` app. Reference it at the start of every build session with: "Read SPEC.md before we begin." See `SUITE.md` at the monorepo root for how this app fits into the wider Dynamics platform.

---

## 1. Overview

A mobile-and-desktop Progressive Web App (PWA) for field engineers to use during equipment installations. The app retrieves job details from Dynamics 365 and allows engineers to convert installed products into Customer Asset records — capturing location, room, and serial number per asset.

The app is **responsive** — designed to work on iOS (primary), and desktop browsers (secondary). See section 11 for responsive layout patterns.

**No user login is required.** Authentication with Dynamics 365 uses Server-to-Server (S2S) via an Azure AD App Registration. All Dynamics API calls are proxied through an Azure Function that holds the client secret. The frontend never handles credentials.

---

## 2. Architecture

```
iOS / Desktop Browser (PWA)
      │
      │  HTTPS
      ▼
Azure Function App  (api/dynamics/)
      │  client_credentials token
      ▼
Dynamics 365 Web API
https://involveproduction.crm11.dynamics.com/api/data/v9.2/
```

### Components

| Component | Technology | Location in monorepo |
|---|---|---|
| Frontend | React + TypeScript + Vite | `apps/installation/` |
| API proxy | Azure Functions (Node.js) | `api/dynamics/` |
| Auth | Azure AD App Registration (S2S) | Azure portal |
| Data | Dynamics 365 Web API (OData) | `involveproduction.crm11.dynamics.com` |
| Hosting | Azure Static Web Apps | UK South region |
| Scanning | @zxing/browser | Frontend dependency |
| Shared types | packages/shared | Dynamics types alongside existing types |

### Why S2S (no user login)?

- No Dynamics 365 licence consumed per engineer
- App is unaffected by individual user account changes, password resets, or staff turnover
- Engineers open the app and it works — no authentication step to forget or fail in the field
- Engineer activity is tracked externally (not via Dynamics audit log)

---

## 3. Confirmed Dynamics environment

All schema names below are confirmed. Do not use placeholders — use these exact values throughout.

| Item | Value |
|---|---|
| Organisation URL | `https://involveproduction.crm11.dynamics.com` |
| API base URL | `https://involveproduction.crm11.dynamics.com/api/data/v9.2/` |
| Token scope | `https://involveproduction.crm11.dynamics.com/.default` |
| Job reference field (Opportunity) | `preact_involvereference` |
| Location entity (Account Sites) | `involve_accountsites` |
| Location ID field | `involve_accountsiteid` |
| Location name field | `involve_name` |
| Location → Account link | `involve_AssociatedAccount` |
| Room entity (Functional Location) | `msdyn_functionallocations` |
| Room ID field | `msdyn_functionallocationid` |
| Room name field | `msdyn_name` |
| Room → Location link | `new_AssociatedSite` |
| Customer Asset entity | `msdyn_customerassets` |
| Asset → Location link | `new_AssociatedSite` (lookup logical name `new_associatedsite`) |
| Asset → Room link | `involve_msdyn_FunctionalLocation` (lookup logical name `involve_msdyn_functionallocation`) |

---

## 4. Shared TypeScript types

Add to `packages/shared/src/types.ts`. Do not modify or remove any existing types — add Dynamics types alongside them.

```typescript
// ─── Dynamics 365 entities — Installation App ────────────────────────────────

export interface DynamicsAccount {
  accountid: string;
  name: string;
}

export interface DynamicsOpportunity {
  opportunityid: string;
  name: string;
  _parentaccountid_value: string;
  preact_involvereference: string;
  // Populated by the proxy via $expand=parentaccountid on getJob —
  // gives the UI the customer name without a second round trip.
  parentaccountid?: DynamicsAccount;
  // ISO date string. Applied uniformly to every asset in the batch as
  // involve_purchasedate on the Customer Asset record. (Schema retains the
  // Involve-org spelling "porecieved".)
  involve_porecieved?: string;
}

export interface DynamicsOpportunityProduct {
  opportunityproductid: string;
  productname: string;
  quantity: number;
  priceperunit: number;
  // Null for write-in lines (free-text products not linked to the catalog).
  _productid_value?: string;
  // Optional — non-physical lines (labour, delivery, etc.) won't have these.
  preact_manufacturer?: string;
  preact_model?: string;
  // Classification used by the proxy to filter out non-equipment lines.
  preact_phase?: string;
}

export interface DynamicsAccountSite {
  involve_accountsiteid: string;
  involve_name: string;
  _involve_associatedaccount_value: string;
}

export interface DynamicsFunctionalLocation {
  msdyn_functionallocationid: string;
  msdyn_name: string;
  _new_associatedsite_value: string;
}

export interface DynamicsCustomerAsset {
  msdyn_customerassetid: string;
  msdyn_name: string;
  preact_serialnumber?: string;
  // ISO date string. Custom field added to Customer Asset (added after the
  // original SPEC — the entity had no install date out of the box).
  involve_installdate?: string;
  // Lookup back to the opportunity product this asset was created from.
  // Lets the app tell which lines are already installed on revisits.
  _involve_opportunityproduct_value?: string;
}

// Returned by GET /api/jobs/{id}/lines — opportunity products augmented with
// per-line install counts (from existing Customer Assets that link back via
// involve_OpportunityProduct).
export interface OpportunityLineSummary extends DynamicsOpportunityProduct {
  installedCount: number;
}
```

---

## 5. Environment configuration

```env
# apps/installation/.env.local  (never commit)
VITE_API_BASE_URL=https://<your-function-app>.azurewebsites.net/api
VITE_USE_MOCK=false   # set to true during development without live Dynamics

# api/dynamics/ — Azure Function Application Settings (never in source control)
DYNAMICS_URL=https://involveproduction.crm11.dynamics.com
TENANT_ID=<azure-ad-tenant-id>
CLIENT_ID=<app-registration-client-id>
CLIENT_SECRET=<app-registration-client-secret>
ALLOWED_ORIGIN=https://<your-static-web-app>.azurestaticapps.net
```

> **Security rule:** The client secret lives only in Azure Function Application Settings. It must never appear in frontend code, committed `.env` files, or API responses. The frontend only ever calls `VITE_API_BASE_URL`.

---

## 6. Azure AD App Registration setup

1. Create a new App Registration in Azure AD
2. Under **API permissions**, add `Dynamics CRM → user_impersonation` as an **application permission** and grant admin consent
3. Create a **Client secret** — copy the value immediately (shown once only)
4. In Dynamics 365, create an **Application User**:
   - Settings → Security → Users → switch to Application Users view
   - New → set Application ID to the App Registration Client ID
   - Assign the **"Installation App — S2S"** security role (see section 10)

---

## 7. Screen flow

### Screen 1 — Job lookup

- Single input for job reference number (`preact_involvereference`)
- Recent jobs listed below — store last 10 in `localStorage` (keyed by reference, storing customer name)
- On submit: call `GET /api/jobs/{ref}`
- If no match: show a clear error — **do not offer a manual fallback**. All valid jobs exist in Dynamics having completed the internal kick-off process
- On success: navigate to Screen 2

### Screen 2 — Opportunity lines

- Header: opportunity name, customer name
- List all Equipment-phase opportunity product lines (`opportunityproducts`, filtered by `preact_phase eq 'Equipment'`)
- Each line: checkbox (default selected for lines with units still to install), product name, quantity, unit price
- **Already-installed tracking** — the proxy includes an `installedCount` per line. Lines with `installedCount < quantity` show "M of N installed · K remaining". Fully-installed lines show "All N installed", are disabled, and unchecked
- **Quantity expansion** — selecting a line contributes `quantity − installedCount` *slots* to the per-product loop. A line with quantity 5 and installedCount 2 produces 3 slots
- Footer CTA: "Continue with N assets →" (note: counts asset slots, not lines)
- On continue: navigate to Screen 3, passing the expanded slot list as `selectedLines`

### Screen 3 — Location & room

Location and room are picked **once for the whole batch** of selected products — engineers shouldn't re-pick the same site for every item. The per-product loop on Screen 4 then only asks for serial number + date.

**Fields:**

| Field | Type | Behaviour |
|---|---|---|
| Customer | Display only | Pre-filled from Opportunity. Not editable. |
| Location | Lookup → `involve_accountsites` | Filtered to sites linked to the customer via `involve_AssociatedAccount`. Searchable panel. Add new / edit existing inline. |
| Room | Lookup → `msdyn_functionallocations` | Filtered to rooms linked to the selected location via `new_AssociatedSite`. Disabled until location chosen. Add new / edit existing inline. |

**Location lookup behaviour:**
- Opens as a bottom sheet (mobile) / side panel (desktop)
- Real-time search filters `involve_name`
- "Add [typed text] as a location" appears when search has no exact match
- Selected location shows edit (pencil) icon — opens edit form pre-populated
- Create → POST, Edit → PATCH (never creates a duplicate)

**Room lookup behaviour:**
- Identical pattern to location
- Always filtered by `new_AssociatedSite eq '{locationid}'` — never shows rooms from other sites
- Disabled and greyed out until a location is selected
- Changing the location clears the room selection (room is bound to a specific site)

**Inline create / edit:**
- Warning banner: "This will create/update a record in Dynamics 365 against [Customer name]"
- Location form: Name (required), no additional fields required
- Room form: Name (required), no additional fields required
- Save: PATCH existing (`involve_name` / `msdyn_name`), POST for new
- Cancel returns to lookup without changes

**Validation & navigation:**
- Continue → disabled until both Location and Room are set
- On Continue: navigate to Screen 4 starting at index 0
- When reached via the "Change" link from Screen 4 mid-flow (with assets already saved), Continue resumes at the next un-saved product

### Screen 4 — Asset details (repeats per selected product)

Header: `[Product name] · [N] of [Total]`

A summary band beneath the header shows the chosen Location · Room with a **Change** link that returns to Screen 3 (pre-filled with the current selections; already-saved assets are preserved and the loop resumes from the current product on return).

A prominent product-identity card sits above the serial number section showing `preact_manufacturer` and `preact_model` (when present), with the full `productname` underneath as supporting text. This is what the engineer matches against the unit in their hand. Lines without manufacturer/model (labour, delivery) hide the card entirely.

**Fields:**

| Field | Type | Behaviour |
|---|---|---|
| Customer | Display only | Pre-filled from Opportunity. Not editable. |
| Serial number | Segmented control | Scan / Manual / None |
| Install date | Date picker | Defaults to today; written to `involve_installdate` on the Customer Asset |

**Serial number modes:**
- **Scan:** `@zxing/browser` `BrowserMultiFormatReader` via `decodeFromVideoDevice`, rear camera, supports barcode and QR. Shows viewfinder UI. On scan, populates value and shows confirmation.
- **Manual:** Plain text input
- **None:** `"N/A"` is sent for `preact_serialnumber` — the schema requires the field. (Earlier versions of the spec said omit entirely; that fails against real Dynamics where the field is `ApplicationRequired`.)

**Validation:**
- Serial number required if mode is Scan or Manual (None is auto-filled with `"N/A"`)
- Install date required (defaults to today, so always populated)
- "Save & next →" POSTs the asset then advances to next product (or Screen 5 if last)
- On the final product the button label flips to "Save & finish →"

### Screen 5 — Confirmation

- **Heading:** reflects mixed state
  - All succeeded → "N assets created" (green)
  - All failed → "N assets failed" (red)
  - Mixed → "X created, Y failed" (amber)
- Subheading: opportunity name
- List of all selected products with per-asset status badges:
  - **Created** (green) — shows scanned/typed serial below the name (omitted when serial is `"N/A"`) and a "View in Dynamics 365 →" link
  - **Failed** (red) — shows the error message inline plus a **Retry** button that re-POSTs the same input. On success the entry flips to Created without leaving the screen
- "View in Dynamics 365 →" deep link: `https://involveproduction.crm11.dynamics.com/main.aspx?appid={appid}&forceUCI=1&pagetype=entityrecord&etn=msdyn_customerasset&id={id}`
  - `appid` is hardcoded to the model-driven app the engineer expects (currently `b55f4427-c566-ea11-a811-00224801bc51`); without it the link opens a default app and may show the wrong form. Move to a `VITE_DYNAMICS_APP_ID` env var if the app ever varies per environment
- "Back to jobs" returns to Screen 1 and clears current job state

**Per-asset failure flow** (Screens 4 + 5 together):

On Screen 4, if the POST fails the engineer sees the error inline with two choices:
- **Try again** — re-POSTs the same input from Screen 4 (e.g. for a transient network error)
- **Skip & next** (or **Skip & finish** on the last product) — records a `failed` result and advances the loop, so one bad write doesn't strand the rest of the batch

The full results array — both successes and failures — flows into Screen 5 where the engineer can retry failures individually. This means a session with 10 products and 2 failures still gets 8 assets saved in one pass.

---

## 8. Mock data mode

Set `VITE_USE_MOCK=true` to develop without a live Dynamics connection. The API client checks this flag and returns fixture data instead of calling the proxy.

Create fixtures in `src/api/mock/` using the confirmed schema names:

```typescript
// mock/jobs.ts — example
export const mockJob: DynamicsOpportunity = {
  opportunityid: 'opp-001',
  name: 'Involve Demo Installation',
  _parentaccountid_value: 'acc-001',
  preact_involvereference: 'INV-2025-001',
};
```

Fixtures needed:
- `jobs.ts` — one opportunity + 3–4 opportunity lines
- `locations.ts` — 3 Account Sites for the mock account
- `rooms.ts` — 2–3 Functional Locations per site

---

## 9. Dynamics 365 API endpoints

All calls made by the Azure Function proxy. The frontend calls the proxy — **never Dynamics directly.**

Base URL: `https://involveproduction.crm11.dynamics.com/api/data/v9.2/`

### 9.1 Look up opportunity by job reference

```
GET /opportunities
  ?$filter=preact_involvereference eq '{ref}'
  &$select=opportunityid,name,_parentaccountid_value,preact_involvereference,involve_porecieved
  &$expand=parentaccountid($select=accountid,name)
  &$top=1
```

The `$expand` brings the customer (account) name back in the same request so screens can display it without a follow-up `/accounts/{id}` fetch. The expanded property name `parentaccountid` matches the lookup attribute name and is the standard navigation property for opportunity → parent account.

### 9.2 Get opportunity lines

```
GET /opportunityproducts
  ?$filter=_opportunityid_value eq '{opportunityid}' and preact_phase eq 'Equipment'
  &$select=opportunityproductid,productname,quantity,priceperunit,_productid_value,preact_manufacturer,preact_model,preact_phase

  + parallel:

GET /msdyn_customerassets
  ?$filter=_involve_opportunityproduct_value eq {oppProductId1} or _involve_opportunityproduct_value eq {oppProductId2} ...
  &$select=_involve_opportunityproduct_value
```

The proxy combines these into `OpportunityLineSummary[]` — each line gets an `installedCount` from the second query. The asset query is **fail-soft**: if `involve_OpportunityProduct` doesn't exist yet (or the query errors), all counts default to 0 and the lines still return.

`preact_manufacturer` and `preact_model` are text fields directly on the `opportunityproducts` entity (not the related `products` record, so no `$expand` needed). Both are optional — non-physical lines (labour, delivery) typically have neither.

`preact_phase` classifies each line. The proxy filters to `'Equipment'` only — Customer Assets are only created for physical equipment, so labour/delivery/service lines never reach the app. If `preact_phase` is an option set in this org rather than a text field, swap `'Equipment'` for the integer option-set value.

### 9.3 Get Account Sites for a customer

```
GET /involve_accountsites
  ?$filter=_involve_associatedaccount_value eq '{accountid}'
  &$select=involve_accountsiteid,involve_name
  &$orderby=involve_name asc
```

### 9.4 Get Functional Locations for a site

```
GET /msdyn_functionallocations
  ?$filter=_new_associatedsite_value eq '{involve_accountsiteid}'
  &$select=msdyn_functionallocationid,msdyn_name
  &$orderby=msdyn_name asc
```

### 9.5 Create a new Account Site

```
POST /involve_accountsites
{
  "involve_name": "Site name",
  "involve_AssociatedAccount@odata.bind": "/accounts('{accountid}')"
}
```

### 9.6 Edit an existing Account Site name

```
PATCH /involve_accountsites('{involve_accountsiteid}')
{ "involve_name": "Updated name" }
```

### 9.7 Create a new Functional Location

```
POST /msdyn_functionallocations
{
  "msdyn_name": "Room name",
  "new_AssociatedSite@odata.bind": "/involve_accountsites('{involve_accountsiteid}')"
}
```

### 9.8 Edit an existing Functional Location name

```
PATCH /msdyn_functionallocations('{msdyn_functionallocationid}')
{ "msdyn_name": "Updated name" }
```

### 9.9 Create a Customer Asset

```
POST /msdyn_customerassets
{
  "msdyn_name": "Product name",
  "msdyn_product@odata.bind": "/products('{productid}')",
  "msdyn_account@odata.bind": "/accounts('{accountid}')",
  "new_AssociatedSite@odata.bind": "/involve_accountsites('{involve_accountsiteid}')",
  "involve_msdyn_FunctionalLocation@odata.bind": "/msdyn_functionallocations('{msdyn_functionallocationid}')",
  "preact_serialnumber": "ABC123",
  "involve_manufacturer": "Sony",
  "involve_assetmodelcode": "BRAVIA FW-75BZ40H",
  "involve_asset_check": false,
  "involve_installdate": "2026-05-22",
  "involve_OpportunityProduct@odata.bind": "/opportunityproducts('{opportunityproductid}')",
  "involve_cost": 2200,
  "involve_purchasedate": "2025-04-15"
}
```

Additional optional payload fields beyond the schema-required ones:
- `involve_cost` — copied from the opportunity line's `priceperunit` so finance reports tie back to what the customer was charged for that unit
- `involve_purchasedate` — copied from the opportunity's `involve_porecieved`. Same value across every asset in a single install session, applied automatically on the proxy from the opportunity context

**Required fields** (all marked `ApplicationRequired` in the entity schema):
- `msdyn_name`, `msdyn_account`, `involve_msdyn_FunctionalLocation`
- `preact_serialnumber` — when serial mode is "None", send `"N/A"` (cannot be null/empty)
- `involve_manufacturer` and `involve_assetmodelcode` — sourced from the opportunity product's `preact_manufacturer` and `preact_model`
- `involve_asset_check` (Boolean) — defaults to `false` for newly-installed assets

**Optional:**
- `msdyn_product@odata.bind` — omit entirely when the opportunity line is a write-in (no `_productid_value`). The asset still gets the line's name via `msdyn_name`.
- `new_AssociatedSite@odata.bind` — not schema-required, but app-enforced via the LocationStep.

> Verify navigation property names via `/EntityDefinitions(LogicalName='msdyn_customerasset')?$expand=ManyToOneRelationships` — casing varies per relationship.

---

## 10. Azure Function proxy

Located at `api/dynamics/`. Serves the installation app now and any future Dynamics platform apps.

### Token fetch (client credentials flow)

```
POST https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token
  grant_type=client_credentials
  &client_id={CLIENT_ID}
  &client_secret={CLIENT_SECRET}
  &scope=https://involveproduction.crm11.dynamics.com/.default
```

- Cache token in memory
- Refresh 60 seconds before expiry (tokens valid ~60 minutes)
- Never fetch a new token per request

### Function routes

| Method | Route | Action |
|---|---|---|
| GET | `/api/jobs/{ref}` | Look up opportunity by `preact_involvereference` |
| GET | `/api/jobs/{opportunityId}/lines` | Get opportunity product lines |
| GET | `/api/accounts/{accountId}/sites` | Get Account Sites for a customer |
| GET | `/api/sites/{siteId}/rooms` | Get Functional Locations for a site |
| POST | `/api/sites` | Create Account Site |
| PATCH | `/api/sites/{siteId}` | Edit Account Site name |
| POST | `/api/rooms` | Create Functional Location |
| PATCH | `/api/rooms/{roomId}` | Edit Functional Location name |
| POST | `/api/assets` | Create Customer Asset |

### CORS

Allow only:
- Production: Azure Static Web Apps domain (set via `ALLOWED_ORIGIN`)
- Development: `http://localhost:5173`

---

## 11. Responsive layout

The app must work on iOS (primary) and desktop browsers (secondary). Use a single responsive layout system — do not build separate mobile and desktop codebases.

### Breakpoints

```typescript
// src/lib/breakpoints.ts
export const breakpoints = {
  mobile: 0,
  desktop: 768,  // px
}
```

### Layout patterns

| Pattern | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar | Left sidebar (240px) |
| Lookup picker | Bottom sheet (slides up) | Right panel or inline dropdown |
| Asset details form | Full width, stacked | Two columns: form left, summary right |
| Job list | Full width cards | List/detail split |
| Max content width | 100% | 480px centred (for form-heavy screens) |

### Implementation

Use CSS media queries or a `useBreakpoint` hook. Keep layout logic in a `Layout` wrapper component — screens should not contain responsive logic themselves.

```tsx
// src/components/Layout/index.tsx
// Renders bottom nav on mobile, sidebar on desktop
// Wraps all screens
```

---

## 12. Dynamics 365 security role

Create a dedicated role named **"Installation App — S2S"**. Assign only the minimum privileges required:

| Entity | Display name | Privileges |
|---|---|---|
| `opportunities` | Opportunity | Read |
| `opportunityproducts` | Opportunity Product | Read |
| `accounts` | Account | Read, Append To |
| `products` | Product | Read, Append To |
| `involve_accountsites` | Account Site | Read, Create, Write, Append, Append To |
| `msdyn_functionallocations` | Functional Location | Read, Create, Write, Append, Append To |
| `msdyn_customerassets` | Customer Asset | Read, Create, Write, Append |
| `asyncoperation` | System Job | Read |

**Why the Append privileges:** when the app POSTs a record with `@odata.bind` to another entity (Asset → Account, Asset → Account Site, Asset → Functional Location, etc.), Dynamics requires `Append` on the source entity and `Append To` on the target. Without these, saves fail with `prvAppendTo<Entity>` 403 errors.

**Why System Job (asyncoperation) Read:** if any Power Automate flow, plugin, or workflow is attached to Customer Asset create in your environment, Dynamics reads a System Job record as part of the side-effect. Without Read on `asyncoperation` the save fails with `prvReadAsyncOperation` 403 *after* the asset has technically been written — duplicate retries will fail differently.

Do not reuse an existing role. Keeping this isolated makes permissions easy to audit and adjust.

---

## 13. PWA configuration

### Manifest (`apps/installation/public/manifest.json`)

```json
{
  "name": "Installation App",
  "short_name": "Installations",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1F5C9E",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service worker

Implement for:
- **Offline detection:** Banner when connectivity lost
- **Request queuing:** Failed asset POST calls queued in IndexedDB, retried on reconnect
- **App shell caching:** Loads instantly on repeat visits

### iOS install prompt

iOS does not support the standard install API. On first visit (check `localStorage` flag), show a dismissable one-time banner:
> *"For the best experience, tap the Share button and select 'Add to Home Screen'."*

---

## 14. Folder structure

```
apps/installation/
  public/
    manifest.json
    icon-192.png
    icon-512.png
    sw.js
  src/
    api/
      client.ts              ← fetch wrapper (checks VITE_USE_MOCK)
      jobs.ts
      sites.ts               ← Account Sites
      rooms.ts               ← Functional Locations
      assets.ts
      mock/
        jobs.ts
        sites.ts
        rooms.ts
    components/
      Layout/                ← responsive shell, nav
      LookupPanel/           ← shared by Site and Room lookups (sheet/panel)
      SegmentedControl/
      Scanner/
      WarningBanner/
    screens/
      JobLookup/
      OpportunityLines/
      LocationStep/          ← location + room once for the whole batch
      AssetDetails/          ← per-product loop: serial + date
      Confirmation/
    hooks/
      useScanner.ts
      useOfflineQueue.ts
      useBreakpoint.ts
    lib/
      breakpoints.ts
    types/                   ← import from packages/shared only
    main.tsx
    App.tsx
  index.html
  vite.config.ts
  tsconfig.json

api/dynamics/
  shared/
    dynamicsClient.ts        ← token cache + authenticated fetch
    types.ts                 ← imports from packages/shared
  functions/
    getJob/
    getJobLines/
    getSites/
    getRooms/
    createSite/
    updateSite/
    createRoom/
    updateRoom/
    createAsset/
  host.json
  package.json
```

---

## 15. Tech stack

| Package | Purpose |
|---|---|
| react ^18 | UI framework |
| typescript ^5 | Type safety |
| vite ^5 | Build tool and dev server |
| react-router-dom ^6 | Client-side routing |
| @zxing/browser ^0.1.x | Barcode and QR scanning |
| @azure/functions ^4 | Azure Function runtime |

Keep dependencies minimal. Do not introduce a UI component library — build from scratch per the design system in `SUITE.md`.

---

## 16. Suggested build order for Claude Code sessions

Complete each step fully before starting the next.

1. **Monorepo scaffold** — Turborepo config, TypeScript inheritance, shared types with confirmed schema names
2. **Azure Function scaffold** — all routes stubbed, Dynamics client with token caching, CORS
3. **Mock data** — fixture files using confirmed schema names, `VITE_USE_MOCK` wired into API client
4. **App shell** — Vite + React, routing, responsive layout component, PWA manifest, service worker stub
5. **Job lookup screen** — input, recent jobs (localStorage), API call, error state
6. **Opportunity lines screen** — list, checkboxes, selection state, continue CTA
7. **Site lookup** — `LookupPanel` component, search, select, add new, edit existing
8. **Room lookup** — same `LookupPanel` component, filtered by selected site
9. **Location step + asset details screen** — `/location` picks site + room once for the batch; `/asset/:index` is a per-product loop with just serial + date and a "Change" link back to `/location` that resumes at the current product
10. **Barcode scanner** — `@zxing/browser`, segmented control, scan / manual / none
11. **Asset creation** — POST per product, handle success and failure per asset
12. **Confirmation screen** — status list, retry failed, Dynamics deep link
13. **Offline queue** — IndexedDB, retry on reconnect, service worker caching
14. **Responsive polish** — desktop layout, sidebar nav, panel lookups, safe area insets

---

## 17. Key rules — enforce throughout every session

- **Client secret never in frontend** — always proxy through Azure Function
- **Room lookup always filtered by `new_AssociatedSite`** — never show rooms from other sites
- **Edit uses PATCH, not POST** — never create a duplicate site or room
- **Serial number "None" omits the field entirely** — do not send null or empty string
- **Job not found = hard error** — no manual fallback; all valid jobs exist in Dynamics
- **Touch targets minimum 44×44pt** — essential for field use on iOS
- **All schema names are confirmed** — use exact values from section 3, never placeholders
