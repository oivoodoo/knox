
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
  , Bucket = require('./bucket')
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

Client.prototype.request = function(method, filename, headers) {
  return this.request(new Bucket(this), method, filename, headers);
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

Client.prototype.request = function(config, method, filename, headers) {
  var options = { host: config.endpoint, port: 80 }
    , date = new Date
    , headers = headers || {};

  // Default headers
  utils.merge(headers, {
      Date: date.toUTCString()
    , Host: this.getBucketEndPoint(this.endpoint)
  });

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: config.getResource(filename)
    , contentType: headers['Content-Type']
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  // Issue request
  options.method = method;
  options.path = join('/', filename);
  options.headers = headers;

  var req = http.request(options);
  req.url = config.url(filename);

  return req;
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
 * Get list of buckets with optional `headers.
 *
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.bucketList = function(headers, fn) {
  if('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  return this.get('/', headers).on('response', function(res) {
    fn(null, res);
  }).end();
};

/**
 * Set context to `bucket`.
 *
 * @param {String} bucket
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.bucket = function(name, fn) {
  fn.call(new Bucket(this, name));
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
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.url = function(filename){
  return 'http://' + join(this.endpoint, filename);
};

/**
 * Return a resource to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */
 
Client.prototype.getResource = function(filename) {
  return filename;
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