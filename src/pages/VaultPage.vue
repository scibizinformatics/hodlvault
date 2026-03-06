<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-lg">HodlVault</div>

    <!-- Oracle Price / Live Data -->
    <q-card flat bordered class="q-mb-md" :class="{ 'border-positive': oracleSuccess }">
      <q-card-section class="row items-center q-gutter-md">
        <div v-if="priceLoading" class="row items-center q-gutter-sm">
          <q-spinner-dots color="primary" size="32px" />
          <span>Fetching Oracle price...</span>
        </div>
        <div v-else-if="oracleSuccess" class="row items-center q-gutter-sm full-width">
          <q-icon name="check_circle" color="positive" size="32px" />
          <div>
            <div class="text-subtitle1 text-weight-medium text-positive">Oracle data received</div>
            <div class="text-caption text-grey-7">Current BCH price is live from the Oracle backend</div>
          </div>
          <q-btn flat dense round icon="refresh" @click="refreshPrice" label="Refresh" class="q-ml-auto" />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-icon name="warning" color="orange" size="32px" />
          <span>Oracle price unavailable. Check that the backend is running at http://127.0.0.1:8000</span>
          <q-btn flat dense label="Retry" @click="refreshPrice" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Create Vault Section -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Create Vault</div>
        <q-form @submit="onLockFunds" class="q-gutter-md">
          <q-input
            v-model.number="form.amount"
            label="Amount to Deposit into Vault"
            type="number"
            outlined
            :rules="[
              (val) => val > 0 || 'Amount must be greater than 0',
              (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
            ]"
            hint="This amount will be requested from your Paytaca wallet to fund the contract (in satoshis)."
          />
          <q-input
            v-model.number="form.priceTarget"
            label="USD Price Target"
            type="number"
            outlined
            step="0.01"
            :rules="[
              (val) => val > 0 || 'Price target must be greater than 0',
            ]"
            hint="Target BCH/USD price to unlock funds"
          />
          <q-btn
            v-if="hasWallet && hasPublicKey"
            type="submit"
            color="primary"
            label="LOCK FUNDS"
            :loading="locking || depositing"
            :disable="!canLockFunds"
            icon="lock"
          />
          <div v-else-if="hasWallet && !hasPublicKey" class="q-mt-md">
            <q-banner class="bg-warning text-dark">
              <template v-slot:avatar>
                <q-icon name="info" />
              </template>
              Public key not available. Verify your identity to continue.
              <template v-slot:action>
                <q-btn
                  flat
                  color="primary"
                  label="VERIFY IDENTITY"
                  :loading="verifyingIdentity"
                  :disable="verifyingIdentity"
                  @click="onVerifyIdentity"
                />
              </template>
            </q-banner>
          </div>
          <div v-else class="q-mt-md text-grey-7">
            Connect your wallet and verify your identity to create a vault.
          </div>
        </q-form>
        <div v-if="depositing" class="q-mt-sm">
          <q-banner class="bg-info text-white">
            <template v-slot:avatar>
              <q-spinner-dots color="white" size="24px" />
            </template>
            Waiting for Deposit... Confirm the payment in your Paytaca wallet.
          </q-banner>
        </div>
      </q-card-section>
    </q-card>

    <!-- Vault Status Section -->
    <q-card v-if="vault" flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">Vault Status</div>
        <div class="q-gutter-md">
          <div>
            <div class="text-subtitle2 q-mb-xs">Contract Address</div>
            <q-input
              :model-value="vault.contractAddress"
              readonly
              outlined
              dense
              class="monospace"
              input-class="text-select"
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Balance</div>
            <div class="row items-center q-gutter-sm">
              <q-input
                :model-value="formatBalance(displayBalance)"
                readonly
                outlined
                dense
                suffix="satoshis"
                class="col"
              />
              <q-btn
                flat
                dense
                round
                icon="refresh"
                color="primary"
                :loading="balanceRefreshing"
                @click="refreshVaultBalance"
                aria-label="Refresh balance from blockchain"
              />
            </div>
            <p class="text-caption text-grey-7 q-mt-xs q-mb-none">
              Live from chipnet blockchain. Clearing site data does not move funds—your vault address stays the same; re-enter the same vault settings to see this balance again.
            </p>
            <a
              v-if="vault && vault.contractAddress"
              :href="chipnetExplorerAddressUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-caption text-primary"
            >
              Verify balance on chipnet explorer →
            </a>
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Deposit More into Vault</div>
            <div class="row q-col-gutter-sm items-center">
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="additionalDepositAmount"
                  label="Additional amount (satoshis)"
                  type="number"
                  outlined
                  dense
                  :rules="[
                    (val) => !!val || 'Amount is required',
                    (val) => val >= 1000 || 'Minimum amount is 1000 satoshis',
                  ]"
                  hint="Send more BCH into this vault using your Paytaca wallet."
                />
              </div>
              <div class="col-auto q-mt-sm q-mt-md-none">
                <q-btn
                  color="primary"
                  label="Deposit More"
                  :loading="depositing"
                  :disable="!canDepositMore"
                  icon="account_balance_wallet"
                  @click="onDepositMore"
                />
              </div>
            </div>
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Vault Deposit QR</div>
            <div class="row items-center q-gutter-md">
              <q-card flat bordered class="q-pa-sm flex flex-center">
                <QrcodeVue :value="vault.contractAddress" :size="160" />
              </q-card>
              <div class="text-body2 text-grey-7">
                Scan this QR in Paytaca to fill the vault address automatically, then
                enter the amount you want to send.
              </div>
            </div>
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Target Price</div>
            <q-input
              :model-value="`$${vault.priceTarget.toFixed(2)}`"
              readonly
              outlined
              dense
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Current BCH Price (Oracle)</div>
            <q-input
              :model-value="currentBchPrice != null ? `$${Number(currentBchPrice).toFixed(2)}` : '—'"
              readonly
              outlined
              dense
              :color="canWithdraw ? 'positive' : 'negative'"
            />
          </div>
          <div>
            <div class="text-subtitle2 q-mb-xs">Withdraw to (optional)</div>
            <p class="text-caption text-grey-7 q-mb-sm">
              Leave empty to use your connected wallet address, or paste / scan your Paytaca receive address below.
            </p>
            <q-input
              v-model="withdrawToAddress"
              label="BCH address (paste or from QR)"
              outlined
              dense
              placeholder="bitcoincash:... or bchtest:..."
              class="monospace"
              clearable
              :rules="[ (val) => !val || isValidBchAddress(val) || 'Invalid BCH address' ]"
            />
            <div class="row q-gutter-sm q-mt-sm flex-wrap">
              <q-btn
                flat
                dense
                color="primary"
                icon="qr_code_scanner"
                label="Scan with camera"
                @click="openCameraScan"
              />
              <q-btn
                flat
                dense
                color="primary"
                icon="upload_file"
                label="Upload QR image"
                @click="triggerWithdrawQrInput"
              />
              <input
                ref="withdrawQrInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onWithdrawQrFile"
              />
            </div>
            <q-dialog v-model="showCameraScan" persistent @hide="stopCamera">
              <q-card style="min-width: 320px">
                <q-card-section>
                  <div class="text-h6">Scan Paytaca receive QR</div>
                  <p class="text-caption text-grey-7">Point your laptop camera at the QR code on your Paytaca receive screen.</p>
                </q-card-section>
                <q-card-section class="flex flex-center">
                  <video
                    ref="cameraVideoRef"
                    autoplay
                    playsinline
                    muted
                    class="camera-video"
                  />
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn flat label="Cancel" color="grey" v-close-popup />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </div>
          <p class="text-caption text-grey-7">
            Withdrawal sends vault funds to your chosen address (chipnet). Your Paytaca must approve the transaction, like receiving from a faucet—you provide the address, then confirm in the wallet.
          </p>
          <q-btn
            color="primary"
            label="Withdraw"
            :loading="withdrawing"
            :disable="!canWithdraw"
            icon="account_balance"
            @click="onWithdraw"
          />
          <div v-if="!canWithdraw && vault" class="text-caption text-negative q-mt-xs">
            Current price (${{ currentBchPrice != null ? Number(currentBchPrice).toFixed(2) : '?' }}) is below target price (${{ vault.priceTarget.toFixed(2) }})
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Developer Info (toggle) -->
    <q-card v-if="vault" flat bordered class="q-mt-md">
      <q-card-section>
        <q-expansion-item icon="bug_report" label="Developer Info" dense>
          <div class="q-gutter-md q-mt-sm">
            <q-input
              label="Owner PKH (hex)"
              :model-value="developerOwnerPkh"
              readonly
              outlined
              dense
              class="monospace"
              input-class="text-select"
            />
            <q-input
              label="Price Target (cents)"
              :model-value="developerPriceTargetCents"
              readonly
              outlined
              dense
            />
            <q-input
              label="Connected Chain ID"
              :model-value="developerChainId"
              readonly
              outlined
              dense
            />
          </div>
        </q-expansion-item>
      </q-card-section>
    </q-card>

    <!-- Empty State -->
    <q-card v-else flat bordered>
      <q-card-section class="text-center text-grey-6">
        No active vault. Create a vault above to get started.
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import QrcodeVue from 'qrcode.vue'
import jsQR from 'jsqr'
import {
  calculateContractAddress,
  initializeHodlVaultContract,
  getAddressBalance,
  spendVault,
  depositToVault,
} from 'src/services/blockchain'
import { fetchOraclePrice } from 'src/services/oracle'
import { hash160, hexToBin, binToHex } from '@bitauth/libauth'

