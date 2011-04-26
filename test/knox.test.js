
/**
 * Module dependencies.
 */

var knox = require('../lib/knox')
  , fs = require('fs');

try {
  var bucket_name = JSON.parse(fs.readFileSync("bucket", 'ascii')).bucket_name;
  var auth = JSON.parse(fs.readFileSync('auth', 'ascii'));
  var client = knox.createClient(auth);
} catch (err) {
  console.error('`make test` requires ./auth and ./bucket to contain a JSON string with');
  console.error('`key, secret, and bucket in order to run tests.');
  process.exit(1);
}

var jsonFixture = __dirname + '/fixtures/user.json';

module.exports = {
  'test .version': function(assert){
    assert.match(knox.version, /^\d+\.\d+\.\d+$/);
  },
  
  'test .createClient() invalid': function(assert){
    var err;
    try {
      knox.createClient({});
    } catch (e) {
      err = e;
    }
    assert.equal('aws "key" required', err.message);
    
    var err;
    try {
      knox.createClient({ key: 'foo' });
    } catch (e) {
      err = e;
    }
    assert.equal('aws "secret" required', err.message);
  },
  
  'test .createClient() valid': function(assert){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
    });
    
    assert.equal('foobar', client.key);
    assert.equal('baz', client.secret);
    assert.equal('s3.amazonaws.com', client.endpoint);
  },
  
  'test .createClient() custom endpoint': function(assert){
    var client = knox.createClient({
        key: 'foobar'
      , secret: 'baz'
      , endpoint: 's3-eu-west-1.amazonaws.com'
    });

    assert.equal('s3-eu-west-1.amazonaws.com', client.endpoint);
  },

  'test .put()': function(assert, done){
    var n = 0;
    fs.stat(jsonFixture, function(err, stat){
      if (err) throw err;
      fs.readFile(jsonFixture, function(err, buf){
        if (err) throw err;
        client.bucket(bucket_name, function(bucket) {
          var req = this.put(bucket, '/test/user.json', {
              'Content-Length': stat.size
            , 'Content-Type': 'application/json'
            , 'x-amz-acl': 'private'
          });
          req.on('response', function(res){
            assert.equal(200, res.statusCode);
            assert.equal(
                'http://'+bucket.name+'.s3.amazonaws.com/test/user.json'
              , bucket.url('/test/user.json'));
            assert.equal(
                'http://'+bucket.name+'.s3.amazonaws.com/test/user.json'
              , req.url);
            done();
          });
          req.end(buf);
        });
      })
    });
  },
  
  'test .getFile()': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      bucket.getFile('/test/user.json', function(err, res){
        assert.ok(!err);
        assert.equal(200, res.statusCode);
        assert.equal('application/json', res.headers['content-type'])
        assert.equal(13, res.headers['content-length'])
        done();
      });
    });
  },
  
  'test .get()': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      this.get(bucket, '/test/user.json').on('response', function(res){
        assert.equal(200, res.statusCode);
        assert.equal('application/json', res.headers['content-type'])
        assert.equal(13, res.headers['content-length'])
        done();
      }).end();
    });
  },

  'test .head()': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      this.head(bucket, '/test/user.json').on('response', function(res){
        assert.equal(200, res.statusCode);
        assert.equal('application/json', res.headers['content-type'])
        assert.equal(13, res.headers['content-length'])
        done();
      }).end();
    });
  },

  'test .del()': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      this.del(bucket, '/test/user.json').on('response', function(res){
        assert.equal(204, res.statusCode);
        done();
      }).end();
    });
  },

  'test .get() 404': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      this.get(bucket, '/test/user.json').on('response', function(res){
        assert.equal(404, res.statusCode);
        done();
      }).end();
    });
  },

  'test .head() 404': function(assert, done){
    client.bucket(bucket_name, function(bucket) {
      this.head(bucket, '/test/user.json').on('response', function(res){
        assert.equal(404, res.statusCode);
        done();
      }).end();
    });
  },

  'test .bucketList()': function(assert, done) {
    client.bucketList(function(err, res) {
      assert.ok(!err, "bucketList() got an error!");
      assert.equal(200, res.statusCode);
      done();
    });
  }
};
