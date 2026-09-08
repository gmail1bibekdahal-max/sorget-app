# Attributer — Attribution Engine (Phase 1 & 2)

A lightweight, dependency-free browser JavaScript attribution engine with first-touch persistence.

---

## What it does

When a visitor arrives at your website, Attributer:

1. Reads UTM parameters from the URL (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`)
2. Reads `document.referrer`
3. Detects the landing URL and landing page path
4. Classifies the traffic into one of **10 channels**
5. Stores the attribution in browser `localStorage` as **first-touch** data under key `attributer_first_touch`
6. On subsequent visits, returns the original stored attribution — **never overwriting it**
7. Handles corrupted or invalid `localStorage` gracefully by cleaning up and re-initializing valid attribution

---

## Channels

| Channel | Triggered by |
|---|---|
| **Paid Search** | `utm_medium` = `cpc`, `ppc`, `paidsearch`, `paid_search` |
| **Paid Social** | `utm_medium` = `paid_social`, `paidsocial`, `social_paid`, `paid-social` |
| **Email** | `utm_medium` = `email`, `e-mail`, `email_marketing` |
| **Display** | `utm_medium` = `display`, `banner`, `cpm` |
| **Affiliate** | `utm_medium` = `affiliate`, `aff` |
| **Organic Search** | `utm_source` = Google / Bing / Yahoo / DuckDuckGo, OR referrer from a search engine domain |
| **Organic Social** | `utm_source` = Facebook / Instagram / LinkedIn / Twitter / TikTok / YouTube etc., OR social referrer |
| **Referral** | Non-empty referrer that is not a search engine |
| **Direct** | No source, no medium, no referrer |
| **Other** | Anything that doesn't match the above rules |

Classification is **deterministic and priority-ordered**: medium-based rules take precedence over source-based and referrer-based rules.

---

## Project structure

```
attributer/
├── src/
│   ├── attribution.js       # Main engine — initializeAttribution()
│   ├── classifier.js        # Traffic channel classifier
│   └── storage.js           # First-touch localStorage wrapper
├── tests/
│   ├── classifier.test.js   # 46 classification test cases
│   └── persistence.test.js  # 7 first-touch persistence test cases
├── test-site/
│   └── index.html           # Minimal test site
├── package.json
└── README.md
```

---

## Install & run

```bash
npm install
npm run dev
```

Then open: [http://localhost:8080/test-site/](http://localhost:8080/test-site/)

---

## Run tests

```bash
npm test
```

All 53 tests run using Node's built-in `node:test` runner.

---

## First-touch persistence behavior

### Visit 1 — Google Ads
```
URL: ?utm_source=google&utm_medium=cpc&utm_campaign=summer
Stored: { channel: "Paid Search", source: "google", medium: "cpc", campaign: "summer" }
```

### Visit 2 — Direct
```
URL: /test-site/
Returned: { channel: "Paid Search", ... }  ← original, not overwritten
```

### Visit 3 — LinkedIn
```
URL: ?utm_source=linkedin
Returned: { channel: "Paid Search", ... }  ← still the original Paid Search
```

To clear first-touch in development:
```javascript
import { clearFirstTouch } from "./src/storage.js";
clearFirstTouch();
```
(Or in the browser console on the test site: `clearFirstTouch()`)

---

## JavaScript API

```javascript
import { initializeAttribution, getAttribution, getStoredAttribution } from "./src/attribution.js";
import { clearFirstTouch } from "./src/storage.js";

// Initialize (call on page load):
const attribution = initializeAttribution();
// → Returns first-touch attribution. Detects and stores on first visit.
//   Returns stored data on subsequent visits without overwriting.

// Read current URL attribution without touching storage:
const current = getAttribution();

// Read stored data without detecting:
const stored = getStoredAttribution();

// Clear stored attribution (for testing):
clearFirstTouch();
```

---

## Known limitations (Phase 2)

- **Browser-only**: Runs in the browser. No server-side component.
- **Single touch**: Only first-touch attribution is stored. Last-touch and multi-touch are out of scope for Phase 2.
- **Per-domain**: `localStorage` is domain-scoped; no cross-domain tracking.
- **Anonymous visitors**: No identity resolution or backend database.
