async = require 'async'
bodyParser = require 'body-parser'
coffee = require 'coffeescript'
config = require '/u/config/dobi-server.js'
connectAssets = require 'teacup/lib/connect-assets'
express = require 'express'
fs = require 'fs'
mongofb = require '../lib/server.js'
teacup = require 'teacup/lib/express'

# helpers
log = -> console.log arguments...
fail = (msg) -> console.log "FATAL: #{msg}"; process.exit 1

# copy file over
copyFile = (next) ->
  read = fs.createReadStream "#{__dirname}/../lib/client.js"
  read.on 'error', fail
  wr = fs.createWriteStream "#{__dirname}/assets/js/client.js"
  wr.on 'error', fail
  wr.on 'close', next
  read.pipe wr

compile = (next) ->
  files = fs.readdirSync "#{__dirname}/assets/js"
  files = files.filter (file) -> return /\.coffee/.test file
  async.each files, ((file, next) ->
    [name, extension] = file.split '.'
    contents = fs.readFileSync "#{__dirname}/assets/js/#{file}", 'utf-8'
    output = coffee.compile contents
    fs.writeFileSync "#{__dirname}/assets/js/#{name}.js", output
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
        src: "#{__dirname}/assets/js"
        jsDir: "#{__dirname}/assets/js"
      }
      mongofb.server {
        root: '/api/v1'
        cache:
          max: 100
          maxAge: 1000 * 60 * 5
        firebase:
          url: config.firebase.url
          secret: config.firebase.secret
        mongodb: config.mongo
        options:
          blacklist: [
            'blacklist'
          ]
      }
    ]

    app = express()
    app.set 'views', "#{__dirname}/views"
    app.set 'view engine', 'coffee'
    app.engine 'coffee', teacup.renderFile
    app.use ware for ware in middleware
    app.get point, action for point, action of endpoints
    app.listen 8080
    log 'server running..., connect to localhost:8080'


