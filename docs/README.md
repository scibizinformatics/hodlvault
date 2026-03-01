# HodlVault (BCH Chipnet)

HodlVault is a decentralized price-locking application built for the Bitcoin Cash ecosystem. It allows users to lock their BCH until the market value meets their expectations.

## Tech Stack

- **Framework:** Vue.js (using **Options API**)
- **Blockchain:** Bitcoin Cash (BCH)
- **Network:** Chipnet (Testnet)
- **Wallet Provider:** Paytaca SDK
- **Oracle Interface:** Price Feed API (via WebSocket for live updates)
- **Styling:** Responsive CSS (Mobile-first approach)

## Getting Started

1. **Clone the repo:** `git clone [repo-url]`
2. **Install Dependencies:** `npm install`
3. **Environment Setup:** Create a `.env` file and set `VUE_APP_NETWORK=chipnet`.
4. **Run Development Server:** `npm run serve`

## Key Functionalities

- **Live Vault Monitoring:** Real-time updates on transaction status and current BCH price.
- **Paytaca Integration:** Direct interaction with Paytaca for secure HODLing.
- **Responsive Design:** Fully functional across desktop, tablets, and mobile devices.

## Development Standards

- All components must be written using the **Options API**.
- Code must pass `eslint` checks before every commit.
- No manual refreshes: Use reactive observers or WebSockets for live status updates.
