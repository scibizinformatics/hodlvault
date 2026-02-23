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
            label="BCH Amount (satoshis)"
            type="number"
            outlined
            :rules="[
              (val) => val > 0 || 'Amount must be greater than 0',
              (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
            ]"
            hint="Enter amount in satoshis (1 BCH = 100,000,000 satoshis)"
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
            label="Lock Funds"
            :loading="locking"
            :disable="!canLockFunds"
            icon="lock"
          />
          <div v-else-if="hasWallet && !hasPublicKey" class="q-mt-md">
            <q-banner class="bg-warning text-dark">
              <template v-slot:avatar>
                <q-icon name="info" />
              </template>
              Public key not available. Click "Connect Wallet" again to fetch it from Paytaca.
              <template v-slot:action>
                <q-btn flat label="Go to Home" @click="goToHome" />
              </template>
            </q-banner>
          </div>
          <q-btn
            v-else
            color="grey-7"
            label="Connect Wallet First"
            icon="account_balance_wallet"
            @click="goToHome"
          />
        </q-form>
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
  getContractBalance,
  spendVault,
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
      locking: false,
      withdrawing: false,
      vault: null,
      priceLoading: false,
      oracleSuccess: false,
      currentBchPrice: null,
      oracleData: {
        message_hex: '',
        signature_hex: '',
        oracle_pubkey_hex: '',
      },
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
  },

  methods: {
    /**
     * Get owner PKH derived from the connected/generated wallet's public key.
     * Returns null if no wallet is connected or signer not set.
     */
    getOwnerPkhHex() {
      const ownerPkHex = this.$store.state.wallet?.publicKey ?? this.$walletConnect?.getOwnerPublicKeyHex?.() ?? null
      if (!ownerPkHex) return null
      return this.derivePkhFromPublicKey(ownerPkHex)
    },

    goToHome() {
      this.$router.push('/')
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

      this.locking = true
      try {
        const ownerPkhHex = this.getOwnerPkhHex()
        const oraclePkHex = this.oracleData.oracle_pubkey_hex
        const priceTarget = Math.floor(this.form.priceTarget * 100)

        if (!oraclePkHex) {
          throw new Error('Oracle public key not loaded. Refresh the price first.')
        }

        const contractAddress = await calculateContractAddress(
          ownerPkhHex,
          oraclePkHex,
          priceTarget
        )

        const contract = initializeHodlVaultContract(
          ownerPkhHex,
          oraclePkHex,
          priceTarget
        )

        // Get initial balance (should be 0 for new contract)
        const balance = Number(await getContractBalance(contract))

        // Store vault info
        this.vault = {
          contractAddress,
          balance: Number(balance),
          priceTarget: this.form.priceTarget,
          contract, // Store contract instance for withdrawal
        }

        this.$q.notify({
          type: 'positive',
          message: `Vault created at ${contractAddress}`,
          icon: 'check_circle',
        })

        console.log('Vault created. Contract address:', contractAddress)
        console.log('To lock funds, send', this.form.amount, 'satoshis to:', contractAddress)
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to create vault',
        })
      } finally {
        this.locking = false
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
      if (this.vault && this.vault.contract) {
        try {
          const balance = await getContractBalance(this.vault.contract)
          this.vault.balance = Number(balance)
        } catch (err) {
          console.error('Failed to refresh balance:', err)
        }
      }
    },
  },

  mounted() {
    this.refreshPrice()
    if (this.vault) {
      this.refreshVaultBalance()
      this.balanceInterval = setInterval(() => {
        this.refreshVaultBalance()
      }, 30000)
    }
  },

  beforeUnmount() {
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval)
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
