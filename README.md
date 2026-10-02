# Ushawama

**Your phone is a cross-border trade station.** Speak it, list cargo, match
verified trucks, clear customs, and release escrow payment — in English or
Swahili, on Android or iOS.

Built for East African cross-border commerce: Kampala ⇄ Nairobi, Mbale ⇄ Kitale,
Mombasa ⇄ Kampala. Priced in USD, UGX, KES, TZS, RWF.

![Expo](https://img.shields.io/badge/Expo-~52.0-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Why this exists

A small trader at the border holds three things against them: a cargo manifest
nobody can read, a phone number for a truck that may not exist, and an escrow
they cannot verify. Paper forms, agent fees, and waiting.

Ushawama turns all of that into one voice conversation.

## What works today

| Module | What it does |
|---|---|
| **Voice-first NLU** | Push-to-talk capture, English + Swahili. Parses intent and slots from an utterance. Falls back to a built-in regex parser when no LLM key is set, so it works **offline**. |
| **Trucking match engine** | Matches cargo to verified trucks across EAC corridors by route, capacity, and border point. |
| **Trade listings** | Cross-border listings with HS codes, tradable in USD/UGX/KES/TZS/RWF. |
| **Customs duty calculator** | EAC Common External Tariff lookup by HS chapter and code, with per-country VAT. |
| **Escrow payments** | Hold, release, refund — with a transaction ledger. |
| **Live tracking** | Shipment pings and progress against a corridor. |
| **Market status** | Cached market snapshot so the app still reads on a dead connection. |

## Quick start

```bash
git clone https://github.com/ceasar-enterprises/ushawama.git
cd ushawama
npm install

cp .env.example .env      # then set EXPO_PUBLIC_USHAWAMA_API to your LAN IP
```

### Run the API

```bash
npm run api               # http://localhost:4000
```

Verify it:

```bash
curl http://localhost:4000/api/market/health
```

### Run the app

```bash
npm start                 # then press a / i / w
```

Windows users can run `run-demo.bat`, which starts both the API and Expo web
with one click.

> **Phones need your LAN IP, not `localhost`.** Find it with `ipconfig` and put
> it in `EXPO_PUBLIC_USHAWAMA_API` (for example `http://192.168.0.10:4000`). Both
> devices must be on the same Wi-Fi.

## Configuration

Everything is optional — the app runs with sensible defaults and degrades
gracefully.

| Variable | Default | Notes |
|---|---|---|
| `EXPO_PUBLIC_USHAWAMA_API` | — | Required for a real device. |
| `SPINE_PROVIDER` | `gemini` | Or `ollama`. |
| `GEMINI_API_KEY` | — | Absent ⇒ regex parser fallback. |
| `OLLAMA_URL` | `http://localhost:11434` | For fully local NLU. |
| `NEBULA_ENABLED` | `false` | Corridor event bridge, see below. |
| `NEBULA_API_BASE` | `https://localhost:8080` | |
| `NEBULA_API_KEY` | — | Required when the bridge is enabled. |
| `NEBULA_TLS_INSECURE` | `false` | Allow self-signed certs (local dev only). |

## Corridor event bridge (optional)

Ushawama can forward escrow and tracking events to the **NEBULA** automation
engine over HTTP, so background work is queued in NEBULA's job system rather
than inside the app.

This is an **adapter at the boundary** — Ushawama talks to NEBULA over the
network and never imports, vendors, or bundles NEBULA code. NEBULA itself is
closed source and licensed separately; this repository contains no NEBULA
source.

```bash
NEBULA_ENABLED=true
NEBULA_API_BASE=https://your-nebula-host:8080
NEBULA_API_KEY=...
```

With the bridge off (the default), everything in the table above still works
standalone.

## Security notes

- **No key is required to run.** With no `GEMINI_API_KEY`, voice input falls
  back to the offline regex parser. Nothing phones home.
- **TLS verification is on by default.** `NEBULA_TLS_INSECURE=true` disables
  certificate verification and exists only for a local self-signed NEBULA. Do
  not set it against a remote host.
- **`.env` is git-ignored.** Use `.env.example` as the template. No key, token,
  or certificate is committed to this repository.
- **All data in this repository is synthetic seed data** — driver names,
  vehicle plates, and phone numbers are fabricated demo records, not real
  carriers or customers. Runtime state (`data/`) is git-ignored and recreated
  on first write; every loader falls back to an empty state when a file is
  missing, so a fresh clone runs clean.
- **One outbound dependency:** HS classification queries the public
  `hscodeatlas.com` and `hs.datahub.io` services for a live tariff lookup and
  falls back to the bundled EAC table when they are unreachable. Only the
  product description is sent. The tests stub this out.
- **MoMo is a stub.** The escrow flow models the ledger and state machine; it
  does not move real money and is not connected to a payment provider.

## Scripts

| Command | Does |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` / `npm run web` | Platform targets |
| `npm run api` | Express API on `:4000` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |

## Project layout

```
App.tsx              root component + tab navigator
src/
  theme.ts           colours, spacing, type scale
  api/               Express API
    server.js        app wiring, CORS, JSON limits, route mounting
    routes/          duty, voice, trade, payment, tracking, market
    spine.js         LLM spine caller (Gemini / Ollama)
    transcribe.js    speech-to-text
    momo.js          MoMo payment client (stub)
    nebula.js        optional corridor event bridge
    client.ts        typed API client used by the app
  core/              shared domain logic
    hs-codes.js      EAC tariff table + HS classification
    duty-calculator.js  duty, VAT, NTB and landed-cost maths
    hs.ts, duty.ts   typed wrappers
    typography.ts    text styles
  screens/           16 Expo screens
  components/        shared UI (Button, Card, ProgressBar, IOSTabBar, ...)
  trade/             listings engine + hook
  trucking/          truck/cargo match engine + hook
  payment/           escrow engine + hook
  ops/               shipment operations engine + hook
  market/            market status hook
  voice/             voice engine, hook, and VoiceBar
  literacy/          literacy course engine (5 levels, 4 languages)
tests/               node:test suites for the core engines
data/                runtime state (git-ignored, auto-recreated)
```

## Tests

```bash
npm test
```

32 tests cover the duty calculator (regimes, STR thresholds, VAT bases,
certificate of origin, SPS), the HS code table (88 chapters, local lookup and
search), and the literacy engine (level structure, translations, progress
persistence, voice prompts). The suites are hermetic — the HS service's network
calls are stubbed, so no test touches the internet.

## Status

Active development. The engines, duty tables, and match logic are working and
tested; escrow is modelled but not yet wired to a live payment provider, and
push notifications are not implemented.

## Licence

MIT — see [LICENSE](LICENSE).

Copyright (c) 2026 Ceasar Enterprises.
