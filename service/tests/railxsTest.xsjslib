/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
describe("railxs REST Framework Unit Test", function() {
    var railxs;
    var request, response;
    var parameters = {format: "json", raw: "/"};

    beforeEach(function(){
        request = {
            path: "/sap/tm/trp/service/dummy.xsjs",
            parameters : {
                get: function(key) {
                    return parameters[key];
                }
            },
            contentType: "application/json",
            headers: {
                get: function() { return; }
            }
        };
    });

    it("should call railxs create method successfully with different validation methods", function() {
        request.method = $.net.http.POST;
        request.body = {
            asString: function() {
                return JSON.stringify({
                    a: {
                        b: {
                            c: {
                                d: [1, 2],
                                e: "string",
                                i: "SYSTEM"
                            },
                            h: 42
                        },
                        g: 3.1415926
                    },
                    f: "M"
                });
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a/b/c/d",
                        presence: true
                    },
                    {
                        field: "a/b/c/e",
                        format: {
                            expr: /\w+/
                        }
                    },
                    {
                        field: "f",
                        inclusion: {
                            scope: ["M", "F"]
                        },
                        on: ["create"]
                    },
                    {
                        field: "a/g",
                        numericality: true,
                        condition: function() { // never do this validation
                            return false;
                        }
                    },
                    {
                        field: "a/b/c/d/e/f/g/h/i/j/k/l/m/n",
                        presence: true,
                        on: ["delete"] // never do this validation
                    },
                    {
                        field: "a/g",
                        range: {
                            lt: 1
                        },
                        condition: function(obj) {
                            return obj.hasOwnProperty("a");
                        },
                        on: ["update"] // overlay condition and on
                    },
                    {
                        field: "a/b/c/d/e/f/g/h/i/j/k/l/m/n",
                        length: {
                            is: 1
                        },
                        allowBlank: true // skip this validation
                    },
                    {
                        field: "a/b/h", // multiple validation rules
                        numericality: true,
                        range: {
                            // these conditions could be overlayed
                            bw: [1, 100],
                            le: 42,
                            lt: 43,
                            ge: 42,
                            gt: 41
                        }
                    },
                    {
                        field: "a/b/c/e",
                        length: {
                            minimum: 6,
                            maximum: 6,
                            within: [5, 7],
                            is: 6
                        }
                    },
                    {
                        field: "a",
                        validateWith: function(obj) {
                            return obj.f === "M" && Object.keys(obj.a).length > 0;
                        }
                    },
                    {
                        field: "a/b/c/i",
                        uniqueness: {
                            sql: "SELECT 1 FROM TABLES WHERE TABLE_NAME = ? AND SCHEMA_NAME = ?",
                            scope: "{a/b/c/i}"
                        }
                    },
                    {
                        not: { // give the opposite condition
                            field: "f",
                            validateWith: function() {
                                return false;
                            }
                        }
                    }

                ];
            })()
        });

        railxs.create = function() {
            return {ID: 1};
        };

        var spyParsePath = spyOn(railxs, "parsePath").and.callThrough();
        var spyUnmarshall = spyOn(railxs, "unmarshall").and.callThrough();
        var spyValidate = spyOn(railxs, "validate").and.callThrough();
        var spyAfterInitialize = spyOn(railxs, "afterInitialize").and.callThrough();
        var spyApplyFilters = spyOn(railxs, "applyFilters").and.callThrough();
        var spyMarshall = spyOn(railxs, "marshall").and.callThrough();
        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();
        var spyTemplate = spyOn(railxs, "template").and.callThrough();
        var spyGetValue = spyOn(railxs, "getValue").and.callThrough();
        var spyGetArgument = spyOn(railxs, "getArguments").and.callThrough();
        var spyCreate = spyOn(railxs, "create").and.callThrough();

        /**
         * Since Validation is initialized inside the validate() method
         * therefore need to spy on the constructor method and
         * add spies when a new Validation initialized
         * the idea is from http://stackoverflow.com/a/22291810/4649046
         */
        var ValidationContructor = railxs.Validation;
        var spyValidatePresence;
        var spyValidateFormat;
        var spyValidateInclusion;
        var spyValidateNumericality;
        var spyValidateRange;
        var spyValidateLength;
        var spyValidateUniqueness;
        var spyValidateValiateWith;
        var spyValidation = spyOn(railxs, "Validation").and.callFake(function(){
            railxs.Validation = new ValidationContructor();

            spyValidatePresence = spyOn(railxs.Validation, "presence").and.callThrough();
            spyValidateFormat = spyOn(railxs.Validation, "format").and.callThrough();
            spyValidateInclusion = spyOn(railxs.Validation, "inclusion").and.callThrough();
            spyValidateNumericality = spyOn(railxs.Validation, "numericality").and.callThrough();
            spyValidateRange = spyOn(railxs.Validation, "range").and.callThrough();
            spyValidateLength = spyOn(railxs.Validation, "length").and.callThrough();
            spyValidateUniqueness = spyOn(railxs.Validation, "uniqueness").and.callThrough();
            spyValidateValiateWith = spyOn(railxs.Validation, "validateWith").and.callThrough();

            return railxs.Validation;
        });


        railxs.handle();

        expect($.response.status).toBe($.net.http.CREATED);

        [spyParsePath,
         spyUnmarshall,
         spyValidate,
         spyAfterInitialize,
         spyApplyFilters,
         spyMarshall,
         spyMarshaller,
         spyTemplate,
         spyGetValue,
         spyGetArgument,
         spyCreate,
         spyValidation,
         spyValidatePresence,
         spyValidateFormat,
         spyValidateInclusion,
         spyValidateNumericality,
         spyValidateRange,
         spyValidateLength,
         spyValidateUniqueness,
         spyValidateValiateWith].forEach(function(spy) {
            expect(spy).toHaveBeenCalled();
        });

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: {
                ID: 1
            }
        });

    });

    it("should work with multi-part request", function() {
        request.method = $.net.http.POST;
        request.contentType = "multipart/mixed; boundary=gc0p4Jq0M2Yt08jU534c0p";
        request.entities = [{
            body: { asString: function() { return '{"a": 1}';}},
            contentType: "application/json"
        }, {
            body: { asString: function() { return 'TEST,CSV,FILE';}},
            contentType: "application/vnd.ms-excel"
        }];

        // quite simple csv handler
        lib.ContentType.csv = {
            type: "application/vnd.ms-excel",
            unmarshall: function(content) { return content.split("\n").map(function(line) { return line.split(",");}); },
            marshall: function(array) { return array.join("\n");}
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.create = function(params) {
            return params.obj;
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.CREATED);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: [{ a: 1 }, [["TEST", "CSV", "FILE"]]]
        });

        delete lib.ContentType.csv;
    });

    it("should work with multi-part request even if the content type is missing", function() {
        request.method = $.net.http.POST;
        request.contentType = "multipart/mixed; boundary=gc0p4Jq0M2Yt08jU534c0p";
        request.entities = [{
            body: { asString: function() { return '{"a": 1}';}}
        }, {
            body: { asString: function() { return 'TEST,CSV,FILE';}}
        }];

        // quite simple csv handler
        lib.ContentType.csv = {
            type: ["application/vnd.ms-excel", "text/csv"],
            unmarshall: function(content) { return content.split("\n").map(function(line) { return line.split(",");}); },
            marshall: function(array) { return array.join("\n");}
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.create = function(params) {
            return params.obj;
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.CREATED);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: [{ a: 1 }, [["TEST", "CSV", "FILE"]]]
        });

        // remove the handler
        delete lib.ContentType.csv;
    });

    it("should override the default unmarshaller if priority is higher", function() {
        request.method = $.net.http.POST;
        request.body = {
            asString: function() {
                return '{"a": 1}';
            }
        };

        request.contentType = undefined;

        // quite simple csv handler
        lib.ContentType.csv = {
            type: ["text/csv"],
            unmarshall: function(content) { return content.split("\n").map(function(line) { return line.split(",");}); },
            marshall: function(obj) { return String(obj);},
            priority: lib.ContentType.Priority.MAX_PRIORITY
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.create = function(params) {
            return params.obj;
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.CREATED);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: [['{"a": 1}']]
        });

        // remove the handler
        delete lib.ContentType.csv;
    });

    it("should fail with validation presence on calling update", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };
        request.method = $.net.http.PUT;
        request.body = {
            asString: function() {
                return '{}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        presence: true,
                        message: "customized message",
                        args: "ARGS"
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: "customized message",
                args: ["ARGS"],
                field: "a"
            }]
        });
    });

    it("should fail with validation inclusion on calling show", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1", a: "S"}[key];
        };

        request.method = $.net.http.GET;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        inclusion: { scope: ["M", "L", "XL"] }
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.show = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: "is not included in the list M,L,XL",
                args : undefined,
                field: "a"
            }]
        });
    });

    it("should fail with validation range on calling index", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/", a: 42}[key];
        };

        request.method = $.net.http.GET;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        range: {
                            bw: [1, 41],
                            le: 41,
                            lt: 41,
                            ge: 43,
                            gt: 43
                        }
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.index = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: {
                    bw: "is not between range 1,41",
                    le: "is not less or equal to value 41",
                    lt: "is not less than value 41",
                    ge: "is not greater or equal to value 43",
                    gt: "is not greater than value 43"
                },
                args : undefined,
                field: "a"
            }]
        });
    });

    it("should fail with validation format on calling destroy", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1", a: "42"}[key];
        };
        request.method = $.net.http.DEL;
        request.body = {
            asString: function() {
                return '{"a": "123"}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        format: { expr: /[a-zA-Z]+/ },
                        args: ["a", "{a}"]
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.destroy = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: "is invalid with format /[a-zA-Z]+/",
                args: ["a", "123"],
                field: "a"
            }]
        });
    });

    it("should fail with validation length on calling delete", function() {
        request.method = $.net.http.DEL;
        request.body = {
            asString: function() {
                return '{"a": "123"}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        length: {
                            minimum: 4,
                            maximum: 2,
                            within: [5, 7],
                            is: 6
                        },
                        args: ["a", "{a}"]
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs["delete"] = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message : {
                    minimum: "must have at least 4 characters",
                    maximum: "must have at most 2 characters",
                    within: "must between 5 and 7 characters",
                    is: "must exactly have 6 characters"
                },
                args: ["a", "123"],
                field: "a"
            }]
        });
    });

    it("should fail with validation numericality on calling destroy", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.DEL;
        request.body = {
            asString: function() {
                return '{"a": "NOT_A_NUMBER"}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        numericality: true
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.destroy = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: "is not a number",
                args: undefined,
                field: "a"
            }]
        });
    });

    it("should fail with validation uniquessness on calling destroy", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1", a: "SYSTEM"}[key];
        };

        request.method = $.net.http.DEL;
        request.body = {
            asString: function() {
                return '{"a": "SYSTEM"}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle",
            model: new (function() {
                this.validates = [
                    {
                        field: "a",
                        uniqueness: {
                            sql: 'SELECT 1 FROM USERS WHERE USER_NAME = ?'
                        }
                    }
                ];
            })()
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.destroy = function(params) {
            throw new Error("never be thrown", params);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        var context = spyMarshaller.calls.mostRecent();
        expect(context).toBeDefined();
        expect(context.args).toBeDefined();
        expect(context.args.length).toBe(1);
        expect(context.args[0].success).toBeFalsy();
        expect(context.args[0].messages).toBeDefined();
        expect(context.args[0].messages.length).toBe(1);
        expect(context.args[0].messages[0].field).toBe("a");
        expect(context.args[0].messages[0].message).toBe("it has been used by someone, try another?");
        expect(context.args[0].messages[0].type).toBe("ERROR");
        expect(context.args[0].messages[0].args).toBeDefined();
        expect(context.args[0].messages[0].args.length).toBeGreaterThan(0);

    });

    it("should fail because the route is invalid", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/search"}[key];
        };
        request.method = $.net.http.POST;
        request.body = {
            asString: function() {
                return '{"a": "123"}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.handle();

        expect($.response.status).toBe($.net.http.METHOD_NOT_ALLOWED);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success : false,
            messages : [{
                type: "ERROR",
                message: "Invalid Route",
                args: undefined,
                cause: {
                    method : 3,
                    scope: "member"
                }
            }]
        });
    });

    it("should fail because the content type is not set correctly", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/search"}[key];
        };
        request.method = $.net.http.POST;
        request.contentType = "application/html";
        request.body = {
            asString: function() {
                return '<html><head>TEST</head></html>';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        railxs.search = function(params) {
            throw new Error("never be thrown", params);
        };
        railxs.setRoutes({
            method: $.net.http.POST,
            scope: "collection",
            action: "search"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.handle();

        expect($.response.status).toBe($.net.http.BAD_REQUEST);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages : [{
                type: "ERROR",
                message: "Unmarshall Failed",
                args: undefined,
                cause: "Invalid Content-Type"
            }, {
                type: "ERROR",
                message: "Invalid Content-Type",
                args: undefined,
                cause: "application/html"
            }]
        });
    });

    it("should be able to initialize WebApplicationError", function() {
        var webAppErr = new lib.WebApplicationError(-1, "message", "cause", "ERROR");

        expect(webAppErr.httpCode).toBe(-1);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[-1] WebApplicationError: message Caused by \"cause\"");
    });

    it("should be able to initialize BadRequestError", function() {
        var webAppErr = new lib.BadRequestError("message", "cause");

        expect(webAppErr.httpCode).toBe(400);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[400] BadRequestError: message Caused by \"cause\"");
    });

    it("should be able to initialize NotFoundError", function() {
        var webAppErr = new lib.NotFoundError("message", "cause");

        expect(webAppErr.httpCode).toBe(404);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[404] NotFoundError: message Caused by \"cause\"");
    });

    it("should be able to initialize InternalError", function() {
        var webAppErr = new lib.InternalError("message", "cause");

        expect(webAppErr.httpCode).toBe(500);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[500] InternalError: message Caused by \"cause\"");
    });

    it("should be able to initialize MethodNotAllowedError", function() {
        var webAppErr = new lib.MethodNotAllowedError("message", "cause");

        expect(webAppErr.httpCode).toBe(405);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[405] MethodNotAllowedError: message Caused by \"cause\"");
    });

    it("should be able to initialize ValidationError", function() {
        var webAppErr = new lib.ValidationError("message", "cause");

        expect(webAppErr.httpCode).toBe(400);
        expect(webAppErr.message).toBe("message");
        expect(webAppErr.cause).toBe("cause");
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[400] ValidationError: message Caused by \"cause\"");
    });

    it("should be able to nest a function runtime error", function() {
        var runtime;
        try {
            f();
        } catch(e) {
            runtime = e;
        }
        var webAppErr = new lib.InternalError(runtime);

        expect(webAppErr.httpCode).toBe(500);
        expect(webAppErr.message).toBe("f is not defined");
        expect(webAppErr.cause).toBeUndefined();
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[500] InternalError: f is not defined");
    });

    it("should be able to nest a undefined runtime error", function() {
        var runtime;
        try {
            var obj = {};

            obj.a.b = 1;
        } catch(e) {
            runtime = e;
        }
        var webAppErr = new lib.InternalError(runtime);

        expect(webAppErr.httpCode).toBe(500);
        expect(webAppErr.message).toBe("obj.a is undefined");
        expect(webAppErr.cause).toBeUndefined();
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[500] InternalError: obj.a is undefined");
    });

    it("should be able to nest a undefined runtime error", function() {
        var runtime;
        try {
            null.f();
        } catch(e) {
            runtime = e;
        }
        var webAppErr = new lib.InternalError(runtime);

        expect(webAppErr.httpCode).toBe(500);
        expect(webAppErr.message).toBe("null has no properties");
        expect(webAppErr.cause).toBeUndefined();
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[500] InternalError: null has no properties");
    });

    it("should be able to nest a syntax runtime error", function() {
        var runtime = new SyntaxError("SyntaxError", "SyntaxError.js", 42);
        var webAppErr = new lib.InternalError(runtime);

        expect(webAppErr.httpCode).toBe(500);
        expect(webAppErr.message).toBe("SyntaxError");
        expect(webAppErr.cause).toBeUndefined();
        expect(webAppErr.type).toBe("ERROR");
        expect(webAppErr.toString()).toBe("[500] InternalError: SyntaxError");
    });

    it("should be able to categories a database runtime error and expose root cause when debug on", function() {
        var runtime;

        try {
            var pstmt = jasmine.dbConnection.prepareStatement("WRONG SQL STATEMENT");
            pstmt.executeQuery();
        } catch (e) {
            runtime = e;
        }
        railxs = new lib.SimpleRest({request: request});
        railxs.setDebug(true);

        var response = railxs.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_DATABASE_ERROR");
        expect(response.messages[0].cause).toBe("dberror(Connection.prepareStatement): 257 - sql syntax error: incorrect syntax near \"WRONG\": line 1 col 1 (at pos 1)");
        expect(response.messages[0].args).toBe(257);
    });


    it("should be able to categories a database runtime error", function() {
        var runtime;

        try {
            var pstmt = jasmine.dbConnection.prepareStatement("WRONG SQL STATEMENT");
            pstmt.executeQuery();
        } catch (e) {
            runtime = e;
        }
        railxs = new lib.SimpleRest({request: request});
        railxs.setDebug(false);

        var response = railxs.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_DATABASE_ERROR");
        expect(response.messages[0].cause).toBeUndefined();
        expect(response.messages[0].args).toBe(257);
    });

    xit("should be able to categories a xsjob runtime error", function() {
        var runtime;

        try {
            var job = new $.jobs.Job({uri:"NOT_EXIST.xsjob"});
        } catch (e) {
            runtime = e;
        }
        var response = lib.SimpleRest.prototype.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_BACKGROUND_JOB_ERROR");
        expect(response.messages[0].cause).toBe("Job: job not found");
    });

    it("should be able to categories a xshttpdest runtime error", function() {
        var runtime;

        try {
            $.net.http.readDestination("sap.tm.trp.service.tests", "NOT_EXIST");
        } catch (e) {
            runtime = e;
        }
        var response = lib.SimpleRest.prototype.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_OUTBOUND_CONNECT_ERROR");
        expect(response.messages[0].cause).toBe("http.readDestination: destination not found (package: sap.tm.trp.service.tests, name: NOT_EXIST)");
    });

    it("should be able to categories a syntax runtime error", function() {
        var runtime = new SyntaxError("SyntaxError", "SyntaxError.js", 42);
        var response = lib.SimpleRest.prototype.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_IMPLEMENTATION_ERROR");
        expect(response.messages[0].args).toEqual(["SyntaxError.js", 42]);
        expect(response.messages[0].cause).toBe("SyntaxError");

    });

    it("should be able to categories a unknown internal runtime error", function() {
        var runtime;

        try {
            throw new Error("UNKNOWN");
        } catch (e) {
            runtime = e;
        }
        var response = lib.SimpleRest.prototype.template(runtime);

        expect(response).toBeDefined();
        expect(response.success).toBeFalsy();
        expect(Array.isArray(response.messages)).toBeTruthy();
        expect(response.messages[0].message).toBe("MSG_TRP_INTERNAL_UNKNOWN_ERROR");
        expect(response.messages[0].cause).toBe("UNKNOWN");

    });

    it("should be able to return warning but success flag is still true", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.PUT;
        request.body = {
            asString: function() {
                return '{}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            var obj = {};
            var warnings = [];

            obj.value = 42;
            warnings.push({ message: "Warning 1", args: 1});
            obj.key = "answer";
            warnings.push({ message: "Warning 2", args: [2]});

            throw new lib.Warning(obj, warnings);
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.OK); // original update should return 204 NO_CONTENT, but warning will override this

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: {
                key: "answer",
                value: 42
            },
            messages: [{
                type: "WARNING",
                message: "Warning 1",
                args: 1
            }, {
                type: "WARNING",
                message: "Warning 2",
                args: [2]
            }]
        });

    });

    it("should be able to throw error if warning is nested", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.PUT;
        request.body = {
            asString: function() {
                return '{}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            var obj = {};
            var warnings = [];

            obj.value = 42;
            warnings.push({ message: "Warning 1", args: 1});

            throw new lib.InternalError("NestedWithWarning", new lib.Warning(obj, warnings));
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.INTERNAL_SERVER_ERROR);

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: false,
            messages: [{
                type: "ERROR",
                message: "NestedWithWarning",
                cause: undefined,
                args: undefined
            }, {
                type: "WARNING",
                message: "Warning 1",
                args: 1
            }]
        });

    });


    xit("should be able to work with the v2 railxs API", function() {
        var name = "orders.xsjslib";
        var path = "/sap/tm/trp/service/tests/";

        var File = ($.import("/sap/tm/trp/service/xslib/file.xsjslib")).File;
        var file = new File(name, path);

        var definition = 'var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");\n\n' +
                         'var entity = new lib.SimpleRest({name: "A", description: "B"});\n' +
                         'entity.index = function() { return {answer: 42}; };\n'+
                         'entity.handle();';

        file.create(definition, "data/xsjslib");

        var response = jasmine.callHTTPService("/sap/tm/trp/service/ng/tests/orders.json", $.net.http.GET, undefined, {"Content-Type": "application/json"});

        expect(response.status).toBe($.net.http.OK);

        var result = JSON.parse(response.body.asString());

        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
        expect(result.data.answer).toBe(42);

        file.remove();
    });

    it("should be able to work with annotation class", function() {
        var annotation = new lib.Annotation();
        annotation.add("@a1", function() { return true; });

        expect(annotation.registered).toBeDefined();
        expect(annotation.registered["@a1"]).toBeDefined();
        expect(annotation.add).toBeDefined();
        expect(annotation.remove).toBeDefined();
    });

    it("should be able to add warning annotation within function", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.PUT;
        request.body = {
            asString: function() {
                return '{}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            var obj = {};

            obj.value = 42;
            "@warning {'Warning 1' 1}";
            obj.key = "answer";
            "@warning {'Warning 2' [2]}";

            return obj;
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.OK); // original update should return 204 NO_CONTENT, but warning will override this

        expect(spyMarshaller).toHaveBeenCalledWith({
            messages: [{
                type: "WARNING",
                message: "Warning 1",
                args: 1
            }, {
                type: "WARNING",
                message: "Warning 2",
                args: [2]
            }],
            success: true,
            data: {
                key: "answer",
                value: 42
            }
        });

    });

    it("should be able to add deprecated annotation within function", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.PUT;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            "@deprecated";
            var obj = {};

            obj.value = 42;
            obj.key = "answer";
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.OK); // original update should return 204 NO_CONTENT, but warning will override this

        expect(spyMarshaller).toHaveBeenCalledWith({
            messages: [{
                type: "WARNING",
                message: "The service has been deprecated and may later be changed, use at your own risk.",
                args: undefined
            }],
            success: true,
            data: undefined
        });

    });

    it("should be able to combine deprecated and warning annotation together", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };
        request.method = $.net.http.PUT;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            "@deprecated {it has been deprecated}";
            var obj = {};

            obj.value = 42;
            obj.key = "answer";

            "@warning {'obj has been configured' [42, 'answer']}";
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.OK); // original update should return 204 NO_CONTENT, but warning will override this

        expect(spyMarshaller).toHaveBeenCalledWith({
            messages: [{
                type: "WARNING",
                message: "it has been deprecated",
                args: undefined
            }, {
                type: "WARNING",
                message: "obj has been configured",
                args: [42, "answer"]
            }],
            success: true,
            data: undefined
        });

    });

    it("should be able to use route annotation to define route", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/search", q: "TOR"}[key];
        };
        request.method = $.net.http.GET;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.search = function(params) {
            "@route {method:GET scope:collection response:OK}";
            return {
                query: params.get("q")
            };
        };

        // no need to set route compare to before
        railxs.handle();

        expect($.response.status).toBe($.net.http.OK); // original update should return 204 NO_CONTENT, but warning will override this

        expect(spyMarshaller).toHaveBeenCalledWith({
            success: true,
            data: {
                query: "TOR"
            }
        });

    });

    it("should be able to use redirect annotation to URL redirect", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1", q: "TOR"}[key];
        };

        request.method = $.net.http.PUT;

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        railxs.update = function() {
            "@redirect {http://www.example.com}";
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.MOVED_PERMANENTLY);
        expect($.response.headers.get("Location")).toBe("http://www.example.com");
    });

    it("should be able to use self defined annotation", function() {
        request.parameters.get = function(key) {
            return {format: "json", raw: "/1"}[key];
        };

        request.method = $.net.http.PUT;
        request.body = {
            asString: function() {
                return '{}';
            }
        };

        railxs = new lib.SimpleRest({
            request: request,
            name: "Test Doodle",
            desc: "Test Doodle"
        });

        var spyMarshaller = spyOn(railxs, "marshaller").and.callThrough();

        var fake = jasmine.createSpyObj("fake", ["handler"]);
        railxs.annotation.add("@customize", fake.handler);

        var obj = {
            validateUser: function(content) {
                if ($.session.getUsername().match(/[A-Z]+/)) {
                    throw new lib.NotAuthorizedError(content);
                }
            }
        };
        spyOn(obj, "validateUser").and.callThrough();
        railxs.annotation.add("@validateUser", obj.validateUser);

        railxs.update = function() {
            "@customize {'The quick brown fox jumps over the lazy dog'}";
            "@validateUser {Uppercase username access is not allowed}";
        };

        railxs.handle();

        expect($.response.status).toBe($.net.http.UNAUTHORIZED);

        expect(spyMarshaller).toHaveBeenCalledWith({
            messages: [{
                type: "ERROR",
                message: "Uppercase username access is not allowed",
                args: undefined,
                cause: undefined
            }],
            success: false
        });

        expect(fake.handler).toHaveBeenCalledWith("'The quick brown fox jumps over the lazy dog'");
        expect(obj.validateUser).toHaveBeenCalled();

    });

});