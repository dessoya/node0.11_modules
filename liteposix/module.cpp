#include "node.h"

#include <unistd.h>
#include <sys/types.h>
#include <pwd.h>

using namespace v8;

void my_setsid(const v8::FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	setsid();
	args.GetReturnValue().Set(v8::True());
}

void my_setuid(const v8::FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);
	setuid(args[0]->ToInteger()->Value());
	args.GetReturnValue().Set(v8::True());
}

void my_getpwnam(const v8::FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = Isolate::GetCurrent();
	HandleScope scope(isolate);

	Handle<Value> value = args[0];
	String::AsciiValue sv(value->ToString());
	const char *name = *sv;

	Handle<Array> array = Array::New(7);
	struct passwd *passwd_struct = getpwnam(name);

	array->Set(2, Number::New(passwd_struct->pw_uid));

	args.GetReturnValue().Set(array);
}

static void RegisterModule(v8::Handle<v8::Object> exports) {
	NODE_SET_METHOD(exports, "setsid", my_setsid);
	NODE_SET_METHOD(exports, "getpwnam", my_getpwnam);
	NODE_SET_METHOD(exports, "setuid", my_setuid);
}

NODE_MODULE(module, RegisterModule);
