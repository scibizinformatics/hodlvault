/**
 * Session Health Monitor
 * Monitors WalletConnect session health and validates connection status
 */

export class SessionHealthMonitor {
  constructor(connectionStateManager, walletConnectClient) {
    this.connectionStateManager = connectionStateManager
    this.walletConnectClient = walletConnectClient
    this.healthCheckInterval = null
    this.healthCheckPeriod = 30000 // 30 seconds
    this.lastHealthCheck = 0
    this.isMonitoring = false
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('SessionHealthMonitor: Already monitoring')
      return
    }

    this.isMonitoring = true
    console.log('SessionHealthMonitor: Starting health monitoring')

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, this.healthCheckPeriod)

    // Perform initial health check
    this.performHealthCheck()
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    console.log('SessionHealthMonitor: Stopping health monitoring')

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      this.lastHealthCheck = Date.now()
      
      const session = this.connectionStateManager.getSession()
      const isConnected = this.connectionStateManager.isConnected()

      console.log('SessionHealthMonitor: Performing health check', {
        hasSession: !!session,
        isConnected,
        sessionTopic: session?.topic,
        sessionExpiry: session?.expiry
      })

      // Check if we think we're connected but don't have a valid session
      if (isConnected && !this.isValidSession(session)) {
        console.warn('SessionHealthMonitor: Invalid session detected, updating state')
        this.handleInvalidSession()
        return
      }

      // Check if session is expired
      if (session && this.isSessionExpired(session)) {
        console.warn('SessionHealthMonitor: Session expired')
        this.handleExpiredSession()
        return
      }

      // Check if we can communicate with the wallet
      if (session && isConnected) {
        await this.validateWalletCommunication(session)
      }

    } catch (error) {
      console.error('SessionHealthMonitor: Health check failed', error)
      this.handleHealthCheckError(error)
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
    
    return hasTopic && hasNamespaces && hasBchNamespace && hasAccounts
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
   * Handle invalid session
   */
  handleInvalidSession() {
    this.connectionStateManager.setState('ERROR', {
      reason: 'invalid_session',
      message: 'Session is invalid or corrupted'
    })

    // Try to clean up the invalid session
    this.cleanupInvalidSession()
  }

  /**
   * Handle expired session
   */
  handleExpiredSession() {
    this.connectionStateManager.setState('DISCONNECTED', {
      reason: 'session_expired',
      message: 'Session has expired'
    })

    this.cleanupExpiredSession()
  }

  /**
   * Handle health check errors
   */
  handleHealthCheckError(error) {
    // Don't change state for network errors, just log them
    if (error.message?.includes('timeout') || 
        error.message?.includes('network') ||
        error.code === -32603) {
      console.warn('SessionHealthMonitor: Network error during health check', error.message)
      return
    }

    // For other errors, mark as error state
    this.connectionStateManager.setState('ERROR', {
      reason: 'health_check_failed',
      message: error.message
    })
  }

  /**
   * Validate wallet communication
   */
  async validateWalletCommunication(session) {
    try {
      // Try a simple request to validate communication
      await this.walletConnectClient.request({
        topic: session.topic,
        chainId: session.namespaces.bch.chains[0],
        request: {
          method: 'bch_getAddresses',
          params: {}
        }
      })

      console.log('SessionHealthMonitor: Wallet communication validated')
    } catch (error) {
      console.warn('SessionHealthMonitor: Wallet communication failed', error.message)
      
      // If communication fails, the session might be dead
      if (error.code === -32001 || error.message?.includes('session')) {
        this.handleDeadSession()
      }
    }
  }

  /**
   * Handle dead session
   */
  handleDeadSession() {
    this.connectionStateManager.setState('DISCONNECTED', {
      reason: 'dead_session',
      message: 'Session is no longer responsive'
    })

    this.cleanupDeadSession()
  }

  /**
   * Cleanup invalid session
   */
  async cleanupInvalidSession() {
    try {
      const session = this.connectionStateManager.getSession()
      if (session?.topic) {
        await this.walletConnectClient.disconnect({
          topic: session.topic
        })
      }
    } catch (error) {
      console.warn('SessionHealthMonitor: Failed to cleanup invalid session', error)
    } finally {
      this.connectionStateManager.setSession(null)
    }
  }

  /**
   * Cleanup expired session
   */
  async cleanupExpiredSession() {
    try {
      const session = this.connectionStateManager.getSession()
      if (session?.topic) {
        await this.walletConnectClient.disconnect({
          topic: session.topic
        })
      }
    } catch (error) {
      console.warn('SessionHealthMonitor: Failed to cleanup expired session', error)
    } finally {
      this.connectionStateManager.setSession(null)
    }
  }

  /**
   * Cleanup dead session
   */
  async cleanupDeadSession() {
    try {
      const session = this.connectionStateManager.getSession()
      if (session?.topic) {
        await this.walletConnectClient.disconnect({
          topic: session.topic
        })
      }
    } catch (error) {
      console.warn('SessionHealthMonitor: Failed to cleanup dead session', error)
    } finally {
      this.connectionStateManager.setSession(null)
    }
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastHealthCheck: this.lastHealthCheck,
      healthCheckPeriod: this.healthCheckPeriod,
      sessionValid: this.isValidSession(this.connectionStateManager.getSession()),
      sessionExpired: this.isSessionExpired(this.connectionStateManager.getSession())
    }
  }

  /**
   * Force immediate health check
   */
  async forceHealthCheck() {
    console.log('SessionHealthMonitor: Forcing health check')
    await this.performHealthCheck()
  }
}
