## errors

helpers for errors manipulations with daemon mode

## Using it

### Writing to stderr

```javascript
var errors = require('errors')

console.err('message')
// Error: message
```

### Create error object

```javascript
var errors = require('errors')
var error = errors.Common.create('error', {customkey1:1});
// show errors at stderr
console.showError(error);
console.showError(new Error('error'));
```

### Protection program's fall

```javascript
var errors = require('errors')

errors.activateCatcher(function(err) {
	// logging errors
	return false;
})

errors.activateCatcher(function(err) {
	if(err.myFatal) return true;
	return false;
})

throw new Error('error'); // show error and continue

throw errors.Common.createa('error',{myFatal:true}); // show error and terminate

```
