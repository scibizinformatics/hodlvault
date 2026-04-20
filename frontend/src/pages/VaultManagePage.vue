<template>
  <q-page class="q-pa-lg" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
    <div class="container">
      <div class="row justify-center">
        <div class="col-12 col-md-8 col-lg-6">
          <!-- Back Button -->
          <div class="q-mb-lg">
            <q-btn
              flat
              color="primary"
              icon="arrow_back"
              label="Back to My Vaults"
              @click="$router.push('/my-vaults')"
            />
          </div>

          <!-- Oracle Status Section -->
          <q-card
            flat
            bordered
            class="q-mb-lg"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'"
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

          <!-- Vault Status Section -->
          <div v-if="vault">
            <q-card flat bordered :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'">
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

                <!-- QR Code -->
                <div class="q-mb-lg">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Vault Deposit QR
                  </label>
                  <div class="row items-center q-gutter-md">
                    <q-card flat bordered class="q-pa-sm flex flex-center">
                      <QrcodeVue :value="vault.contractAddress" :size="160" />
                    </q-card>
                    <div class="text-body2 text-grey-6">
                      Scan this QR in Paytaca to fill the vault address automatically, then enter
                      the amount you want to send.
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
                    />
                  </div>
                </div>

                <!-- Withdrawal Section -->
                <div class="q-mb-lg">
                  <p class="text-caption text-grey-6 q-mb-md">
                    Withdrawal sends vault funds to your original funding address automatically.
                    Your Paytaca must approve the transaction, like receiving from a faucet—you
                    provide the address, then confirm in wallet.
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

          <!-- Empty State -->
          <div v-else class="text-center q-pa-xl">
            <q-card
              flat
              bordered
              class="text-center q-pa-lg"
              :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'"
            >
              <q-icon name="account_balance" size="64px" class="text-grey-6 q-mb-md" />
              <h3 class="text-h5 text-grey-4 q-mb-md">No Vault Selected</h3>
              <p class="text-grey-6 q-mb-lg">Please select a vault from My Vaults to manage it.</p>
              <q-btn
                color="primary"
                label="Go to My Vaults"
                icon="list"
                @click="$router.push('/my-vaults')"
              />
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import QrcodeVue from 'qrcode.vue'
import {
  initializeHodlVaultContract,
  getAddressBalance,
  depositToVault,
} from 'src/services/blockchain'
import { paytacaOptimizedWithdrawal } from 'src/services/paytaca-optimized-withdrawal'
import { fetchOraclePrice } from 'src/services/oracle'
import { vaultStorage } from 'src/services/vault-storage'

