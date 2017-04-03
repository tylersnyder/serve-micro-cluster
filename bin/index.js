#!/usr/bin/env node

const { cyan, green } = require('chalk')
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

main()
.catch(err => {
  process.nextTick(() => {
    throw err
  })
})

async function startServices(file, services) {
  const { rules } = require(resolve(file))

  return new Promise(done => {
    rules.map(async(rule) => {
      const { pathname, dest } = rule
      const port = rule.port || await getPort()

      const env = rule.env
                ? Object.assign({}, process.env, rule.env)
                : process.env

      const path = resolve(dirname(file), dest)
      const args = ['--port', port, path]
      
      if (process.platform.includes('win32')) {
        var cmd = await spawn('cmd', ['/s', '/c', 'micro', ...args], {
          env
        })
      } else {
        var cmd = await spawn('micro', args, {
          env
        })
      }

      cmd.on('error', (err) => {
        console.log(`Error: ${err.message}`)
      })

      services[pathname] = { pathname, port }
      done()
    })
  })
}

async function startProxy(host, port, services) {
  return new Promise(done => {
    const proxy = createProxyServer()

    proxy.on('proxyRes', (proxyRes, req, res) => {
      const { origin } = req.headers
      
      if (origin) {
        res.setHeader('access-control-allow-origin', origin)
      }
    })

    const server = createServer(async(req, res) => {
      try {
        const { pathname } = parse(req.url)
        const { port } = match(pathname, services)

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
    done({ host, port })
  })
}

async function main() {
  const { host = 'localhost', port = 3000, file = 'rules.json' } = program
  const services = {}

  await startServices(file, services)
  await startProxy(host, port, services)

  output(host, port, services)
}

function output(host, port, services) {
  console.log(`Cluster proxy listening on ${host}:${port}...`)

  Object.keys(services).forEach(key => {
    const { pathname, port } = services[key]
    console.log(`${cyan(pathname)} (${host}:${port})`)
  })

  console.log(`> ${green('Ready!')}`)
}

const sanitize = pathname => {
  let query = pathname.trim()
  
  if (pathname.startsWith('/')) {
    query = query.substring(1)
  }

  if (pathname.endsWith('/')) {
    query = query.slice(0, -1)
  }
  
  return query
}

const match = (pathname, services) => {
  let query = sanitize(pathname)

  if (query.includes('/')) {
    query = query.split('/')[0]
  }

  const key = Object.keys(services).find(key => {
    if (key.includes('**')) {
      const sanitizedKey = key.replace('**', '')
      return sanitizedKey === `/${query}`
    }
  
    return key === `/${query}`
  })

  return services[key] || {}
}