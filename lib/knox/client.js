
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


  var sys = require ('sys');
  

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
 * @param {Object} resource that will provide some generic methods with 
 * endpoint and url information. Basically this object just for divide bucket
 * and client object methods.
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
    , Host: config.endpoint
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
  options.path = config.getPath(filename);
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

Client.prototype.put = function(config, filename, headers){
  if ('string' == typeof config) {
    filename = config;
    config = this;
  }
  headers = utils.merge({
      Expect: '100-continue'
    , 'x-amz-acl': 'public-read'
  }, headers || {});
  return this.request(config, 'PUT', filename, headers);
};

/**
 * GET `filename` with optional `headers`.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.get = function(config, filename, headers){
  if ('string' == typeof config) {
    filename = config;
    config = this;
  }
  return this.request(config, 'GET', filename, headers);
};

/**
 * Issue a HEAD request on `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.head = function(config, filename, headers){
  if ('string' == typeof config) {
    filename = config;
    config = this;
  }
  return this.request(config, 'HEAD', filename, headers);
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
  // As configu we will provide client object for request method.
  return this.get(this, '/', headers).on('response', function(res) {
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
  var b = new Bucket(this, {name: name});
  if (!!fn) {
    fn.call(this, b);
  }
  return b;
};


/**
 * DELETE `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.del = function(config, filename, headers){
  if ('string' == typeof config) {
    filename = config;
    config = this;
  }
  return this.request(config, 'DELETE', filename, headers);
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
 * Return a path to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */
 
Client.prototype.getPath = function(filename) {
  return join('/', filename);
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