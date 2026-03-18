const path = require('path')

const Hyperschema = require('hyperschema')

const SCHEMA_DIR = path.join(__dirname, 'spec', 'hyperschema')

const schema = Hyperschema.from(SCHEMA_DIR, { versioned: false })
const pushGateway = schema.namespace('blind-push-gateway')

pushGateway.register({
  name: 'forward-push-request',
  fields: [
    {
      name: 'payload',
      type: 'buffer',
      required: true
    },
    {
      name: 'discoveryKey',
      type: 'fixed32',
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)
