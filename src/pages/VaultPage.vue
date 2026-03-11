<template>
  <q-page class="q-pa-md">
    <!-- Oracle Status Section -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center q-gutter-md">
        <div v-if="priceLoading" class="row items-center q-gutter-sm">
          <q-spinner-dots color="primary" size="32px" />
          <span>Fetching Oracle price...</span>
        </div>
        <div v-else-if="oracleSuccess" class="row items-center q-gutter-sm full-width">
          <q-icon name="check_circle" color="positive" size="32px" />
          <div>
            <div class="text-subtitle1 text-weight-medium text-positive">Oracle data received</div>
            <div class="text-caption text-grey-7">
              Current BCH price is live from Oracle backend
            </div>
          </div>
          <q-btn
            flat
            dense
            round
            icon="refresh"
            @click="refreshPrice"
            label="Refresh"
            class="q-ml-auto"
          />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-icon name="warning" color="orange" size="32px" />
          <span
            >Oracle price unavailable. Check that the backend is running at
            https://oracle1.mainnet.cash</span
          >
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
            hint="This amount will be requested from your Paytaca wallet to fund contract (in satoshis)."
          />
          <q-input
            v-model.number="form.priceTarget"
            label="USD Price Target"
            type="number"
            outlined
            step="0.01"
            :rules="[(val) => val > 0 || 'Price target must be greater than 0']"
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
            Waiting for Deposit... Confirm payment in your Paytaca wallet.
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
            <div class="row items-center q-gutter-sm">
              <q-input
                :model-value="formatBalance(displayBalance)"
                readonly
                outlined
                dense
                suffix="satoshis"
                class="col"
              />
              <q-btn
                flat
                dense
                round
                icon="refresh"
                color="primary"
                :loading="balanceRefreshing"
                @click="refreshVaultBalance"
                aria-label="Refresh balance from blockchain"
              />
            </div>
            <p class="text-caption text-grey-7 q-mt-xs q-mb-none">
              Live from chipnet blockchain. Clearing site data does not move funds—your vault
              address stays the same; re-enter the same vault settings to see this balance again.
            </p>
            <a
              v-if="vault && vault.contractAddress"
              :href="chipnetExplorerAddressUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption text-primary"
            >
              Verify balance on chipnet explorer →
            </a>
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
            <div class="text-subtitle2 q-mb-xs">Vault Deposit QR</div>
            <div class="row items-center q-gutter-md">
              <q-card flat bordered class="q-pa-sm flex flex-center">
                <QrcodeVue :value="vault.contractAddress" :size="160" />
              </q-card>
              <div class="text-body2 text-grey-7">
                Scan this QR in Paytaca to fill the vault address automatically, then enter the
                amount you want to send.
              </div>
            </div>
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Target Price</div>
            <q-input :model-value="`$${vault.priceTarget.toFixed(2)}`" readonly outlined dense />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Current BCH Price (Oracle)</div>
            <q-input
              :model-value="
                currentBchPrice != null ? `$${Number(currentBchPrice).toFixed(2)}` : '—'
              "
              readonly
              outlined
              dense
              :color="canWithdraw ? 'positive' : 'negative'"
            />
          </div>
          <p class="text-caption text-grey-7">
            Withdrawal sends vault funds to your original funding address automatically. Your
            Paytaca must approve the transaction, like receiving from a faucet—you provide the
            address, then confirm in wallet.
          </p>
          <q-btn
            color="primary"
            label="Withdraw"
            :loading="withdrawing"
            :disable="!canWithdraw"
            icon="account_balance"
            @click="onWithdraw"
          />
          <div v-if="!canWithdraw && vault" class="text-caption text-negative q-mt-xs">
            Current price (${ currentBchPrice != null ? Number(currentBchPrice).toFixed(2) : '?' }})
            is below target price (${{ vault.priceTarget.toFixed(2) }})
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
            <q-input
              label="Oracle Source"
              value="Mainnet.cash Production Oracle"
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
import QrcodeVue from 'qrcode.vue'
import {
  calculateContractAddress,
  initializeHodlVaultContract,
  getAddressBalance,
  depositToVault,
} from 'src/services/blockchain'
import { simpleWithdrawal } from 'src/services/simple-withdrawal'
import { fetchOraclePrice, ORACLE_PUBKEY } from 'src/services/oracle'
import { hash160, hexToBin, binToHex } from '@bitauth/libauth'

