import { InstanceBase, InstanceStatus, SomeCompanionConfigField, runEntrypoint } from '@companion-module/base'
import { NodeCGConfig, GetConfigFields } from './config'
import io from 'socket.io-client'
import { TypedClientSocket } from '@nodecg/types/types/socket-protocol'
import { GetActionsList } from './actions'

/**
 * Companion instance class for NodeCG instances
 */
class NodeCGInstance extends InstanceBase<NodeCGConfig> {
  private socket: TypedClientSocket | undefined
  private config!: NodeCGConfig

  // private connected = false

  // Override base types to make types stricter
  public checkFeedbacks(...feedbackTypes: string[]): void {
    // todo - arg should be of type FeedbackId
    super.checkFeedbacks(...feedbackTypes)
  }

  /**
   * Main initialization function called once the module
   * is OK to start doing things.
   */
  public async init(config: NodeCGConfig): Promise<void> {
    this.config = config

    this.setupNodeCGConnection()

    this.updateCompanionBits()
  }

  /**
   * Process an updated configuration array.
   */
  public async configUpdated(config: NodeCGConfig): Promise<void> {
    this.config = config

    this.socket?.disconnect()
    this.socket?.removeAllListeners()
    this.socket = undefined

    this.setupNodeCGConnection()
  }

  /**
   * Creates the configuration fields for web config.
   */
  public getConfigFields(): SomeCompanionConfigField[] {
    return GetConfigFields()
  }

  /**
   * Clean up the instance before it is destroyed.
   */
  public async destroy(): Promise<void> {
    this.socket?.disconnect()
    this.socket?.removeAllListeners()
    this.socket = undefined
  }

  private updateCompanionBits(): void {
    // this.setActionDefinitions(GetActionsList(this, this.client, this.config, this.state))
    // this.setFeedbackDefinitions(GetFeedbacksList(this, this.client, this.state))
    // this.setPresetDefinitions(GetPresetsList())
  }

  private setupNodeCGConnection(): void {
    this.log('debug', 'connecting ' + (this.config.url || ''))
    this.updateStatus(InstanceStatus.Connecting)

    if (!this.config.url) {
      // todo - throw error
      this.updateStatus(InstanceStatus.BadConfig)
      this.log('error', 'No url ' + (this.config.url || ''))

      return
    }

    if (this.config.token) {
      this.log('debug', 'connecting using token')
      this.socket = io(this.config.url, { query: { token: this.config.token } })
    } else {
      this.socket = io(this.config.url)
      this.log('debug', 'connected without token' + this.socket.connected)
    }

    this.socket.on('protocol_error', (err) => {
      if (err.type === 'UnauthorizedError') {
        // todo - set state to failed
        this.updateStatus(InstanceStatus.ConnectionFailure, 'Unauthorized')
        this.log('error', 'Failed to connect ' + (this.config.url || '') + ': unauthorized')
      } else {
        // unhandled socket err
        this.updateStatus(InstanceStatus.ConnectionFailure, 'Unhandled error' + err.message)
      }
    })

    this.socket.on('disconnect', (reason) => {
      this.updateStatus(InstanceStatus.Connecting, reason)

      if (reason === 'io server disconnect') {
        // The server forcibly closed the socket.
        // In this case, the client won't automatically reconnect.
        // So, we manually do it here:
        this.socket?.connect()
      }
    })

    this.socket.io.on('reconnect', () => {
      this.updateStatus(InstanceStatus.Ok)
    })

    this.socket.io.on('reconnect_failed', () => {
      this.updateStatus(InstanceStatus.Disconnected, 'Failed to reconnect to NodeCG server!')
    })

    this.socket.on('connect', () => {
      this.updateStatus(InstanceStatus.Ok)

      this.log('debug', 'Connected to NodeCG, initialising...')

      // @ts-expect-error: dependency not updated
      this.socket?.emit('remote:readAllMethods', (err, methods) => {
        if (err) this.log('error', JSON.stringify(err))
        this.log('debug', JSON.stringify(methods))

        if (methods) {
          this.setActionDefinitions(GetActionsList(this, this.executeMethod.bind(this), methods))
        }
      })
    })
  }

  executeMethod(bundleName: string, methodName: string) {
    this.log('debug', 'exec ' + bundleName + ' ' + methodName)
    // @ts-expect-error: prototype
    this.socket?.emit('remote:executeMethod', { bundleName, methodName, data: null }, (err) => {
      if (err) {
        this.log('error', err)
      }
    })
  }
}

runEntrypoint(NodeCGInstance, [])
