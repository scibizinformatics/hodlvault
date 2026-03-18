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

          <!-- Wallet Connection Section -->
          <div class="wallet-section q-mb-xl">
            <q-card
              flat
              bordered
              class="wallet-card q-pa-lg"
              style="background-color: #1e1e1e; border-color: #333"
            >
              <q-card-section class="q-pa-none">
                <template v-if="!connectedAddress">
                  <div class="text-subtitle1 text-grey-4 q-mb-md">
                    Connect your wallet to get started
                  </div>
                  <div class="row justify-center q-gutter-md">
                    <q-btn
                      size="lg"
                      color="primary"
                      label="Connect Wallet"
                      icon="account_balance_wallet"
                      class="text-weight-bold"
                      style="background-color: #00d588; color: #000"
                      :loading="connecting"
                      @click="onConnectWallet"
                    />
                    <q-btn
                      color="warning"
                      label="Mock"
                      icon="bug_report"
                      unelevated
                      size="lg"
                      @click="onMockConnect"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="text-subtitle1 text-positive q-mb-md">
                    <q-icon name="check_circle" class="q-mr-sm" />
                    Wallet Connected
                  </div>
                  <div class="text-body2 text-grey-6 q-mb-sm">
                    {{ connectedAddress }}
                  </div>
                  <q-btn
                    color="negative"
                    label="Disconnect"
                    icon="logout"
                    outline
                    @click="onDisconnectWallet"
                  />
                </template>
              </q-card-section>
            </q-card>
          </div>

          <!-- Action Buttons -->
          <div class="row justify-center q-gutter-md">
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
      return this.$store.state.wallet?.address ?? null
    },
  },

  methods: {
    async onConnectWallet() {
      this.connecting = true
      try {
        if (!this.$walletConnect) {
          throw new Error('WalletConnect not initialized')
        }
        await this.$walletConnect.connect()
        this.$q.notify({
          type: 'positive',
          message: 'Connected to Paytaca',
          icon: 'check_circle',
        })
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to connect wallet',
        })
      } finally {
        this.connecting = false
      }
    },

    onDisconnectWallet() {
      this.$store.dispatch('wallet/clearWallet')
      if (this.$walletConnect) {
        this.$walletConnect.disconnect()
      }
      this.$q.notify({
        type: 'info',
        message: 'Wallet disconnected',
      })
    },

    onMockConnect() {
      // Mock connection for testing
      this.$store.dispatch('wallet/setWallet', {
        address: 'chipnet:qz4wqx8kjzlk7yalev0x8c8nppd6vqszxg5xqf8jrp',
        publicKey: '02d09613d20ce44da55956799863c0a5e82c5896a2df33502b4859664650529d2f',
      })
      this.$q.notify({
        type: 'positive',
        message: 'Mock connection established',
        icon: 'check_circle',
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
