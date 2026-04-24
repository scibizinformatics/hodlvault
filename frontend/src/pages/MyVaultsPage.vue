<template>
  <q-page class="q-pa-lg" :class="$q.dark.isActive ? 'bg-dark' : 'bg-white'">
    <div class="container">
      <div class="row justify-center">
        <div class="col-12 col-md-10 col-lg-8">
          <!-- Header -->
          <div class="text-center q-mb-xl">
            <h1
              class="text-h4 text-weight-bold"
              :class="$q.dark.isActive ? 'text-white' : 'text-grey-9'"
              q-mb-md
            >
              My Vaults
            </h1>
            <p :class="$q.dark.isActive ? 'text-grey-6' : 'text-grey-7'" q-mb-lg>
              Manage all your BCH HODL vaults in one place
            </p>

            <!-- Connected Wallet Info -->
            <q-card
              flat
              bordered
              class="q-pa-md inline-block"
              :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'"
            >
              <div
                class="text-subtitle2"
                :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'"
                q-mb-sm
              >
                Connected Wallet
              </div>
              <div class="text-body2 text-primary">
                {{ connectedAddress || 'Not Connected' }}
              </div>
            </q-card>

            <!-- Activity History Button -->
            <div class="q-mt-md">
              <q-btn
                flat
                color="primary"
                icon="history"
                label="Activity History"
                @click="showActivityHistory = true"
              />
            </div>
          </div>

          <!-- Vault List -->
          <div v-if="loading" class="text-center q-pa-xl">
            <q-spinner-dots color="primary" size="64px" />
            <div :class="$q.dark.isActive ? 'text-grey-4' : 'text-grey-7'" class="q-mt-md">
              Loading your vaults...
            </div>
          </div>

          <div v-else-if="vaults.length === 0" class="text-center q-pa-xl">
            <q-icon
              name="account_balance"
              size="64px"
              :class="$q.dark.isActive ? 'text-grey-6 q-mb-md' : 'text-grey-7 q-mb-md'"
            />
            <h3
              class="text-h5"
              :class="$q.dark.isActive ? 'text-grey-4 q-mb-md' : 'text-grey-7 q-mb-md'"
            >
              No Vaults Found
            </h3>
            <p :class="$q.dark.isActive ? 'text-grey-6' : 'text-grey-8'" q-mb-lg>
              You haven't created any vaults yet. Start by creating your first HODL vault.
            </p>
            <q-btn
              color="primary"
              label="Create Your First Vault"
              icon="add_circle"
              size="lg"
              class="text-weight-bold"
              style="background-color: #00d588; color: #000"
              @click="$router.push('/vault')"
            />
          </div>

          <div v-else class="q-gutter-md">
            <!-- Vault Summary Cards -->
            <q-card
              v-for="vault in vaults"
              :key="vault.id"
              flat
              bordered
              class="vault-card cursor-pointer"
              style="background-color: #1e1e1e; border-color: #333"
              @click="selectVault(vault)"
            >
              <q-card-section class="q-pa-lg">
                <div class="row items-center q-gutter-md">
                  <!-- Vault Icon and Status -->
                  <div class="col-auto">
                    <q-avatar
                      :color="vault.canWithdraw ? 'positive' : 'primary'"
                      text-color="black"
                      size="64px"
                      class="text-weight-bold"
                    >
                      <q-icon name="account_balance" size="32px" />
                    </q-avatar>
                  </div>

                  <!-- Vault Info -->
                  <div class="col">
                    <div class="text-h6 text-weight-bold text-white q-mb-sm">
                      {{ vault.name || `Vault #${vault.contractAddress.slice(-8)}` }}
                    </div>

                    <div class="row q-gutter-md text-body2">
                      <div class="col-auto">
                        <div class="text-grey-5">Balance</div>
                        <div class="text-white text-weight-medium">
                          {{ formatBalance(vault.balance) }} satoshis
                        </div>
                      </div>

                      <div class="col-auto">
                        <div class="text-grey-5">Target Price</div>
                        <div class="text-white text-weight-medium">
                          ${{ vault.priceTarget.toFixed(2) }}
                        </div>
                      </div>

                      <div class="col-auto">
                        <div class="text-grey-5">Current Price</div>
                        <div class="text-white text-weight-medium">
                          ${{ currentBchPrice ? currentBchPrice.toFixed(2) : 'Loading...' }}
                        </div>
                      </div>
                    </div>

                    <!-- Creation Date -->
                    <div class="text-caption text-grey-6 q-mt-sm">
                      Created: {{ formatDate(vault.createdAt) }}
                    </div>

                    <!-- Status Badge -->
                    <div class="q-mt-sm">
                      <q-chip
                        :color="vault.canWithdraw ? 'positive' : 'warning'"
                        text-color="white"
                        size="sm"
                        class="text-weight-medium"
                      >
                        <q-icon
                          :name="vault.canWithdraw ? 'check_circle' : 'lock'"
                          class="q-mr-xs"
                        />
                        {{ vault.canWithdraw ? 'Ready to Withdraw' : 'HODLing' }}
                      </q-chip>
                    </div>
                  </div>

                  <!-- Action Button -->
                  <div class="col-auto">
                    <q-btn
                      flat
                      dense
                      round
                      color="primary"
                      icon="arrow_forward"
                      @click.stop="selectVault(vault)"
                    />
                  </div>
                </div>
              </q-card-section>

              <!-- Progress Bar -->
              <q-linear-progress
                :value="getProgressPercentage(vault)"
                :color="vault.canWithdraw ? 'positive' : 'primary'"
                size="4px"
                class="q-mt-none"
              />
            </q-card>
          </div>

          <!-- Summary Stats -->
          <div v-if="vaults.length > 0" class="q-mt-xl">
            <q-card
              flat
              bordered
              class="q-pa-lg"
              style="background-color: #1e1e1e; border-color: #333"
            >
              <div class="text-h6 text-weight-bold text-white q-mb-md">Portfolio Summary</div>
              <div class="row q-gutter-lg">
                <div class="col-12 col-sm-4">
                  <div class="text-grey-5">Total Locked</div>
                  <div class="text-h4 text-primary text-weight-bold">
                    {{ getTotalSatoshis() }} satoshis
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-grey-5">Total Vaults</div>
                  <div class="text-h4 text-white text-weight-bold">
                    {{ vaults.length }}
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-grey-5">Ready to Withdraw</div>
                  <div class="text-h4 text-positive text-weight-bold">
                    {{ getReadyToWithdrawCount() }}
                  </div>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity History Modal -->
    <q-dialog v-model="showActivityHistory" maximized>
      <q-card
        :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'"
        style="max-width: 800px; width: 90vw"
      >
        <q-card-section class="row items-center">
          <q-icon name="history" size="32px" class="q-mr-sm" color="primary" />
          <div class="text-h6">Activity History</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-none" style="max-height: 70vh; overflow-y: auto">
          <q-list v-if="activityLogs.length > 0">
            <q-item v-for="log in activityLogs" :key="log._id" class="activity-item">
              <q-item-section avatar>
                <q-icon
                  :name="getActivityIcon(log.activityType)"
                  :color="getActivityColor(log.activityType)"
                  size="md"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ formatActivityType(log.activityType) }}
                </q-item-label>
                <q-item-label caption>
                  <span v-if="log.vaultName">Vault: {{ log.vaultName }}</span>
                  <span v-if="log.details?.amountSatoshis">
                    • {{ formatBCH(log.details.amountSatoshis) }} BCH
                  </span>
                </q-item-label>
                <q-item-label caption class="text-grey-6">
                  {{ formatDate(log.timestamp) }}
                </q-item-label>
              </q-item-section>

              <q-item-section side v-if="log.details?.txHash">
                <q-btn
                  flat
                  dense
                  size="sm"
                  color="primary"
                  icon="open_in_new"
                  label="View TX"
                  @click="openTxExplorer(log.details.txHash)"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else-if="loadingLogs" class="text-center q-pa-lg">
            <q-spinner color="primary" size="32px" />
            <p class="text-grey-6 q-mt-sm">Loading activity history...</p>
          </div>

          <div v-else class="text-center q-pa-lg text-grey-6">
            <q-icon name="history" size="48px" class="q-mb-sm" />
            <p>No activity history yet</p>
            <p class="text-caption">Your vault operations will appear here</p>
          </div>

          <!-- Load More -->
          <div v-if="hasMoreLogs && !loadingLogs" class="text-center q-pa-md">
            <q-btn
              flat
              color="primary"
              label="Load More"
              :loading="loadingMore"
              @click="loadMoreLogs"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { vaultStorage } from 'src/services/vault-storage'

