async = require 'async'
bodyParser = require 'body-parser'
coffee = require 'coffee-script'
config = require '/u/config/local-test'
connectAssets = require 'teacup/lib/connect-assets'
express = require 'express'
fs = require 'fs'
mongofb = require '../lib/server.coffee'
teacup = require 'teacup/lib/express'

# helpers
log = -> console.log arguments...
fail = (msg) -> console.log "FATAL: #{msg}"; process.exit 1

# copy file over
copyFile = (next) ->
  read = fs.createReadStream('../lib/client.coffee')
  read.on 'error', fail
  wr = fs.createWriteStream 'assets/js/client.coffee'
  wr.on 'error', fail
  wr.on 'close', next
  read.pipe wr

compile = (next) ->
  files = fs.readdirSync './assets/js'
  files = files.filter (file) -> return /\.coffee/.test file
  async.each files, ((file, next) ->
    [name, extension] = file.split '.'
    contents = fs.readFileSync "./assets/js/#{file}", 'utf-8'
    output = coffee.compile contents
    fs.writeFileSync "./assets/js/#{name}.js", output
    next()
  ), (err) ->
    return fail err if err
    next()

copyFile ->
  compile ->
    endpoints = {
      '/': ({req, res}) ->
        res.render 'index'
    }

    middleware = [
      bodyParser.json()
      connectAssets {
        src: 'assets/js'
        jsDir: 'assets/js'
      }
      mongofb.server {
        root: '/api/v1'
        cache:
          enabled: false
          max: 100
          maxAge: 1000 * 60 * 5
        firebase: config.firebase
        shards: config.firebases
        mongodb:
          db: 'TestDB'
          host: 'localhost'
          post: 27017
          user: 'admin'
      }
    ]

    app = express()
    app.set 'view engine', 'coffee'
    app.engine 'coffee', teacup.renderFile
    app.use ware for ware in middleware
    app.get point, action for point, action of endpoints
    app.listen 8080
    log 'server running...'


