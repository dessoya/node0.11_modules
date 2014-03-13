'use strict';

var assert = require('assert')
  , errors = require('./../index.js')
  , util = require('util')


describe('errors', function(){

  it('function console.err', function(done){

		assert.equal(typeof console.err, 'function', 'console.err typeof');

		var old = process.stderr.write;
		var text = '';
		var ef = process.stderr.write = function(message) {
			text += message;
		}

		console.err('text');
		assert.equal(text, 'Error: text\n', 'console.err output');

		text = '';
		console.showError('error');
		// process.stdout.write('\n'+text);
		process.stderr.write = old;
		assert.equal(text.indexOf('Error: error\n'), 0, 'console.showError output 1');
		assert.notEqual(text.indexOf('errors/test/common.js:24:11)'), -1, 'console.showError output 2');

		process.stderr.write = ef;
		text = '';
		console.showError(errors.Common.create('error'));
		// process.stdout.write('\n'+text);
		process.stderr.write = old;
		assert.equal(text.indexOf('Error: error\n'), 0, 'console.showError output 3');
		assert.notEqual(text.indexOf('errors/test/common.js:32:35)'), -1, 'console.showError output 4');

		process.stderr.write = ef;
		text = '';
		console.showError(new Error('native'));
		// process.stdout.write('\n'+text);
		process.stderr.write = old;
		assert.equal(text.indexOf('Error: native\n'), 0, 'console.showError output 5');
		assert.notEqual(text.indexOf('errors/test/common.js:40:21)'), -1, 'console.showError output 6');

		// process.stderr.write = old;
		done();
	})

  it('creating errors.Common', function(done){

		assert.equal(typeof errors.Common, 'function', 'console.err typeof');

		var e1 = errors.Common.create('error1');
		var e2 = errors.Common.create(e1, {a:1});
		// console.log('\n'+util.inspect(e2,{depth:null,showHidden:true}));
		assert.equal(e2.a, 1, 'errors.Common from errors.Common 1');
		assert.equal(e2.error, 'error1', 'errors.Common from errors.Common 2');
		assert.notEqual(e2.stack[0].indexOf('errors/test/common.js:54:26)'), -1, 'errors.Common from errors.Common 3');

		var e3 = errors.Common.create(new Error('error2'), {b:2});
		// console.log('\n'+util.inspect(e3,{depth:null,showHidden:true}));
		assert.equal(e3.b, 2, 'errors.Common from Error 3');
		assert.equal(e3.error, 'error2', 'errors.Common from Error 1');
		assert.notEqual(e3.stack[0].indexOf('errors/test/common.js:61:33)'), -1, 'errors.Common from Error 2');

		var e21 = errors.Common.create(e1);
		var e31 = errors.Common.create(new Error('error3'));

		done();
	})

  it('activateCatcher', function(done){

		assert.equal(typeof errors.activateCatcher, 'function', 'console.err typeof');

		var old = process.stderr.write;
		var text = '';
		var ef = process.stderr.write = function(message) {
			text += message;
		}

		var oldl;
		var setupError = function(catcher) {
			oldl = process.listeners('uncaughtException');
			process.removeAllListeners('uncaughtException');
			errors.activateCatcher();
			errors.activateCatcher(catcher);
		}
		var restoreError = function() {
			process.stderr.write = old;
			errors.removeCatcher();
			var c = oldl.length; while(c--) process.on('uncaughtException', oldl[c]);
		}

		setupError(function(err) {

			// console.dir(err);
			// console.log(err.stack[0]);
			process.stderr.write = old;
			assert.equal(err.error, 'error activateCatcher', 'activateCatcher 1');
			assert.notEqual(err.stack[0].indexOf('errors/test/common.js:109:30'), -1, 'activateCatcher 2');
			process.stderr.write = ef;

			return false;
		});

		process.nextTick(function() {
	       	throw errors.Common.create('error activateCatcher');
		});

		process.nextTick(function() {
			restoreError();
			phase2();
		});

		var phase2 = function() {
			var oldexit = process.exit;
			process.exit = function(errorCode) {
				// console.log('errorCode '+errorCode);

				process.exit = oldexit;
				restoreError();

				assert.equal(errorCode, 200, 'process.exit 200');
				// phase3();
				done();
			}

			process.stderr.write = ef;
			text = '';

			setupError(function(err) {
				return true;
			})

			process.nextTick(function() {
		       	throw new Error('error');
			})
		}
/*
		var phase3 = function() {
			var oldexit = process.exit;
			process.exit = function(errorCode) {
				console.log('errorCode 1 '+errorCode);
				assert.equal(errorCode, 200, 'process.exit 200');
				done();
			}

			process.stderr.write = ef;
			text = '';
			process.on('uncaughtException', function(err) {
				a = b /c;
			});

			setupError(function(err) {
				// a = b /c;
				return ;
			})

			process.nextTick(function() {
		       	throw new Error('error');
			})
		}
*/
	})
})
