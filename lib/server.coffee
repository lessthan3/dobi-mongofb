# dependencies
async = require 'async'
crypto = require 'crypto'
express = require 'express'
Firebase = require 'firebase'
FirebaseTokenGenerator = require 'firebase-token-generator'
jwt = require 'jwt-simple'
LRU = require 'lru-cache'
merge = require 'deepmerge'
mongodb = require 'mongodb'
wrap = require 'asset-wrap'


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
    shards: {}
    mongodb:
      db: 'test'
      host: 'localhost'
      pass: ''
      port: 27017
      user: 'admin'
      options:
        db:
          native_parser: false
        server:
          auto_reconnect: true
          poolSize: 1
          socketOptions:
            keepAlive: 120
    options:
      limit_default: 20
      limit_max: 1000
      set_created: true
      set_last_modified: true
      use_objectid: true
  }, cfg


  # variables
  exports.db = null
  exports.fb = null
  exports.shards = null
  db = null
  fb = null
  shards = {}

  connectFB = (options, next) ->
    {url, secret} = options or {}
    return next 'missing url and secret' unless url and secret
    firebase = new Firebase url
    token_generator = new FirebaseTokenGenerator secret
    token = token_generator.createToken {}, {
      expires: Date.now() + 1000*60*60*24*30
      admin: true
    }
    firebase.authWithCustomToken token, (err) ->
      return next? err if err
      firebase.admin_token = token
      next? null, firebase

  # connect to firebase and mongodb
  connect = (next) ->
    return next?() if db and fb and exports.shards

    async.parallel [

      # connect mongoDB
      (next) ->
        m = cfg.mongodb
        url = "mongodb://#{m.user}:#{m.pass}@#{m.host}:#{m.port}/#{m.db}"
        url = url.replace ':@', '@'
        mongodb.MongoClient.connect url, m.options, (err, database) ->
          return next err if err
          db = database
          db.ObjectID = mongodb.ObjectID
          exports.db = db
          next()

      # connect main shard
      (next) ->
        return next 'firebase required' unless cfg.firebase
        connectFB cfg.firebase, (err, firebase) ->
          return next? err if err
          fb = firebase
          exports.fb = firebase
          next()

      # connect shards
      (next) ->
        async.each Object.keys(cfg.shards or {}), ((shard, next) ->
          connectFB cfg.shards[shard], (err, firebase) ->
            return next? err if err
            shards[shard] = firebase
            next()
        ), (err) ->
          return next err if err
          exports.shards = shards
          next()

    ], (err) ->
      return next? err

  connect()

  # middleware
  (req, res, next) ->
    connect (err) ->
      return next err if err

      # databases
      req.db = db
      req.fb = fb
      req.shards = shards if shards
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
        next()

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
      router = new express.Router()

      # fix query parameters
      router.route 'GET', "#{cfg.root}/*", (req, res, next) ->
        map =
          'false': false
          'true': true
          'null': null

        for k, v of req.query
          req.query[k] = map[v] if v of map
        next()

      # client javascript
      router.route 'GET', "#{cfg.root}/mongofb.js", (req, res, next) ->
        contentType 'text/javascript'
        cache (next) ->
          asset = new wrap.Snockets {
            src: "#{__dirname}/client.coffee"
          }, (err) ->
            return handleError err if err
            next asset.data

      # client javascript minified
      router.route 'GET', "#{cfg.root}/mongofb.min.js", (req, res, next) ->
        contentType 'text/javascript'
        cache (next) ->
          asset = new wrap.Snockets {
            src: "#{__dirname}/client.coffee"
            minify: true
          }, (err) ->
            return handleError err if err
            next asset.data

      # firebase url
      router.route 'GET', "#{cfg.root}/Firebase", (req, res, next) ->
        res.send cfg.firebase.url


      # ObjectID for creating documents
      router.route 'GET', "#{cfg.root}/ObjectID", (req, res, next) ->
        res.send mongodb.ObjectID().toString()

      # UNDER NO CIRUMSTANCES SHOULD WE ALLOW
      # SHARD SYNC TO REMOVE DOCUMENTS OR HELL MAY BREAK LOOSE
      # sync shard function
      # how it works:
      # 1. get shard value
      # 2. ensure shard value isnt null if mongoDB value has data (bad)
      # 3. if shard has no data, then sync from cfb.firebase location
      # 4. update the mongoDB document
      # 5. update all shards
      url = "#{cfg.root}/shards/sync/:shard/:collection/:id*"
      router.route 'GET', url, auth, (req, res, next) ->
        collection = db.collection req.params.collection
        shard = req.params.shard
        key = "#{req.params.collection}/#{req.params.id}"

        if not shards[req.params.shard]
          return handleError 'Invalid Firebase Shard'
        ref = shards[req.params.shard].child key

        setAll = (value, next) ->
          value._id = value._id.toString() if value?._id
          async.each Object.keys(shards), ((shard, next) ->
            shard_ref = shards[shard].child key
            shard_ref.set value, next
          ), next

        async.waterfall [

          # get latest data
          (next) ->
            ref.once 'value', (snapshot) ->
              doc = snapshot.val()

              # if doc is null, pull it from the main firebase shard
              # to ensure that non-sharded objects don't get
              # cleared by shard sync
              if not doc?
                fb.child(key).once 'value', (snapshot) ->

                  # if main shard (in cfg.firebase) isnt null
                  # then revert all shards
                  if doc isnt snapshot.val()
                    setAll snapshot.val(), (err) ->
                      return next 'invalid removal'
                  else
                    doc = snapshot.val()
                    next null, doc
              else
                next null, doc

          # insert / update
          (doc, next) ->

            # convert _id if using ObjectIDs
            if cfg.options.use_objectid
              try
                qry = {_id: new mongodb.ObjectID req.params.id}
              catch err
                return next 'Invalid ObjectID'

            # if doc exists, sync will update all shards
            if doc

              # set created and last modified
              doc.created ?= Date.now() if cfg.options.set_created
              doc.last_modified = Date.now() if cfg.options.set_last_modified

              # update mongodb
              doc._id = qry._id
              opt = {safe: true, upsert: true}
              collection.update qry, doc, opt, (err) ->
                return next 'Error updating document' if err
                next null, doc
            else
              collection.remove qry, (err) ->
                return next 'Error removing document' if err
                next null, doc

        ], (err, doc) ->
          return handleError err if err
          setAll doc, (err) ->
            return next 'Shard sync error' if err
            hook 'after', 'find', doc if doc
            res.send doc

      # sync data from firebase
      # NOTE: requires _id to be an ObjectID
      # db.collection.update
      # db.collection.insert
      # db.collection.remove
      # the format is /sync/:collection/:id and not /:collection/:sync/:id to
      # match firebase urls. the key in firebase is /:collection/:id
      url = "#{cfg.root}/sync/:collection/:id*"
      router.route 'GET', url, auth, (req, res, next) ->
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
      router.route 'GET', url, auth, (req, res, next) ->
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
      router.route 'GET', url, auth, (req, res, next) ->
        req.url = "#{cfg.root}/#{req.params.collection}/find"
        req.query.__single = true
        router._dispatch req, res, next


      # db.collection.findById
      url = "#{cfg.root}/:collection/:id*"
      router.route 'GET', url, auth, (req, res, next) ->
        req.url = "#{cfg.root}/#{req.params.collection}/find"
        req.query.criteria = JSON.stringify {_id: req.params.id}
        req.query.__single = true
        req.query.__field = req.params[1] if req.params[1]
        router._dispatch req, res, next


      # execute routes
      router._dispatch req, res, next

