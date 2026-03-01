# MVP: HodlVault

## Project Vision

HodlVault is a "forced discipline" wallet for Bitcoin Cash (BCH) investors. It prevents impulsive selling by locking funds in a vault that only unlocks when a user-defined price target is reached, verified by a decentralized or centralized oracle.

## Core Features (The "Must-Haves")

1. **Price-Locked Vaults:**
   - Users create a vault and set a "Target Price" (e.g., $1,000 USD/BCH).
   - The system fetches live BCH prices via an Oracle.
   - Withdrawal functionality is disabled/hidden if `Current Price < Target Price`.
2. **Chipnet Integration:**
   - Operates on BCH Chipnet (Testnet) for safe development and testing.
3. **Paytaca Wallet Connection:**
   - Seamless integration with Paytaca for signing transactions.
4. **QR Deposit System:**
   - Generate a unique BCH address/QR code for each vault to allow easy deposits.
5. **Real-time Status Engine:**
   - UI must reflect transaction confirmations and price changes instantly without page refreshes.

## User Stories

- As a user, I want to set a target price so I am not tempted to sell during market dips.
- As a user, I want to see a live "Lock Status" so I know exactly how far I am from my goal.
- As a user, I want to deposit funds simply by scanning a QR code from my Paytaca mobile app.

## Success Metrics

- Zero-refresh data flow (Reactive UI).
- Successful oracle price verification.
- Lint-clean codebase using Options API.
