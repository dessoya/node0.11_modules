'use strict';

var assert = require('assert')
  , errors = require('./../index.js')
  , util = require('util')


describe('errors', function(){

  it('function console.err', function(done){

		assert.equal(typeof console.err, 'function', 'console.err typeof');

		var old = process.stderr.write;
		var text = '';
		process.stderr.write = function(message) {
			text += message;
		}

		console.err('text');
		assert.equal(text, 'Error: text\n', 'console.err output');

		text = '';
		console.showError('error');
		// process.stdout.write('\n'+text);
		assert.equal(text.indexOf('Error: error\n'), 0, 'console.showError output 1');
		assert.notEqual(text.indexOf('errors/test/common.js:24:11)'), -1, 'console.showError output 2');

		text = '';
		console.showError(errors.Common.create('error'));
		// process.stdout.write('\n'+text);
		assert.equal(text.indexOf('Error: error\n'), 0, 'console.showError output 3');
		assert.notEqual(text.indexOf('errors/test/common.js:30:35)'), -1, 'console.showError output 4');

		text = '';
		console.showError(new Error('native'));
		// process.stdout.write('\n'+text);
		assert.equal(text.indexOf('Error: Error: native\n'), 0, 'console.showError output 3');
		assert.notEqual(text.indexOf('errors/test/common.js:36:21)'), -1, 'console.showError output 4');

		process.stderr.write = old;

		done();
	})

  it('creating errors.Common', function(done){

		assert.equal(typeof errors.Common, 'function', 'console.err typeof');

		var e1 = errors.Common.create('error1');
		var e2 = errors.Common.create(e1, {a:1});
		// console.log('\n'+util.inspect(e2,{depth:null,showHidden:true}));
		assert.equal(e2.a, 1, 'errors.Common from errors.Common 1');
		assert.equal(e2.error, 'error1', 'errors.Common from errors.Common 2');
		assert.notEqual(e2.stack[0].indexOf('errors/test/common.js:50:26)'), -1, 'errors.Common from errors.Common 3');

		var e3 = errors.Common.create(new Error('error2'), {b:2});
		// console.log('\n'+util.inspect(e3,{depth:null,showHidden:true}));
		assert.equal(e3.b, 2, 'errors.Common from Error 3');
		assert.equal(e3.error, 'Error: error2', 'errors.Common from Error 1');
		assert.notEqual(e3.stack[0].indexOf('errors/test/common.js:57:33)'), -1, 'errors.Common from Error 2');

		var e21 = errors.Common.create(e1);
		var e31 = errors.Common.create(new Error('error3'));

		done();
	})

  it('activateCatcher', function(done){

		assert.equal(typeof errors.activateCatcher, 'function', 'console.err typeof');
/*
		var e1 = errors.Common.create('error1');
		var e2 = errors.Common.create(e1, {a:1});
		// console.log('\n'+util.inspect(e2,{depth:null,showHidden:true}));
		assert.equal(e2.a, 1, 'errors.Common from errors.Common 1');
		assert.equal(e2.error, 'error1', 'errors.Common from errors.Common 2');
		assert.notEqual(e2.stack[0].indexOf('errors/test/common.js:50:26)'), -1, 'errors.Common from errors.Common 3');

		var e3 = errors.Common.create(new Error('error2'), {b:2});
		// console.log('\n'+util.inspect(e3,{depth:null,showHidden:true}));
		assert.equal(e3.b, 2, 'errors.Common from Error 3');
		assert.equal(e3.error, 'Error: error2', 'errors.Common from Error 1');
		assert.notEqual(e3.stack[0].indexOf('errors/test/common.js:57:33)'), -1, 'errors.Common from Error 2');

		var e21 = errors.Common.create(e1);
		var e31 = errors.Common.create(new Error('error3'));
*/
		// var old = process.listeners('uncaughtException');
		process.removeAllListeners('uncaughtException');

		errors.activateCatcher();

		errors.activateCatcher(function() {
			return false;
		});

		process.nextTick(function() {
	       	throw Error('e1');
		});

		process.nextTick(function() {
				done();
		});
	})
})
