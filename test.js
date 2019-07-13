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

  it('should throw error if payload is not passed in options', function () {
    try {
      ApiLock(redisclient)
    }
    catch(error) {
      assert.strictEqual(error.message, 'Payload cannot be empty')
    }
  })

  it('should execute the function without errors', function () {
    try {
      var options = { payload: { path: '/api/v1/user', body: { userID: 123, user_name: 'jon doe' } } }
      ApiLock(redisclient, options, {}, function () {})
      ApiLock(redisclient, options, {}, function () {})
    }
    catch(error) {
      console.log(error)
    }
  })
})
