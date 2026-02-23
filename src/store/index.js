/**
 * Vuex store: global app state.
 * Wallet state is persisted here so it survives tab/page changes.
 */

import { createStore } from 'vuex'
import wallet from './modules/wallet'
import app from './modules/app'

export default createStore({
  modules: {
    wallet,
    app,
  },
})
