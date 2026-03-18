<template>
  <q-page class="q-pa-none" style="background-color: #121212">
    <div class="hero-section">
      <div class="container text-center">
        <div class="hero-content q-py-xl">
          <h1 class="text-h2 text-weight-bold text-white q-mb-md">Force-HODL Your Bitcoin Cash</h1>
          <p class="text-h5 text-grey-6 q-mb-xl">
            Lock your BCH in smart contracts that only unlock when your price target is met. No more
            emotional selling, just disciplined investing.
          </p>

          <!-- Action Buttons -->
          <div class="row justify-center q-gutter-md q-mb-xl">
            <q-btn
              size="xl"
              color="primary"
              label="Create New Vault"
              icon="add_circle"
              class="text-weight-bold"
              style="background-color: #00d588; color: #000"
              padding="md xl"
              :disabled="!connectedAddress"
              @click="$router.push('/vault')"
            />
            <q-btn
              size="xl"
              outline
              color="primary"
              label="Access My Vaults"
              icon="account_balance"
              class="text-weight-bold"
              style="border-color: #00d588; color: #00d588"
              padding="md xl"
              :disabled="!connectedAddress"
              @click="$router.push('/my-vaults')"
            />
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'IndexPage',

  data() {
    return {
      connecting: false,
    }
  },

  computed: {
    connectedAddress() {
      return this.$store.getters['wallet/walletInfo']?.address ?? null
    },

    connectionStatus() {
      return this.$store.getters['wallet/isConnected']
    },

    shortAddress() {
      return this.$store.getters['wallet/walletInfo']?.shortAddress ?? null
    },
  },

  methods: {
    async onConnectWallet() {
      this.connecting = true
      try {
        if (!this.$walletConnect) {
          throw new Error('WalletConnect not initialized')
        }

        const address = await this.$walletConnect.connect()

        if (address) {
          this.$q.notify({
            type: 'positive',
            message: `Connected to Paytaca: ${this.shortAddress}`,
            icon: 'check_circle',
            timeout: 3000,
          })
        } else {
          throw new Error('No address returned from wallet')
        }
      } catch (err) {
        console.error('Connection failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to connect wallet',
          timeout: 5000,
        })
      } finally {
        this.connecting = false
      }
    },

    async onDisconnectWallet() {
      try {
        this.$q.loading.show({
          message: 'Disconnecting wallet...',
        })

        this.$store.dispatch('wallet/clearWallet')

        if (this.$walletConnect) {
          await this.$walletConnect.disconnect()
        }

        this.$q.notify({
          type: 'info',
          message: 'Wallet disconnected successfully',
          icon: 'logout',
          timeout: 3000,
        })
      } catch (err) {
        console.error('Disconnect failed:', err)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to disconnect wallet properly',
          timeout: 3000,
        })
      } finally {
        this.$q.loading.hide()
      }
    },

    onMockConnect() {
      // Mock connection for testing
      const mockWalletData = {
        address: 'chipnet:qz4wqx8kjzlk7yalev0x8c8nppd6vqszxg5xqf8jrp',
        publicKey: '02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f',
      }

      this.$store.dispatch('wallet/setWallet', mockWalletData)

      this.$q.notify({
        type: 'positive',
        message: `Mock connection: ${mockWalletData.address.slice(0, 12)}...`,
        icon: 'bug_report',
        timeout: 3000,
      })
    },
  },
})
</script>

<style scoped>
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 800px;
  width: 100%;
}

.hero-content {
  max-width: 600px;
  margin: 0 auto;
}

.wallet-section {
  max-width: 500px;
  margin: 0 auto;
}

.wallet-card {
  backdrop-filter: blur(10px);
}

/* Custom primary color override */
.q-btn.color-primary {
  background-color: #00d588 !important;
  color: #000 !important;
}

.q-btn--outline.color-primary {
  border-color: #00d588 !important;
  color: #00d588 !important;
}

.q-btn--outline.color-primary:hover {
  background-color: rgba(0, 213, 136, 0.1) !important;
}
</style>
