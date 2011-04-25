
/*!
 * knox - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var utils = require('./utils')
  , auth = require('./auth')
  , http = require('http')
  , url = require('url')
  , join = require('path').join
  , mime = require('./mime')
  , fs = require('fs');

/**
 * Initialize a `Client` with the given `options`.
 * 
 * Required:
 *
 *  - `key`     amazon api key
 *  - `secret`  amazon secret
 *
 * @param {Object} options
 * @api public
 */

var Client = module.exports = exports = function Client(options) {
  if (!options.key) throw new Error('aws "key" required');
  if (!options.secret) throw new Error('aws "secret" required');

  // This is default endpoint for amazon s3 service.
  this.endpoint = 's3.amazonaws.com';

  utils.merge(this, options);
};

/**
 * Request with `filename` the given `method`, and optional `headers`.
 *
 * @param {String} method
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api private
 */

Client.prototype.request = function(method, filename, headers){
  var options = { host: this.endpoint, port: 80 }
    , date = new Date
    , headers = headers || {};

  // If we doesn't have in this context any initialized bucket 
  // just save bucket_name as empty string line.
  this.bucket_name = !this.bucket_name ? "" : this.bucket_name;
  
  // Default headers
  utils.merge(headers, {
      Date: date.toUTCString()
    , Host: this.getBucketEndPoint(this.endpoint)
  });

  var resource = "/";
  if (!!filename) {
    resource = join("/", this.bucket_name, filename);
  }

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: resource
    , contentType: headers['Content-Type']
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  // Issue request
  options.method = method;
  options.path = join('/', filename);
  options.headers = headers;

  var req = http.request(options);
  req.url = this.url(filename);

  return req;
};

/**
 * Return bucket endpoint if we are working in the bucket context method.
 */
 
Client.prototype.getBucketEndPoint = function() {
  return (!this.bucket_name ? "" :  this.bucket_name + ".") + this.endpoint;
};

