#
# Mongo Firebase
# mongofb.js
#
# Database
# Collection
# CollectionRef
# Document
# DocumentRef
#

if typeof window != 'undefined'
  exports = window.mongofb = {}
  extend = (target, object) ->
    $.extend true, target, object
  Firebase = window.Firebase
  fetch = (args) ->
    result = null
    if args.next
      success = (data) -> args.next null, data
      error = (jqXHR, textStatus, err) -> args.next jqXHR, null
      async = true
    else
      success = (data) -> result = data
      error = -> result = null
      async = false
    $.ajax {
      url: args.url
      cache: args.cache
      type: 'GET'
      data: args.params
      success: success
      error: error
      async: async
    }
    return result

else
  exports = module.exports = {}
  extend = require 'node.extend'
  request = require 'request'
  Firebase = require 'firebase'
  fetch = (args) ->
    args.params ?= {}
    args.params._ ?= Date.now() if not args.cache
    request {
      url: args.url
      qs: args.params
      method: 'GET'
    }, (err, resp, body) =>
      return args.next err if err
      return args.next 'bad response' unless resp

      switch resp.statusCode

        # success
        when 200
          if args.json
            try
              body = JSON.parse body
            catch err
              body = null

        # not found, return null
        when 404
          body = null

        # unexpected response, send error
        # example: 500 error for duplicate key error
        else
          err = body
          body = null

      args.next err, body

exports.utils =
  isEquals: (a, b) ->
    return false if a and not b
    return false if b and not a
    return false if typeof(a) isnt typeof(b)
    return true if a is null and b is null

    switch typeof a
      when 'function'
        return false if a.toString() isnt b.toString()
      when 'object'
        return false if Object.keys(a).length isnt Object.keys(b).length
        for k of a
          return false unless exports.utils.isEquals a[k], b[k]
      else
        return false if a isnt b
    true
  
  # logging utility
  log: (msg) ->
    console.log "[monogfb] #{msg}"

  # prepare query parameters for a find
  prepareFind: (the_arguments) ->
    args = Array.prototype.slice.call the_arguments, 0

    # stringify json params
    jsonify = (q) -> o = {}; o[k] = JSON.stringify v for k, v of q when v; o

    # callback
    has_callback = typeof args[args.length - 1] is 'function'
    next = args[args.length - 1] if has_callback

    # defaults
    criteria = {}

    # query objects
    criteria = args[0] if typeof args[0] is 'object'
    fields = args[1] if typeof args[1] is 'object'
    options = args[2] if typeof args[2] is 'object'
    special = args[3] if typeof args[3] is 'object'

    # args[1] can be either fields or options or special
    # args[2] can be either options or special
    
    # case: special was in args[2]
    if options and not special and (options.token or options._)
      [special, options] = [options, null]

    # case: options was in args[1]
    if fields and not options and (fields.limit or fields.skip or fields.sort)
      [options, fields] = [fields, null]

    # case: special was in args[1]
    if fields and not special and (fields.token or fields._)
      [special, fields] = [fields, null]

    # format query objects and prepare to send
    query = {criteria, fields, options}
    params = jsonify query

    params.token = special.token if special?.token
    params._ = special._ if special?._

    [query, params, next]

  startsWith: (str, target) ->
    str.slice(0, target.length) == target

class exports.EventEmitter
  constructor: ->
    @events = {}

  emit: (event, args...) ->
    if @events[event]
      handler(args...) for handler in @events[event]

  on: (event, handler) ->
    @events[event] ?= []
    @events[event].push handler

  # handler=null will remove all events of that type
  off: (event, handler=null) ->
    @events[event] ?= []
    @events[event] = @events[event].filter (fn) ->
      handler isnt null and fn isnt handler

class exports.Database
  constructor: (cfg) ->
    @cache = true
    @safe_writes = true
    if typeof cfg == 'string'
      @api = cfg
      @request 'Firebase', false, (url) ->
        @firebase = new Firebase url
    else
      @api = cfg.server
      @firebase = new Firebase cfg.firebase

  collection: (name) ->
    new exports.Collection @, name

  get: (path) ->
    path = path.split /[\/\.]/g
    collection = @collection path[0]
    return collection if path.length == 1
    collection.get path[1..].join '/'

  request: ->
    json = true
    resource = ''
    next = null
    params = {}

    for arg in arguments
      switch typeof arg
        when 'boolean' then json = arg
        when 'string' then resource = arg
        when 'function' then next = arg
        when 'object' then params = arg

    url = "#{@api}/#{resource}"
    params.token = @token if @token
    return fetch {
      cache: @cache
      json: json
      next: next
      params: params
      resource: resource
      url: url
    }

  auth: (token, next) ->
    @firebase.auth token, =>
      @token = token
      next()

  setToken: (token) ->
    @token = token
 
