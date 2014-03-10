'use strict'

var Class	= require('class')
  , util	= require('util')

global.console.err = function(text) {
	process.stderr.write('Error: '+text + "\n");
}

global.console.showError = function(err) {
	if(err instanceof Common) {
		console.err(err.error+'\n'+err.stack.join('\n'));
	}
	else if(err instanceof Error) {
		console.err(err.stack,{depth:null});
	}
	else {
		console.err(util.inspect(err,{depth:null}));
		console.err(new Error().stack,{depth:null});
	}
}

var Common = Class.inherit({
	onCreate: function(error, stack) {

		if(error instanceof Common) {
			if(stack) {
				for(var name in stack) this[name] = stack[name];
			}
			this.error = error.error;
			this.stack = error.stack;
		}
		else if(error instanceof Error) {
			if(stack) {
				for(var name in stack) this[name] = stack[name];
			}
			this.stack = error.stack.split('\n');
			this.error = this.stack.shift();
		}
		else {
			this.error = error;
			this.stack = (new Error().stack).split('\n');
			this.stack.shift();
			this.stack.shift();
			this.stack.shift();
		}
	}
})

var errorCatchers = [], listener = false;
function errorCatcher(err) {
	if(err.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
		process.exit(0);
	}
	else {
		var l = errorCatchers.length, fatal = false; while(l--) {
			fatal = errorCatchers[l](err);
			if(fatal) break;
		}
		console.err('Caught exception:');
		if(err instanceof Common) {
			console.err(err.error+'\n'+err.stack.join('\n'));
		}
		else if(err instanceof Error) {
			console.err(err.stack,{depth:null});
		}
		else {
			console.err(util.inspect(err,{depth:null}));
			console.err(new Error().stack,{depth:null});
		}
		if(fatal) process.exit(200);
	}
}

function activateCatcher(catcher) {
	if(!listener) {		
		process.on('uncaughtException', errorCatcher);
		listener = true;
	}
    if(catcher) errorCatchers.push(catcher);
}

module.exports = {
	Common:				Common,
	activateCatcher:	activateCatcher,
}