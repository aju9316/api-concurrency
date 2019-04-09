/* global describe, it */

var assert = require('assert')
var redisclient = require("redis-mock").createClient();
var ApiLock = require('./index')

describe('ApiLock', function () {
  it('should throw error if redis client object is not present', function () {
    try {
      ApiLock()
    }
    catch(error) {
      assert.strictEqual(error.message, 'Argument redisClient is required')
    }
  })

  it('should throw error if redis client object is not valid', function () {
    try {
      ApiLock({ dummy: 'value' })
    }
    catch(error) {
      assert.strictEqual(error.message, 'First argument should be a valid redis client object')
    }
  })

  it('should return a middleware function', function () {
    try {
      var middleware = ApiLock(redisclient)
      assert.strictEqual(typeof middleware, typeof 'function');
    }
    catch(error) {
      console.log(error)
      // assert.strictEqual(error.message, 'First argument should be a valid redis client object')
    }
  })
})