class exports.Collection
  constructor: (@database, @name) ->
    @ref = new exports.CollectionRef @

  get: (path) ->
    path = path.split /[\/\.]/g
    doc = collection.findById path[0]
    return doc if path.length == 1
    doc.get path[1..].join '/'

  insert: (doc, priority, next) ->
    [next, priority] = [priority, null] if typeof priority is 'function'
    @database.request 'ObjectID', false, {
      _: "#{Date.now()}-#{Math.random()}"
    }, (err, id) =>
      return next?(err) if err
      doc._id = id
      ref = @database.firebase.child "#{@name}/#{id}"
      ref.set doc, (err) =>
        return next?(err) if err
        ref.setPriority priority if priority
        @database.request "sync/#{@name}/#{id}", {
          _: Date.now()
        }, (err, data) =>
          return next?(err) if err
          next?(null, new exports.Document @, data)

  # find()
  # find(criteria)
  # find(criteria, fields)
  # find(criteria, options)
  # find(criteria, fields, options)
  #
  # find(next)
  # find(criteria, next)
  # find(criteria, fields, next)
  # find(criteria, options, next)
  # find(criteria, fields, options, next)
  find: (criteria=null, fields=null, options=null, next=null) ->
    [query, params, next] = exports.utils.prepareFind arguments
 
    if next
      @database.request "#{@name}/find", params, (err, datas) =>
        return next err if err
        next null, (new exports.Document @, data, query for data in datas)
    else
      datas = @database.request("#{@name}/find", params) or []
      return (new exports.Document @, data, query for data in datas)

  findById: (id=null, fields=null, options=null, next=null) ->
    [query, params, next] = exports.utils.prepareFind arguments

    if next
      @database.request "#{@name}/#{id}", params, (err, data) =>
        return next err if err
        return next null, null if not data
        next null, new exports.Document @, data
    else
      data = @database.request "#{@name}/#{id}", params
      return null unless data
      return new exports.Document @, data

  # findOne()
  # findOne(criteria)
  # findOne(criteria, fields)
  # findOne(criteria, fields, options)
  #
  # findOne(next)
  # findOne(criteria, next)
  # findOne(criteria, fields, next)
  # findOne(criteria, fields, options, next)
  findOne: (criteria=null, fields=null, options=null, next=null) ->

    [query, params, next] = exports.utils.prepareFind arguments

    if next
      @database.request "#{@name}/findOne", params, (err, data) =>
        return next err if err
        return next null, null if not data
        next null, new exports.Document @, data, query
    else
      data = @database.request "#{@name}/findOne", params
      return null if not data
      return new exports.Document @, data, query

  list: (priority, limit=1) ->
    @ref.endAt priority
    @ref.limit limit
    @ref

  removeById: (_id, next) ->
    ref = @database.firebase.child "#{@name}/#{_id}"

    # store current value
    ref.once 'value', (snapshot) =>
      old_data = snapshot.val()

      # remove value from firebase
      ref.set null, (err) =>
        return next?(err) if err

        # sync result to mongodb
        @database.request "sync/#{@name}/#{_id}", (err, data) =>

          # if sync failed, rollback data
          if err
            ref.set old_data, (err) =>
              if err
                next?('sync failed, and rollback failed')
              else
                next?('sync failed, data rollback successful')

          # sync successful
          else
            next?(null)

class exports.PseudoCollection extends exports.Collection
  constructor: (@database, @name, @defaults={}) ->
    super @database, @name

  insert: (doc, priority, next) ->
    doc[k] = v for k, v of @defaults
    super doc, priority, next

  find: (criteria=null, fields=null, options=null, next=null) ->
    [query, params, next] = exports.utils.prepareFind arguments
    query.criteria[k] = v for k, v of @defaults
    super query.criteria, query.fields, query.options, next

  findOne: (criteria=null, fields=null, options=null, next=null) ->
    [query, params, next] = exports.utils.prepareFind arguments
    query.criteria[k] = v for k, v of @defaults
    super query.criteria, query.fields, query.options, next

class exports.CollectionRef extends exports.EventEmitter
  constructor: (@collection) ->
    @database = @collection.database
    @ref = @database.firebase.child @collection.name

  endAt: (priority) ->
    @ref = @ref.endAt priority

  limit: (num) ->
    @ref = @ref.limit num

  startAt: (priority) ->
    @ref = @ref.startAt priority

  on: (event, handler) ->
    super event, handler

    if @events.insert?.length > 0
      @ref.off 'child_added'
      @ref.on 'child_added', (snapshot) =>
        @emit 'insert', snapshot.val()

    if @events.remove?.length > 0
      @ref.off 'child_removed'
      @ref.on 'child_removed', (snapshot) =>
        @emit 'remove', snapshot.val()

  off: (event, handler=null) ->
    super event, handler

    if @events.insert?.length == 0
      @ref.off 'child_added'

    if @events.remove?.length == 0
      @ref.off 'child_removed'

