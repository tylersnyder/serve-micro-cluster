#!/usr/bin/env node

const program = require('commander')
const getPort = require('get-port')
const { createServer } = require('http')
const { createProxyServer } = require('http-proxy')
const micro = require('micro')
const { dirname, resolve } = require('path')
const { parse } = require('url')
const { spawn } = require('child_process')
const { version } = require('../package')

program
.version(version)
.option('-p, --port <port>', 'Port to listen on (3000)', parseInt)
.option('-h, --host <host>', 'Host to listen on (localhost)')
.option('-f, --file <file>', 'File to read rules from (rules.json)')
.parse(process.argv)

const { host = 'localhost', port = 3000, file = 'rules.json' } = program
const services = {}

main()
.catch(err => {
  process.nextTick(() => {
    throw err
  })
})

async function startServers(rules) {
  return new Promise((res, rej) => {
    rules.map(async(rule) => {
      const { pathname, dest } = rule
      const port = rule.port || await getPort()

      const env = rule.env
                ? Object.assign({}, process.env, rule.env)
                : process.env

      const path = resolve(dirname(file), dest)
      
      await spawn('micro', ['--port', port, path], {
        env
      }).on('error', (err) => {
        console.log(`Error: ${err.message}`)
      })

      services[pathname] = { port }
      console.log(`${pathname} listening on ${host}:${port}`)
      res()
    })
  })
}

async function main() {
  const { rules } = require(resolve(file))
  await startServers(rules)

  const proxy = createProxyServer()

  const server = createServer(async(req, res) => {
    try {
      const { pathname } = parse(req.url)
      const { port } = match(pathname)

      if (!port) {
        const err = micro.createError(404, 'not found')
        throw err
      }

      proxy.web(req, res, {
        target: {
          host,
          port
        }
      })
    } catch(err) {
      res.writeHead(err.statusCode)
      res.end(err.message)
    }
  })

  server.listen(port)
  console.log(`> \u001b[96mReady!\u001b[39m Proxy listening on ${host}:${port}.`)
}

const match = pathname => {
  const shouldTrim = pathname.endsWith('/')
  const query = shouldTrim ? pathname.slice(0, -1) : pathname
  const service = services[query]
  return service || {}
}