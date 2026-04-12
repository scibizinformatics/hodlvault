/**
 * Boot file: install Vuex store on the app so it is available globally.
 */

import { boot } from 'quasar/wrappers'
import store from 'src/store'

export default boot(({ app }) => {
  app.use(store)
})
