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
                <div class="q-mb-md">
                  <h3 class="text-h5 text-weight-bold text-white q-mb-xs">Vault Status</h3>
                  <div class="text-subtitle1 text-primary text-weight-medium">
                    {{ vault.name || 'Unnamed Vault' }}
                  </div>
                </div>

                <!-- Contract Address -->
                <div class="q-mb-lg">
                  <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                    Contract Address
                  </label>
                  <div class="row items-center q-gutter-sm">
                    <q-input
                      :model-value="vault.contractAddress"
                      readonly
                      outlined
                      dark
                      class="monospace text-primary col"
                      input-class="text-select"
                    />
                    <q-btn
                      flat
                      dense
                      round
                      icon="content_copy"
                      color="primary"
                      @click="copyContractAddress"
                      aria-label="Copy contract address"
                    >
                      <q-tooltip>Copy address to clipboard</q-tooltip>
                    </q-btn>
                  </div>
                </div>

                <!-- QR Code Button (efficient UX: only poll when user intends to deposit) -->
                <div class="q-mb-lg">
                  <q-btn
                    :color="showQRCode ? 'negative' : 'primary'"
                    :icon="showQRCode ? 'visibility_off' : 'qr_code'"
                    :label="showQRCode ? 'Hide QR Code' : 'Show QR Code to Deposit'"
                    size="md"
                    class="q-mb-md"
                    @click="toggleQRCode"
                  />

                  <q-slide-transition>
                    <div v-show="showQRCode">
                      <label class="text-subtitle2 text-weight-medium text-grey-4 q-mb-sm block">
                        Vault Deposit QR
                      </label>
                      <div class="row items-center q-gutter-md">
                        <q-card flat bordered class="q-pa-sm flex flex-center">
                          <QrcodeVue :value="vault.contractAddress" :size="160" />
                        </q-card>
                        <div class="text-body2 text-grey-6">
                          Scan this QR in Paytaca to fill the vault address automatically, then
                          enter the amount you want to send.
                          <br />
                          <span class="text-positive text-weight-medium">
                            Balance updates automatically when deposit is detected.
                          </span>
                        </div>
                      </div>
                    </div>
                  </q-slide-transition>
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
                      :color="canWithdraw ? 'primary' : 'grey-6'"
                      label="Withdraw"
                      :loading="withdrawing"
                      :disable="!canWithdraw"
                      icon="account_balance"
                      size="lg"
                      :class="canWithdraw ? 'text-weight-bold' : 'text-weight-regular'"
                      padding="md xl"
                      @click="onWithdraw"
                    >
                      <q-tooltip v-if="!canWithdraw && vault">
                        <span v-if="!vault.balance || vault.balance <= 0"
                          >Vault has no balance to withdraw</span
                        >
                        <span
                          v-else-if="currentBchPrice && Number(currentBchPrice) < vault.priceTarget"
                        >
                          Current BCH price (${{ Number(currentBchPrice).toFixed(2) }}) is below
                          your target (${{ vault.priceTarget.toFixed(2) }})
                        </span>
                      </q-tooltip>
                    </q-btn>
                  </div>

                  <!-- Status Banner -->
                  <div v-if="vault && currentBchPrice" class="q-mt-md">
                    <q-banner
                      :class="canWithdraw ? 'bg-positive text-white' : 'bg-grey-3 text-grey-8'"
                      rounded
                      dense
                    >
                      <template v-slot:avatar>
                        <q-icon :name="canWithdraw ? 'lock_open' : 'lock'" />
                      </template>
                      <div class="text-body2">
                        <span v-if="canWithdraw">
                          <strong>Withdrawal Available</strong><br />
                          Target price of ${{ vault.priceTarget.toFixed(2) }} has been reached!
                        </span>
                        <span v-else>
                          <strong>Withdrawal Locked</strong><br />
                          <span v-if="!vault.balance || vault.balance <= 0">
                            Vault is empty - deposit funds first
                          </span>
                          <span
                            v-else-if="
                              currentBchPrice && Number(currentBchPrice) < vault.priceTarget
                            "
                          >
                            Waiting for BCH to reach ${{ vault.priceTarget.toFixed(2) }} (currently
                            ${{ Number(currentBchPrice).toFixed(2) }})
                          </span>
                        </span>
                      </div>
                    </q-banner>
                  </div>
                </div>

                <!-- Auto-Withdrawal Status -->
                <div v-if="vault && vault.autoWithdrawal" class="q-mt-md">
                  <q-banner class="bg-positive text-white">
                    <template v-slot:avatar>
                      <q-icon name="auto_awesome" />
                    </template>
                    <div class="text-body2">
                      <strong>Auto-Withdrawal Active</strong><br />
                      • Server monitors oracle prices 24/7<br />
                      • Automatically withdraws when price target is reached<br />
                      • Works even when you're offline<br />
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
import { initializeHodlVaultContract, getAddressBalance } from 'src/services/blockchain'
import { paytacaOptimizedWithdrawal } from 'src/services/paytaca-optimized-withdrawal'
import { fetchOraclePrice } from 'src/services/oracle'
import { vaultStorage } from 'src/services/vault-storage'
import { connectSSE, disconnectSSE } from 'src/services/sse.service'

