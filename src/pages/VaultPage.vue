<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-lg">HodlVault</div>

    <!-- Oracle Price / Live Data -->
    <q-card flat bordered class="q-mb-md" :class="{ 'border-positive': oracleSuccess }">
      <q-card-section class="row items-center q-gutter-md">
        <div v-if="priceLoading" class="row items-center q-gutter-sm">
          <q-spinner-dots color="primary" size="32px" />
          <span>Fetching Oracle price...</span>
        </div>
        <div v-else-if="oracleSuccess" class="row items-center q-gutter-sm full-width">
          <q-icon name="check_circle" color="positive" size="32px" />
          <div>
            <div class="text-subtitle1 text-weight-medium text-positive">Oracle data received</div>
            <div class="text-caption text-grey-7">Current BCH price is live from the Oracle backend</div>
          </div>
          <q-btn flat dense round icon="refresh" @click="refreshPrice" label="Refresh" class="q-ml-auto" />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-icon name="warning" color="orange" size="32px" />
          <span>Oracle price unavailable. Check that the backend is running at http://127.0.0.1:8000</span>
          <q-btn flat dense label="Retry" @click="refreshPrice" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Create Vault Section -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Create Vault</div>
        <q-form @submit="onLockFunds" class="q-gutter-md">
          <q-input
            v-model.number="form.amount"
            label="Amount to Deposit into Vault"
            type="number"
            outlined
            :rules="[
              (val) => val > 0 || 'Amount must be greater than 0',
              (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
            ]"
            hint="This amount will be requested from your Paytaca wallet to fund the contract (in satoshis)."
          />
          <q-input
            v-model.number="form.priceTarget"
            label="USD Price Target"
            type="number"
            outlined
            step="0.01"
            :rules="[
              (val) => val > 0 || 'Price target must be greater than 0',
            ]"
            hint="Target BCH/USD price to unlock funds"
          />
          <q-btn
            v-if="hasWallet && hasPublicKey"
            type="submit"
            color="primary"
            label="LOCK FUNDS"
            :loading="locking || depositing"
            :disable="!canLockFunds"
            icon="lock"
          />
          <div v-else-if="hasWallet && !hasPublicKey" class="q-mt-md">
            <q-banner class="bg-warning text-dark">
              <template v-slot:avatar>
                <q-icon name="info" />
              </template>
              Public key not available. Verify your identity to continue.
              <template v-slot:action>
                <q-btn
                  flat
                  color="primary"
                  label="VERIFY IDENTITY"
                  :loading="verifyingIdentity"
                  :disable="verifyingIdentity"
                  @click="onVerifyIdentity"
                />
              </template>
            </q-banner>
          </div>
          <div v-else class="q-mt-md text-grey-7">
            Connect your wallet and verify your identity to create a vault.
          </div>
        </q-form>
        <div v-if="depositing" class="q-mt-sm">
          <q-banner class="bg-info text-white">
            <template v-slot:avatar>
              <q-spinner-dots color="white" size="24px" />
            </template>
            Waiting for Deposit... Confirm the payment in your wallet.
          </q-banner>
        </div>
      </q-card-section>
    </q-card>

    <!-- Vault Status Section -->
    <q-card v-if="vault" flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">Vault Status</div>
        <div class="q-gutter-md">
          <div>
            <div class="text-subtitle2 q-mb-xs">Contract Address</div>
            <q-input
              :model-value="vault.contractAddress"
              readonly
              outlined
              dense
              class="monospace"
              input-class="text-select"
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Balance</div>
            <q-input
              :model-value="formatBalance(displayBalance)"
              readonly
              outlined
              dense
              suffix="satoshis"
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Deposit More into Vault</div>
            <div class="row q-col-gutter-sm items-center">
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="additionalDepositAmount"
                  label="Additional amount (satoshis)"
                  type="number"
                  outlined
                  dense
                  :rules="[
                    (val) => !!val || 'Amount is required',
                    (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
                  ]"
                  hint="Send more BCH into this vault using your Paytaca wallet."
                />
              </div>
              <div class="col-auto q-mt-sm q-mt-md-none">
                <q-btn
                  color="primary"
                  label="Deposit More"
                  :loading="depositing"
                  :disable="!canDepositMore"
                  icon="account_balance_wallet"
                  @click="onDepositMore"
                />
              </div>
            </div>
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Target Price</div>
            <q-input
              :model-value="`$${vault.priceTarget.toFixed(2)}`"
              readonly
              outlined
              dense
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Current BCH Price (Oracle)</div>
            <q-input
              :model-value="currentBchPrice != null ? `$${Number(currentBchPrice).toFixed(2)}` : '—'"
              readonly
              outlined
              dense
              :color="canWithdraw ? 'positive' : 'negative'"
            />
          </div>
          <q-btn
            color="primary"
            label="Withdraw"
            :loading="withdrawing"
            :disable="!canWithdraw"
            icon="account_balance"
            @click="onWithdraw"
          />
          <div v-if="!canWithdraw && vault" class="text-caption text-negative q-mt-xs">
            Current price (${{ currentBchPrice != null ? Number(currentBchPrice).toFixed(2) : '?' }}) is below target price (${{ vault.priceTarget.toFixed(2) }})
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Developer Info (toggle) -->
    <q-card v-if="vault" flat bordered class="q-mt-md">
      <q-card-section>
        <q-expansion-item icon="bug_report" label="Developer Info" dense>
          <div class="q-gutter-md q-mt-sm">
            <q-input
              label="Owner PKH (hex)"
              :model-value="developerOwnerPkh"
              readonly
              outlined
              dense
              class="monospace"
              input-class="text-select"
            />
            <q-input
              label="Price Target (cents)"
              :model-value="developerPriceTargetCents"
              readonly
              outlined
              dense
            />
            <q-input
              label="Connected Chain ID"
              :model-value="developerChainId"
              readonly
              outlined
              dense
            />
          </div>
        </q-expansion-item>
      </q-card-section>
    </q-card>

    <!-- Empty State -->
    <q-card v-else flat bordered>
      <q-card-section class="text-center text-grey-6">
        No active vault. Create a vault above to get started.
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import {
  calculateContractAddress,
  initializeHodlVaultContract,
  getAddressBalance,
  spendVault,
  depositToVault,
} from 'src/services/blockchain'
import { fetchOraclePrice } from 'src/services/oracle'
import { hash160, hexToBin, binToHex } from '@bitauth/libauth'

