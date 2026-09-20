# Buyology Dashboard

The admin and supplier console for **Buyology** — orders, suppliers, catalogue,
fulfilment, procurement, repairs and support, in one React + Tailwind app.

## Brand

The UI follows the Buyology Brand Identity Guidelines:

| Role | Colour | Hex | Tailwind token |
| --- | --- | --- | --- |
| Primary | Mikado Yellow | `#FFBE12` | `buyology-yellow-500` |
| Secondary | American Blue | `#402F75` | `buyology-600` / `brand-600` |
| Tertiary | Black / White | `#000000` / `#FFFFFF` | `black` / `white` |

The published tints of each colour are available as `mikado-tint-1…4` and
`american-tint-1…4`. Tagline: **Buy the why**.

Logo assets live in [`public/images/logo/`](./public/images/logo/):

- `buyology-wordmark-light.png` — black wordmark, for light theme
- `buyology-wordmark-dark.png` — white wordmark, for dark theme
- `buyology-mark.svg` — the B-wave logomark, traced from the guidelines' vector

Use the [`BuyologyLogo`](./src/components/common/BuyologyLogo.tsx) components
(`BuyologyLockup`, `BuyologyMark`, `BuyologyWave`) rather than referencing the
files directly — the lockup handles the theme swap, which is required because
the black wordmark is unreadable on a dark ground and the white one vanishes on
a light one.

Typography is **Raleway** across both headings and body. This matches the
v2 storefront and supersedes the guidelines' Biennale/Manrope pairing.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev      # vite dev server
npm run build    # typecheck + production build
npm run lint
```

Copy `.env.example` to `.env` and fill in the API base URL before running.

## Project layout

```
src/
  api/          service clients, grouped per backend domain
  auth/         role helpers driving sidebar + route visibility
  components/   UI primitives, charts, tables, forms
  context/      sidebar, theme and auth providers
  icons/        SVG icon set
  layout/       AppLayout / AppHeader / AppSidebar shell
  pages/        routed screens
```

Further notes: [`MODULES_DOCUMENTATION.md`](./MODULES_DOCUMENTATION.md) and
[`SERVICES_LIST.md`](./SERVICES_LIST.md).

## Credits

Built on the [TailAdmin React](https://tailadmin.com) free dashboard template,
used under the MIT licence — see [`LICENSE.md`](./LICENSE.md). All Buyology
branding, product code and integrations are © Buyology.
