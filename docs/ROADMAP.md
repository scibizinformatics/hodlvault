# HodlVault Development Roadmap

This roadmap outlines the path from a Chipnet prototype to a feature-complete, real-time HODL application.

## Phase 1: Foundation & Wallet Integration (Week 1)

_Goal: Establish the UI skeleton and connect to the BCH network._

- [ ] **Project Scaffolding:** Set up Vue.js project using **Options API** and ESLint.
- [ ] **Responsive Layout:** Build the mobile-first CSS shell (Header, Vault Card, Footer).
- [ ] **Paytaca Connection:** Implement Paytaca SDK to allow users to connect their Chipnet wallets.
- [ ] **Network Check:** Add logic to ensure the user is on **Chipnet** (preventing Mainnet errors).

## Phase 2: The Vault & Oracle Logic (Week 2)

_Goal: Implement the core "Lock" functionality._

- [ ] **Vault Creation UI:** Forms to set "Target Price" and "Vault Name."
- [ ] **Price Oracle Integration:** Connect to a price feed API to fetch live BCH/USD rates.
- [ ] **Locking Mechanism:**
  - Create a computed property to compare `Target Price` vs. `Current Price`.
  - Disable "Withdraw" buttons if the condition is not met.
- [ ] **QR Deposit System:** Integrate a QR code generator library to display the vault's BCH address.

## Phase 3: Real-Time Engine (Week 3)

_Goal: Eliminate page refreshes and provide live feedback._

- [ ] **WebSocket Integration:** Replace standard API polling with WebSockets for live price updates.
- [ ] **Transaction Listeners:** Implement a listener that detects incoming BCH deposits on Chipnet and updates the balance instantly.
- [ ] **Live Status UI:**
  - Add a "Sending..." and "Confirmed" status indicator for withdrawals.
  - Animate price changes (green/red flashes) to show live data flow.

## Phase 4: Hardening & Linting (Week 4)

_Goal: Code quality and final polish._

- [ ] **Linting Sweep:** Run `eslint --fix` and resolve all remaining architectural warnings.
- [ ] **Error Handling:** Add "Toast" notifications for failed transactions or Oracle timeouts.
- [ ] **Cross-Device Testing:** Ensure the responsive design works on iOS, Android, and Desktop browsers.
- [ ] **Final MVP Review:** Verify the system logic: _Can funds be withdrawn if the price is below target?_ (Should be: NO).

## Future Ideas (Post-MVP)

- **Multi-Vaults:** Allow users to have multiple HODL goals at once.
- **Time-Lock + Price-Lock:** Add an option to lock until a date OR a price.
- **Mainnet Migration:** Prepare the system for real BCH value once Chipnet testing is 100% stable.