export default defineComponent({
  name: 'MyVaultsPage',

  data() {
    return {
      loading: false,
      vaults: [],
      currentBchPrice: null,
      priceLoading: false,
      balanceInterval: null,
      refreshInterval: null, // ✅ Auto-refresh interval for vault list
      showActivityHistory: false,
      activityLogs: [],
      loadingLogs: false,
      loadingMore: false,
      logsSkip: 0,
      logsLimit: 20,
      hasMoreLogs: false,
    }
  },

  computed: {
    connectedAddress() {
      return this.$store.state.wallet?.address ?? null
    },
  },

  mounted() {
    this.loadVaults()
    this.startSilentBalanceRefresh() // ✅ Start silent balance refresh (no blinking)
    this.fetchCurrentPrice()
    this.startBalancePolling()
  },

  beforeUnmount() {
    this.stopBalancePolling()
    this.stopSilentBalanceRefresh() // ✅ Stop silent balance refresh
  },

  methods: {
    async loadVaults() {
      this.loading = true
      try {
        // ✅ PROFESSIONAL: Fetch from backend first (source of truth)
        let storedVaults = []

        if (this.connectedAddress) {
          try {
            console.log('🔄 Fetching vaults from backend for wallet:', this.connectedAddress)
            storedVaults = await vaultStorage.getVaultsByWallet(this.connectedAddress)
            console.log(`✅ Loaded ${storedVaults.length} vaults from backend`)

            // Sync backend vaults to localStorage for offline access
            if (storedVaults.length > 0) {
              const existingLocal = this.getAllStoredVaults()
              const merged = this.mergeVaults(existingLocal, storedVaults)
              localStorage.setItem('hodl-vault-all-vaults', JSON.stringify(merged))
              console.log('💾 Synced backend vaults to localStorage')
            }
          } catch (backendError) {
            console.warn(
              '⚠️ Failed to fetch from backend, falling back to localStorage:',
              backendError,
            )
            // Fallback to localStorage
            storedVaults = this.getAllStoredVaults().filter(
              (vault) => vault.walletAddress === this.connectedAddress,
            )
          }
        } else {
          // No wallet connected, use localStorage only
          storedVaults = this.getAllStoredVaults()
        }

        // Filter vaults for current wallet and refresh their balances
        this.vaults = await Promise.all(
          storedVaults
            .filter((vault) => vault.walletAddress === this.connectedAddress)
            .map(async (vault) => {
              // Ensure priceTarget is computed from priceTargetCents for display
              if (!vault.priceTarget && vault.priceTargetCents) {
                vault.priceTarget = vault.priceTargetCents / 100
              }

              // Refresh balance from blockchain
              try {
                const { getAddressBalance } = await import('src/services/blockchain')
                const currentBalance = await getAddressBalance(vault.contractAddress)

                // Update vault balance in storage (convert BigInt to Number for JSON serialization)
                vaultStorage.updateVaultBalance(vault.contractAddress, Number(currentBalance))

                return {
                  ...vault,
                  balance: Number(currentBalance),
                  canWithdraw: this.checkCanWithdraw({ ...vault, balance: Number(currentBalance) }),
                }
              } catch (balanceError) {
                console.warn(
                  `Failed to fetch balance for vault ${vault.contractAddress}:`,
                  balanceError,
                )
                return {
                  ...vault,
                  canWithdraw: this.checkCanWithdraw(vault),
                }
              }
            }),
        )

        console.log('Loaded vaults with refreshed balances:', this.vaults)
      } catch (error) {
        console.error('Failed to load vaults:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load vaults',
        })
      } finally {
        this.loading = false
      }
    },

    /**
     * Merge local and backend vaults, keeping the most recent data
     * Backend is source of truth, but preserves local data if newer
     */
    mergeVaults(localVaults, backendVaults) {
      const merged = [...localVaults]

      for (const backendVault of backendVaults) {
        const existingIndex = merged.findIndex(
          (v) => v.contractAddress === backendVault.contractAddress,
        )

        if (existingIndex >= 0) {
          // Update existing with backend data (backend is source of truth)
          const localVault = merged[existingIndex]
          const backendUpdated = new Date(backendVault.updatedAt).getTime()
          const localUpdated = localVault.updatedAt || 0

          merged[existingIndex] = {
            ...localVault,
            ...backendVault,
            // Keep local balance if it's more recent
            ...(backendUpdated > localUpdated ? {} : { balance: localVault.balance }),
          }
        } else {
          // Add new vault from backend
          merged.push(backendVault)
        }
      }

      return merged
    },

    // ✅ Auto-refresh methods for automatic data updates (silent balance-only updates)
    startSilentBalanceRefresh() {
      // Silently refresh only balances every 30 seconds - no full page re-render
      this.refreshInterval = setInterval(() => {
        this.silentRefreshBalances()
      }, 30000)
      console.log('✅ Silent balance refresh started (every 30s)')
    },

    stopSilentBalanceRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
        console.log('🛑 Silent balance refresh stopped')
      }
    },

    // Silently refresh only vault balances without re-rendering the entire list
    async silentRefreshBalances() {
      if (this.vaults.length === 0) return

      console.log('🔄 Silently refreshing vault balances...')

      for (let i = 0; i < this.vaults.length; i++) {
        const vault = this.vaults[i]
        try {
          const { getAddressBalance } = await import('src/services/blockchain')
          const newBalance = Number(await getAddressBalance(vault.contractAddress))

          // Only update if balance changed to avoid unnecessary re-renders
          if (vault.balance !== newBalance) {
            vault.balance = newBalance
            vault.canWithdraw = this.checkCanWithdraw(vault)
            // Update storage silently
            vaultStorage.updateVaultBalance(vault.contractAddress, newBalance)
          }
        } catch (error) {
          // Silently fail - don't disrupt UI
          console.warn(`Silent balance refresh failed for ${vault.contractAddress}:`, error)
        }
      }

      console.log('✅ Silent balance refresh complete')
    },

    getAllStoredVaults() {
      if (typeof localStorage === 'undefined') return []

      // Use only the new multi-vault storage system
      const multiVaults = localStorage.getItem('hodl-vault-all-vaults')
      if (multiVaults) {
        try {
          return JSON.parse(multiVaults)
        } catch (e) {
          console.error('Failed to parse multi-vaults:', e)
          return []
        }
      }

      return []
    },

    async fetchCurrentPrice() {
      this.priceLoading = true
      try {
        // Import oracle service
        const { fetchOraclePrice } = await import('src/services/oracle')
        const result = await fetchOraclePrice()
        this.currentBchPrice = result.price
      } catch (error) {
        console.error('Failed to fetch current price:', error)
        // Fallback price
        this.currentBchPrice = 450.0
      } finally {
        this.priceLoading = false
      }
    },

    checkCanWithdraw(vault) {
      if (!this.currentBchPrice || !vault.priceTarget) return false
      return Number(this.currentBchPrice) >= Number(vault.priceTarget)
    },

    formatBalance(satoshis) {
      if (!satoshis) return '0'
      return satoshis.toString()
    },

    formatDate(timestamp) {
      if (!timestamp) return 'Unknown'
      const date = new Date(timestamp)
      const dateStr = date.toLocaleDateString()
      const timeStr = date.toLocaleTimeString()
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      return `${dateStr} ${timeStr} (${timeZone})`
    },

    getProgressPercentage(vault) {
      if (!this.currentBchPrice || !vault.priceTarget) return 0
      const progress = (this.currentBchPrice / vault.priceTarget) * 100
      return Math.min(progress, 100)
    },

    getTotalSatoshis() {
      return this.vaults.reduce((total, vault) => {
        return total + (vault.balance || 0)
      }, 0)
    },

    getTotalBalance() {
      return this.vaults.reduce((total, vault) => {
        return total + (vault.balance || 0) / 100000000
      }, 0)
    },

    getReadyToWithdrawCount() {
      return this.vaults.filter((vault) => vault.canWithdraw).length
    },

    selectVault(vault) {
      // Store selected vault in localStorage for the vault page
      localStorage.setItem('hodl-vault-selected-vault', JSON.stringify(vault))

      // Navigate to vault management page
      this.$router.push('/vault/manage')
    },

    startBalancePolling() {
      this.stopBalancePolling()
      this.balanceInterval = setInterval(() => {
        this.refreshVaultBalances()
      }, 30000) // Poll every 30 seconds
    },

    stopBalancePolling() {
      if (this.balanceInterval) {
        clearInterval(this.balanceInterval)
        this.balanceInterval = null
      }
    },

    async refreshVaultBalances() {
      if (this.vaults.length === 0) return

      try {
        // Refresh balances for all vaults
        const updatedVaults = await Promise.all(
          this.vaults.map(async (vault) => {
            try {
              const { getAddressBalance } = await import('src/services/blockchain')
              const currentBalance = await getAddressBalance(vault.contractAddress)

              // Update vault balance in storage (convert BigInt to Number for JSON serialization)
              vaultStorage.updateVaultBalance(vault.contractAddress, Number(currentBalance))

              return {
                ...vault,
                balance: Number(currentBalance),
                canWithdraw: this.checkCanWithdraw({ ...vault, balance: Number(currentBalance) }),
              }
            } catch (balanceError) {
              console.warn(
                `Failed to refresh balance for vault ${vault.contractAddress}:`,
                balanceError,
              )
              return vault
            }
          }),
        )

        this.vaults = updatedVaults
        console.log('Vault balances refreshed automatically')
      } catch (error) {
        console.error('Failed to refresh vault balances:', error)
      }
    },

    async loadActivityHistory() {
      this.loadingLogs = true
      this.logsSkip = 0
      try {
        const { activityLogApi } = await import('src/services/activity-log-api.js')
        const result = await activityLogApi.getHistory(this.logsLimit, this.logsSkip)

        this.activityLogs = result.logs || []
        this.hasMoreLogs = result.hasMore || false
      } catch (error) {
        console.error('Failed to load activity history:', error)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to load activity history',
          timeout: 3000,
        })
      } finally {
        this.loadingLogs = false
      }
    },

    async loadMoreLogs() {
      this.loadingMore = true
      this.logsSkip += this.logsLimit

      try {
        const { activityLogApi } = await import('src/services/activity-log-api.js')
        const result = await activityLogApi.getHistory(this.logsLimit, this.logsSkip)

        this.activityLogs.push(...(result.logs || []))
        this.hasMoreLogs = result.hasMore || false
      } catch (error) {
        console.error('Failed to load more logs:', error)
      } finally {
        this.loadingMore = false
      }
    },

    getActivityIcon(type) {
      const icons = {
        VAULT_CREATED: 'add_circle',
        DEPOSIT: 'arrow_downward',
        WITHDRAWAL: 'arrow_upward',
        PRICE_TARGET_REACHED: 'check_circle',
        VAULT_DELETED: 'delete',
      }
      return icons[type] || 'info'
    },

    getActivityColor(type) {
      const colors = {
        VAULT_CREATED: 'positive',
        DEPOSIT: 'red', // 🔴 Red for deposits (money going in)
        WITHDRAWAL: 'positive', // 🟢 Green for withdrawals (money going out)
        PRICE_TARGET_REACHED: 'warning',
        VAULT_DELETED: 'grey',
      }
      return colors[type] || 'grey'
    },

    formatActivityType(type) {
      return type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
    },

    formatBCH(satoshis) {
      return (satoshis / 100000000).toFixed(8)
    },

    openTxExplorer(txHash) {
      window.open(`https://chipnet.bch.ninja/tx/${txHash}`, '_blank')
    },
  },

  watch: {
    showActivityHistory(val) {
      if (val) {
        this.loadActivityHistory()
      }
    },
  },
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
}

.vault-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.vault-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 213, 136, 0.15);
  border-color: #00d588;
}

.q-linear-progress {
  border-radius: 0 0 12px 12px;
}

/* Custom primary color override */
.q-btn.color-primary {
  background-color: #00d588 !important;
  color: #000 !important;
}
</style>
