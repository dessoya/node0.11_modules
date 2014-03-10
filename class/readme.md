## Class

Class implementation

## Using it

### Create Class

```javascript
var SomeClass = Class.inherit({
	// constructor
	onCreate: function(args) {
	},
	foo: function() {
		console.log(213);
	}
})
```

### Create instance of Class

```javascript
var object = SomeClass.create(args)
```

### Class inheritance

```javascript
var AnotherClass = SomeClass.inherit({
	// constructor
	onCreate: function(args) {
		this.foo();
	}
})
```