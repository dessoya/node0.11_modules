## errors

helpers for errors manipulations with daemon mode

## Using it

### Writing to stderr

```javascript
var errors = require('errors')

console.err('message')
// Error: message
```

### create error object

```javascript
var errors = require('errors')
var error = errors.Common.create('error', {customkey1:1});
// show errors at stderr
console.showError(error);
console.showError(new Error('error'));
```
