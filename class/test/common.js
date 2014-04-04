'use strict';

var assert = require('assert')
  , Class = require('./../index.js')
  , util = require('util')


describe('Module class', function(){

  it('common functionality', function(done){

		assert.equal(typeof Class, 'function', 'Class type check');
		assert.equal(typeof Class.create, 'function', 'Class type check');
		assert.equal(typeof Class.inherit, 'function', 'Class type check');
		assert.equal(typeof Class.constructor, 'function', 'Class type check');

		done();
	})

  it('inherit', function(done){

		var C = Class.inherit({
			onCreate: function() {
			}
		});

		assert.equal(typeof C, 'function', 'Class type check');
		assert.equal(typeof C.create, 'function', 'Class type check');
		assert.equal(typeof C.inherit, 'function', 'Class type check');
		assert.equal(typeof C.constructor, 'function', 'Class type check');
		assert.equal(typeof C.prototype.onCreate, 'function', 'Class type check');

		done();
	})

  it('create', function(done){

		var C = Class.inherit({
			onCreate: function() {
				this.a = 123;
			}
		});

		var o = C.create();

		assert.equal(o.a, 123, 'onCreate check');

		done();
	})

  it('default onCreate', function(done){

		var C = Class.inherit({
		});

		var o = C.create();

		assert.equal(typeof C.prototype.onCreate, 'function', 'Class type check');

		done();
	})

  it('parent constructor access', function(done){

		var C = Class.inherit({
			onCreate: function() {
				this.foo = 123;
			}
		});

		var B = C.inherit({
			onCreate: function() {
				C.constructor(this)();
			}
		});

		var o = B.create();

		assert.equal(o.foo, 123, 'parent constructor executing');

		done();
	})

  it('multi inherit', function(done){

		var C = Class.inherit({
			onCreate: function() {
				this.foo = 123;
			},

			cmethod: function() { return 'cmethod' },
		})

		var B = C.inherit({
			onCreate: function() {
				this.bar = 456;
			},
			bmethod: function() { return 'bmethod' },
		});

		var S = C.inherit({
			onCreate: function() {
				C.constructor(this)();
				B.constructor(this)();
			}
		}, B);

		var o = S.create();

		assert.equal(o.foo, 123, 'C constructor executing');
		assert.equal(o.bar, 456, 'C constructor executing');
		assert.equal(o.cmethod(), 'cmethod', 'method from C class');
		assert.equal(o.bmethod(), 'bmethod', 'method from B class');

		done();
	})
})
