# express-api-locker
Express.js Middleware to restrict duplicate requests for express.js.

If an API request arrives for the very first time it will lock it ([using redis](https://redis.io/topics/quickstart)) and another request for same API with same request body arrive even before the response of previous API is sent, it will return an error in response for that second (duplicate) request


# Installation
```
npm install express-api-locker
```
# Usage
```javascript
var express = require('express')
var apiLock = require('express-api-locker')
var redisClient = require('redis').createClient()
var app = express()

app.use(apiLock(redisClient))

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
key | datatype | description
------------ | ------------ | -------------
ttl | number (default: 60000) | value (in millisecond) to expire the hashkey regardless of response was sent or not
silent | boolean (default: false) | if true, it will block the API execution in case of redis error
