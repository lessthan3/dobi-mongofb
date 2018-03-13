# dependencies
crypto = require 'crypto'
express = require 'express'
Firebase = require 'firebase'
FirebaseTokenGenerator = require 'firebase-token-generator'
jwt = require 'jwt-simple'
LRU = require 'lru-cache'
merge = require 'deepmerge'
mongodb = require 'mongodb'
wrap = require 'dobi-asset-wrap'


# exports
exports.ObjectID = mongodb.ObjectID
exports.client = require './client'
exports.server = (cfg) ->

  # configuration
  cfg = merge {
    root: '/api'
    cache:
      enabled: true
      max: 100
      maxAge: 1000*60*5
    firebase:
      url: 'https://vn42xl9zsez.firebaseio-demo.com/'
      secret: null
    mongodb:
      db: 'test'
      host: 'localhost'
      pass: ''
      port: 27017
      user: 'admin'
      options:
        native_parser: false
        autoReconnect: true
        poolSize: 1
        keepAlive: 120
    options:
      blacklist: []
      limit_default: 20
      limit_max: 1000
      set_created: true
      set_last_modified: true
      use_objectid: true
  }, cfg

  # variables
  exports.db = null
  exports.fb = null
  db = null
  fb = null

  # connect to firebase and mongodb
  connect = (next) ->
    return next?() if db and fb
    m = cfg.mongodb
    url = "mongodb://#{m.user}:#{m.pass}@#{m.host}:#{m.port}/#{m.db}"
    url = url.replace ':@', '@'
    mongodb.MongoClient.connect url, m.options, (err, database) ->
      return next?(err) if err
      db = database
      db.ObjectID = mongodb.ObjectID
      exports.db = db
      fb = new Firebase cfg.firebase.url
      if cfg.firebase.secret
        token_generator = new FirebaseTokenGenerator cfg.firebase.secret
        token = token_generator.createToken {}, {
          expires: Date.now() + 1000*60*60*24*30
          admin: true
        }
        fb.authWithCustomToken token, (err) ->
          fb.admin_token = token
          next?(err)
          exports.fb = fb
      else
        next?()
  connect()

  # middleware
  (req, res, next) ->
    connect (err) ->
      return next err if err

      # databases
      req.db = db
      req.fb = fb
      req.mongofb = new exports.client.Database {
        server: "http://#{req.get('host')}#{cfg.root}"
        firebase: cfg.firebase.url
      }

      # helpers
      auth = (req, res, next) ->
        token = req.query?.token or req.body?.token
        if token and cfg.firebase
          try
            payload = jwt.decode token, cfg.firebase.secret
            req.user = payload.d
            req.admin = payload.admin
          catch err
            req.token_parse_error = err
        next?()

      hasPermission = ->
        auth req, res
        if req.admin
          return true
        else if req.params.collection in cfg.options.blacklist
          return false
        else
          return true

      _cache = new LRU cfg.cache
      cache = (fn) ->
        max_age = cfg.cache.maxAge / 1000
        max_age = 0 if req.query.bust == '1'
        val = 'private, max-age=0, no-cache, no-store, must-revalidate'
        if cfg.cache.enabled and max_age > 0
          val = "public, max-age=#{max_age}, must-revalidate"
        res.set 'Cache-Control', val
        key = req.url.replace '&bust=1', ''
        if req.query.bust == '1'
          _cache.del key
          delete req.query.bust
        if cfg.cache.enabled and _cache.has key
          return res.send _cache.get key
        delete req.query._
        fn (data) ->
          _cache.set key, data
          res.send data

      contentType = (type) ->
        res.set 'Content-Type', type

      handleError = (err) ->
        contentType 'text/plain'
        res.send 400, err.toString()

      hook = (time, method, args) ->
        fn = cfg.hooks?[req.params.collection]?[time]?[method]
        if fn
          args = [args] unless Array.isArray args
          fn.apply req, args
        else
          args

      # routes
      router = express.Router()

      # fix query parameters
      router.get "#{cfg.root}/*", (req, res, next) ->
        map =
          'false': false
          'true': true
          'null': null

        for k, v of req.query
          req.query[k] = map[v] if v of map
        next()

      # client javascript
      router.get "#{cfg.root}/mongofb.js", (req, res, next) ->
        contentType 'text/javascript'
        cache (next) ->
          asset = new wrap.Snockets {
            src: "#{__dirname}/client.js"
          }, (err) ->
            return handleError err if err
            next asset.data

      # client javascript minified
      router.get "#{cfg.root}/mongofb.min.js", (req, res, next) ->
        contentType 'text/javascript'
        cache (next) ->
          asset = new wrap.Snockets {
            src: "#{__dirname}/client.js"
            minify: true
          }, (err) ->
            return handleError err if err
            next asset.data

      # firebase url
      router.get "#{cfg.root}/Firebase", (req, res, next) ->
        res.send cfg.firebase.url


      # ObjectID for creating documents
      router.get "#{cfg.root}/ObjectID", (req, res, next) ->
        res.send mongodb.ObjectID().toString()


      # sync data from firebase
      # NOTE: requires _id to be an ObjectID
      # db.collection.update
      # db.collection.insert
      # db.collection.remove
      # the format is /sync/:collection/:id and not /:collection/:sync/:id to
      # match firebase urls. the key in firebase is /:collection/:id
      url = "#{cfg.root}/sync/:collection/:id*"
      router.get url, auth, (req, res, next) ->
        collection = db.collection req.params.collection

        # get data
        ref = fb.child "#{req.params.collection}/#{req.params.id}"
        ref.once 'value', (snapshot) ->
          doc = snapshot.val()

          # convert _id if using ObjectIDs
          if cfg.options.use_objectid
            try
              qry = {_id: new mongodb.ObjectID req.params.id}
            catch err
              return handleError 'Invalid ObjectID'

          # send null if collection in blacklist
          # WARNING: IF YOU ATTEMPT TO SYNC A COLLECTION ITEM NOT
          # ON YOUR FIREBASE AND CALL SYNC, IT WILL GET DESTROYED
          return res.send null unless hasPermission()

          # insert/update
          if doc

            # set created
            if cfg.options.set_created
              doc.created ?= Date.now()

            # set last modified
            if cfg.options.set_last_modified
              doc.last_modified = Date.now()

            doc._id = qry._id
            opt = {safe: true, upsert: true}
            collection.update qry, doc, opt, (err) ->
              return handleError err if err
              hook 'after', 'find', doc
              res.send doc

          # remove
          else
            collection.remove qry, (err) ->
              return handleError err if err
              res.send null


      # db.collection.find
      url = "#{cfg.root}/:collection/find"
      router.get url, auth, (req, res, next) ->
        cache (next) ->

          # special options (mainly for use by findByID and findOne)
          __single = req.query.__single or false
          __field = null
          if req.query.__field
            __field = unescape(req.query.__field).replace(/\//g, '.')
          delete req.query.__single
          delete req.query.__field

          # defaults
          criteria = {}
          fields = {}
          options = {}

          # use JSON encoded parameters
          if req.query.criteria or req.query.options
            if req.query.criteria
              try
                criteria = JSON.parse req.query.criteria
              catch err
                return handleError 'invalid criteria'

            if req.query.fields
              try
                fields = JSON.parse req.query.fields
              catch err
                return handleError 'invalid fields'

            if req.query.options
              try
                options = JSON.parse req.query.options
              catch err
                return handleError 'invalid options'

          # simple http queries
          else
            if req.query.fields
              for field in req.query.fields.split ','
                fields[field] = 1
              delete req.query.fields

            if req.query.limit
              options.limit = req.query.limit
              delete req.query.limit

            if req.query.skip
              options.skip = req.query.skip
              delete req.query.skip

            if req.query.sort
              [sort_field, sort_dir] = req.query.sort.split ','
              options.sort = [[sort_field, sort_dir or 'asc']]
              delete req.query.sort

            criteria = req.query

          options.limit = 1 if __single

          # built-in hooks
          if cfg.options.use_objectid
            try
              if criteria._id
                if typeof criteria._id is 'string'
                  criteria._id = new mongodb.ObjectID criteria._id
                else if criteria._id.$in
                  ids = criteria._id.$in
                  criteria._id.$in = (new mongodb.ObjectID id for id in ids)
            catch err
              return handleError 'Invalid ObjectID'
          if cfg.options.limit_default
            options.limit ?= cfg.options.limit_default
          if cfg.options.limit_max
            options.limit = Math.min options.limit, cfg.options.limit_max

          # don't allow $where clauses in the criteria
          if criteria.$where
            return res.send 403, 'use of the $where operator is not allowed'

          # dont make a DB call for blacklist
          # as mongo errors can be revealing
          if not hasPermission()
            return res.send 404 if __single
            return next []

          # hooks
          hook 'before', 'find', [criteria, fields, options]

          # run query
          collection = db.collection req.params.collection
          collection.find(criteria, fields, options).toArray (err, docs) ->
            return handleError err if err
            hook('after', 'find', doc) for doc in docs

            if __field
              fn = (o) -> o = o?[key] for key in __field.split '.' ; o
              docs = (fn doc for doc in docs)
            if __single
              return res.send 404 if docs.length == 0
              docs = docs[0]
            next docs

      # db.collection.findOne
      url = "#{cfg.root}/:collection/findOne"
      router.get url, auth, (req, res, next) ->
        req.url = "#{cfg.root}/#{req.params.collection}/find"
        req.query.__single = true
        router.handle req, res, next


      # db.collection.findById
      url = "#{cfg.root}/:collection/:id*"
      router.get url, auth, (req, res, next) ->
        req.url = "#{cfg.root}/#{req.params.collection}/find"
        req.query.criteria = JSON.stringify {_id: req.params.id}
        req.query.__single = true
        req.query.__field = req.params[1] if req.params[1]
        router.handle req, res, next

      # execute routes
      router.handle req, res, next