# Complete Re-development Prompt: BCH HodlVault System

## Project Overview

**BCH HodlVault** is a "forced discipline" Bitcoin Cash wallet application that prevents impulsive selling by locking funds in smart contracts until a user-defined price target is reached. The system operates on BCH Chipnet (testnet) and integrates with Paytaca wallet for secure transaction signing.

## Technology Stack

### Frontend Framework
- **Vue 3** with Options API (not Composition API)
- **Quasar Framework v2.16.0** for UI components and build system
- **Vue Router 5** for navigation
- **Vuex 4** for state management

### Blockchain Integration
- **CashScript v0.12.1** for smart contract interaction
- **@bitauth/libauth v3.1.0** for cryptographic operations
- **WalletConnect v2** (@walletconnect/sign-client, @walletconnect/modal) for Paytaca integration

### Development Tools
- **Vite** as build tool (via Quasar)
- **ESLint** with strict configuration
- **Prettier** for code formatting
- **Node.js 20+** compatibility

## Core Architecture

### 1. Smart Contract Layer
**File: `src/contract/HodlVault.cash`**
```cashscript
pragma cashscript ^0.12.0;

contract HodlVault(bytes20 ownerPkh, pubkey oraclePk, int priceTarget) {
  function spend(
    pubkey ownerPk,
    sig ownerSig,
    bytes oracleMessage,
    datasig oracleSig
  ) {
    // 1. Owner verification
    require(hash160(ownerPk) == ownerPkh);
    require(checkSig(ownerSig, ownerPk));
    
    // 2. Oracle signature verification
    require(checkDataSig(oracleSig, oracleMessage, oraclePk));
    
    // 3. Price condition check
    require(oracleMessage.length >= 8);
    bytes priceBytes = oracleMessage.split(8)[0];
    require(int(priceBytes) >= priceTarget);
    
    // 4. Covenant: single output to owner
    int minerFee = 1000;
    int amount = tx.inputs[this.activeInputIndex].value - minerFee;
    require(tx.outputs.length == 1);
    require(tx.outputs[0].value == amount);
    bytes25 ownerLock = new LockingBytecodeP2PKH(ownerPkh);
    require(tx.outputs[0].lockingBytecode == ownerLock);
  }
}
```

### 2. Application Structure

#### Pages
- **`VaultPage.vue`** - Main vault interface (create, deposit, withdraw)
- **`IndexPage.vue`** - Wallet connection landing page
- **`ErrorNotFound.vue`** - 404 handler

#### Layout
- **`MainLayout.vue`** - Header with wallet connection status

#### Core Services
- **`blockchain.js`** - CashScript contract operations, transaction building
- **`oracle.js`** - Price oracle integration (CoinGecko API)
- **`walletconnect.js`** - Paytaca wallet integration
- **`paytaca-compat.js`** - Paytaca-specific compatibility layer
- **`paytaca-recovery.js`** - Transaction recovery mechanisms
- **`simple-withdrawal.js`** - Simplified withdrawal logic

#### State Management
- **`store/modules/wallet.js`** - Wallet state persistence

## Key Features Implementation

### 1. Wallet Connection System
- WalletConnect v2 integration with Paytaca
- Session persistence and recovery
- Public key recovery from message signatures
- Chain validation (BCH Chipnet)

### 2. Vault Creation Flow
1. User connects Paytaca wallet
2. Sets target price (USD)
3. System fetches oracle public key
4. Contract address is calculated deterministically
5. QR code generated for deposits
6. Balance polling starts automatically

### 3. Price Oracle Integration
- Primary: CoinGecko API for BCH/USD price
- Fallback: Mock oracle data when API unavailable
- Oracle message format: 8-byte price (cents) + timestamp
- Hardcoded oracle pubkey: `02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f`

### 4. Transaction System
- **Deposit**: QR code generation + balance polling
- **Withdrawal**: Multi-attempt signing with 14 fallback strategies
- Local signing support via SignatureTemplate
- WalletConnect signing with Paytaca compatibility layer

### 5. Security Features
- No private key storage (delegated to Paytaca)
- Chipnet-only configuration
- Persistent vault state in localStorage
- Transaction validation and error recovery

## Development Setup

### Environment Configuration
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

### Key Configuration Files
- **`quasar.config.js`** - Quasar framework configuration
- **`package.json`** - Dependencies and scripts
- **`.env`** - Environment variables (VITE_BCH_NETWORK=chipnet)

