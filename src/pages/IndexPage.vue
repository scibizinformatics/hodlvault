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
    return {}
  },

  computed: {
    connectedAddress() {
      return this.$store.state.wallet?.address ?? null
    },
  },

  methods: {},
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
