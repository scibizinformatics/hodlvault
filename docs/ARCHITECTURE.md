# System Architecture: HodlVault

## 1. High-Level Overview

HodlVault operates as a client-side application that interacts with the BCH Chipnet blockchain and an external Price Oracle. The logic layer ensures that the "Withdraw" action is only authorized when the Oracle data satisfies the Vault's conditions.

## 2. Component Structure (Vue.js Options API)

- **App.vue:** Main layout and global state (Price/Wallet connection).
- **VaultDashboard.vue:** Handles the logic for displaying vault balances and target price comparisons.
- **DepositModule.vue:** Generates QR codes and listens for incoming transactions.
- **WithdrawModule.vue:** Contains the conditional logic for unlocking funds based on Oracle data.

## 3. Data Flow & Real-time Updates

To achieve a "no-refresh" experience, the system utilizes:

- **WebSockets (Price):** Connects to a price feed (e.g., Coinbase or similar) to stream live BCH/USD rates.
- **Blockchain Listeners:** Uses a block explorer API or library to monitor the vault address for incoming Chipnet BCH. When a transaction is detected, the UI updates the "Balance" state immediately.
- **Reactive State:** Vue’s reactivity system monitors the `currentPrice` vs `targetPrice` variables to toggle the UI state (Locked/Unlocked) instantly.

## 4. Security & Integration

- **Wallet:** The system does not store private keys. It delegates all signing to the **Paytaca Wallet**.
- **Oracle:** The "Unlock" button is gated by a computed property that validates the current price against the user's stored target.
- **Network:** Strictly configured for `Chipnet` to prevent accidental loss of mainnet funds.

## 5. Linting & Quality Control

- Strict ESLint configuration to ensure code consistency.
- Standardized naming conventions for methods and data properties within the Options API structure.