## Critical Implementation Details

### 1. Paytaca Wallet Integration
The system includes extensive compatibility layers for Paytaca:
- Multiple signing attempt strategies (14 different approaches)
- Transaction recovery mechanisms
- Response normalization for different wallet formats
- Error handling and retry logic

### 2. Contract Address Calculation
Contract addresses are deterministic based on:
- Owner's public key hash (20 bytes)
- Oracle's public key (33 bytes compressed)
- Price target in cents (integer)

### 3. Balance Monitoring
Real-time balance polling with:
- Automatic polling start after vault creation
- Polling intervals optimized for user experience
- Balance change detection for transaction confirmation

### 4. Price Validation
Withdrawal only enabled when:
- Current BCH price ≥ target price
- Oracle signature is valid
- Owner signature is valid
- All contract conditions are met

## State Management Pattern

### Wallet Module (Vuex)
```javascript
// State
{
  address: string | null,
  publicKey: string | null,
  privateKey: null // Never stored
}

// Mutations
- SET_WALLET
- SET_PUBLIC_KEY  
- CLEAR_WALLET

// Actions
- loginUser
- clearWallet
```

### Persistence Strategy
- Wallet state: localStorage (`hodl-vault-wallet`)
- Vault state: localStorage (`hodl-vault-active-vault`)
- Session recovery on app load

## Error Handling Strategy

### Multi-Layer Approach
1. **Service Level**: Individual service error handling
2. **Component Level**: User-friendly error messages
3. **Global Level**: Unhandled error catching

### Transaction Failures
- 14-attempt fallback strategy for withdrawals
- Automatic retry with different signing methods
- User guidance for manual operations
- QR code generation as last resort

## Testing Strategy

### Recommended Test Coverage
1. **Unit Tests**: Service functions, utility methods
2. **Integration Tests**: Wallet connection, contract operations
3. **E2E Tests**: Complete user flows (create vault, deposit, withdraw)
4. **Contract Tests**: CashScript contract validation

### Key Test Scenarios
- Wallet connection/disconnection
- Vault creation with various parameters
- Deposit detection and balance updates
- Withdrawal with valid/invalid oracle data
- Error recovery and fallback mechanisms

## Security Considerations

### Critical Security Points
1. **Oracle Trust**: System relies on oracle for price data
2. **Wallet Security**: All private keys remain in Paytaca
3. **Network Isolation**: Chipnet-only prevents mainnet fund loss
4. **Input Validation**: All user inputs must be validated

### Security Best Practices
- Never store private keys
- Validate all oracle signatures
- Use deterministic contract addressing
- Implement proper error boundaries
- Sanitize all user inputs

## Performance Optimizations

### Key Optimizations
1. **Lazy Loading**: Components loaded on demand
2. **Debounced Operations**: Price fetching, balance polling
3. **Efficient State Updates**: Vuex reactivity optimizations
4. **Minimal Re-renders**: Computed properties for derived state

## Deployment Configuration

### Build Configuration
- Target: Modern browsers (ES2022+)
- Output: Static files for web deployment
- Environment: Production with optimized builds
- CDN: Recommended for Quasar assets

### Environment Variables
```bash
VITE_BCH_NETWORK=chipnet
# Add other required environment variables as needed
```

## Future Enhancement Opportunities

### Potential Improvements
1. **Multiple Oracle Support**: Reduce single point of failure
2. **Multi-Vault Management**: Support for multiple vaults per user
3. **Mobile App**: Capacitor/Electron deployment
4. **Advanced Analytics**: Vault performance tracking
5. **Social Features**: Vault sharing, leaderboards

### Scalability Considerations
- Database integration for vault persistence
- API rate limiting for oracle calls
- Caching strategies for price data
- Load balancing for high-traffic scenarios

## Development Guidelines

### Code Standards
- Use Vue 3 Options API (not Composition API)
- Follow ESLint strict configuration
- Implement comprehensive error handling
- Add detailed logging for debugging
- Use TypeScript for new features (optional)

### Git Workflow
- Feature branches for new development
- Pull requests for code review
- Automated testing on commits
- Semantic versioning for releases

This comprehensive prompt provides all necessary information to rebuild the BCH HodlVault system from scratch while maintaining the same architecture, security model, and user experience.