export default defineComponent({
  name: 'VaultManagePage',

  components: {
    QrcodeVue,
  },

  data() {
    return {
      additionalDepositAmount: null,
      depositing: false,
      withdrawing: false,
      balanceInterval: null,
      vault: null,
      priceLoading: false,
      oracleSuccess: false,
      currentBchPrice: null,
      oracleData: {
        message_hex: '',
        signature_hex: '',
        oracle_pubkey_hex: '',
      },
      balanceRefreshing: false,
      enableAutoWithdrawal: false,
    }
  },

  computed: {
    hasWallet() {
      return !!this.$store.state.wallet?.address
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

    displayBalance() {
      if (!this.vault) return 0
      return this.vault.balance
    },

    walletAddress() {
      return this.$store.state.wallet?.address ?? null
    },

    chipnetExplorerAddressUrl() {
      if (!this.vault || !this.vault.contractAddress) return ''
      const addr = encodeURIComponent(this.vault.contractAddress)
      return `https://chipnet.bch.ninja/address/${addr}`
    },
  },

  mounted() {
    this.loadSelectedVault()
    this.refreshPrice()
  },

  beforeUnmount() {
    this.stopBalancePolling()
  },

  methods: {
    async loadSelectedVault() {
      try {
        // Get selected vault from localStorage
        const selectedVaultData = localStorage.getItem('hodl-vault-selected-vault')
        if (!selectedVaultData) {
          console.log('No selected vault found')
          return
        }

        let vaultData = JSON.parse(selectedVaultData)
        console.log('Initial vaultData from localStorage:', vaultData)

        // ✅ Defensive: Convert old priceTarget field to priceTargetCents if needed
        if (!vaultData.priceTargetCents && vaultData.priceTarget) {
          vaultData.priceTargetCents = Math.round(vaultData.priceTarget * 100)
          console.log('🔄 Converted priceTarget to priceTargetCents:', vaultData.priceTargetCents)
        }

        // ✅ Check if we have all required fields
        const hasRequiredFields =
          vaultData.ownerPkhHex &&
          vaultData.oraclePkHex &&
          vaultData.priceTargetCents &&
          vaultData.vaultSalt

        if (!hasRequiredFields && vaultData.contractAddress) {
          console.log('⚠️ Incomplete vault data, fetching from backend...')
          const { vaultStorage } = await import('src/services/vault-storage')
          const completeVault = await vaultStorage.getVaultByContractAddressFromBackend(
            vaultData.contractAddress,
          )

          if (completeVault) {
            console.log('✅ Complete vault data fetched from backend:', completeVault)
            vaultData = completeVault
            // Update localStorage with complete data
            localStorage.setItem('hodl-vault-selected-vault', JSON.stringify(completeVault))
          } else {
            console.error('❌ Failed to fetch complete vault data from backend')
            this.$q.notify({
              type: 'negative',
              message: 'Failed to load vault data: Incomplete data',
            })
            return
          }
        }

        // Initialize contract for the selected vault
        const contract = initializeHodlVaultContract(
          vaultData.ownerPkhHex,
          vaultData.oraclePkHex,
          vaultData.priceTargetCents,
          vaultData.vaultSalt,
        )

        // Compute priceTarget (dollars) from priceTargetCents for display
        const priceTargetCents = vaultData.priceTargetCents
        const priceTarget = priceTargetCents / 100

        this.vault = {
          contractAddress: vaultData.contractAddress,
          balance: vaultData.balance || 0,
          priceTarget: priceTarget,
          priceTargetCents: priceTargetCents,
          ownerPkhHex: vaultData.ownerPkhHex,
          oraclePkHex: vaultData.oraclePkHex,
          contract,
          originalFundingAddress: vaultData.originalFundingAddress,
        }

        this.refreshVaultBalance()
        this.startBalancePolling()

        console.log('Selected vault loaded:', vaultData.contractAddress)
      } catch (error) {
        console.error('Failed to load selected vault:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load vault data',
        })
      }
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

    async refreshVaultBalance() {
      if (!this.vault) return

      this.balanceRefreshing = true
      try {
        const balance = Number(await getAddressBalance(this.vault.contractAddress))
        this.vault.balance = balance

        // Update vault balance in storage
        vaultStorage.updateVaultBalance(this.vault.contractAddress, balance)

        console.log('Vault balance refreshed:', balance)
      } catch (error) {
        console.error('Failed to refresh vault balance:', error)
      } finally {
        this.balanceRefreshing = false
      }
    },

    startBalancePolling() {
      this.stopBalancePolling()
      this.balanceInterval = setInterval(() => {
        this.refreshVaultBalance()
      }, 30000) // Poll every 30 seconds
    },

    stopBalancePolling() {
      if (this.balanceInterval) {
        clearInterval(this.balanceInterval)
        this.balanceInterval = null
      }
    },

    async onDepositMore() {
      if (!this.canDepositMore) return

      this.depositing = true
      try {
        const wc = this.$walletConnect
        if (!wc || !wc.isConnected()) {
          this.$q.notify({
            type: 'negative',
            message: 'Please connect your wallet first',
          })
          return
        }

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

        // Reset form
        this.additionalDepositAmount = null

        // Refresh balance after deposit
        setTimeout(() => {
          this.refreshVaultBalance()
        }, 5000)
      } catch (depositErr) {
        console.error('Additional deposit failed:', depositErr)
        this.$q.notify({
          type: 'negative',
          message: `RAW ERROR: ${JSON.stringify(depositErr, null, 2)}`,
          timeout: 15000,
          html: true,
        })
      } finally {
        this.depositing = false
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

      // Use original funding address automatically
      const ownerAddress = this.vault.originalFundingAddress || wc.getAddress()
      if (!ownerAddress) {
        this.$q.notify({ type: 'negative', message: 'Could not get wallet address' })
        return
      }

      if (!this.oracleData.message_hex || !this.oracleData.signature_hex) {
        this.$q.notify({
          type: 'negative',
          message: 'Oracle data not available. Please refresh price.',
        })
        return
      }
      console.log(this.vault)
      this.withdrawing = true
      try {
        await paytacaOptimizedWithdrawal(
          this.vault.contract,
          ownerAddress,
          this.oracleData.message_hex,
          this.oracleData.signature_hex,
        )

        this.$q.notify({
          type: 'positive',
          message: 'Withdrawal successful! Funds have been returned to your wallet.',
          icon: 'check_circle',
        })

        // Refresh balance after withdrawal
        setTimeout(() => {
          this.refreshVaultBalance()
        }, 5000)
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

    formatBalance(satoshis) {
      if (!satoshis) return '0'
      return satoshis.toString()
    },
  },
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.monospace {
  font-family: 'Courier New', monospace;
}

/* Custom primary color override */
.q-btn.color-primary {
  background-color: #00d588 !important;
  color: #000 !important;
}
</style>
