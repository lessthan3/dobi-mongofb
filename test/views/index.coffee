{renderable, div, h1, span, doctype} = require 'teacup'
{html, head, meta, title, script, body, raw} = require 'teacup'
{js, a, img, link, h2} = require 'teacup'

module.exports = renderable ->
  doctype 5
  html lang: 'en', ->
    head ->
      title -> 'Dobi MongoFB Test'
      meta charset: 'UTF-*'
      meta 'http-equiv': 'Content-Language', content: 'en'
    body ->
      div -> 'Use console to test mongofb.'

      js 'firebase'
      js 'firebase-simple-login'
      js 'jquery'
      js 'client'
      js 'core'


