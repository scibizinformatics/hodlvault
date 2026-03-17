<template>
  <q-page class="q-pa-lg" style="background-color: #121212">
    <div class="container">
      <div class="row justify-center">
        <div class="col-12 col-md-8 col-lg-6">
          <!-- Oracle Status Section -->
          <q-card
            flat
            bordered
            class="q-mb-lg"
            style="background-color: #1e1e1e; border-color: #333"
          >
            <q-card-section class="row items-center q-gutter-md">
              <div v-if="priceLoading" class="row items-center q-gutter-sm">
                <q-spinner-dots color="primary" size="32px" />
                <span class="text-grey-4">Fetching Oracle price...</span>
              </div>
              <div v-else-if="oracleSuccess" class="row items-center q-gutter-sm full-width">
                <q-icon name="check_circle" color="positive" size="32px" />
                <div>
                  <div class="text-subtitle1 text-weight-medium text-positive">
                    Oracle data received
                  </div>
                  <div class="text-caption text-grey-6">
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
                  class="q-ml-auto text-primary"
                />
              </div>
              <div v-else class="row items-center q-gutter-sm">
                <q-icon name="warning" color="orange" size="32px" />
                <span class="text-grey-4">
                  Oracle price unavailable. Check that the backend is running at
                  https://oracle1.mainnet.cash
                </span>
                <q-btn flat dense label="Retry" @click="refreshPrice" color="primary" />
              </div>
            </q-card-section>
          </q-card>

          <!-- Create Vault Section -->
          <q-card
            flat
            bordered
            class="q-mb-lg"
            style="background-color: #1e1e1e; border-color: #333"
          >
            <q-card-section class="text-center">
              <h2 class="text-h4 text-weight-bold text-white q-mb-md">Create New Vault</h2>
              <p class="text-grey-6 q-mb-lg">Lock your BCH until your target price is reached</p>
            </q-card-section>

            <q-card-section>
              <q-form @submit="onLockFunds" class="q-gutter-md">
                <!-- Connected Address Display -->
                <div class="q-mb-lg">
                  <q-card
                    flat
                    bordered
                    class="q-pa-md"
                    style="background-color: #2a2a2a; border-color: #444"
                  >
                    <div class="text-subtitle2 text-grey-4 q-mb-sm">Connected Address</div>
                    <div class="text-caption text-primary q-mb-xs">
                      {{ walletAddress || 'Not Connected' }}
                    </div>
                    <div class="text-caption text-grey-6">
                      Balance: {{ walletBalance || '0' }} BCH
                    </div>
                  </q-card>
                </div>

                <!-- Amount Input -->
                <div class="q-mb-lg">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Amount to Deposit (satoshis)
                  </label>
                  <q-input
                    v-model.number="form.amount"
                    type="number"
                    outlined
                    dark
                    placeholder="Enter amount in satoshis"
                    class="text-h6"
                    input-class="text-center"
                    style="background-color: #2a2a2a"
                    :rules="[
                      (val) => val > 0 || 'Amount must be greater than 0',
                      (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
                    ]"
                    hint="This amount will be requested from your Paytaca wallet to fund contract"
                    persistent-hint
                  >
                    <template v-slot:prepend>
                      <q-icon name="currency_bitcoin" color="primary" />
                    </template>
                  </q-input>
                </div>

                <!-- Target Price Input -->
                <div class="q-mb-lg">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Target Price (USD)
                  </label>
                  <q-input
                    v-model.number="form.priceTarget"
                    type="number"
                    step="0.01"
                    min="0.01"
                    outlined
                    dark
                    placeholder="Enter your target price per BCH"
                    class="text-h6"
                    input-class="text-center"
                    style="background-color: #2a2a2a"
                    :rules="[(val) => val > 0 || 'Price target must be greater than 0']"
                    :hint="
                      currentBchPrice
                        ? `Current BCH Price: $${currentBchPrice}`
                        : 'Fetching current price...'
                    "
                    persistent-hint
                  >
                    <template v-slot:prepend>
                      <q-icon name="attach_money" color="primary" />
                    </template>
                    <template v-slot:append>
                      <q-spinner v-if="priceLoading" size="sm" color="primary" />
                    </template>
                  </q-input>
                </div>

                <!-- Auto-Withdrawal Option -->
                <div class="q-mb-lg">
                  <q-toggle
                    v-model="enableAutoWithdrawal"
                    label="Enable Auto-Withdrawal (Create, Fund, Forget)"
                    color="primary"
                    size="lg"
                    class="text-grey-4"
                  >
                    <q-tooltip>
                      Automatically withdraw funds when price target is met. Requires pre-signing
                      multiple transactions.
                    </q-tooltip>
                  </q-toggle>

                  <div v-if="enableAutoWithdrawal" class="q-mt-sm">
                    <q-banner class="bg-primary text-black">
                      <template v-slot:avatar>
                        <q-icon name="auto_awesome" />
                      </template>
                      <div class="text-body2">
                        <strong>Create, Fund, Forget Mode:</strong><br />
                        • Pre-sign withdrawal transactions for multiple price targets<br />
                        • System automatically monitors price and executes withdrawal<br />
                        • No manual action required when target is met<br />
                        • You'll be asked to sign multiple transactions during vault creation
                      </div>
                    </q-banner>
                  </div>
                </div>

                <!-- Submit Button -->
                <div class="row justify-center q-mt-lg">
                  <q-btn
                    type="submit"
                    color="primary"
                    label="LOCK FUNDS"
                    :loading="locking || depositing"
                    :disable="!canLockFunds"
                    icon="lock"
                    size="lg"
                    class="text-weight-bold"
                    style="background-color: #00d588; color: #000"
                    padding="md xl"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>

          <!-- Wallet Connection Status -->
          <div v-if="!hasWallet" class="q-mt-md">
            <q-banner class="bg-warning text-dark">
              <template v-slot:avatar>
                <q-icon name="warning" />
              </template>
              Connect your wallet to create a vault.
              <template v-slot:action>
                <q-btn color="primary" label="Connect Wallet" @click="$router.push('/')" />
              </template>
            </q-banner>
          </div>
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

          <!-- Deposit Status -->
          <div v-if="depositing" class="q-mt-sm">
            <q-banner class="bg-info text-white">
              <template v-slot:avatar>
                <q-spinner-dots color="white" size="24px" />
              </template>
              Waiting for Deposit... Confirm payment in your Paytaca wallet.
            </q-banner>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault Status Section -->
    <div v-if="vault" class="container q-mt-lg">
      <div class="row justify-center">
        <div class="col-12 col-md-8 col-lg-6">
          <q-card flat bordered style="background-color: #1e1e1e; border-color: #333">
            <q-card-section>
              <h3 class="text-h5 text-weight-bold text-white q-mb-md">Vault Status</h3>

              <!-- Contract Address -->
              <div class="q-mb-lg">
                <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                  Contract Address
                </label>
                <q-input
                  :model-value="vault.contractAddress"
                  readonly
                  outlined
                  dark
                  class="monospace text-primary"
                  input-class="text-select"
                  style="background-color: #2a2a2a"
                />
              </div>

              <!-- Balance -->
              <div class="q-mb-lg">
                <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                  Balance
                </label>
                <div class="row items-center q-gutter-sm">
                  <q-input
                    :model-value="formatBalance(displayBalance)"
                    readonly
                    outlined
                    dark
                    suffix="satoshis"
                    class="col"
                    style="background-color: #2a2a2a"
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
                <p class="text-caption text-grey-6 q-mt-xs q-mb-none">
                  Live from chipnet blockchain. Clearing site data does not move funds—your vault
                  address stays the same; re-enter the same vault settings to see this balance
                  again.
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

              <!-- Deposit More -->
              <div class="q-mb-lg">
                <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                  Deposit More into Vault
                </label>
                <div class="row q-col-gutter-sm items-center">
                  <div class="col-12 col-md-6">
                    <q-input
                      v-model.number="additionalDepositAmount"
                      label="Additional amount (satoshis)"
                      type="number"
                      outlined
                      dark
                      style="background-color: #2a2a2a"
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
                      style="background-color: #00d588; color: #000"
                    />
                  </div>
                </div>
              </div>

              <!-- QR Code -->
              <div class="q-mb-lg">
                <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                  Vault Deposit QR
                </label>
                <div class="row items-center q-gutter-md">
                  <q-card
                    flat
                    bordered
                    class="q-pa-sm flex flex-center"
                    style="background-color: #2a2a2a; border-color: #444"
                  >
                    <QrcodeVue :value="vault.contractAddress" :size="160" />
                  </q-card>
                  <div class="text-body2 text-grey-6">
                    Scan this QR in Paytaca to fill the vault address automatically, then enter the
                    amount you want to send.
                  </div>
                </div>
              </div>

              <!-- Price Information -->
              <div class="row q-gutter-md q-mb-lg">
                <div class="col-12 col-md-6">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Target Price
                  </label>
                  <q-input
                    :model-value="`$${vault.priceTarget.toFixed(2)}`"
                    readonly
                    outlined
                    dark
                    style="background-color: #2a2a2a"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Current BCH Price (Oracle)
                  </label>
                  <q-input
                    :model-value="
                      currentBchPrice != null ? `$${Number(currentBchPrice).toFixed(2)}` : '—'
                    "
                    readonly
                    outlined
                    dark
                    :color="canWithdraw ? 'positive' : 'negative'"
                    style="background-color: #2a2a2a"
                  />
                </div>
              </div>

              <!-- Withdrawal Section -->
              <div class="q-mb-lg">
                <p class="text-caption text-grey-6 q-mb-md">
                  Withdrawal sends vault funds to your original funding address automatically. Your
                  Paytaca must approve the transaction, like receiving from a faucet—you provide the
                  address, then confirm in wallet.
                </p>
                <div class="row justify-center">
                  <q-btn
                    color="primary"
                    label="Withdraw"
                    :loading="withdrawing"
                    :disable="!canWithdraw"
                    icon="account_balance"
                    size="lg"
                    class="text-weight-bold"
                    style="background-color: #00d588; color: #000"
                    padding="md xl"
                    @click="onWithdraw"
                  />
                </div>
                <div
                  v-if="!canWithdraw && vault"
                  class="text-caption text-negative q-mt-xs text-center"
                >
                  Current price (${ currentBchPrice != null ? Number(currentBchPrice).toFixed(2) :
                  '?' }}) is below target price (${{ vault.priceTarget.toFixed(2) }})
                </div>
              </div>

              <!-- Auto-Withdrawal Status -->
              <div v-if="enableAutoWithdrawal" class="q-mt-md">
                <q-banner class="bg-positive text-white">
                  <template v-slot:avatar>
                    <q-icon name="auto_awesome" />
                  </template>
                  <div class="text-body2">
                    <strong>Auto-Withdrawal Active</strong><br />
                    • System will automatically withdraw when price target is met<br />
                    • No manual action required<br />
                    • Funds will return to: {{ vault.originalFundingAddress }}
                  </div>
                </q-banner>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
    <!-- Empty State -->
    <div v-if="!vault" class="container q-mt-lg">
      <div class="row justify-center">
        <div class="col-12 col-md-8 col-lg-6">
          <q-card
            flat
            bordered
            class="text-center q-pa-lg"
            style="background-color: #1e1e1e; border-color: #333"
          >
            <div class="text-grey-6">No active vault. Create a vault above to get started.</div>
          </q-card>
        </div>
      </div>
    </div>
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
import { paytacaOptimizedWithdrawal } from 'src/services/paytaca-optimized-withdrawal'
import { fetchOraclePrice, ORACLE_PUBKEY } from 'src/services/oracle'
import { hash160, hexToBin, binToHex } from '@bitauth/libauth'
import { autoWithdrawalService } from 'src/services/auto-withdrawal'
import { preSigningService } from 'src/services/pre-signing'

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

      // Pre-signing functionality
      preSigning: false,
      enableAutoWithdrawal: false,
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

    walletBalance() {
      // This would need to be implemented based on your wallet store structure
      return this.$store.state.wallet?.balance ?? '0'
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
          message: `RAW ERROR: ${JSON.stringify(err, null, 2)}`,
          timeout: 15000,
          html: true,
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

        // NEW: Pre-signing for auto-withdrawal
        if (this.enableAutoWithdrawal) {
          await this.preSignWithdrawals()
        }

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
              message: `RAW ERROR: ${JSON.stringify(depositErr, null, 2)}`,
              timeout: 15000,
              html: true,
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
        console.error('Vault creation failed:', err)
        this.$q.notify({
          type: 'negative',
          message: `RAW ERROR: ${JSON.stringify(err, null, 2)}`,
          timeout: 15000,
          html: true,
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
        console.error('Identity verification failed:', err)
        this.$q.notify({
          type: 'negative',
          message: `RAW ERROR: ${JSON.stringify(err, null, 2)}`,
          timeout: 15000,
          html: true,
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

        const result = await paytacaOptimizedWithdrawal(
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
          message: `RAW ERROR: ${JSON.stringify(err, null, 2)}`,
          timeout: 15000,
          html: true,
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

    /**
     * Pre-sign withdrawal transactions for automated withdrawals
     */
    async preSignWithdrawals() {
      if (!this.vault || !this.enableAutoWithdrawal) return

      this.preSigning = true
      try {
        const wc = this.$walletConnect
        if (!wc || !wc.isConnected()) {
          throw new Error('Wallet not connected for pre-signing')
        }

        this.$q.notify({
          type: 'info',
          message: 'Preparing pre-signed transactions for auto-withdrawal...',
          icon: 'settings',
        })

        // Generate pre-signed transactions for various price targets
        const transactions = await preSigningService.generatePreSignedTransactions(
          this.vault,
          (method, params) => wc.request(method, params),
          this.$store,
        )

        if (transactions.length > 0) {
          this.$q.notify({
            type: 'positive',
            message: `Successfully pre-signed ${transactions.length} withdrawal transactions!`,
            icon: 'check_circle',
          })

          // Add vault to auto-withdrawal monitoring
          autoWithdrawalService.addVault(this.vault)

          // Start monitoring if not already running
          autoWithdrawalService.startMonitoring()

          console.log(
            `Pre-signed ${transactions.length} transactions for vault ${this.vault.contractAddress}`,
          )
        } else {
          throw new Error('No pre-signed transactions were created')
        }
      } catch (error) {
        console.error('Pre-signing failed:', error)
        this.$q.notify({
          type: 'negative',
          message: `Pre-signing failed: ${error.message}`,
          icon: 'error',
        })

        // Disable auto-withdrawal if pre-signing failed
        this.enableAutoWithdrawal = false
      } finally {
        this.preSigning = false
      }
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

    // Initialize auto-withdrawal service with Vuex store
    autoWithdrawalService.init(this.$store)

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
