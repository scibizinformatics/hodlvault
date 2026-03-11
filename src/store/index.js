/**
 * Vuex store: global app state.
 * Wallet state is persisted here so it survives tab/page changes.
 */

import { createStore } from 'vuex'
import wallet from './modules/wallet'
import app from './modules/app'
import autoWithdrawal from './modules/autoWithdrawal'

export default createStore({
  modules: {
    wallet,
    app,
    autoWithdrawal,
  },
})
