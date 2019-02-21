/*!
 * express-api-locker
 * Copyright(c) 2019 Aziz Tinwala
 * MIT Licensed
 */

'use strict';

/**
 * Module exports.
 * @public
 */

module.exports = ApiLock;

var crypto = require('crypto')
var onHeaders = require('on-headers')

var DEFAULTS = {
  ttl: 60000, // one minute in milliseconds
  silent: false, // by default, throw error if we encounter redis related error
  error_message: 'Resource is busy'
}

/**
 * @description Initialize user preferred options and defaults
 * @param {Object} redisClient object which will be used to set and get keys from redis
 * @param {Object} options object which contains user preferred options (for e.g. ttl for the key to remain valid in redis)
 * @returns {Function} express middleware function
 * @public
 */
function ApiLock(redisClient, options) {
  options     = options || {};
  var self    = this || {};
  self.ttl    = typeof options.ttl === 'number' ? options.ttl : DEFAULTS.ttl;
  self.silent = options.silent === true ? true : DEFAULTS.silent;

  /** We try to ping redis to test the connection
   *  If not able to connect, we throw an error (silent flag is ignored intentionally in this case)
   **/ 
  redisClient.ping(function(err, reply) {
    if(err || reply !== 'PONG') 
      throw new Error('Redis connection error');
  });

  /**
   * @description Express middleware function to convert api endpoint and request body into MD5 hash. This MD5 hash will be stored in redis as a key
   * @param {Object} req Express request object
   * @param {Object} res Express response object
   * @param {Function} next Express next method to invoke the next middleware in line
   * @returns {Function} Can throw an error in case same API is already being processed and it;s MD5 hashkey is already present in redis
   */
  return function lock (req, res, next) {
    var reqObject = { api: req.path, body: req.body };
    var hash = crypto.createHash('md5').update(JSON.stringify(reqObject)).digest("hex");
  
    redisClient.get(hash, function(getKeyError, getKeyReply) {
      if(getKeyError) {
        return next(self.throwError(getKeyError))
      }
      if(getKeyReply === 'LOCKED') {
        res.isFirstRequest = false
        res.status(200);
        return next(DEFAULTS.error_message)
      }
      else {
        redisClient.set(hash, 'LOCKED', 'PX', self.ttl, function(setKeyError, setKeyReply) {
          if(setKeyError) {
            return next(self.throwError(setKeyError))
          }
          if(setKeyReply === 'OK') {
            res.isFirstRequest = true
            setTimeout(() => {
              return next()
            }, 10000);
          }
          else return next(self.throwError('No response from redis while setting the lock for ' + hash));
        });
      }
    })
  
    onHeaders(res, function() {
      if (!!res.isFirstRequest) {
        redisClient.expire(hash, 0)
      }
    })
  }
}

/**
 * @description Function to check if we should throw an error incase of a failure or just silently ignore
 * @param {Object} error Error object
 * @returns Will return 'null' in case of silent error
 * @private
 */
ApiLock.prototype.throwError = function(error) {
  if(this.silent) return null;
  else throw new Error(error);
}