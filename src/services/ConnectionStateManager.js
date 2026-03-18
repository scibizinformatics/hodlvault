/**
 * Connection State Manager
 * Unified state management for WalletConnect connections
 * Prevents race conditions and ensures state synchronization
 */

export class ConnectionStateManager {
  constructor() {
    this.states = {
      DISCONNECTED: 'DISCONNECTED',
      CONNECTING: 'CONNECTING',
      CONNECTED: 'CONNECTED',
      RECONNECTING: 'RECONNECTING',
      ERROR: 'ERROR'
    }
    
    this.currentState = this.states.DISCONNECTED
    this.currentSession = null
    this.connectionPromise = null
    this.stateChangeListeners = []
    this.lastStateChange = Date.now()
    this.connectionAttempts = 0
    this.maxConnectionAttempts = 3
  }

  /**
   * Add listener for state changes
   */
  addStateChangeListener(callback) {
    this.stateChangeListeners.push(callback)
  }

  /**
   * Remove state change listener
   */
  removeStateChangeListener(callback) {
    const index = this.stateChangeListeners.indexOf(callback)
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1)
    }
  }

  /**
   * Notify all listeners of state change
   */
  notifyStateChange(oldState, newState, data = {}) {
    this.lastStateChange = Date.now()
    
    console.log('ConnectionStateManager: State change', {
      from: oldState,
      to: newState,
      timestamp: this.lastStateChange,
      data
    })

    this.stateChangeListeners.forEach(callback => {
      try {
        callback(newState, oldState, data)
      } catch (error) {
        console.error('ConnectionStateManager: Listener error', error)
      }
    })
  }

  /**
   * Transition to new state with validation
   */
  setState(newState, data = {}) {
    const oldState = this.currentState
    
    // Validate state transition
    if (!this.isValidTransition(oldState, newState)) {
      console.warn('ConnectionStateManager: Invalid state transition', {
        from: oldState,
        to: newState
      })
      return false
    }

    this.currentState = newState
    this.notifyStateChange(oldState, newState, data)
    return true
  }

  /**
   * Validate if state transition is allowed
   */
  isValidTransition(fromState, toState) {
    const validTransitions = {
      [this.states.DISCONNECTED]: [
        this.states.CONNECTING,
        this.states.RECONNECTING
      ],
      [this.states.CONNECTING]: [
        this.states.CONNECTED,
        this.states.ERROR,
        this.states.DISCONNECTED
      ],
      [this.states.CONNECTED]: [
        this.states.DISCONNECTED,
        this.states.RECONNECTING,
        this.states.ERROR
      ],
      [this.states.RECONNECTING]: [
        this.states.CONNECTED,
        this.states.ERROR,
        this.states.DISCONNECTED
      ],
      [this.states.ERROR]: [
        this.states.DISCONNECTED,
        this.states.RECONNECTING,
        this.states.CONNECTING
      ]
    }

    return validTransitions[fromState]?.includes(toState) || false
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState
  }

  /**
   * Check if currently connected
   */
  isConnected() {
    return this.currentState === this.states.CONNECTED
  }

  /**
   * Check if currently connecting
   */
  isConnecting() {
    return this.currentState === this.states.CONNECTING || 
           this.currentState === this.states.RECONNECTING
  }

  /**
   * Check if in error state
   */
  isError() {
    return this.currentState === this.states.ERROR
  }

  /**
   * Set current session
   */
  setSession(session) {
    const oldSession = this.currentSession
    this.currentSession = session
    
    console.log('ConnectionStateManager: Session updated', {
      hasOldSession: !!oldSession,
      hasNewSession: !!session,
      sessionTopic: session?.topic
    })

    // Update state based on session
    if (session && session.topic) {
      if (this.isConnecting()) {
        this.setState(this.states.CONNECTED, { session })
      }
    } else {
      if (this.isConnected()) {
        this.setState(this.states.DISCONNECTED, { reason: 'session_cleared' })
      }
    }
  }

  /**
   * Get current session
   */
  getSession() {
    return this.currentSession
  }

  /**
   * Set connection promise (prevents multiple simultaneous connections)
   */
  setConnectionPromise(promise) {
    this.connectionPromise = promise
  }

  /**
   * Get connection promise
   */
  getConnectionPromise() {
    return this.connectionPromise
  }

  /**
   * Clear connection promise
   */
  clearConnectionPromise() {
    this.connectionPromise = null
  }

  /**
   * Increment connection attempts
   */
  incrementConnectionAttempts() {
    this.connectionAttempts++
    return this.connectionAttempts
  }

  /**
   * Reset connection attempts
   */
  resetConnectionAttempts() {
    this.connectionAttempts = 0
  }

  /**
   * Check if max attempts reached
   */
  isMaxAttemptsReached() {
    return this.connectionAttempts >= this.maxConnectionAttempts
  }

  /**
   * Get connection health status
   */
  getHealthStatus() {
    return {
      state: this.currentState,
      hasSession: !!this.currentSession,
      sessionTopic: this.currentSession?.topic,
      lastStateChange: this.lastStateChange,
      connectionAttempts: this.connectionAttempts,
      hasActiveConnection: this.connectionPromise !== null
    }
  }

  /**
   * Reset all state (for recovery)
   */
  reset() {
    const oldState = this.currentState
    this.currentState = this.states.DISCONNECTED
    this.currentSession = null
    this.connectionPromise = null
    this.connectionAttempts = 0
    this.lastStateChange = Date.now()
    
    this.notifyStateChange(oldState, this.states.DISCONNECTED, { reason: 'manual_reset' })
  }
}

// Singleton instance
export const connectionStateManager = new ConnectionStateManager()