/**
 * PUT data to `filename` with optional `headers`.
 *
 * Example:
 *
 *     // Fetch the size
 *     fs.stat('Readme.md', function(err, stat){
 *      // Create our request
 *      var req = client.put('/test/Readme.md', {
 *          'Content-Length': stat.size
 *        , 'Content-Type': 'text/plain'
 *      });
 *      fs.readFile('Readme.md', function(err, buf){
 *        // Output response
 *        req.on('response', function(res){
 *          console.log(res.statusCode);
 *          console.log(res.headers);
 *          res.on('data', function(chunk){
 *            console.log(chunk.toString());
 *          });
 *        }); 
 *        // Send the request with the file's Buffer obj
 *        req.end(buf);
 *      });
 *     });
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.put = function(filename, headers){
  headers = utils.merge({
      Expect: '100-continue'
    , 'x-amz-acl': 'public-read'
  }, headers || {});
  return this.request('PUT', filename, headers);
};

/**
 * PUT the file at `src` to `filename`, with callback `fn`
 * receiving a possible exception, and the response object.
 *
 * NOTE: this method reads the _entire_ file into memory using
 * fs.readFile(), and is not recommended or large files.
 *
 * Example:
 *
 *    client
 *     .putFile('package.json', '/test/package.json', function(err, res){
 *       if (err) throw err;
 *       console.log(res.statusCode);
 *       console.log(res.headers);
 *     });
 *
 * @param {String} src
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.putFile = function(src, filename, headers, fn){
  var self = this;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  fs.readFile(src, function(err, buf){
    if (err) return fn(err);
    headers = utils.merge({
        'Content-Length': buf.length
      , 'Content-Type': mime.lookup(src)
    }, headers);
    self.put(filename, headers).on('response', function(res){
      fn(null, res);
    }).end(buf);
  });
};

/**
 * PUT the given `stream` as `filename` with optional `headers`.
 *
 * @param {Stream} stream
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.putStream = function(stream, filename, headers, fn){
  var self = this;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  fs.stat(stream.path, function(err, stat){
    if (err) return fn(err);
    // TODO: sys.pump() wtf?
    var req = self.put(filename, utils.merge({
        'Content-Length': stat.size
      , 'Content-Type': mime.lookup(stream.path)
    }, headers));
    req.on('response', function(res){
      fn(null, res);
    });
    stream
      .on('error', function(err){fn(null, err); })
      .on('data', function(chunk){ req.write(chunk); })
      .on('end', function(){ req.end(); });
  });
};

/**
 * GET `filename` with optional `headers`.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.get = function(filename, headers){
  return this.request('GET', filename, headers);
};

/**
 * GET `filename` with optional `headers` and callback `fn`
 * with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.getFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.get(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Issue a HEAD request on `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.head = function(filename, headers){
  return this.request('HEAD', filename, headers);
};

/**
 * Issue a HEAD request on `filename` with optional `headers` 
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.headFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.head(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Get list of buckets with optional `headers.
 *
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.listBucket = function(headers, fn) {
  if('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.get('', headers).on('response', function(res) {
    fn(null, res);
  }).end();
};

/**
 * Create `bucket name` with optional `headers.
 * This method is workin on bucket context. Before using we have to set bucket
 * context via client.bucket("bucket_name") to the selected bucket.
 * Example:
 *  client.
 * @param {String} bucket name
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.create = function(headers, fn) {
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.put("/", headers).on('response', function(res) {
    fn(null, res);
  }).end();
};

/**
 * Set context to `bucket name`.
 *
 * @param {String} bucket
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.bucket = function(name, fn) {
  this.bucket_name = name;
  fn.call(this);
  this.bucket_name = "";
};

/**
 * Get list of files in the bucket with optional `headers.
 * Before using this method you have to set context to selected.
 * Example:
 *  client.bucket('name_of_bucket', function() {
 *    client.list(function(err, res) {
 *      console.log(data);
 *      res.on('data', function(t) {
 *        console.log(t.toString());
 *      });
 *    });
 *  });
 * Data is represented as xml. For parsing them you can use for 
 * example the next following code:
 *  var Parser = require('xml2js').Parser;
 *  Parser.addListener('end', function(result) {
 *    console.log(result); // <- result is json object.
 *  });
 *  parser.parseString(t.toString()); // convert buffer to String.
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.list = function(filename, headers, fn) {
  if ('function' == typeof filename) {
    fn = filename;
    filename = "/";
  }
  if('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.get("/", headers).on('response', function(res) {
    fn(null, res);
  }).end();
};


/**
 * DELETE `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.del = function(filename, headers){
  return this.request('DELETE', filename, headers);
};

/**
 * DELETE `filename` with optional `headers` 
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.deleteFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.del(filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * DELETE `bucket name` with optional `headers` 
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} bucket_name
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */
 
Client.prototype.deleteBucket = function(headers, fn) {
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.del("/", headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.url = function(filename){
  return 'http://' + join(this.getBucketEndPoint(), filename);
};

/**
 * Return an S3 presigned url to the given `filename`.
 *
 * @param {String} filename
 * @param {Date} expiration
 * @return {String}
 * @api public
 */

Client.prototype.signedUrl = function(filename, expiration){
  this.bucket_name = !this.bucket_name ? "" : this.bucket_name;
  var epoch = Math.floor(expiration.getTime()/1000);
  var signature = auth.signQuery({
    secret: this.secret,
    date: epoch,
    resource: '/' + this.bucket_name + url.parse(filename).pathname
  });
  
  return this.url(filename) + 
    '?Expires=' + epoch +
    '&AWSAccessKeyId=' + this.key +
    '&Signature=' + escape(signature);
};

/**
 * Shortcut for `new Client()`.
 *
 * @param {Object} options
 * @see Client()
 * @api public
 */

exports.createClient = function(options){
  return new Client(options);
};
