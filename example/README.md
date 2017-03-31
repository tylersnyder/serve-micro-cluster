# serve-micro-cluster example
Easily start a local cluster of [`micro`](https://github.com/zeit/micro)-based services using a simple `rules.json` file. It's like *Path Alias* on [now](https://zeit.co/now), but for local development.

### Installation

Install `serve-micro-cluster` globally.

```
npm install -g serve-micro-cluster

// or

yarn global add serve-micro-cluster
```

### Usage

Define a `rules.json` file. If your file has a name other than `rules`, use the `-f` flag to let `serve-micro-cluster` know. This comes in handy if you're keeping multiple versions of your `rules` available in the same directory (development, production.)

```
{
  "rules": [
    {
      "pathname": "/accounts",
      "dest": "./services/accounts/index.js"
    },
    ...
  ]
}
```

You can also define `port` and `env` variables:

```
{
  "rules": [
    {
      ...
      "port": 4000,
      "env": {
        "SECRET_KEY": "supersecret"
      }
    }
}
```


Once your rules are defined, you can start your microservices and proxy server using `serve-micro-cluster`.

```
  "scripts": {
    "start": "serve-micro-cluster"
  }
```

The following options are available:

 - `-h`, `--host` (default `localhost`)
 - `-p`, `--port` (default `3000`)
 - `-f`, `--file` (default `rules.json`)
 
### Source
See [`serve-micro-cluster`](https://github.com/tylersnyder/serve-micro-cluster)