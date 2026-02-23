# MVP Definition: BCH HodlVault

## Core Objective
A web application that allows users to lock Bitcoin Cash (BCH) in a smart contract. The funds can only be released back to the owner's wallet if a specific BCH price target (verified by an Oracle) is met.

## Essential Features
1. **Wallet Integration:** Connect to mobile wallets via WalletConnect.
2. **Vault Creation:** Input a "Price Target" and "Amount" to deploy a HodlVault contract.
3. **Oracle Data:** Fetch signed price data from a trusted Oracle (Django Backend).
4. **Covenant Security:** Ensure funds can ONLY be returned to the depositor's address.
5. **Withdrawal Logic:** Trigger the smart contract's `spend` function when conditions are met.

## Success Criteria
- User can lock 1000 sats.
- User cannot withdraw if price is below target.
- User CAN withdraw if price is above target and Oracle provides a valid signature.