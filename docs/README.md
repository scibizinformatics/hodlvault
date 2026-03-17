# HodlVault (BCH Chipnet)

HodlVault is a decentralized price-locking vault application built for the Bitcoin Cash ecosystem. It allows users to lock their BCH in smart contracts until the market value meets their expectations, with automated withdrawal capabilities and oracle-verified price feeds.

## Tech Stack

- **Framework:** Vue 3 with Quasar v2 (Composition API)
- **Blockchain:** Bitcoin Cash (BCH) with CashScript smart contracts
- **Network:** Chipnet (Testnet) with mainnet preparation
- **Oracle Service:** Oracles.cash (https://oracle1.mainnet.cash)
- **Wallet Integration:** WalletConnect v2 with Paytaca SDK
- **State Management:** Vuex with modular store architecture
- **Styling:** Quasar components with custom Renao design system
- **Build Tool:** Quasar CLI with modern development workflow

## Key Features

### Core Vault Functionality

- **Price-Locked Vaults:** Create vaults that only unlock at your target price
- **Smart Contract Security:** CashScript contracts enforce withdrawal conditions
- **Oracle Verification:** Cryptographic signature verification from Oracles.cash
- **Auto-Withdrawal:** Optional automatic withdrawal when price targets are met

### Modern User Experience

- **Dark Theme:** Beautiful dark interface with Renao design aesthetics
- **Responsive Design:** Fully functional across desktop, tablets, and mobile devices
- **Real-Time Updates:** Live price feeds and vault status monitoring
- **QR Code Deposits:** Easy vault funding via QR code scanning

### Advanced Features

- **Multiple Withdrawal Strategies:** Robust fallback mechanisms for transaction signing
- **Balance Monitoring:** Real-time vault balance tracking
- **Transaction History:** Complete audit trail of all vault operations
- **State Persistence:** Vault data survives browser sessions

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Paytaca wallet mobile app
- Basic understanding of BCH and smart contracts

### Installation

1. **Clone the repository:**

   ```bash
   git clone [repository-url]
   cd hodl-vault-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup:**

   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Run development server:**

   ```bash
   npm run dev
   # or
   quasar dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   # or
   quasar build
   ```

## Oracle Integration

### Primary Oracle Service

- **Service:** Oracles.cash
- **Endpoint:** https://oracle1.mainnet.cash
- **Public Key:** `02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f`
- **Fallback:** CoinGecko API for redundancy

### Oracle Features

- Cryptographic signature verification
- Real-time price feeds
- High availability and reliability
- Chipnet compatibility

## Smart Contract Architecture

### HodlVault Contract

- **Language:** CashScript
- **Network:** Bitcoin Cash Chipnet
- **Features:** Price locking, oracle validation, withdrawal conditions
- **Security:** Multi-signature validation and fund protection

### Contract Operations

- Dynamic contract deployment
- Oracle signature verification
- Secure fund locking and release
- Transaction fee optimization

## Auto-Withdrawal System

### Features

- **Pre-Signing:** Transactions prepared in advance
- **Price Monitoring:** Continuous oracle price checking
- **Automatic Execution:** Withdrawals when conditions are met
- **Fallback Options:** Manual withdrawal as backup

### Security Measures

- Secure key management
- Transaction validation
- Error handling and recovery
- Audit logging

## Development Standards

### Code Quality

- ESLint configuration for code consistency
- Prettier for code formatting
- TypeScript support where applicable
- Comprehensive test coverage

### Architecture Principles

- Modular service design
- Component-based UI architecture
- State management best practices
- Security-first development approach

### Performance Requirements

- Sub-second price updates
- Responsive UI interactions
- Efficient blockchain polling
- Minimal memory footprint

## Security Considerations

### Wallet Security

- Private keys never stored
- All signing delegated to Paytaca
- Secure transaction validation
- Multi-factor authentication support

### Smart Contract Security

- Oracle signature verification
- Contract audit requirements
- Formal verification where possible
- Bug bounty program

### Application Security

- HTTPS enforcement
- Input validation and sanitization
- XSS and CSRF protection
- Secure communication protocols

## Network Configuration

### Chipnet (Testnet)

- **Purpose:** Development and testing
- **Explorer:** https://chipnet.bch.ninja
- **Faucet:** Testnet BCH faucets available
- **Safety:** No real value at risk

### Mainnet Preparation

- **Audit Requirements:** Full security audit before deployment
- **Oracle Configuration:** Production oracle endpoints
- **Fee Structure:** Mainnet fee optimization
- **Risk Management:** Comprehensive risk assessment

## Contributing

We welcome contributions to the HodlVault project! Please see our contributing guidelines for details on:

- Code submission process
- Bug reporting procedures
- Feature request guidelines
- Development environment setup

## Support

### Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [MVP Specification](./MVP.md)
- [Development Roadmap](./ROADMAP.md)

### Community

- GitHub Issues for bug reports and feature requests
- Discord community for general discussion
- Technical support via development channels

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

**⚠️ Important Notice:** HodlVault is currently in development and operates on the Bitcoin Cash Chipnet testnet. Do not use with real funds. The smart contracts and oracle integrations are experimental and should be thoroughly tested before any mainnet deployment.

## Future Development

See our [Roadmap](./ROADMAP.md) for upcoming features including:

- Mainnet deployment
- Multi-vault support
- Advanced withdrawal strategies
- Mobile applications
- API integrations
