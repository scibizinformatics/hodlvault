<template>
  <q-page class="flex flex-center column q-pa-md">
    <div class="text-h5 q-mb-md">BCH HodlVault v1.8.1</div>

    <!-- Connect Paytaca (WalletConnect) -->
    <q-card flat bordered class="wallet-card q-pa-lg">
      <q-card-section class="q-pa-none">
        <q-btn
          v-if="!connectedAddress"
          color="primary"
          label="Connect Wallet"
          :loading="connecting"
          @click="onConnectWallet"
          icon="account_balance_wallet"
        />
        <div v-else class="row items-center q-gutter-sm flex-wrap">
          <q-chip color="positive" text-color="white" icon="check_circle">
            Connected to Paytaca
          </q-chip>
          <q-input
            :model-value="connectedAddress"
            readonly
            outlined
            dense
            class="monospace"
            input-class="text-select"
            style="min-width: 300px"
          />
          <q-btn
            flat
            dense
            color="negative"
            label="Disconnect"
            @click="onDisconnectWallet"
          />
        </div>
      </q-card-section>
    </q-card>
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
  },
})
</script>

<style scoped lang="scss">
.wallet-card {
  max-width: 560px;
  width: 100%;
}
.monospace {
  font-family: ui-monospace, monospace;
}
.text-select {
  user-select: all;
}
</style>
