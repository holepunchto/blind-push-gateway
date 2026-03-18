const test = require('brittle')
const createTestnet = require('hyperdht/testnet')
const HyperDHT = require('hyperdht')
const Hyperswarm = require('hyperswarm')
const ProtomuxRPC = require('protomux-rpc')
const ProtomuxRPCRouter = require('protomux-rpc-router')
const b4a = require('b4a')
const cenc = require('compact-encoding')

const schema = require('../spec/hyperschema')
const ForwardPushRequest = schema.getEncoding('@blind-push-gateway/forward-push-request')

const BlindPushGateway = require('..')

async function setupTestnet(t) {
  const testnet = await createTestnet()
  t.teardown(() => testnet.destroy(), { order: 5000 })
  return testnet
}

async function setupGateway(t, bootstrap) {
  const sentMessages = []
  const swarm = new Hyperswarm({ bootstrap })
  const router = new ProtomuxRPCRouter()
  const service = new BlindPushGateway(swarm, router, {
    send: async (message) => {
      sentMessages.push(message)
    }
  })

  t.teardown(
    async () => {
      await service.close()
      await swarm.destroy()
    },
    { order: 3000 }
  )

  await service.ready()

  return { service, sentMessages }
}

async function setupClient(t, bootstrap, serverPublicKey) {
  const dht = new HyperDHT({ bootstrap })
  t.teardown(() => dht.destroy(), { order: 4000 })

  const stream = dht.connect(serverPublicKey)
  stream.on('error', () => {})
  await stream.opened

  const rpc = new ProtomuxRPC(stream, {
    id: serverPublicKey,
    valueEncoding: null
  })
  await rpc.fullyOpened()

  return rpc
}

test('forward-push sends the expected payload', async (t) => {
  const { bootstrap } = await setupTestnet(t)
  const { service, sentMessages } = await setupGateway(t, bootstrap)
  const rpc = await setupClient(t, bootstrap, service.publicKey)

  const req = {
    payload: b4a.from('blind-push'),
    discoveryKey: b4a.alloc(32, 0x42)
  }

  await rpc.request('forward-push', req, {
    requestEncoding: ForwardPushRequest,
    responseEncoding: cenc.none
  })

  t.is(sentMessages.length, 1, 'one message was sent')

  const encodedPayload = b4a.toString(cenc.encode(ForwardPushRequest, req), 'base64')
  const message = sentMessages[0]
  t.is(message.topic, b4a.toString(req.discoveryKey, 'hex'))
  t.is(message.android.priority, 'high')
  t.is(message.android.data.title, 'Keet')
  t.is(message.android.data.body, '✉️')
  t.is(message.android.data.payload, encodedPayload)
  t.is(message.apns.headers['apns-topic'], 'io.keet.app')
  t.is(message.apns.payload.aps.threadId, b4a.toString(req.discoveryKey, 'base64'))
  t.is(message.apns.payload.payload, encodedPayload)
  t.alike(service.stats, { attempted: 1, sent: 1, failed: 0 }, 'stats updated')
})
