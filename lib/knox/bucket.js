
/**
 * Module dependencies.
 */

var utils = require('./utils')
  , mime = require('./mime')
  , url = require('url')
  , join = require('path').join
  , fs = require('fs');

/**
 * Initialize a `Bucket` with 'client' and the given `options`.
 * 
 * Required:
 *
 *  - `bucket name`     bucket name for creating context
 *
 * @param {Client} client
 * @param {Object} options
 * @api public
 */
 
var Bucket = module.exports = exports = function Bucket(client, options) {
  if (!options.name) throw new Error('bucket name is required');

  this.name = options.name;
  this.client = client;
  this.endpoint = options.name + "." + client.endpoint;

  utils.merge(this, options);
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

Bucket.prototype.putFile = function(src, filename, headers, fn){
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
    self.client.put(self, filename, headers).on('response', function(res){
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

Bucket.prototype.putStream = function(stream, filename, headers, fn){
  var self = this;
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  };
  fs.stat(stream.path, function(err, stat){
    if (err) return fn(err);
    // TODO: sys.pump() wtf?
    var req = self.client.put(self, filename, utils.merge({
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
 * GET `filename` with optional `headers` and callback `fn`
 * with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Bucket.prototype.getFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.get(this, filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
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

Bucket.prototype.headFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.head(this, filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Create `bucket name` with optional `headers.
 *
 * @param {String} bucket name
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Bucket.prototype.create = function(headers, fn) {
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.put(this, '/', headers).on('response', function(res) {
    fn(null, res);
  }).end();
};

/**
 * Delete `bucket name` with optional `headers.
 *
 * Example:
 *  client.bucket("oivoodoo3", function(){ 
 *    client.bucketDelete(function(err, r) {
 *      if (err) throw err;
 *      if (r.statusCode == "204") {
 *        console.log("OK+");
 *      }
 *    });
 *  });
 *
 * @param {String} bucket name
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 *
 */

Bucket.prototype.remove = function(headers, fn) {
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.del(this, '/', headers).on('response', function(res) {
    fn(null, res);
  }).end();
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

Bucket.prototype.list = function(filename, headers, fn) {
  if ('function' == typeof filename) {
    fn = filename;
    filename = "/";
  }
  if('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.get(this, filename, headers).on('response', function(res) {
    fn(null, res);
  }).end();
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

Bucket.prototype.deleteFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.client.del(this, filename, headers).on('response', function(res){
    fn(null, res);
  }).end();
};

/**
 * Return an S3 presigned url to the given `filename`.
 *
 * @param {String} filename
 * @param {Date} expiration
 * @return {String}
 * @api public
 */

Bucket.prototype.signedUrl = function(filename, expiration){
  var epoch = Math.floor(expiration.getTime()/1000);
  var signature = auth.signQuery({
    secret: this.secret,
    date: epoch,
    resource: '/' + this.name + url.parse(filename).pathname
  });

  return this.url(filename) + 
    '?Expires=' + epoch +
    '&AWSAccessKeyId=' + this.key +
    '&Signature=' + escape(signature);
};

/**
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Bucket.prototype.url = function(filename) {
  return 'http://' + join(this.endpoint, filename);
};

/**
 * Return a resource to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */
 
Bucket.prototype.getResource = function(filename) {
  // If we are working with create, remove operations 
  // we dont need full resource name.
  if (!filename || filename == "/") {
    return filename = "/";
  }
  return join("/", this.name, filename);
};

/**
 * Return a path to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */
 
Bucket.prototype.getPath = function(filename) {
  // If we are working with create, remove operations 
  // we dont need full resource name.
  if (!filename 
      || filename == "/") {
    return filename = "/";
  }
  return join('/', filename);
};