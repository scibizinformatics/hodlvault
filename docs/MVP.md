# MVP: HodlVault

## Project Vision

HodlVault is a "forced discipline" Bitcoin Cash (BCH) vault application that prevents impulsive selling by locking funds in smart contracts that only unlock when a user-defined price target is reached, verified by the Oracles.cash oracle service. The system features automated withdrawal capabilities and a modern dark-themed interface.

## Core Features (Implemented)

1. **Price-Locked Vaults with CashScript:**
   - Users create vaults with custom target prices (e.g., $1,000 USD/BCH)
   - System uses CashScript smart contracts for secure fund locking
   - Withdrawal only possible when `Current Price >= Target Price`
   - Oracle signature validation through Oracles.cash

2. **Oracles.cash Integration:**
   - Primary oracle service: https://oracle1.mainnet.cash
   - Oracle public key: `02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f`
   - CoinGecko fallback for price data
   - Cryptographic signature verification

3. **Auto-Withdrawal System:**
   - Optional automatic withdrawal when price targets are met
   - Pre-signing transactions for seamless execution
   - Background price monitoring
   - Fallback to manual withdrawal if needed

4. **Chipnet Integration:**
   - Operates on BCH Chipnet for safe testing
   - Mainnet preparation capabilities
   - Explorer integration: https://chipnet.bch.ninja

5. **Paytaca Wallet Integration:**
   - WalletConnect v2 integration
   - Multiple fallback signing strategies
   - Secure transaction signing without private key storage

6. **Modern UI/UX (Renao Design):**
   - Dark theme by default
   - Responsive design with Quasar v2
   - Primary green (#00d588) color scheme
   - Mobile-first approach

## User Stories

- As a user, I want to set a target price so I am not tempted to sell during market dips
- As a user, I want automatic withdrawal when my price target is reached
- As a user, I want to see live oracle-verified prices and vault status
- As a user, I want to deposit funds easily using QR codes and Paytaca wallet
- As a user, I want confidence that my funds are secured by smart contracts

## Technical Implementation

### Smart Contract Features

- CashScript-based HodlVault contracts
- Oracle signature validation
- Dynamic contract deployment
- Price target enforcement

### Service Architecture

- Modular service design
- Multiple withdrawal fallback strategies
- Robust error handling
- State persistence

### Security Measures

- Oracle signature verification
- Contract-based fund locking
- No private key storage
- Multi-strategy transaction signing

## Success Metrics

- ✅ Oracle price verification working with Oracles.cash
- ✅ Auto-withdrawal system implemented
- ✅ CashScript smart contract deployment
- ✅ Modern UI with Renao design
- ✅ Paytaca wallet integration
- ✅ Responsive design across devices
- ✅ Clean, maintainable codebase

## Future Development Targets

- Mainnet deployment preparation
- Multi-vault support
- Advanced auto-withdrawal strategies
- Enhanced oracle integration
- Performance optimizations