export default defineComponent({
  name: 'VaultPage',

  components: {
    QrcodeVue,
  },

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

      // Original funding address for auto-withdrawal
      originalFundingAddress: '',

      balanceRefreshing: false,
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

    chipnetExplorerAddressUrl() {
      if (!this.vault || !this.vault.contractAddress) return ''
      const addr = encodeURIComponent(this.vault.contractAddress)
      return `https://chipnet.bch.ninja/address/${addr}`
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

    clearPersistedVaultState() {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.removeItem(this.vaultPersistKey)
      } catch {
        // ignore persistence errors
      }
    },

    loadPersistedVaultState() {
      if (typeof localStorage === 'undefined') return null
      try {
        const stored = localStorage.getItem(this.vaultPersistKey)
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    },

    getOwnerPkhHex() {
      const addr = this.walletAddress
      if (!addr) return ''
      const hash = hash160(hexToBin(addr.slice(1)))
      return binToHex(hash)
    },

    async refreshPrice() {
      this.priceLoading = true
      this.oracleSuccess = false
      try {
        const result = await fetchOraclePrice()
        this.currentBchPrice = result.price
        this.oracleData = {
          message_hex: result.message_hex,
          signature_hex: result.signature_hex,
          oracle_pubkey_hex: result.oracle_pubkey_hex,
        }
        this.oracleSuccess = true
        this.$q.notify({
          type: 'positive',
          message: `Oracle price: $${result.price}`,
          icon: 'check_circle',
        })
      } catch (err) {
        console.error('Oracle fetch error:', err)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to fetch Oracle price. Check backend is running.',
        })
      } finally {
        this.priceLoading = false
      }
    },

    async onLockFunds() {
      if (!this.canLockFunds) return

      this.locking = true
      try {
        const wc = this.$walletConnect
        if (!wc || !wc.isConnected()) {
          this.$q.notify({
            type: 'negative',
            message: 'Please connect your wallet first',
          })
          return
        }

        const ownerPkhHex = this.getOwnerPkhHex()
        const oraclePkHex = this.oracleData.oracle_pubkey_hex
        const priceTargetCents = Math.floor(this.form.priceTarget * 100)

        if (!oraclePkHex) {
          throw new Error('Oracle public key not loaded. Refresh the price first.')
        }

        const contractAddress = await calculateContractAddress(
          ownerPkhHex,
          ORACLE_PUBKEY, // Use Oracles.cash public key
          priceTargetCents,
        )

        const contract = initializeHodlVaultContract(ownerPkhHex, oraclePkHex, priceTargetCents)

        // Get initial balance (should be 0 for new contract)
        const balance = Number(await getAddressBalance(contractAddress))

        // Store vault info
        this.vault = {
          contractAddress,
          balance: Number(balance),
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex: ORACLE_PUBKEY, // Use hardcoded Oracles.cash public key
          contract, // Store contract instance for withdrawal
          originalFundingAddress: this.walletAddress, // Store original funding address
        }

        // Persist vault so it survives refresh
        this.persistVaultState({
          walletAddress: this.walletAddress,
          contractAddress,
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex: ORACLE_PUBKEY, // Save Oracles.cash public key
          originalFundingAddress: this.walletAddress, // Save original funding address
          createdAt: Date.now(),
        })

        this.$q.notify({
          type: 'positive',
          message: `Vault created at ${contractAddress}`,
          icon: 'check_circle',
        })

        console.log('Vault created. Contract address:', contractAddress)
        console.log('To lock funds, send', this.form.amount, 'satoshis to:', contractAddress)

        // Always start watching balance after vault creation (covers both manual and WalletConnect deposits)
        this.startBalancePolling()

        // Immediately request a deposit from the connected wallet using WalletConnect
        if (typeof wc.request === 'function') {
          this.depositing = true
          try {
            const depositPromise = depositToVault(
              contractAddress,
              this.form.amount,
              (method, params) => wc.request(method, params),
            )
            const depositResult = await Promise.race([
              depositPromise,
              new Promise((resolve) => setTimeout(() => resolve({ txid: null, raw: null }), 20000)),
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
            console.error('Initial deposit via WalletConnect failed:', depositErr)
            this.$q.notify({
              type: 'negative',
              message:
                depositErr?.message ||
                'Deposit rejected by wallet. Please ensure you have enough funds for the amount + fee.',
            })
          } finally {
            this.depositing = false
          }
        } else {
          this.$q.notify({
            type: 'warning',
            message:
              'WalletConnect request function is not available; please send funds manually to the vault address.',
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

    /** Validate BCH CashAddr (bitcoincash:, bchtest:, chipnet:) */
    isValidBchAddress(val) {
      if (!val || typeof val !== 'string') return false
      const trimmed = val.trim()
      return /^(bitcoincash|bchtest|chipnet):[a-zA-Z0-9]+$/i.test(trimmed)
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

      // Use original funding address automatically
      const ownerAddress = this.vault.originalFundingAddress || wc.getAddress()
      if (!ownerAddress) {
        this.$q.notify({ type: 'negative', message: 'Could not get wallet address' })
        return
      }

      if (!this.oracleData.message_hex || !this.oracleData.signature_hex) {
        this.$q.notify({
          type: 'negative',
          message: 'Oracle data missing. Refresh price first.',
        })
        return
      }

      this.withdrawing = true
      try {
        console.log('Simple withdrawal:', {
          from: this.vault.contractAddress,
          to: ownerAddress,
          oracleMessage: this.oracleData.message_hex ? 'present' : 'missing',
          oracleSig: this.oracleData.signature_hex ? 'present' : 'missing',
        })

        const result = await simpleWithdrawal(
          this.vault.contract,
          ownerAddress,
          this.oracleData.message_hex,
          this.oracleData.signature_hex,
          wc.getOwnerPublicKeyHex() || '',
          (method, params) => wc.request(method, params),
        )

        this.$q.notify({
          type: 'positive',
          message: result?.txid
            ? `Withdrawal sent. TX: ${result.txid}`
            : 'Withdrawal processed successfully!',
          icon: 'check_circle',
        })
        await this.refreshVaultBalance()
      } catch (err) {
        console.error('Withdrawal failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to withdraw',
        })
      } finally {
        this.withdrawing = false
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
          (method, params) => wc.request(method, params),
        )
        const depositResult = await Promise.race([
          depositPromise,
          new Promise((resolve) => setTimeout(() => resolve({ txid: null, raw: null }), 20000)),
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
        console.error('Additional deposit via WalletConnect failed:', err)
        this.$q.notify({
          type: 'negative',
          message:
            err?.message ||
            'Deposit rejected by wallet. Please ensure you have enough funds for the amount + fee.',
        })
      } finally {
        this.depositing = false
      }
    },

    formatBalance(balance) {
      return new Intl.NumberFormat('en-US').format(balance)
    },

    async refreshVaultBalance() {
      if (!this.vault || !this.vault.contractAddress) return
      this.balanceRefreshing = true
      try {
        const balance = await getAddressBalance(this.vault.contractAddress)
        this.vault.balance = Number(balance)
      } catch (err) {
        console.error('Failed to refresh balance:', err)
        this.$q.notify({
          type: 'warning',
          message: err?.message || 'Failed to refresh balance',
        })
      } finally {
        this.balanceRefreshing = false
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
          persisted.priceTargetCents,
        )
        this.vault = {
          contractAddress: persisted.contractAddress,
          balance: 0,
          priceTarget: persisted.priceTarget ?? null,
          priceTargetCents: persisted.priceTargetCents,
          ownerPkhHex: persisted.ownerPkhHex,
          oraclePkHex: ORACLE_PUBKEY, // Use hardcoded Oracles.cash public key
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
    }
  },
})
</script>
