Backend Implementation Plan: HodlVault Node.js Transition

1. Project Mission and Context Engineering Initialization

The HodlVault system is a secure, decentralized asset management interface utilizing the Quasar framework and Bitcoin Cash (BCH) smart contracts. This plan formalizes the transition of backend responsibilities—specifically oracle data signing—from the legacy Django architecture to a high-performance Node.js/Express signing service.

Context Engineering Initialization To initialize the environment, execute the following command sequence to load architectural constraints into active memory:

1. load .windsurfrules (Project standards and Git prefixes)
2. load src/contract/HodlVault.cash (Contract logic authority)
3. load src/contract/HodlVault.json (ABI and artifact metadata)
4. load AGENTS.md (State and memory management)

Success Criteria

- Functional: The backend /sign endpoint must return a payload that passes the checkDataSig requirement in the HodlVault.cash contract.
- Technical: Successful verification of the generated datasig using @bitauth/libauth against the ORACLE_PUBKEY.
- Architectural: Full migration of shared utilities (serialization, network inference) to a centralized packages/shared workspace.

2. Monorepo Directory Structure

The project utilizes a pnpm-based monorepo to ensure type safety and code reuse across the stack.

pnpm-workspace.yaml Configuration:

packages:

- 'apps/\*'
- 'packages/\*'

Layout Definition:

- apps/frontend/: Existing Quasar/Vue 3 application.
- apps/backend/: New Express.js/TypeScript signing service.
- packages/shared/: Shared TypeScript interfaces, constants, and Libauth utilities.
- plans/: Iterative implementation blueprints.
- rules/: Centralized .windsurfrules files.

Naming Conventions:

- Directories: lowercase-with-dashes (e.g., signing-service/).
- Vue Components: PascalCase (e.g., VaultCard.vue).
- Logic/Utilities: camelCase (e.g., signerService.ts).

3. Backend Tech Stack and Configuration

Component Specification
Runtime Node.js (Version 20+)
Language TypeScript (Strict mode, explicit return types)
Framework Express.js (Modular routing)
Package Manager pnpm (Workspace mode)

TypeScript and Path Mapping: Initialize tsconfig.base.json in the root to handle absolute imports:

{
"compilerOptions": {
"baseUrl": ".",
"paths": {
"@hodlvault/shared": ["packages/shared/src/index.ts"],
"@/_": ["apps/backend/src/_"]
}
}
}

- Strictness: Interfaces are mandatory over types for data structures.
- Immutability: Configuration objects must use as const assertions.

4. Oracle Signing Service Implementation

The SignerService must replicate the logic expected by HodlVault.cash, specifically the bytes priceBytes = oracleMessage.split(8)[0]; operation.

Byte-Level Requirements:

- Price Formatting: The price must be converted to a 64-bit unsigned integer in Little-Endian format (Uint64LE).
- Payload Construction: The oracleMessage is a concatenated buffer: [8 bytes price][variable bytes blockheight].
- Cryptographic Target: Signatures must be generated using the private key corresponding to the ORACLE_PUBKEY: 02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818.

Architectural Logic (Applying Law 1: Guard Clauses):

function signPriceData(data: OracleData): string {
// Law 1: Guard Clauses
if (data.price <= 0) throw new Error('Invalid price');
if (data.blockheight <= 0) throw new Error('Invalid blockheight');

const priceBuf = bigIntToBinUint64LE(BigInt(data.price));
const heightBuf = utf8ToBin(data.blockheight.toString());
const message = binToHex(flattenBinaries([priceBuf, heightBuf]));

// Signature logic follows...
return message;
}

5. API Endpoint Architecture

Endpoint Method Description
GET /api/v1/oracle/price GET Proxies and caches current USD/BCH price from General Protocols.
POST /api/v1/vault/sign POST Generates the datasig for the contract spend function.

POST /api/v1/vault/sign Example:

- Request Body:
- Response Body:

6. Shared Logic and Integration

To eliminate code duplication (Law 2), the following elements are migrated to packages/shared/:

- Constants: ORACLE_PUBKEY and network identifiers.
- Utilities: serializeForWc (handling BigInt to string) and inferNetworkFromAddress.
- Interfaces: Vault, OracleData, and SignatureResponse.

Frontend Refactoring: src/services/oracle.js must be updated to replace direct fetch calls to General Protocols with calls to the local Node.js backend. This centralizes the price source and ensures the frontend receives data already formatted for contract consumption.

7. Context Engineering and System Rules

Update .windsurfrules to enforce backend-specific rigor:

- Explicit State: AI must state which "Law of Readable Code" is applied during code generation.
- Git Standards: Strict adherence to prefixes: feat:, fix:, refactor:, docs:, chore:, style:, test:.
- Memory Management: API schemas must be maintained in AGENTS.md to prevent "vibe coding" drift between frontend and backend expectations.

8. Implementation Roadmap (Execution Plan)

1. Workspace Setup:

- Run pnpm init in root.
- Create pnpm-workspace.yaml.
- Migrate frontend to apps/frontend.

2. Shared Package Initialization:

- Create packages/shared/src/index.ts.
- Extract serializeForWc and ORACLE_PUBKEY from blockchain.js and oracle.js.

3. Backend Scaffold:

- Initialize apps/backend with Express and TypeScript.
- Configure tsconfig.json with @hodlvault/shared path mapping.

4. Signer Service Development:

- Implement SignerService using @bitauth/libauth.
- Validation Checkpoint: Verify bigIntToBinUint64LE produces the exact 8-byte prefix required by the HodlVault.cash split logic.

5. API Implementation:

- Create /oracle/price and /vault/sign routes.
- Implement error handling middleware using user-friendly message patterns.

6. Frontend Integration:

- Refactor src/services/oracle.js to point to the new Express endpoints.
- Update src/services/blockchain.js to use the shared serializeForWc utility.
