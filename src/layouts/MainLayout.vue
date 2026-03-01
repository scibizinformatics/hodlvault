<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>BCH HodlVault v2.1.0</q-toolbar-title>

        <div class="row items-center q-gutter-sm">
          <div class="text-caption q-mr-md">Quasar v{{ $q.version }}</div>

          <template v-if="connectedAddress">
            <q-chip color="positive" text-color="white" icon="check_circle">
              Connected
            </q-chip>
            <q-input
              :model-value="connectedAddress"
              readonly
              outlined
              dense
              class="monospace"
              input-class="text-select"
              style="max-width: 320px"
            />
            <q-btn
              flat
              dense
              color="negative"
              label="Disconnect"
              @click="onDisconnectWallet"
            />
          </template>
          <template v-else>
            <q-btn
              color="primary"
              label="Connect Wallet"
              :loading="connecting"
              @click="onConnectWallet"
              icon="account_balance_wallet"
            />
          </template>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
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
  },
})
</script>