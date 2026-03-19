<template>
  <q-page class="q-pa-lg" style="background-color: #121212">
    <div class="container">
      <div class="row justify-center">
        <div class="col-12 col-md-10 col-lg-8">
          <!-- Header -->
          <div class="text-center q-mb-xl">
            <h1 class="text-h4 text-weight-bold text-white q-mb-md">My Vaults</h1>
            <p class="text-grey-6 q-mb-lg">Manage all your BCH HODL vaults in one place</p>

            <!-- Connected Wallet Info -->
            <q-card
              flat
              bordered
              class="q-pa-md inline-block"
              style="background-color: #1e1e1e; border-color: #333"
            >
              <div class="text-subtitle2 text-grey-4 q-mb-sm">Connected Wallet</div>
              <div class="text-body2 text-primary">
                {{ connectedAddress || 'Not Connected' }}
              </div>
            </q-card>
          </div>

          <!-- Vault List -->
          <div v-if="loading" class="text-center q-pa-xl">
            <q-spinner-dots color="primary" size="64px" />
            <div class="text-grey-4 q-mt-md">Loading your vaults...</div>
          </div>

          <div v-else-if="vaults.length === 0" class="text-center q-pa-xl">
            <q-icon name="account_balance" size="64px" class="text-grey-6 q-mb-md" />
            <h3 class="text-h5 text-grey-4 q-mb-md">No Vaults Found</h3>
            <p class="text-grey-6 q-mb-lg">
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
    }
  },

  computed: {
    connectedAddress() {
      return this.$store.state.wallet?.address ?? null
    },
  },

  mounted() {
    this.loadVaults()
    this.fetchCurrentPrice()
    this.startBalancePolling()
  },

  beforeUnmount() {
    this.stopBalancePolling()
  },

  methods: {
    async loadVaults() {
      this.loading = true
      try {
        // Load vaults from localStorage (for now)
        const storedVaults = this.getAllStoredVaults()

        // Filter vaults for current wallet and refresh their balances
        this.vaults = await Promise.all(
          storedVaults
            .filter((vault) => vault.walletAddress === this.connectedAddress)
            .map(async (vault) => {
              // Refresh balance from blockchain
              try {
                const { getAddressBalance } = await import('src/services/blockchain')
                const currentBalance = await getAddressBalance(vault.contractAddress)

                // Update vault balance in storage
                vaultStorage.updateVaultBalance(vault.contractAddress, currentBalance)

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
      return new Date(timestamp).toLocaleDateString()
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

              // Update vault balance in storage
              vaultStorage.updateVaultBalance(vault.contractAddress, currentBalance)

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
