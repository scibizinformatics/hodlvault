/**
 * State Reconciliation Service
 * Detects and fixes state mismatches between WalletConnect, Vuex store, and Paytaca
 */

export class StateReconciliationService {
  constructor(connectionStateManager, store, walletConnectClient) {
    this.connectionStateManager = connectionStateManager
    this.store = store
    this.walletConnectClient = walletConnectClient
    this.reconciliationInProgress = false
    this.reconciliationListeners = []
  }

  /**
   * Add reconciliation listener
   */
  addReconciliationListener(callback) {
    this.reconciliationListeners.push(callback)
  }

  /**
   * Remove reconciliation listener
   */
  removeReconciliationListener(callback) {
    const index = this.reconciliationListeners.indexOf(callback)
    if (index > -1) {
      this.reconciliationListeners.splice(index, 1)
    }
  }

  /**
   * Notify reconciliation listeners
   */
  notifyReconciliationListeners(event, data) {
    this.reconciliationListeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('StateReconciliationService: Listener error', error)
      }
    })
  }

  /**
   * Perform full state reconciliation
   */
  async performReconciliation() {
    if (this.reconciliationInProgress) {
      console.log('StateReconciliationService: Reconciliation already in progress')
      return
    }

    this.reconciliationInProgress = true
    console.log('StateReconciliationService: Starting reconciliation')

    try {
      const reconciliationResult = await this.reconcileStates()
      
      this.notifyReconciliationListeners('reconciliation_completed', reconciliationResult)
      
      return reconciliationResult
    } catch (error) {
      console.error('StateReconciliationService: Reconciliation failed', error)
      
      const errorResult = {
        success: false,
        error: error.message,
        actions: []
      }
      
      this.notifyReconciliationListeners('reconciliation_failed', errorResult)
      
      return errorResult
    } finally {
      this.reconciliationInProgress = false
    }
  }

  /**
   * Reconcile all states
   */
  async reconcileStates() {
    const states = await this.gatherAllStates()
    const issues = this.detectStateIssues(states)
    const actions = []

    console.log('StateReconciliationService: State analysis', { states, issues })

    // Fix issues in order of priority
    for (const issue of issues) {
      const action = await this.fixStateIssue(issue, states)
      if (action) {
        actions.push(action)
        // Update states after each fix
        Object.assign(states, await this.gatherAllStates())
      }
    }

    return {
      success: issues.length === 0 || actions.every(a => a.success),
      issues,
      actions,
      finalStates: states
    }
  }

  /**
   * Gather all connection states
   */
  async gatherAllStates() {
    const wcSession = this.connectionStateManager.getSession()
    const wcState = this.connectionStateManager.getState()
    const storeState = this.store.state.wallet

    let walletState = null
    let walletAddress = null

    // Try to get actual wallet state if we have a session
    if (wcSession && wcSession.topic) {
      try {
        const addresses = await this.walletConnectClient.request({
          topic: wcSession.topic,
          chainId: wcSession.namespaces?.bch?.chains?.[0] || 'bch:chipnet',
          request: { method: 'bch_getAddresses', params: {} }
        })
        walletAddress = Array.isArray(addresses) && addresses.length ? addresses[0] : null
        walletState = walletAddress ? 'connected' : 'disconnected'
      } catch (error) {
        walletState = 'error'
        console.warn('StateReconciliationService: Failed to get wallet state', error.message)
      }
    }

    return {
      walletConnect: {
        session: wcSession,
        state: wcState,
        hasValidSession: this.isValidSession(wcSession)
      },
      store: {
        address: storeState?.address,
        publicKey: storeState?.publicKey,
        hasWalletData: !!(storeState?.address || storeState?.publicKey)
      },
      wallet: {
        state: walletState,
        address: walletAddress,
        isResponsive: walletState !== null
      }
    }
  }

  /**
   * Detect state issues
   */
  detectStateIssues(states) {
    const issues = []

    // Issue 1: WalletConnect says connected but no valid session
    if (states.walletConnect.state === 'CONNECTED' && !states.walletConnect.hasValidSession) {
      issues.push({
        type: 'wc_state_without_session',
        severity: 'high',
        description: 'WalletConnect state shows connected but no valid session'
      })
    }

    // Issue 2: Store has wallet data but WalletConnect is disconnected
    if (states.store.hasWalletData && states.walletConnect.state === 'DISCONNECTED') {
      issues.push({
        type: 'store_data_without_connection',
        severity: 'high',
        description: 'Store has wallet data but WalletConnect is disconnected'
      })
    }

    // Issue 3: WalletConnect connected but store has no data
    if (states.walletConnect.state === 'CONNECTED' && !states.store.hasWalletData) {
      issues.push({
        type: 'connection_without_store_data',
        severity: 'medium',
        description: 'WalletConnect connected but store has no wallet data'
      })
    }

    // Issue 4: Address mismatch between store and wallet
    if (states.store.address && states.wallet.address && 
        states.store.address !== states.wallet.address) {
      issues.push({
        type: 'address_mismatch',
        severity: 'high',
        description: 'Address mismatch between store and wallet'
      })
    }

    // Issue 5: Wallet state error but WalletConnect shows connected
    if (states.walletConnect.state === 'CONNECTED' && states.wallet.state === 'error') {
      issues.push({
        type: 'wallet_unresponsive',
        severity: 'high',
        description: 'Wallet is unresponsive but WalletConnect shows connected'
      })
    }

    // Issue 6: Expired session
    if (states.walletConnect.session && this.isSessionExpired(states.walletConnect.session)) {
      issues.push({
        type: 'expired_session',
        severity: 'high',
        description: 'WalletConnect session has expired'
      })
    }

    return issues.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  /**
   * Fix specific state issue
   */
  async fixStateIssue(issue, states) {
    console.log('StateReconciliationService: Fixing issue', issue.type)

    try {
      switch (issue.type) {
        case 'wc_state_without_session':
          return await this.fixWcStateWithoutSession()
        
        case 'store_data_without_connection':
          return await this.fixStoreDataWithoutConnection()
        
        case 'connection_without_store_data':
          return await this.fixConnectionWithoutStoreData(states)
        
        case 'address_mismatch':
          return await this.fixAddressMismatch(states)
        
        case 'wallet_unresponsive':
          return await this.fixWalletUnresponsive()
        
        case 'expired_session':
          return await this.fixExpiredSession()
        
        default:
          return {
            success: false,
            issue: issue.type,
            action: 'unknown_issue',
            message: `Unknown issue type: ${issue.type}`
          }
      }
    } catch (error) {
      console.error(`StateReconciliationService: Failed to fix ${issue.type}`, error)
      return {
        success: false,
        issue: issue.type,
        action: 'fix_failed',
        error: error.message
      }
    }
  }

  /**
   * Fix WalletConnect state without session
   */
  async fixWcStateWithoutSession() {
    console.log('StateReconciliationService: Fixing WC state without session')
    
    this.connectionStateManager.setState('DISCONNECTED', {
      reason: 'reconciliation_fix',
      description: 'Fixed invalid connected state'
    })

    return {
      success: true,
      issue: 'wc_state_without_session',
      action: 'reset_wc_state',
      message: 'Reset WalletConnect state to disconnected'
    }
  }

  /**
   * Fix store data without connection
   */
  async fixStoreDataWithoutConnection() {
    console.log('StateReconciliationService: Fixing store data without connection')
    
    this.store.dispatch('wallet/clearWallet')

    return {
      success: true,
      issue: 'store_data_without_connection',
      action: 'clear_store_data',
      message: 'Cleared store wallet data'
    }
  }

  /**
   * Fix connection without store data
   */
  async fixConnectionWithoutStoreData(states) {
    console.log('StateReconciliationService: Fixing connection without store data')
    
    try {
      const session = states.walletConnect.session
      const addresses = await this.walletConnectClient.request({
        topic: session.topic,
        chainId: session.namespaces?.bch?.chains?.[0] || 'bch:chipnet',
        request: { method: 'bch_getAddresses', params: {} }
      })

      if (addresses && addresses.length > 0) {
        this.store.dispatch('wallet/loginUser', {
          address: addresses[0],
          publicKey: null // Will be populated later if available
        })

        return {
          success: true,
          issue: 'connection_without_store_data',
          action: 'sync_store_data',
          message: 'Synced wallet data to store'
        }
      } else {
        // No addresses available, disconnect
        await this.walletConnectClient.disconnect({ topic: session.topic })
        this.connectionStateManager.setSession(null)

        return {
          success: true,
          issue: 'connection_without_store_data',
          action: 'disconnect_no_addresses',
          message: 'Disconnected due to no available addresses'
        }
      }
    } catch (error) {
      return {
        success: false,
        issue: 'connection_without_store_data',
        action: 'sync_failed',
        error: error.message
      }
    }
  }

  /**
   * Fix address mismatch
   */
  async fixAddressMismatch(states) {
    console.log('StateReconciliationService: Fixing address mismatch')
    
    // Trust the wallet address over store address
    if (states.wallet.address) {
      this.store.dispatch('wallet/loginUser', {
        address: states.wallet.address,
        publicKey: states.store.publicKey // Keep existing public key
      })

      return {
        success: true,
        issue: 'address_mismatch',
        action: 'update_store_address',
        message: 'Updated store address to match wallet'
      }
    } else {
      // Clear store if wallet address not available
      this.store.dispatch('wallet/clearWallet')
      
      return {
        success: true,
        issue: 'address_mismatch',
        action: 'clear_store_mismatch',
        message: 'Cleared store due to address mismatch'
      }
    }
  }

  /**
   * Fix unresponsive wallet
   */
  async fixWalletUnresponsive() {
    console.log('StateReconciliationService: Fixing unresponsive wallet')
    
    const session = this.connectionStateManager.getSession()
    if (session?.topic) {
      try {
        await this.walletConnectClient.disconnect({ topic: session.topic })
      } catch (error) {
        console.warn('StateReconciliationService: Failed to disconnect unresponsive wallet', error)
      }
    }

    this.connectionStateManager.setSession(null)
    this.store.dispatch('wallet/clearWallet')

    return {
      success: true,
      issue: 'wallet_unresponsive',
      action: 'disconnect_unresponsive',
      message: 'Disconnected unresponsive wallet'
    }
  }

  /**
   * Fix expired session
   */
  async fixExpiredSession() {
    console.log('StateReconciliationService: Fixing expired session')
    
    const session = this.connectionStateManager.getSession()
    if (session?.topic) {
      try {
        await this.walletConnectClient.disconnect({ topic: session.topic })
      } catch (error) {
        console.warn('StateReconciliationService: Failed to disconnect expired session', error)
      }
    }

    this.connectionStateManager.setSession(null)
    this.store.dispatch('wallet/clearWallet')

    return {
      success: true,
      issue: 'expired_session',
      action: 'disconnect_expired',
      message: 'Disconnected expired session'
    }
  }

  /**
   * Check if session is valid
   */
  isValidSession(session) {
    if (!session) return false
    
    const hasTopic = !!session.topic
    const hasNamespaces = !!session.namespaces
    const hasBchNamespace = !!session.namespaces?.bch
    const hasAccounts = session.namespaces?.bch?.accounts?.length > 0
    const notExpired = !this.isSessionExpired(session)
    
    return hasTopic && hasNamespaces && hasBchNamespace && hasAccounts && notExpired
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(session) {
    if (!session?.expiry) return false
    
    const now = Math.floor(Date.now() / 1000)
    return session.expiry <= now
  }

  /**
   * Get reconciliation status
   */
  getReconciliationStatus() {
    return {
      reconciliationInProgress: this.reconciliationInProgress,
      listenerCount: this.reconciliationListeners.length
    }
  }
}
