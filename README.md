# blind-push-gateway

> **POC** - This is a proof-of-concept still. Breaking changes possible till the V1 release.

P2P push notification gateway for blind-peer clients. The service exposes a `forward-push` RPC method over Hyperswarm, converts the request into Android/APNS payloads, and forwards it through an external push provider such as Firebase Cloud Messaging.

## Install

```sh
npm install blind-push-gateway
```

## Usage

Create a config file at `~/.blind-push-gateway/config.json`:

```json
{
  "certPath": "./service-account.json",
  "notification": {
    "title": "Keet",
    "body": "✉️"
  },
  "apnsTopic": "io.keet.app"
}
```

Then run:

```sh
blind-push-gateway run
```

The service will log its public key on startup. Clients can connect to that swarm key and send `forward-push` RPC requests.

## How It Works

1. The operator starts the gateway with Firebase service account credentials.
2. The gateway listens on Hyperswarm and accepts RPC connections through `protomux-rpc-router`.
3. A client sends a `forward-push` request encoded with `@holepunchto/blind-push/encodings`.
4. The gateway encodes the request, derives Android/APNS fields, and forwards the message through the configured push service.

## CLI

```sh
blind-push-gateway run [options]
```

- `--config|-c [path]`: config path, defaults to `~/.blind-push-gateway/config.json`
- `--storage|-s [path]`: storage path, defaults to `~/.blind-push-gateway/storage`

## API

#### `const service = new BlindPushGateway(swarm, router, externalPushService, opts)`

Create a new gateway service.

- `swarm`: `Hyperswarm` instance
- `router`: `ProtomuxRPCRouter` instance
- `externalPushService`: object with an async `send(message)` method
- `opts.notification`: default notification payload, defaults to `{ title: 'Keet', body: '✉️' }`
- `opts.apnsTopic`: APNS topic, defaults to `io.keet.app`

#### `await service.ready()`

Start the gateway and begin listening for RPC connections.

#### `await service.close()`

Gracefully shut down the gateway.

#### `service.publicKey`

The swarm public key clients use to connect.

## TODOs (before V1)

- Add more tests beyond the current happy-path coverage
- Figure out a plan for integration testing with FCM
- Discuss and refine the config format
  - currently the gateway support only 1 `appId`, and 1 set of config, the requirements may change
- stats and instrument integration
- add bare support with `bin-bare.js`
- add `blind-push-gateway-service` package for deployment
