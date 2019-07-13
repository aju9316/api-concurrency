/*!
 * api-concurrency
 * Copyright(c) 2019 Aziz Tinwala
 * MIT Licensed
 */

'use strict'

/**
 * Module exports.
 * @public
 */

module.exports = ApiLock

var crypto = require('crypto')
var onFinished = require('on-finished')

var defaults = {
  TTL: 60000, // one minute in milliseconds
  SILENT: false, // by default, throw error if we encounter redis related error
  ERROR_MESSAGE: 'Resource is busy',
  KEY_PREFIX: 'ApiLock-'
}

/**
 * @description Initialize user preferred options and defaults
 * @param {Object} redisClient object which will be used to set and get keys from redis
 * @param {Object} options object which contains user preferred options (for e.g. TTL for the key to remain valid in redis)
 * @param {Object} res HTTP response object
 * @param {Function} next next callback to invoke the next middleware in line
 * @returns {Function} Can throw an error in case same API is already being processed and its MD5 hashkey is already present in redis
 * @public
 */
function ApiLock (redisClient, options, res, next) {
  options = options || {}
  var self = this || {}
  self.TTL = typeof options.ttl === 'number' ? options.ttl : defaults.TTL
  self.SILENT = options.silent === true ? true : defaults.SILENT
  self.KEY_PREFIX = options.key_prefix || defaults.KEY_PREFIX
  self.ERROR_MESSAGE = options.error_message || defaults.ERROR_MESSAGE
  
  validateRedis(redisClient) // intentionally left this function as synchronous

  if(!options.payload) {
    throw new Error('Payload cannot be empty')
  }

  var hash = crypto.createHash('md5').update(JSON.stringify(options.payload)).digest('hex')
  hash = self.KEY_PREFIX + hash
  redisClient.get(hash, function (getKeyError, getKeyReply) {
    if (getKeyError) {
      return next(throwError(self.SILENT, getKeyError))
    }
    if (getKeyReply === 'LOCKED') {
      res.isFirstRequest = false
      res.status(200)
      return next(self.ERROR_MESSAGE)
    } else {
      redisClient.set(hash, 'LOCKED', 'PX', self.TTL, function (setKeyError, setKeyReply) {
        if (setKeyError) {
          return next(throwError(self.SILENT, setKeyError))
        }
        if (setKeyReply === 'OK') {
          res.isFirstRequest = true
          return next()
        } else {
          return next(throwError(self.SILENT, 'No response from redis while setting the lock for ' + hash))
        }
      })
    }
  })
  onFinished(res, function () {
    if (res.isFirstRequest) {
      redisClient.expire(hash, 0)
    }
  })
}

/**
 * @description Function to check if we should throw an error incase of a redis failure or just silently ignore
 * @param {Object} error Error object
 * @returns Will return 'null' in case of silent error
 * @private
 */
function throwError (silent, error) {
  if (silent) return null
  else throw new Error(error)
}

/**
 * @description Function to check if redisClient is a valid instance of Redis Client
 * @param {Object} redisClient Redis Client object
 * @returns Will throw an error if redis client object is not valid or connection to redis to not established
 * @private
 */
function validateRedis (redisClient) {
  if (!redisClient) {
    throw new Error('Argument redisClient is required')
  }
  if (redisClient && typeof redisClient.ping !== 'function') {
    throw new Error('First argument should be a valid redis client object')
  }

  /** We try to ping redis to test the connection
   *  If not able to connect, we throw an error (silent flag is ignored intentionally in this case)
   **/
  redisClient.ping(function (err, reply) {
    if (err || reply !== 'PONG') {
      throw new Error('Redis connection error')
    }
  })
}
