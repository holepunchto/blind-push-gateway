# blind-push-gateway

> **POC** - This is a proof-of-concept still. Breaking changes possible till the V1 release.

P2P push notification gateway for blind-peer clients. The service exposes a `forward-push` RPC method over Hyperswarm, converts the request into Android/APNS payloads, and forwards it through an external push provider.

End users most likely want to use [blind-push-gateway-cli](https://github.com/holepunchto/blind-push-gateway-cli) instead of interacting directly with this module.

## Install

```sh
npm install blind-push-gateway
```

## How It Works

1. The operator starts a gateway with a push service (for example Firebase Cloud Messaging).
2. The gateway listens on Hyperswarm and accepts RPC connections through `protomux-rpc-router`.
3. A client sends a `forward-push` request encoded with `blind-push/encodings`.
4. The gateway encodes the request, derives Android/APNS fields, and forwards the message through the configured push service.

## API

#### `const service = new BlindPushGateway(dht, router, externalPushService, opts)`

Create a new gateway service.

- `dht`: `HyperDHT` instance
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

#### `service.stats`

Counters for `attempted`, `sent`, and `failed` push requests.

#### `service.registerMetrics(promClient)`

Register Prometheus gauges for gateway stats.
