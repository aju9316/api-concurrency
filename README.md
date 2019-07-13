[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

# api-concurrency
Function to restrict duplicate HTTP requests.

If an API request arrives for the very first time it will lock it ([using redis](https://redis.io/topics/quickstart)) and another request for same API with same request body arrive even before the response of previous API is sent, it will return an error in response for that second (duplicate) request.

Tip: To increase the throughput of this function, connect the redis client with redis server using unix sockets


# Installation
```
npm install api-concurrency
```
# Usage
```javascript
var express = require('express')
var apiLock = require('api-concurrency')
var redisClient = require('redis').createClient()
var app = express()

app.use(function (req, res, next) {
    var options = {
        payload: {
            path: req.path, // path should always be given in payload to determine same endpoint
            body: req.body // make sure your body contains a unique key for a given session
        },
        ttl: 60000,
        silent: false,
        key_prefix: 'apiLock:' // a prefix to redis's key
    }
    
    /*
     * Following function will invoke the next middleware with or without error depending on weather a request is duplicate or not.
     * This function will NOT return the response directly.
     **/
    apiLock(redisClient, options, res, next)
})

app.get('/', function(req, res) {
  // We delay the response in order to mock the runtime of an actual API.
  // Now, you can try and hit the same API before 2 secs and it should throw an error
  setTimeout(() => {
    return res.status(200).json('Hello, World!')
  }, 2000)
})

app.listen(3000, function() {
  console.log('Server listening at port 3000')
})
```

## Options
key | data type | description
------------ | ------------ | -------------
payload | string/number/object/array (mandatory) | this value will be used to determine if a given request if duplicate or not
ttl | number (optional, default: 60000) | value (in millisecond) to expire the hashkey regardless of response was sent or not
silent | boolean (optional, default: false) | if true, it will block the API execution in case of redis error
key_prefix | string (optional, default: 'ApiLock') | this string will be appended as prefix to the key name in redis
