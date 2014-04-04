'use strict'

var errors = require('errors')
  , util = require('util')

global.GE_ERROR		= 0;
global.GE_PART		= 1;
global.GE_END		= 2;

function resume0(err, data) {
	// console.log('resume0');
	if(err) {

		// console.log('fakeasync error');
		if(this.throwErrors) {
			var result = this.generator.throw(err);
			if(!this.checkEnd(result)) this.next(data);
		}
		else {
			if(this.callback) this.callback(GE_ERROR, err);
		}
	}
	else {
		this.next(data);
	}
}

function resume3end(event, data) {

	// console.log('resume3');

	if(GE_ERROR === event) {

		// console.log('resume3 err');
/*
		var result = this.generator.throw(data);
		if(!this.checkEnd(result)) this.next();
*/

		if(this.throwErrors) {
			var result = this.generator.throw(data);
			if(!this.checkEnd(result)) this.next(data);
		}
		else {
			if(this.callback) this.callback(GE_ERROR, data);
		}

	}
	else if (GE_END === event) {
		// console.log('resume3 data');
		this.next(data);
	}
}

function checkEnd(result) {
	if(result && result.done) {
		if(this.callback) this.callback(GE_END, result.value);
		return true;
	}
	return false;
}

function next(data) {
	try {
		data = this.generator.next(data);
	}
	catch(error) {
		data = null;
		if(this.callback) this.callback(GE_ERROR, errors.Common.create(error));
	}
	if(data) this.checkEnd(data);	
}

function executeGenerator(generator, params, callback) {
	var sv = { callback: callback, next: next, checkEnd: checkEnd };
	sv.resume = resume0.bind(sv);
	sv.resume3end = resume3end.bind(sv);
	sv.generator = generator(params, sv);
	sv.next();
}

module.exports = executeGenerator
