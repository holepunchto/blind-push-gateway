#!/usr/bin/env node

const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const Corestore = require('corestore')
const HyperDHT = require('hyperdht')
const ProtomuxRPCRouter = require('protomux-rpc-router')
const IdEnc = require('hypercore-id-encoding')
const goodbye = require('graceful-goodbye')
const { command, flag } = require('paparam')
const pino = require('pino')

const BlindPushGateway = require('.')
const FcmPushService = require('./lib/fcm')

const SERVICE_NAME = 'blind-push-gateway'
const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.blind-push-gateway', 'config.json')
const DEFAULT_STORAGE_PATH = path.join(os.homedir(), '.blind-push-gateway', 'storage')

const runCmd = command(
  'run',
  flag('--config|-c [path]', `config path, defaults to ${DEFAULT_CONFIG_PATH}`),
  flag('--storage|-s [path]', `storage path, defaults to ${DEFAULT_STORAGE_PATH}`),

  async function ({ flags }) {
    const logger = pino({ name: SERVICE_NAME })

    const configPath = path.resolve(flags.config || DEFAULT_CONFIG_PATH)
    logger.info(`Reading config from: ${configPath}`)
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'))

    if (!config.certPath) {
      logger.error('Config requires a certPath')
      process.exit(1)
    }

    const certPath = path.resolve(path.dirname(configPath), config.certPath)
    logger.info(`Using Firebase credential: ${certPath}`)

    const storage = path.resolve(flags.storage || DEFAULT_STORAGE_PATH)
    logger.info(`Using storage: ${storage}`)

    const store = new Corestore(storage)
    const swarm = new HyperDHT({
      keyPair: await store.createKeyPair('swarm-key')
    })
    const router = new ProtomuxRPCRouter()
    const pushService = new FcmPushService(certPath)

    const service = new BlindPushGateway(swarm, router, pushService, {
      notification: config.notification,
      apnsTopic: config.apnsTopic
    })

    goodbye(async () => {
      logger.info('Shutting down blind-push-gateway service')
      await service.close()
      await pushService.close()
      await swarm.destroy()
      await store.close()
    })

    logger.info('Starting blind-push-gateway service')
    await pushService.ready()
    await service.ready()

    logger.info(`Public key: ${IdEnc.normalize(service.publicKey)}`)
  }
)

const cmd = command('blind-push-gateway', runCmd)

cmd.parse()
