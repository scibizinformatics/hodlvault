<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-dark text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold cursor-pointer" @click="$router.push('/')">
          HodlVault
        </q-toolbar-title>

        <q-space />

        <!-- Dark/Light Mode Toggle -->
        <q-btn
          flat
          round
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          :color="$q.dark.isActive ? 'white' : 'black'"
          @click="toggleTheme"
          class="q-mr-sm"
        >
          <q-tooltip>
            {{ $q.dark.isActive ? 'Light Mode' : 'Dark Mode' }}
          </q-tooltip>
        </q-btn>

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
      walletWatchInterval: null,
    }
  },

  computed: {
    connectedAddress() {
      return this.$store.state.wallet?.address ?? null
    },

    shortAddress() {
      if (!this.connectedAddress) return ''
      const addr = this.connectedAddress
      return `${addr.slice(0, 8)}...${addr.slice(-8)}`
    },
  },

  mounted() {
    // Start watching wallet connection status changes
    this.startWalletStatusWatcher()

    // Initialize theme from localStorage
    this.initializeTheme()
  },

  beforeUnmount() {
    // Clean up wallet status watcher
    this.stopWalletStatusWatcher()
  },

  methods: {
    initializeTheme() {
      // Load theme from localStorage
      const savedTheme = localStorage.getItem('theme')

      if (savedTheme) {
        // Apply saved theme
        if (savedTheme === 'dark') {
          this.$q.dark.set(true)
        } else {
          this.$q.dark.set(false)
        }
      } else {
        // Auto-detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        this.$q.dark.set(prefersDark)
      }
    },

    startWalletStatusWatcher() {
      // Clear any existing interval
      this.stopWalletStatusWatcher()

      // Watch for wallet connection status changes every 2 seconds
      this.walletWatchInterval = setInterval(() => {
        this.checkWalletConnectionStatus()
      }, 2000)
    },

    stopWalletStatusWatcher() {
      if (this.walletWatchInterval) {
        clearInterval(this.walletWatchInterval)
        this.walletWatchInterval = null
      }
    },

    checkWalletConnectionStatus() {
      const currentAddress = this.$store.state.wallet?.address ?? null
      const walletConnectConnected = this.$walletConnect?.isConnected() ?? false

      // If WalletConnect says disconnected but store still has address, clear store
      if (!walletConnectConnected && currentAddress) {
        console.log('Wallet status mismatch detected - clearing wallet state')
        this.$store.dispatch('wallet/clearWallet')
      }

      // If WalletConnect says connected but store has no address, try to restore
      if (walletConnectConnected && !currentAddress) {
        console.log('Wallet status mismatch detected - attempting to restore session')
        // The walletconnect boot file should handle session restoration automatically
        // But we can trigger a manual check if needed
      }
    },

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
          message: err && err.message ? err.message : 'Failed to connect wallet',
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

    toggleTheme() {
      // Toggle between dark and light mode
      this.$q.dark.toggle()
      // Save user preference to localStorage
      localStorage.setItem('theme', this.$q.dark.isActive ? 'dark' : 'light')
    },
  },
})
</script>