class exports.Document
  constructor: (@collection, @data, @query) ->
    @database = @collection.database
    @key = "#{@collection.name}/#{@data._id}"
    @query ?= {criteria: null, fields: null, options: null}
    @ref = new exports.DocumentRef @

  emit: (event, args...) ->
    @ref.emit event, args...

  get: (path) ->
    @ref.get path

  name: ->
    @ref.name()
    
  on: (event, handler) ->
    @ref.on event, handler

  off: (event, handler) ->
    @ref.off event, handler

  refresh: (next) ->
    @ref.refresh next

  remove: (next) ->
    if typeof next not in ['function', 'undefined']
      return exports.utils.log 'invalid callback function to remove'
    @collection.removeById @data._id, next

  save: (next) ->
    @ref.set @data, next

  set: (value, next=null) ->
    @ref.set value, next

  val: ->
    @ref.val()

class exports.DocumentRef extends exports.EventEmitter
  @_counter = 0

  constructor: (@document, @path='') ->
    super()
    @counter = ++exports.DocumentRef._counter
    @collection = @document.collection
    @database = @collection.database

    # @path[0] doesn't work in ie6, must use @path[0..0]
    if typeof @path is 'string'
      @path = @path[1..] if @path[0..0] == '/'
      @path = @path.split /[\/\.]/g if typeof @path is 'string'
    @key = "#{@document.key}/#{@path.join '/'}".replace /\/$/, ''
    @data = @document.data
    @data = @data?[k] for k in @path when k isnt ''
    @data ?= null
    @ref = @database.firebase.child @key

  log: ->
    console.log "ref_#{@counter}", arguments...

  get: (path) ->
    temp = @path.slice 0
    while exports.utils.startsWith path, '..'
      temp.pop()
      path = path[2..]
      path = path[1..] if exports.utils.startsWith path, '/'
    new exports.DocumentRef @document, "#{temp.join '/'}/#{path}"

  name: ->
    if @path.length == 1 and @path[0] == ''
      @data._id
    else
      @path[@path.length-1]

  # value: emit now and when updated
  # update: emit only when updated
  on: (event, handler) ->
    super event, handler

    if @events.update?.length > 0 or @events.value?.length > 0
      @emit 'value', @val()
      @ref.on 'value', (snapshot) =>
        @updateData snapshot.val()

  off: (event, handler=null) ->
    super event, handler

    unless @events.update?.length and @events.value?.length
      @ref.off 'value'

  parent: ->
    new exports.DocumentRef @document, @path[0...@path.length-1]

  refresh: (next) ->
    @ref.once 'value', (snapshot) =>
      @updateData snapshot.val()
      next?()

  remove: (next) ->
    if typeof next not in ['function', 'undefined']
      return exports.utils.log 'invalid callback function to remove'
    @set null, next

  set: (value, next) ->

    # if specific fields were queried for, only allow those to be updated
    if @database.safe_writes
      allow = true
      if @document.query.fields
        allow = false
        for k, v of @document.query.fields
          dst = "#{@document.key}/#{k.replace /\./g, '/'}"
          allow = allow or @key.indexOf(dst) is 0
      return next?('cannot set a field that was not queried for') unless allow

    ref = @database.firebase.child @key
    ref.set value, (err) =>
      return next?(err) if err
      @database.request "sync/#{@key}", (err, data) =>
        return next?(err) if err
        @updateData value
        next?(null)

  # @data = what we got from mongodb or what was already updated here
  # data = new data from firebase
  updateData: (data) ->

    # ignore special 'created' and 'last_modified' fields on documents
    if @key == @document.key
      data.created = @data.created if @data?.created
      data.last_modified = @data.last_modified if @data?.last_modified

    # no updates to send if data isn't changing
    return if exports.utils.isEquals @data, data

    # here, we need to set a brief timeout so all firebase listeners can
    # fire before we update any data. if we ran this code synchonously
    # a DocumentRef may update the Document data before the Document
    # listener had a chance to update. In that case, the isEquals call a few
    # lines above would return true, and the listener for the Document would
    # never be fired. With this setTimeout, all listeners have a chance to
    # compare against past data before anything is updated.
    #
    # example
    # ```
    #   cookie = db.cookies.findOne()
    #   type = cookie.get 'type'
    #   cookie.on 'update', (val) ->
    #     console.log 'cookie was updated'
    #   type.on 'update', (val) ->
    #     console.log 'type was updated'
    #   type.set 'new type'
    # ```
    #
    # this works because setTimeout() re-queues the new javascript at the end
    # of the execution queue.
    setTimeout ( =>

      # update DocumentRef data
      @data = data

      # update document data. this will allow handlers to use
      # ref.get and have access to new data
      if @path.length == 1 and @path[0] == ''
        @document.data = data
      else
        [keys..., key] = @path
        target = @document.data
        for k in keys
          target[k] ?= {}
          target = target[k]
        target[key] = data

      # emit the updates
      @emit 'update', @val()
      @emit 'value', @val()

    ), 1

  val: ->
    return null if @data is null
    if Array.isArray @data
      extend [], @data
    else if typeof @data == 'object'
      extend {}, @data
    else
      @data

