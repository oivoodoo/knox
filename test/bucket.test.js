
/**
 * Module dependencies.
 */

var knox = require('../lib/knox')
  , fs = require('fs');

try {
  var bucket_name = JSON.parse(fs.readFileSync("bucket", 'ascii')).bucket_name;
  var auth = JSON.parse(fs.readFileSync('auth', 'ascii'));
  var client = knox.createClient(auth);
  var bucket = client.bucket(bucket_name);
} catch (err) {
  console.error('`make test` requires ./auth and ./bucket to contain a JSON string with');
  console.error('`key, secret, and bucket in order to run tests.');
  process.exit(1);
}

var jsonFixture = __dirname + '/fixtures/user.json';

module.exports = {

  'test .create()': function(assert, done) {
    var test_bucket = client.bucket('testbucketnamejustfortest');
    test_bucket.create(function(err, res) {
      assert.ok(!err, 'create() got an error!');
      assert.equal(200, res.statusCode);
      done();
    });
  },

  'test .remove()': function(assert, done) {
    var test_bucket = client.bucket('testbucketnamejustfortest');
    test_bucket.remove(function(err, res) {
      assert.ok(!err, "remove() got an error!");
      assert.equal(204, res.statusCode);
      done();
    });
  },

  'test .putFile()': function(assert, done){
    var n = 0;
    bucket.putFile(jsonFixture, '/test/user.json', function(err, res){
      assert.ok(!err, 'putFile() got an error!');
      assert.equal(200, res.statusCode);
      bucket.client.get(bucket, '/test/user.json').on('response', function(res){
        assert.equal('application/json', res.headers['content-type']);
        done();
      }).end();
    });
  },

  'test .putStream()': function(assert, done){
    var stream = fs.createReadStream(jsonFixture);
    bucket.putStream(stream, '/test/user.json', function(err, res){
      assert.ok(!err);
      if (100 !== res.statusCode) assert.equal(200, res.statusCode);
      done();
    });
  },

  'test .getFile()': function(assert, done){
    bucket.getFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    });
  },
 
  'test .headFile()': function(assert, done){
    bucket.headFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(200, res.statusCode);
      assert.equal('application/json', res.headers['content-type'])
      assert.equal(13, res.headers['content-length'])
      done();
    });
  },
  
  'test .deleteFile()': function(assert, done){
    bucket.deleteFile('/test/user.json', function(err, res){
      assert.ok(!err);
      assert.equal(204, res.statusCode);
      done();
    });
  }
};