export default defineComponent({
  name: 'VaultPage',

  data() {
    return {
      form: {
        amount: null,
        priceTarget: null,
      },
      additionalDepositAmount: null,
      locking: false,
      depositing: false,
      verifyingIdentity: false,
      withdrawing: false,
      balanceInterval: null,
      depositPollInterval: null,
      depositPollStartTime: null,
      vault: null,
      priceLoading: false,
      oracleSuccess: false,
      currentBchPrice: null,
      oracleData: {
        message_hex: '',
        signature_hex: '',
        oracle_pubkey_hex: '',
      },

      // Vault persistence (localStorage)
      vaultPersistKey: 'hodl-vault-active-vault',
    }
  },

  computed: {
    /** Single source of truth: wallet address from Vuex store */
    hasWallet() {
      return !!this.$store.state.wallet?.address
    },

    canLockFunds() {
      return (
        this.hasWallet &&
        this.form.amount &&
        this.form.amount >= 1000 &&
        this.form.priceTarget &&
        this.form.priceTarget > 0 &&
        this.oracleData.oracle_pubkey_hex &&
        this.hasPublicKey
      )
    },

    canDepositMore() {
      return (
        this.vault &&
        this.hasWallet &&
        this.additionalDepositAmount &&
        this.additionalDepositAmount >= 1000
      )
    },

    canWithdraw() {
      if (!this.vault) return false
      if (this.currentBchPrice == null) return false
      return Number(this.currentBchPrice) >= this.vault.priceTarget
    },

    hasPublicKey() {
      return !!this.$store.state.wallet?.publicKey
    },

    displayBalance() {
      if (!this.vault) return 0
      return this.vault.balance
    },

    walletAddress() {
      return this.$store.state.wallet?.address ?? null
    },

    developerOwnerPkh() {
      return this.getOwnerPkhHex()
    },

    developerPriceTargetCents() {
      if (this.form.priceTarget != null) {
        return Math.floor(this.form.priceTarget * 100)
      }
      if (this.vault && this.vault.priceTarget != null) {
        return Math.floor(this.vault.priceTarget * 100)
      }
      return null
    },

    developerChainId() {
      return this.$walletConnect && typeof this.$walletConnect.getChainId === 'function'
        ? this.$walletConnect.getChainId()
        : null
    },
  },

  methods: {
    persistVaultState(vaultState) {
      if (typeof localStorage === 'undefined') return
      try {
        if (!vaultState) {
          localStorage.removeItem(this.vaultPersistKey)
          return
        }
        localStorage.setItem(this.vaultPersistKey, JSON.stringify(vaultState))
      } catch {
        // ignore persistence errors
      }
    },

    loadPersistedVaultState() {
      if (typeof localStorage === 'undefined') return null
      try {
        const raw = localStorage.getItem(this.vaultPersistKey)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        return parsed
      } catch {
        return null
      }
    },

    clearPersistedVaultState() {
      this.persistVaultState(null)
    },

    /**
     * Get owner PKH derived from the connected/generated wallet's public key.
     * Returns null if no wallet is connected or signer not set.
     */
    getOwnerPkhHex() {
      const ownerPkHex = this.$store.state.wallet?.publicKey ?? this.$walletConnect?.getOwnerPublicKeyHex?.() ?? null
      if (!ownerPkHex) return null
      return this.derivePkhFromPublicKey(ownerPkHex)
    },

    /**
     * Derive PKH from public key hex
     * Note: In production, get public key from connected wallet
     */
    derivePkhFromPublicKey(publicKeyHex) {
      try {
        const publicKey = hexToBin(publicKeyHex)
        const pkh = hash160(publicKey)
        return binToHex(pkh)
      } catch (error) {
        console.error('Failed to derive PKH:', error)
        return null
      }
    },

    async refreshPrice() {
      this.priceLoading = true
      this.oracleSuccess = false
      try {
        const data = await fetchOraclePrice()
        this.currentBchPrice = data.price
        this.oracleData = {
          message_hex: data.message_hex,
          signature_hex: data.signature_hex,
          oracle_pubkey_hex: data.oracle_pubkey_hex,
        }
        this.oracleSuccess = true
        this.$q.notify({
          type: 'positive',
          message: 'Oracle data received successfully',
          icon: 'check_circle',
        })
      } catch (err) {
        this.currentBchPrice = null
        this.oracleData = { message_hex: '', signature_hex: '', oracle_pubkey_hex: '' }
        this.$q.notify({
          type: 'warning',
          message: err?.message || 'Failed to fetch Oracle price',
          icon: 'warning',
        })
      } finally {
        this.priceLoading = false
      }
    },

    async onLockFunds() {
      if (!this.canLockFunds) return
      const wc = this.$walletConnect
      if (!wc || !wc.isConnected || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      this.locking = true
      try {
        const ownerPkhHex = this.getOwnerPkhHex()
        const oraclePkHex = this.oracleData.oracle_pubkey_hex
        const priceTargetCents = Math.floor(this.form.priceTarget * 100)

        if (!oraclePkHex) {
          throw new Error('Oracle public key not loaded. Refresh the price first.')
        }

        const contractAddress = await calculateContractAddress(
          ownerPkhHex,
          oraclePkHex,
          priceTargetCents
        )

        const contract = initializeHodlVaultContract(
          ownerPkhHex,
          oraclePkHex,
          priceTargetCents
        )

        // Get initial balance (should be 0 for new contract)
        const balance = Number(await getAddressBalance(contractAddress))

        // Store vault info
        this.vault = {
          contractAddress,
          balance: Number(balance),
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex,
          contract, // Store contract instance for withdrawal
        }

        // Persist vault so it survives refresh
        this.persistVaultState({
          walletAddress: this.walletAddress,
          contractAddress,
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex,
          createdAt: Date.now(),
        })

        this.$q.notify({
          type: 'positive',
          message: `Vault created at ${contractAddress}`,
          icon: 'check_circle',
        })

        console.log('Vault created. Contract address:', contractAddress)
        console.log('To lock funds, send', this.form.amount, 'satoshis to:', contractAddress)

        // Always start watching balance after vault creation (covers manual deposits)
        this.startBalancePolling()

        // Immediately request a deposit from the connected wallet
        if (typeof wc.request === 'function') {
          this.depositing = true
          try {
            const depositPromise = depositToVault(
              contractAddress,
              this.form.amount,
              (method, params) => wc.request(method, params)
            )
            const depositResult = await Promise.race([
              depositPromise,
              new Promise((resolve) => setTimeout(() => resolve({ txid: null, raw: null }), 15000)),
            ])
            const txid = depositResult && depositResult.txid
            this.$q.notify({
              type: 'positive',
              message: txid
                ? `Deposit transaction submitted. TX: ${txid}`
                : 'Deposit submitted in wallet. Waiting for network confirmation...',
              icon: 'check_circle',
            })
          } catch (depositErr) {
            this.$q.notify({
              type: 'negative',
              message:
                depositErr?.message ||
                'Deposit rejected by wallet. Please ensure you have enough funds for the amount + gas fee.',
            })
          } finally {
            this.depositing = false
          }
        } else {
          this.$q.notify({
            type: 'warning',
            message: 'WalletConnect request function is not available; please send funds manually.',
          })
        }
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to create vault',
        })
      } finally {
        this.locking = false
      }
    },

    async onDepositMore() {
      if (!this.vault || !this.vault.contractAddress) {
        this.$q.notify({
          type: 'negative',
          message: 'No active vault to deposit into',
        })
        return
      }

      const wc = this.$walletConnect
      if (!wc || !wc.isConnected || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      if (!this.additionalDepositAmount || this.additionalDepositAmount < 1000) {
        this.$q.notify({
          type: 'warning',
          message: 'Deposit amount must be at least 1000 satoshis',
        })
        return
      }

      this.depositing = true
      try {
        const depositPromise = depositToVault(
          this.vault.contractAddress,
          this.additionalDepositAmount,
          (method, params) => wc.request(method, params)
        )
        const depositResult = await Promise.race([
          depositPromise,
          new Promise((resolve) =>
            setTimeout(() => resolve({ txid: null, raw: null }), 15000)
          ),
        ])
        const txid = depositResult && depositResult.txid
        this.$q.notify({
          type: 'positive',
          message: txid
            ? `Deposit transaction submitted. TX: ${txid}`
            : 'Deposit submitted in wallet. Waiting for network confirmation...',
          icon: 'check_circle',
        })
        this.startBalancePolling()
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message:
            err?.message ||
            'Deposit rejected by wallet. Please ensure you have enough funds for the amount + gas fee.',
        })
      } finally {
        this.depositing = false
      }
    },

    async onVerifyIdentity() {
      if (this.hasPublicKey) return
      const wc = this.$walletConnect
      if (!wc || typeof wc.recoverPublicKey !== 'function') {
        this.$q.notify({ type: 'negative', message: 'WalletConnect not initialized' })
        return
      }

      this.verifyingIdentity = true
      try {
        await wc.recoverPublicKey()
        this.$q.notify({
          type: 'positive',
          message: 'Identity verified',
          icon: 'check_circle',
        })
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to verify identity',
        })
      } finally {
        this.verifyingIdentity = false
      }
    },

    async onWithdraw() {
      if (!this.canWithdraw || !this.vault) return

      const wc = this.$walletConnect
      if (!wc || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      const ownerAddress = wc.getAddress()
      if (!ownerAddress) {
        this.$q.notify({ type: 'negative', message: 'Could not get wallet address' })
        return
      }

      if (!this.oracleData.message_hex || !this.oracleData.signature_hex) {
        this.$q.notify({
          type: 'negative',
          message: 'Oracle data missing. Refresh the price first.',
        })
        return
      }

      const ownerSigTemplate = wc.getSignatureTemplate()
      const useWalletConnectSign = !ownerSigTemplate && typeof wc.request === 'function'

      this.withdrawing = true
      try {
        const result = await spendVault(this.vault.contract, {
          ownerPkHex: wc.getOwnerPublicKeyHex() || '',
          ownerSigTemplate: ownerSigTemplate || undefined,
          oracleMessageHex: this.oracleData.message_hex,
          oracleSigHex: this.oracleData.signature_hex,
          ownerAddress,
          ...(useWalletConnectSign && {
            walletConnectRequest: (method, params) => wc.request(method, params),
          }),
        })
        this.$q.notify({
          type: 'positive',
          message: `Withdrawal sent. TX: ${result.txid}`,
          icon: 'check_circle',
        })
        await this.refreshVaultBalance()
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to withdraw',
        })
      } finally {
        this.withdrawing = false
      }
    },

    formatBalance(balance) {
      return new Intl.NumberFormat('en-US').format(balance)
    },

    async refreshVaultBalance() {
      if (this.vault && this.vault.contractAddress) {
        try {
          const balance = await getAddressBalance(this.vault.contractAddress)
          this.vault.balance = Number(balance)
        } catch (err) {
          console.error('Failed to refresh balance:', err)
          this.$q.notify({
            type: 'warning',
            message: err?.message || 'Failed to refresh balance',
          })
        }
      }
    },

    startBalancePolling() {
      if (!this.vault || !this.vault.contractAddress) return
      if (this.depositPollInterval) {
        clearInterval(this.depositPollInterval)
        this.depositPollInterval = null
      }
      this.depositPollStartTime = Date.now()
      this.depositPollInterval = setInterval(async () => {
        if (!this.vault || !this.vault.contractAddress) {
          clearInterval(this.depositPollInterval)
          this.depositPollInterval = null
          return
        }
        try {
          const balance = await getAddressBalance(this.vault.contractAddress)
          const numeric = Number(balance)
          this.vault.balance = numeric
          const elapsed = Date.now() - this.depositPollStartTime
          if (numeric > 0) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
            this.$q.notify({
              type: 'positive',
              message: 'Deposit confirmed',
              icon: 'check_circle',
            })
          } else if (elapsed >= 120000) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
          }
        } catch (err) {
          console.error('Vault balance watcher error:', err)
          const elapsed = Date.now() - this.depositPollStartTime
          if (elapsed >= 120000) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
          }
        }
      }, 5000)
    },
  },

  watch: {
    walletAddress(newAddress, oldAddress) {
      if (!newAddress || newAddress !== oldAddress) {
        this.vault = null
        this.depositing = false
        this.clearPersistedVaultState()
        if (this.balanceInterval) {
          clearInterval(this.balanceInterval)
          this.balanceInterval = null
        }
        if (this.depositPollInterval) {
          clearInterval(this.depositPollInterval)
          this.depositPollInterval = null
        }
      }
    },

    vault(newVault, oldVault) {
      if (newVault && newVault !== oldVault) {
        this.refreshVaultBalance()
        this.startBalancePolling()
      }
    },
  },

  mounted() {
    this.refreshPrice()
    // Restore persisted vault (if it belongs to current wallet)
    const persisted = this.loadPersistedVaultState()
    if (persisted && persisted.walletAddress && persisted.walletAddress === this.walletAddress) {
      const currentOwnerPkhHex = this.getOwnerPkhHex()
      const canRestore =
        persisted.contractAddress &&
        persisted.oraclePkHex &&
        persisted.priceTargetCents != null &&
        persisted.ownerPkhHex &&
        currentOwnerPkhHex &&
        persisted.ownerPkhHex === currentOwnerPkhHex

      if (canRestore) {
        const contract = initializeHodlVaultContract(
          persisted.ownerPkhHex,
          persisted.oraclePkHex,
          persisted.priceTargetCents
        )
        this.vault = {
          contractAddress: persisted.contractAddress,
          balance: 0,
          priceTarget: persisted.priceTarget ?? null,
          priceTargetCents: persisted.priceTargetCents,
          ownerPkhHex: persisted.ownerPkhHex,
          oraclePkHex: persisted.oraclePkHex,
          contract,
        }
        this.refreshVaultBalance()
        this.startBalancePolling()
      } else {
        this.clearPersistedVaultState()
      }
    }
    this.balanceInterval = setInterval(() => {
      this.refreshVaultBalance()
    }, 30000)
  },

  beforeUnmount() {
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval)
    }
    if (this.depositPollInterval) {
      clearInterval(this.depositPollInterval)
      this.depositPollInterval = null
    }
  },
})
</script>

<style scoped lang="scss">
.monospace {
  font-family: ui-monospace, monospace;
}
.text-select {
  user-select: all;
}
.border-positive {
  border: 2px solid var(--q-positive);
}
</style>
