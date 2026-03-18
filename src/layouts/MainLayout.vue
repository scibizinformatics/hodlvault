<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-dark text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold cursor-pointer" @click="$router.push('/')">
          HodlVault
        </q-toolbar-title>

        <q-space />

        <!-- Debug Mock Connect Button - Corner -->
        <q-btn
          v-if="!connectedAddress"
          color="warning"
          label="Mock"
          icon="bug_report"
          unelevated
          size="xs"
          class="q-mr-sm"
          @click="onMockConnect"
        />

        <q-btn
          v-if="!connectedAddress"
          color="primary"
          label="Connect Wallet"
          icon="account_balance_wallet"
          unelevated
          class="text-weight-medium"
          :loading="connecting"
          @click="onConnectWallet"
        />
        <q-btn
          v-else
          color="positive"
          :label="shortAddress"
          icon="check_circle"
          unelevated
          class="text-weight-medium"
          @click="onDisconnectWallet"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-transparent text-grey-8">
      <div class="row justify-center q-pa-sm">
        <div class="text-caption" style="opacity: 0.4; font-size: 10px; line-height: 1.2">
          System Version: v2.3.0 | Network: CHIPNET
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'MainLayout',

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
            message: `Connected to Paytaca`,
            icon: 'check_circle',
            timeout: 2000,
          })
        } else {
          throw new Error('No address returned from wallet')
        }
      } catch (err) {
        console.error('Connection failed:', err)
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to connect wallet',
          timeout: 3000,
        })
      } finally {
        this.connecting = false
      }
    },

    async onDisconnectWallet() {
      try {
        this.$store.dispatch('wallet/clearWallet')

        if (this.$walletConnect) {
          await this.$walletConnect.disconnect()
        }

        this.$q.notify({
          type: 'info',
          message: 'Wallet disconnected',
          icon: 'logout',
          timeout: 2000,
        })
      } catch (err) {
        console.error('Disconnect failed:', err)
        this.$q.notify({
          type: 'negative',
          message: 'Failed to disconnect wallet',
          timeout: 2000,
        })
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
        message: 'Mock connection established',
        icon: 'bug_report',
        timeout: 2000,
      })
    },
  },
})
</script>
