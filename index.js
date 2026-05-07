const ReadyResource = require('ready-resource')
const b4a = require('b4a')
const cenc = require('compact-encoding')

const blindPush = require('blind-push')
const { ForwardPushRequest } = require('blind-push/encodings')

const DEFAULT_NOTIFICATION = {
  title: 'Keet',
  body: '✉️'
}

const DEFAULT_APNS_TOPIC = 'io.keet.app'

/**
 * @typedef {object} ExternalPushMessage
 * @property {string} topic
 * @property {{
 *   priority: string,
 *   data: {
 *     title: string,
 *     body: string,
 *     payload: string
 *   }
 * }} android
 * @property {{
 *   headers: {
 *     'apns-topic': string,
 *     'apns-push-type': string
 *   },
 *   payload: {
 *     aps: {
 *       category: string,
 *       alert: {
 *         title: string,
 *         body: string
 *       },
 *       mutableContent: true,
 *       sound: string,
 *       threadId: string
 *     },
 *     payload: string
 *   }
 * }} apns
 */

/**
 * @typedef {object} ExternalPushService
 * @property {(message: ExternalPushMessage) => Promise<unknown>} send
 */

class BlindPushGateway extends ReadyResource {
  /**
   * @param {import('hyperdht')} dht
   * @param {import('protomux-rpc-router')} router
   * @param {ExternalPushService} externalPushService
   * @param {object} [opts]
   * @param {{ title?: string, body?: string }} [opts.notification]
   * @param {string} [opts.apnsTopic='io.keet.app']
   */
  constructor(
    dht,
    router,
    externalPushService,
    { notification = DEFAULT_NOTIFICATION, apnsTopic = DEFAULT_APNS_TOPIC } = {}
  ) {
    super()

    this.dht = dht
    this.router = router
    this.externalPushService = externalPushService
    this.notification = notification
    this.apnsTopic = apnsTopic
    this.stats = { attempted: 0, sent: 0, failed: 0 }

    this.router.method(
      'forward-push',
      {
        requestEncoding: ForwardPushRequest,
        responseEncoding: cenc.none
      },
      this._forwardPush.bind(this)
    )
    this.server = this.dht.createServer()
  }

  get publicKey() {
    return this.dht.defaultKeyPair.publicKey
  }

  async _open() {
    await this.router.ready()

    this.server.on('connection', (conn) => {
      this.router.handleConnection(conn, this.dht.defaultKeyPair.publicKey)
    })
    await this.server.listen()
  }

  async _close() {
    await this.router.close()
  }

  async _forwardPush(req) {
    if (!this.opened) await this.ready()

    this.stats.attempted++

    try {
      const payload = b4a.toString(blindPush.encode(req.payload), 'base64')
      const topic = b4a.toString(req.payload.discoveryKey, 'hex')
      const threadId = b4a.toString(req.payload.discoveryKey, 'base64')

      /** @type {ExternalPushMessage} */
      const message = {
        topic,
        android: {
          priority: 'high',
          data: {
            ...this.notification,
            payload
          }
        },
        apns: {
          headers: {
            'apns-topic': this.apnsTopic,
            'apns-push-type': 'alert'
          },
          payload: {
            aps: {
              category: 'room_message',
              alert: this.notification,
              mutableContent: true,
              sound: 'default',
              threadId
            },
            payload
          }
        }
      }

      await this.externalPushService.send(message)

      this.stats.sent++
    } catch (err) {
      this.stats.failed++
      throw err
    }
  }
}

module.exports = BlindPushGateway