export default defineComponent({
  name: 'VaultManagePage',

  components: {
    QrcodeVue,
  },

  data() {
    return {
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
      showQRCode: false, // ✅ QR code hidden by default until user clicks button
      depositPollTimeout: null, // Track rapid polling timeout for cleanup
    }
  },

  computed: {
    hasWallet() {
      return !!this.$store.state.wallet?.address
    },

    canWithdraw() {
      if (!this.vault) return false
      if (this.currentBchPrice == null) return false
      // ✅ Check vault has balance to withdraw
      const hasBalance = this.vault.balance > 0
      const targetReached = Number(this.currentBchPrice) >= this.vault.priceTarget
      return hasBalance && targetReached
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

    // ✅ Connect to real-time SSE updates
    connectSSE()

    // Listen for vault withdrawal events (in case this vault is auto-withdrawn)
    window.addEventListener('vault-withdrawn', this.handleVaultWithdrawn)

    // Listen for deposit confirmation events (real-time balance updates)
    window.addEventListener('deposit-confirmed', this.handleDepositConfirmed)
  },

  beforeUnmount() {
    // Stop any active watching
    this.stopDepositWatch()
    this.stopBalancePolling()

    // ✅ Disconnect SSE and remove event listeners
    disconnectSSE()
    window.removeEventListener('vault-withdrawn', this.handleVaultWithdrawn)
    window.removeEventListener('deposit-confirmed', this.handleDepositConfirmed)
  },

  methods: {
    /**
     * Handle real-time vault withdrawal event from SSE
     */
    handleVaultWithdrawn(event) {
      const { vaultId, contractAddress, amountSatoshis } = event.detail
      console.log('[SSE] Vault withdrawn in real-time:', {
        vaultId,
        contractAddress,
        amountSatoshis,
      })

      // Check if this is the current vault being viewed
      if (this.vault && this.vault.contractAddress === contractAddress) {
        // Update vault status immediately
        this.vault.status = 'withdrawn'
        this.vault.balance = 0

        // Show notification
        this.$q.notify({
          type: 'positive',
          message: `Auto-withdrawal complete! ${(amountSatoshis / 100000000).toFixed(8)} BCH returned to your wallet`,
          timeout: 8000,
        })

        // Redirect to My Vaults after a delay
        setTimeout(() => {
          this.$router.push('/my-vaults')
        }, 3000)
      }
    },

    /**
     * Handle real-time deposit confirmation event from SSE
     */
    handleDepositConfirmed(event) {
      const { vaultId, contractAddress, amountSatoshis, newBalance } = event.detail
      console.log('[SSE] Deposit confirmed in real-time:', {
        vaultId,
        contractAddress,
        amountSatoshis,
        newBalance,
      })

      // Check if this is the current vault being viewed
      if (this.vault && this.vault.contractAddress === contractAddress) {
        // Update balance
        if (newBalance !== undefined && newBalance !== null) {
          this.vault.balance = newBalance
        }

        // Hide QR code
        this.showQRCode = false

        // Notify user
        this.$q.notify({
          type: 'positive',
          message: `Deposit confirmed! +${amountSatoshis} satoshis`,
          icon: 'check_circle',
          timeout: 5000,
        })

        console.log('[SSE] Balance updated to:', this.vault.balance)
      }
    },

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
          _id: vaultData._id || vaultData.id, // ✅ Include MongoDB ID for delete operations
          name: vaultData.name || 'Unnamed Vault', // ✅ Include vault name for activity logs
          contractAddress: vaultData.contractAddress,
          balance: vaultData.balance || 0,
          priceTarget: priceTarget,
          priceTargetCents: priceTargetCents,
          ownerPkhHex: vaultData.ownerPkhHex,
          oraclePkHex: vaultData.oraclePkHex,
          contract,
          originalFundingAddress: vaultData.originalFundingAddress,
          autoWithdrawal: !!vaultData.autoWithdrawal, // Auto-withdrawal flag from backend
        }

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

    async refreshVaultBalanceSilent() {
      if (!this.vault?.contractAddress) return

      try {
        const { getAddressBalance } = await import('src/services/blockchain')
        const balance = Number(await getAddressBalance(this.vault.contractAddress))

        // Only update if changed to avoid unnecessary re-renders
        if (this.vault.balance !== balance) {
          this.vault.balance = balance
          try {
            await vaultStorage.updateVaultBalance(this.vault.contractAddress, balance)
            console.log('Balance updated silently:', balance)
          } catch (storageError) {
            // If vault not found (404), it was likely auto-deleted - stop polling
            if (storageError.response?.status === 404) {
              console.log(
                '[VaultManage] Vault not found (404) - stopping polling (likely auto-deleted)',
              )
              this.stopBalancePolling()
            }
          }
        }
      } catch (error) {
        // Silently fail - don't show error to user
        console.warn('Silent balance refresh failed:', error)
      }
    },

    stopBalancePolling() {
      if (this.balanceInterval) {
        clearInterval(this.balanceInterval)
        this.balanceInterval = null
      }
    },

    /**
     * Toggle QR code display
     * ✅ SSE-Only: Tell backend to watch/unwatch for deposits
     */
    async toggleQRCode() {
      this.showQRCode = !this.showQRCode

      if (this.showQRCode) {
        // User wants to deposit - tell backend to watch
        console.log('👁️ QR code shown - telling backend to watch for deposit')
        await this.startDepositWatch()
      } else {
        // User closed QR - tell backend to stop watching
        console.log('🛑 QR code hidden - stopping backend watch')
        await this.stopDepositWatch()
      }
    },

    /**
     * ✅ SSE-Only: Tell backend to watch for deposit
     */
    async startDepositWatch() {
      try {
        const { activityLogApi } = await import('src/services/activity-log-api.js')

        await activityLogApi.watchDeposit({
          vaultId: this.vault._id,
          vaultName: this.vault.name || 'Unnamed Vault',
          contractAddress: this.vault.contractAddress,
          expectedAmount: null,
        })

        console.log('👁️ Backend watching for deposit to:', this.vault.contractAddress)
        this.$q.notify({
          type: 'info',
          message: 'Send funds to the address above. You will be notified when confirmed.',
          timeout: 5000,
        })
      } catch (error) {
        console.error('Failed to start deposit watch:', error)
        this.$q.notify({
          type: 'info',
          message: 'Send funds to the vault address. This page will update automatically.',
          timeout: 10000,
        })
      }
    },

    /**
     * ✅ SSE-Only: Tell backend to stop watching
     */
    async stopDepositWatch() {
      try {
        const { activityLogApi } = await import('src/services/activity-log-api.js')
        await activityLogApi.stopWatchingDeposit(this.vault.contractAddress)
        console.log('🛑 Stopped watching for deposit to:', this.vault.contractAddress)
      } catch (error) {
        console.warn('Failed to stop deposit watch:', error.message)
      }
    },

    /**
     * Copy contract address to clipboard
     */
    async copyContractAddress() {
      try {
        await navigator.clipboard.writeText(this.vault.contractAddress)
        this.$q.notify({
          type: 'positive',
          message: 'Contract address copied to clipboard',
          icon: 'content_copy',
          timeout: 2000,
        })
      } catch (err) {
        console.error('Failed to copy address:', err)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to copy address. Please select and copy manually.',
          timeout: 3000,
        })
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
        const result = await paytacaOptimizedWithdrawal(
          this.vault.contract,
          ownerAddress,
          this.oracleData.message_hex,
          this.oracleData.signature_hex,
        )

        // ✅ Check result before showing success message
        if (result?.success) {
          this.$q.notify({
            type: 'positive',
            message: `Withdrawal successful! Vault will be removed.${result.amountSatoshis ? ` (${result.amountSatoshis} sats)` : ''}`,
            icon: 'check_circle',
          })

          // ✅ Log withdrawal activity
          try {
            const { activityLogApi } = await import('src/services/activity-log-api.js')
            await activityLogApi.logWithdrawal({
              vaultId: this.vault._id,
              vaultName: this.vault.name || 'Unnamed Vault',
              contractAddress: this.vault.contractAddress,
              amountSatoshis: result.amountSatoshis || this.vault.balance || 0,
              txHash: result.txHash,
            })
            console.log('✅ Withdrawal activity logged')
          } catch (logError) {
            console.warn('⚠️ Failed to log withdrawal activity:', logError)
          }

          // ✅ Delete vault from backend and localStorage
          if (this.vault) {
            const vaultId = this.vault._id || this.vault.id
            console.log('🗑️ Deleting vault:', {
              contractAddress: this.vault.contractAddress,
              vaultId: vaultId,
            })
            try {
              await vaultStorage.deleteVault(this.vault.contractAddress, vaultId)
              console.log('✅ Vault deleted after successful withdrawal')
              this.$q.notify({
                type: 'positive',
                message: 'Vault removed from your list',
                timeout: 2000,
              })
            } catch (deleteError) {
              console.error('❌ Failed to delete vault:', deleteError)
              this.$q.notify({
                type: 'warning',
                message:
                  'Withdrawal succeeded but vault cleanup failed. It will disappear on next refresh.',
                timeout: 5000,
              })
            }
          }

          // ✅ Redirect to My Vaults page after short delay
          setTimeout(() => {
            this.$router.push('/my-vaults')
          }, 1500)
        } else {
          // ✅ Show actual error from the service
          this.$q.notify({
            type: 'negative',
            message: result?.error || 'Withdrawal failed - no transaction was sent',
            timeout: 8000,
          })
        }
      } catch (err) {
        console.error('Withdrawal failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err.message || 'Withdrawal failed unexpectedly',
          timeout: 8000,
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
