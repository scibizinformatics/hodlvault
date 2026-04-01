<template>
  <q-page class="q-pa-none" :class="{ 'hero-page-background': $q.dark.isActive }">
    <div class="hero-section">
      <div class="container text-center">
        <div class="hero-content q-py-xl">
          <h1
            class="text-h2 text-weight-bold"
            :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
            q-mb-md
          >
            Force-HODL Your Bitcoin Cash
          </h1>
          <p class="text-h5" :class="$q.dark.isActive ? 'text-grey-6' : 'text-grey-8'" q-mb-xl>
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
.hero-page-background {
  background-image:
    radial-gradient(
      ellipse at center,
      rgba(18, 18, 18, 0.9) 0%,
      rgba(18, 18, 18, 0.7) 30%,
      rgba(18, 18, 18, 0.4) 50%,
      rgba(18, 18, 18, 0) 70%
    ),
    url('/src/assets/images/background image2.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  min-height: 100vh;
}

.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-image:
    linear-gradient(
      to right,
      rgba(18, 18, 18, 0.9) 0%,
      rgba(18, 18, 18, 0.6) 20%,
      rgba(18, 18, 18, 0.3) 35%,
      rgba(18, 18, 18, 0) 50%,
      rgba(18, 18, 18, 0.3) 65%,
      rgba(18, 18, 18, 0.6) 80%,
      rgba(18, 18, 18, 0.9) 100%
    ),
    url('/src/assets/images/background image2.webp');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to right,
    rgba(18, 18, 18, 0.9) 0%,
    rgba(18, 18, 18, 0.6) 20%,
    rgba(18, 18, 18, 0.3) 35%,
    rgba(18, 18, 18, 0) 50%,
    rgba(18, 18, 18, 0.3) 65%,
    rgba(18, 18, 18, 0.6) 80%,
    rgba(18, 18, 18, 0.9) 100%
  );
  pointer-events: none;
}

/* Light mode specific styles */
.body--light .hero-section::before {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.6) 20%,
    rgba(255, 255, 255, 0.3) 35%,
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 0.3) 65%,
    rgba(255, 255, 255, 0.6) 80%,
    rgba(255, 255, 255, 0.9) 100%
  );
}

.body--light .hero-section {
  background-image:
    linear-gradient(
      to right,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.6) 20%,
      rgba(255, 255, 255, 0.3) 35%,
      rgba(255, 255, 255, 0) 50%,
      rgba(255, 255, 255, 0.3) 65%,
      rgba(255, 255, 255, 0.6) 80%,
      rgba(255, 255, 255, 0.9) 100%
    ),
    url('/src/assets/images/background image2.webp');
}

.container {
  max-width: 800px;
  width: 100%;
  position: relative;
  z-index: 1;
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

/* Responsive adjustments - background removed since it's handled by hero-page-background */
@media (max-width: 768px) {
  /* Mobile styles for layout only - background handled by hero-page-background class */
}
</style>