export default defineComponent({
  name: 'VaultPage',

  components: {
    QrcodeVue,
  },

  data() {
    return {
      form: {
        amount: null,
        priceTarget: null,
      },
      additionalDepositAmount: null,
      locking: false,
      depositing: false,
      verifyingIdentity: false,
      withdrawing: false,
      balanceInterval: null,
      depositPollInterval: null,
      depositPollStartTime: null,
      vault: null,
      priceLoading: false,
      oracleSuccess: false,
      currentBchPrice: null,
      oracleData: {
        message_hex: '',
        signature_hex: '',
        oracle_pubkey_hex: '',
      },

      // Vault persistence (localStorage)
      vaultPersistKey: 'hodl-vault-active-vault',

      // Withdraw destination (optional): from paste or QR scan/upload
      withdrawToAddress: '',

      // Live camera QR scan
      showCameraScan: false,
      cameraStream: null,
      cameraScanInterval: null,

      balanceRefreshing: false,
    }
  },

  computed: {
    /** Single source of truth: wallet address from Vuex store */
    hasWallet() {
      return !!this.$store.state.wallet?.address
    },

    canLockFunds() {
      return (
        this.hasWallet &&
        this.form.amount &&
        this.form.amount >= 1000 &&
        this.form.priceTarget &&
        this.form.priceTarget > 0 &&
        this.oracleData.oracle_pubkey_hex &&
        this.hasPublicKey
      )
    },

    canDepositMore() {
      return (
        this.vault &&
        this.hasWallet &&
        this.additionalDepositAmount &&
        this.additionalDepositAmount >= 1000
      )
    },

    canWithdraw() {
      if (!this.vault) return false
      if (this.currentBchPrice == null) return false
      return Number(this.currentBchPrice) >= this.vault.priceTarget
    },

    hasPublicKey() {
      return !!this.$store.state.wallet?.publicKey
    },

    displayBalance() {
      if (!this.vault) return 0
      return this.vault.balance
    },

    walletAddress() {
      return this.$store.state.wallet?.address ?? null
    },

    developerOwnerPkh() {
      return this.getOwnerPkhHex()
    },

    developerPriceTargetCents() {
      if (this.form.priceTarget != null) {
        return Math.floor(this.form.priceTarget * 100)
      }
      if (this.vault && this.vault.priceTarget != null) {
        return Math.floor(this.vault.priceTarget * 100)
      }
      return null
    },

    developerChainId() {
      return this.$walletConnect && typeof this.$walletConnect.getChainId === 'function'
        ? this.$walletConnect.getChainId()
        : null
    },

    chipnetExplorerAddressUrl() {
      if (!this.vault || !this.vault.contractAddress) return ''
      const addr = encodeURIComponent(this.vault.contractAddress)
      return `https://chipnet.bch.ninja/address/${addr}`
    },
  },

  methods: {
    persistVaultState(vaultState) {
      if (typeof localStorage === 'undefined') return
      try {
        if (!vaultState) {
          localStorage.removeItem(this.vaultPersistKey)
          return
        }
        localStorage.setItem(this.vaultPersistKey, JSON.stringify(vaultState))
      } catch {
        // ignore persistence errors
      }
    },

    loadPersistedVaultState() {
      if (typeof localStorage === 'undefined') return null
      try {
        const raw = localStorage.getItem(this.vaultPersistKey)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        return parsed
      } catch {
        return null
      }
    },

    clearPersistedVaultState() {
      this.persistVaultState(null)
    },

    /**
     * Get owner PKH derived from the connected/generated wallet's public key.
     * Returns null if no wallet is connected or signer not set.
     */
    getOwnerPkhHex() {
      const ownerPkHex = this.$store.state.wallet?.publicKey ?? this.$walletConnect?.getOwnerPublicKeyHex?.() ?? null
      if (!ownerPkHex) return null
      return this.derivePkhFromPublicKey(ownerPkHex)
    },

    /**
     * Derive PKH from public key hex
     * Note: In production, get public key from connected wallet
     */
    derivePkhFromPublicKey(publicKeyHex) {
      try {
        const publicKey = hexToBin(publicKeyHex)
        const pkh = hash160(publicKey)
        return binToHex(pkh)
      } catch (error) {
        console.error('Failed to derive PKH:', error)
        return null
      }
    },

    async refreshPrice() {
      this.priceLoading = true
      this.oracleSuccess = false
      try {
        const data = await fetchOraclePrice()
        this.currentBchPrice = data.price
        this.oracleData = {
          message_hex: data.message_hex,
          signature_hex: data.signature_hex,
          oracle_pubkey_hex: data.oracle_pubkey_hex,
        }
        this.oracleSuccess = true
        this.$q.notify({
          type: 'positive',
          message: 'Oracle data received successfully',
          icon: 'check_circle',
        })
      } catch (err) {
        this.currentBchPrice = null
        this.oracleData = { message_hex: '', signature_hex: '', oracle_pubkey_hex: '' }
        this.$q.notify({
          type: 'warning',
          message: err?.message || 'Failed to fetch Oracle price',
          icon: 'warning',
        })
      } finally {
        this.priceLoading = false
      }
    },

    async onLockFunds() {
      if (!this.canLockFunds) return
      const wc = this.$walletConnect
      if (!wc || !wc.isConnected || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      this.locking = true
      try {
        const ownerPkhHex = this.getOwnerPkhHex()
        const oraclePkHex = this.oracleData.oracle_pubkey_hex
        const priceTargetCents = Math.floor(this.form.priceTarget * 100)

        if (!oraclePkHex) {
          throw new Error('Oracle public key not loaded. Refresh the price first.')
        }

        const contractAddress = await calculateContractAddress(
          ownerPkhHex,
          oraclePkHex,
          priceTargetCents
        )

        const contract = initializeHodlVaultContract(
          ownerPkhHex,
          oraclePkHex,
          priceTargetCents
        )

        // Get initial balance (should be 0 for new contract)
        const balance = Number(await getAddressBalance(contractAddress))

        // Store vault info
        this.vault = {
          contractAddress,
          balance: Number(balance),
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex,
          contract, // Store contract instance for withdrawal
        }

        // Persist vault so it survives refresh
        this.persistVaultState({
          walletAddress: this.walletAddress,
          contractAddress,
          priceTarget: this.form.priceTarget,
          priceTargetCents,
          ownerPkhHex,
          oraclePkHex,
          createdAt: Date.now(),
        })

        this.$q.notify({
          type: 'positive',
          message: `Vault created at ${contractAddress}`,
          icon: 'check_circle',
        })

        console.log('Vault created. Contract address:', contractAddress)
        console.log('To lock funds, send', this.form.amount, 'satoshis to:', contractAddress)

        // Always start watching balance after vault creation (covers both manual and WalletConnect deposits)
        this.startBalancePolling()

        // Immediately request a deposit from the connected wallet using WalletConnect
        if (typeof wc.request === 'function') {
          this.depositing = true
          try {
            const depositPromise = depositToVault(
              contractAddress,
              this.form.amount,
              (method, params) => wc.request(method, params)
            )
            const depositResult = await Promise.race([
              depositPromise,
              new Promise((resolve) =>
                setTimeout(() => resolve({ txid: null, raw: null }), 20000)
              ),
            ])
            const txid = depositResult && depositResult.txid
            this.$q.notify({
              type: 'positive',
              message: txid
                ? `Deposit transaction submitted. TX: ${txid}`
                : 'Deposit submitted in wallet. Waiting for network confirmation...',
              icon: 'check_circle',
            })
          } catch (depositErr) {
            console.error('Initial deposit via WalletConnect failed:', depositErr)
            this.$q.notify({
              type: 'negative',
              message:
                depositErr?.message ||
                'Deposit rejected by wallet. Please ensure you have enough funds for the amount + fee.',
            })
          } finally {
            this.depositing = false
          }
        } else {
          this.$q.notify({
            type: 'warning',
            message:
              'WalletConnect request function is not available; please send funds manually to the vault address.',
          })
        }
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to create vault',
        })
      } finally {
        this.locking = false
      }
    },

    async onVerifyIdentity() {
      if (this.hasPublicKey) return
      const wc = this.$walletConnect
      if (!wc || typeof wc.recoverPublicKey !== 'function') {
        this.$q.notify({ type: 'negative', message: 'WalletConnect not initialized' })
        return
      }

      this.verifyingIdentity = true
      try {
        await wc.recoverPublicKey()
        this.$q.notify({
          type: 'positive',
          message: 'Identity verified',
          icon: 'check_circle',
        })
      } catch (err) {
        this.$q.notify({
          type: 'negative',
          message: err?.message || 'Failed to verify identity',
        })
      } finally {
        this.verifyingIdentity = false
      }
    },

    /** Validate BCH CashAddr (bitcoincash:, bchtest:, chipnet:) */
    isValidBchAddress(val) {
      if (!val || typeof val !== 'string') return false
      const trimmed = val.trim()
      return /^(bitcoincash|bchtest|chipnet):[a-zA-Z0-9]+$/i.test(trimmed)
    },

    triggerWithdrawQrInput() {
      this.$refs.withdrawQrInputRef?.click()
    },

    openCameraScan() {
      this.showCameraScan = true
      this.$nextTick(() => this.startCamera())
    },

    startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.$q.notify({ type: 'negative', message: 'Camera not supported in this browser' })
        this.showCameraScan = false
        return
      }
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          this.cameraStream = stream
          this.$nextTick(() => {
            const video = this.$refs.cameraVideoRef
            if (video) {
              video.srcObject = stream
              video.play().catch(() => {})
              this.cameraScanInterval = setInterval(() => this.captureAndDecode(), 250)
            }
          })
        })
        .catch((err) => {
          this.$q.notify({
            type: 'negative',
            message: err?.message || 'Camera access denied or unavailable',
          })
          this.showCameraScan = false
        })
    },

    stopCamera() {
      if (this.cameraScanInterval) {
        clearInterval(this.cameraScanInterval)
        this.cameraScanInterval = null
      }
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((t) => t.stop())
        this.cameraStream = null
      }
      const video = this.$refs.cameraVideoRef
      if (video && video.srcObject) {
        video.srcObject = null
      }
    },

    captureAndDecode() {
      const video = this.$refs.cameraVideoRef
      if (!video || !video.videoWidth || video.readyState < 2) return
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && code.data) {
        const address = this.extractBchAddressFromQrData(code.data)
        if (address) {
          this.withdrawToAddress = address
          this.$q.notify({ type: 'positive', message: 'Address scanned', icon: 'check_circle' })
          this.stopCamera()
          this.showCameraScan = false
        }
      }
    },

    onWithdrawQrFile(event) {
      const file = event.target?.files?.[0]
      if (!file || !file.type.startsWith('image/')) {
        this.$q.notify({ type: 'warning', message: 'Please choose an image file (e.g. Paytaca receive QR screenshot)' })
        event.target.value = ''
        return
      }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          this.$q.notify({ type: 'negative', message: 'Could not read image' })
          event.target.value = ''
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (!code || !code.data) {
          this.$q.notify({ type: 'warning', message: 'No QR code found in image' })
          event.target.value = ''
          return
        }
        const address = this.extractBchAddressFromQrData(code.data)
        if (address) {
          this.withdrawToAddress = address
          this.$q.notify({ type: 'positive', message: 'Address read from QR', icon: 'check_circle' })
        } else {
          this.$q.notify({ type: 'warning', message: 'QR code does not contain a BCH address' })
        }
        event.target.value = ''
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        this.$q.notify({ type: 'negative', message: 'Failed to load image' })
        event.target.value = ''
      }
      img.src = url
    },

    /** Extract BCH CashAddr from Paytaca-style receive QR data (e.g. "bitcoincash:qp3d...?amount=0.01") */
    extractBchAddressFromQrData(data) {
      if (!data || typeof data !== 'string') return null
      const withoutQuery = data.trim().split('?')[0].trim()
      const match = withoutQuery.match(/^(bitcoincash|bchtest|chipnet):[a-zA-Z0-9]+$/i)
      return match ? match[0] : null
    },

    async onWithdraw() {
      if (!this.canWithdraw || !this.vault) return

      const wc = this.$walletConnect
      if (!wc || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      const customAddress = this.withdrawToAddress?.trim()
      const ownerAddress = customAddress || wc.getAddress()
      if (!ownerAddress) {
        this.$q.notify({ type: 'negative', message: 'Could not get wallet address' })
        return
      }
      if (customAddress && !this.isValidBchAddress(customAddress)) {
        this.$q.notify({ type: 'negative', message: 'Invalid BCH address. Use a CashAddr (bitcoincash:, bchtest:, or chipnet:).' })
        return
      }

      if (!this.oracleData.message_hex || !this.oracleData.signature_hex) {
        this.$q.notify({
          type: 'negative',
          message: 'Oracle data missing. Refresh the price first.',
        })
        return
      }

      const ownerSigTemplate = wc.getSignatureTemplate()
      const useWalletConnectSign = !ownerSigTemplate && typeof wc.request === 'function'

      this.withdrawing = true
      try {
        const withdrawPromise = spendVault(this.vault.contract, {
          ownerPkHex: wc.getOwnerPublicKeyHex() || '',
          ownerSigTemplate: ownerSigTemplate || undefined,
          oracleMessageHex: this.oracleData.message_hex,
          oracleSigHex: this.oracleData.signature_hex,
          ownerAddress,
          ...(useWalletConnectSign && {
            walletConnectRequest: (method, params) => wc.request(method, params),
          }),
        })

        const result = await Promise.race([
          withdrawPromise,
          new Promise((resolve) =>
            setTimeout(() => resolve({ txid: null, timeout: true }), 25000)
          ),
        ])

        if (result && result.timeout) {
          this.$q.notify({
            type: 'warning',
            message:
              'Withdrawal request timed out waiting for wallet. Please check Paytaca for any pending or sent transaction.',
          })
          return
        }

        this.$q.notify({
          type: 'positive',
          message: `Withdrawal sent. TX: ${result.txid}`,
          icon: 'check_circle',
        })
        await this.refreshVaultBalance()
      } catch (err) {
        const msg = err?.message || 'Failed to withdraw'
        const isInternal = msg.includes('Internal error') || (err?.code === -32603)
        this.$q.notify({
          type: 'negative',
          message: isInternal
            ? 'Wallet could not sign the withdrawal (internal error). Try ensuring Paytaca is updated and you are on the correct network (e.g. chipnet).'
            : msg,
        })
      } finally {
        this.withdrawing = false
      }
    },

    async onDepositMore() {
      if (!this.vault || !this.vault.contractAddress) {
        this.$q.notify({
          type: 'negative',
          message: 'No active vault to deposit into',
        })
        return
      }

      const wc = this.$walletConnect
      if (!wc || !wc.isConnected || !wc.isConnected()) {
        this.$q.notify({
          type: 'negative',
          message: 'Please connect your wallet first',
        })
        return
      }

      if (!this.additionalDepositAmount || this.additionalDepositAmount < 1000) {
        this.$q.notify({
          type: 'warning',
          message: 'Deposit amount must be at least 1000 satoshis',
        })
        return
      }

      this.depositing = true
      try {
        const depositPromise = depositToVault(
          this.vault.contractAddress,
          this.additionalDepositAmount,
          (method, params) => wc.request(method, params)
        )
        const depositResult = await Promise.race([
          depositPromise,
          new Promise((resolve) =>
            setTimeout(() => resolve({ txid: null, raw: null }), 20000)
          ),
        ])
        const txid = depositResult && depositResult.txid
        this.$q.notify({
          type: 'positive',
          message: txid
            ? `Deposit transaction submitted. TX: ${txid}`
            : 'Deposit submitted in wallet. Waiting for network confirmation...',
          icon: 'check_circle',
        })
        this.startBalancePolling()
      } catch (err) {
        console.error('Additional deposit via WalletConnect failed:', err)
        this.$q.notify({
          type: 'negative',
          message:
            err?.message ||
            'Deposit rejected by wallet. Please ensure you have enough funds for the amount + fee.',
        })
      } finally {
        this.depositing = false
      }
    },

    formatBalance(balance) {
      return new Intl.NumberFormat('en-US').format(balance)
    },

    async refreshVaultBalance() {
      if (!this.vault || !this.vault.contractAddress) return
      this.balanceRefreshing = true
      try {
        const balance = await getAddressBalance(this.vault.contractAddress)
        this.vault.balance = Number(balance)
      } catch (err) {
        console.error('Failed to refresh balance:', err)
        this.$q.notify({
          type: 'warning',
          message: err?.message || 'Failed to refresh balance',
        })
      } finally {
        this.balanceRefreshing = false
      }
    },

    startBalancePolling() {
      if (!this.vault || !this.vault.contractAddress) return
      if (this.depositPollInterval) {
        clearInterval(this.depositPollInterval)
        this.depositPollInterval = null
      }
      this.depositPollStartTime = Date.now()
      this.depositPollInterval = setInterval(async () => {
        if (!this.vault || !this.vault.contractAddress) {
          clearInterval(this.depositPollInterval)
          this.depositPollInterval = null
          return
        }
        try {
          const balance = await getAddressBalance(this.vault.contractAddress)
          const numeric = Number(balance)
          this.vault.balance = numeric
          const elapsed = Date.now() - this.depositPollStartTime
          if (numeric > 0) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
            this.$q.notify({
              type: 'positive',
              message: 'Deposit confirmed',
              icon: 'check_circle',
            })
          } else if (elapsed >= 120000) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
          }
        } catch (err) {
          console.error('Vault balance watcher error:', err)
          const elapsed = Date.now() - this.depositPollStartTime
          if (elapsed >= 120000) {
            clearInterval(this.depositPollInterval)
            this.depositPollInterval = null
          }
        }
      }, 5000)
    },
  },

  watch: {
    walletAddress(newAddress, oldAddress) {
      if (!newAddress || newAddress !== oldAddress) {
        this.vault = null
        this.depositing = false
        this.clearPersistedVaultState()
        if (this.balanceInterval) {
          clearInterval(this.balanceInterval)
          this.balanceInterval = null
        }
        if (this.depositPollInterval) {
          clearInterval(this.depositPollInterval)
          this.depositPollInterval = null
        }
      }
    },

    vault(newVault, oldVault) {
      if (newVault && newVault !== oldVault) {
        this.refreshVaultBalance()
        this.startBalancePolling()
      }
    },
  },

  mounted() {
    this.refreshPrice()
    // Restore persisted vault (if it belongs to current wallet)
    const persisted = this.loadPersistedVaultState()
    if (persisted && persisted.walletAddress && persisted.walletAddress === this.walletAddress) {
      const currentOwnerPkhHex = this.getOwnerPkhHex()
      const canRestore =
        persisted.contractAddress &&
        persisted.oraclePkHex &&
        persisted.priceTargetCents != null &&
        persisted.ownerPkhHex &&
        currentOwnerPkhHex &&
        persisted.ownerPkhHex === currentOwnerPkhHex

      if (canRestore) {
        const contract = initializeHodlVaultContract(
          persisted.ownerPkhHex,
          persisted.oraclePkHex,
          persisted.priceTargetCents
        )
        this.vault = {
          contractAddress: persisted.contractAddress,
          balance: 0,
          priceTarget: persisted.priceTarget ?? null,
          priceTargetCents: persisted.priceTargetCents,
          ownerPkhHex: persisted.ownerPkhHex,
          oraclePkHex: persisted.oraclePkHex,
          contract,
        }
        this.refreshVaultBalance()
        this.startBalancePolling()
      } else {
        this.clearPersistedVaultState()
      }
    }
    this.balanceInterval = setInterval(() => {
      this.refreshVaultBalance()
    }, 30000)
  },

  beforeUnmount() {
    this.stopCamera()
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval)
    }
    if (this.depositPollInterval) {
      clearInterval(this.depositPollInterval)
      this.depositPollInterval = null
    }
  },
})
</script>

<style scoped lang="scss">
.monospace {
  font-family: ui-monospace, monospace;
}
.text-select {
  user-select: all;
}
.border-positive {
  border: 2px solid var(--q-positive);
}
.hidden {
  display: none !important;
}
.camera-video {
  width: 100%;
  max-width: 320px;
  max-height: 240px;
  object-fit: cover;
  background: #000;
}
</style>
