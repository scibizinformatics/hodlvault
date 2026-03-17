# System Architecture: HodlVault

## 1. High-Level Overview

HodlVault operates as a client-side application that interacts with the BCH Chipnet blockchain and the Oracles.cash price oracle service. The system uses CashScript smart contracts to create price-locked vaults that only release funds when predefined price targets are met. The logic layer ensures that withdrawal actions are only authorized when the oracle data satisfies the vault's conditions, with optional auto-withdrawal capabilities.

## 2. Component Structure (Vue 3 + Quasar v2)

- **App.vue:** Main application component with dark mode configuration
- **MainLayout.vue:** Layout wrapper with header, wallet connection UI, and footer
- **VaultPage.vue:** Main vault interface handling creation, deposits, withdrawals, and auto-withdrawal
- **IndexPage.vue:** Landing page with hero section and wallet connection prompts
- **ErrorNotFound.vue:** 404 error page

## 3. Service Layer Architecture

### Core Services

- **oracle.js:** Fetches BCH price data from Oracles.cash service with CoinGecko fallback
- **blockchain.js:** CashScript contract operations, address calculation, and withdrawal logic
- **simple-withdrawal.js:** Basic withdrawal functionality
- **auto-withdrawal.js:** Automated withdrawal service with price monitoring
- **pre-signing.js:** Pre-signing transactions for auto-withdrawal

### Wallet Integration Services

- **paytaca-compat.js:** Paytaca wallet compatibility layer
- **paytaca-recovery.js:** Recovery mechanisms for failed transactions
- **paytaca-alternatives.js:** Alternative signing strategies
- **direct-signing.js:** Direct wallet signing methods
- **ultimate-withdrawal-solutions.js:** Fallback withdrawal strategies

## 4. Data Flow & Real-time Updates

- **Oracle Price Fetching:** Periodic polling of Oracles.cash for live BCH/USD rates
- **Blockchain Monitoring:** Balance polling for vault address transactions
- **Reactive State:** Vue 3 reactivity system monitors price vs target conditions
- **Auto-Withdrawal:** Background service monitors price changes and triggers withdrawals automatically

## 5. Smart Contract Integration

- **HodlVault.cash:** CashScript smart contract defining vault logic
- **Contract Deployment:** Dynamic contract creation based on user parameters
- **Oracle Validation:** Contract validates oracle signatures for price verification
- **Withdrawal Conditions:** Smart contract enforces price target requirements

## 6. State Management (Vuex)

- **wallet.js:** Wallet connection state and user data
- **autoWithdrawal.js:** Auto-withdrawal configuration and status
- **app.js:** Global application state and settings

## 7. Security & Integration

- **Wallet:** Private keys never stored; all signing delegated to Paytaca Wallet
- **Oracle:** Oracles.cash provides authenticated price data with cryptographic signatures
- **Network:** Configured for Chipnet testnet with mainnet preparation capabilities
- **Auto-Withdrawal:** Secure pre-signing and automated execution

## 8. Design System

- **Dark Theme:** Default dark mode with Renao design aesthetics
- **Responsive Design:** Mobile-first approach with Quasar components
- **Color Scheme:** Primary green (#00d588) with dark backgrounds
- **Component Library:** Quasar v2 with custom styling
