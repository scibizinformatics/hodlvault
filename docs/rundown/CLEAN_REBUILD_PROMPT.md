# BCH HodlVault System - Clean Rebuild

## Project Objective

Build a Bitcoin Cash smart contract application that allows users to lock funds in vaults until a predetermined price target is reached. The system operates on BCH Chipnet and integrates with Paytaca wallet for secure transaction signing.

## Core Features

### Wallet Integration

- Connect to Paytaca wallet using WalletConnect v2
- Maintain persistent wallet sessions
- Recover wallet state on application reload
- Display wallet connection status and address

### Vault Management

- Create vaults with custom USD price targets
- Generate unique contract addresses for each vault
- Display vault balance and contract details
- Support multiple vaults per user

### Deposit System

- Generate QR codes for vault deposits
- Monitor vault balances in real-time
- Detect and confirm incoming transactions
- Update UI automatically on balance changes

### Withdrawal System

- Enable withdrawals when BCH price meets or exceeds target
- Validate oracle price data and signatures
- Execute contract spending with proper conditions
- Handle transaction signing through Paytaca wallet

### Price Oracle

- Integrate with Oracles.cash service for BCH/USD price data
- Fetch current prices from Oracles.cash production oracle
- Validate oracle signatures and message format
- Provide fallback data when Oracles.cash is unavailable
- Display current price and target comparisons

## Technology Stack

### Frontend Framework

- Vue 3 with Options API
- Quasar Framework v2.16.0
- Vue Router 5
- Vuex 4 for state management

### Blockchain Integration

- CashScript v0.12.1 for smart contracts
- @bitauth/libauth v3.1.0 for crypto operations
- WalletConnect v2 for wallet integration

### Development Tools

- Vite build system
- ESLint with strict configuration
- Prettier for code formatting
- Node.js 20+ compatibility

### Smart Contract

- CashScript contract written in .cash language
- Contract enforces price-based spending conditions
- Covenant requirements for transaction outputs
- Oracle signature validation

## Network Configuration

- Target Network: BCH Chipnet (testnet)
- Oracle Integration: External price oracle with fallback
- Wallet Support: Paytaca wallet via WalletConnect
- Contract Deployment: Deterministic address generation

## User Experience Requirements

- Responsive web interface for desktop and mobile
- Real-time balance updates and price monitoring
- Clear transaction status indicators
- Comprehensive error handling and user feedback
- Persistent state across browser sessions

## Security Considerations

- No private key storage in application
- All signing operations delegated to wallet
- Input validation for user-provided data
- Secure handling of oracle data and signatures
- Testnet-only deployment to prevent mainnet risks
