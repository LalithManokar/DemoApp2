/*
 * Simple REST version 2.1
 *
 * author: yihan.song@sap.com
 * last update: 2016/08/17
 */
var VERSION = 2.1;
var ERROR = "ERROR", WARNING = "WARNING", INFO = "INFO";

function WebApplicationError(code, message, cause, type) {
    this.httpCode = code;
    this.cause = cause;
    this.type = type || ERROR;

    if (message instanceof Error) {
        var origin = message;

        this.prototype = origin;
        this.message = origin.message;
    } else if (!Array.isArray(message) || message.length <= 1) {
        this.message = [].concat(message)[0];
    } else { // if the messages is an array then try to nest the error into one
        this.message = message[0];

        var Constructor = this.constructor;
        message.slice(1).reduce(function(memo, msg) {
            memo.cause = new Constructor(msg, cause); // recursively create nested cause with the same type
            memo = memo.cause;
            return memo;
        }, this);
    }
}
WebApplicationError.prototype = Object.create(Error.prototype, {
    name: {
        value: "WebApplicationError"
    },
    constructor: {
        value: WebApplicationError
    }
});
WebApplicationError.prototype.toString = function() {
    return "[" + (this.httpCode || 0) + "] " +
            this.name + ": " +
            (this.message || "") +
            (this.cause ? " Caused by " + (this.cause.hasOwnProperty("toString") ? this.cause : JSON.stringify(this.cause)) : "");
};

function BadRequestError(message, cause) {
    WebApplicationError.call(this, $.net.http.BAD_REQUEST, message, cause);
}
BadRequestError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "BadRequestError"
    },
    constructor: {
        value: BadRequestError
    }
});

function NotFoundError(message, cause) {
    WebApplicationError.call(this, $.net.http.NOT_FOUND, message, cause);
}
NotFoundError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "NotFoundError"
    },
    constructor: {
        value: NotFoundError
    }
});

function InternalError(message, cause) {
    WebApplicationError.call(this, $.net.http.INTERNAL_SERVER_ERROR, message, cause);
}
InternalError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "InternalError"
    },
    constructor: {
        value: InternalError
    }
});

function MethodNotAllowedError(message, cause) {
    WebApplicationError.call(this, $.net.http.METHOD_NOT_ALLOWED, message, cause);
}
MethodNotAllowedError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "MethodNotAllowedError"
    },
    constructor: {
        value: MethodNotAllowedError
    }
});

function ValidationError(message, cause) {
    WebApplicationError.call(this, $.net.http.BAD_REQUEST, message, cause);
}
ValidationError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "ValidationError"
    },
    constructor: {
        value: ValidationError
    }
});

ValidationError.prototype.isBuiltIn = function(e) {
    // really a framework defined ValidationError
    return e instanceof ValidationError &&
           Array.isArray(e.cause) &&
           e.cause.every(function(c) { return c.hasOwnProperty("field"); });
};

function NotImplementError(message, cause) {
    WebApplicationError.call(this, $.net.http.NOT_YET_IMPLEMENTED, message, cause);
}
NotImplementError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "NotImplementError"
    },
    constructor: {
        value: NotImplementError
    }
});

function NotAuthorizedError(message, cause) {
    WebApplicationError.call(this, $.net.http.UNAUTHORIZED, message, cause);
}
NotAuthorizedError.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "NotAuthorizedError"
    },
    constructor: {
        value: NotAuthorizedError
    }
});

// a general warning, railxs will treat it in exception flow but set the HTTP code to 200
function Warning(obj, warnings) {
    WebApplicationError.call(this, $.net.http.OK, undefined, undefined, WARNING);

    this.obj = obj;
    this.warnings = warnings || [];

    var that = this;
    var regex = /'?([\w\s]+)'?\s*(\[?[\w\s\.,']+\]?)?/g;

    this.annotationHandler = function(content) {
        regex.lastIndex = 0;

        if (regex.test(content)) {
            regex.lastIndex = 0;
            var result = regex.exec(content);
            that.warnings.push({ message: result[1], args: JSON.parse(result[2].replace(/'/g, '"'))});
        }
    };
}
Warning.prototype = Object.create(WebApplicationError.prototype, {
    name: {
        value: "Warning"
    },
    constructor: {
        value: Warning
    }
});
Warning.prototype.isEmpty = function() {
    return this.warnings.length === 0;
};

function Annotation(){
    this.registered = {};
    this.annotations = [];

    this.add = function(annotation, handler, options) {
        if (typeof handler !== "function") {
            throw new Error("handler is missing or invalid for annotation " + annotation);
        }

        if (!annotation.startsWith("@")) {
            throw new Error("annotation should start with @");
        }

        options = options || { multiple: true, ignoreError: false, before: false};

        this.registered[annotation] = {
            action: handler,
            options: options,
            meta: {
                triggered: false
            }
        };
    };

    this.remove = function(annotation) {
        delete this.registered[annotation];
    };

    this.trigger = function(annotation, params, scope) {
        if(this.registered.hasOwnProperty(annotation)) {
            var foo = this.registered[annotation];
//            var condition = foo.options.condition;
//            if (!condition || (condition && condition.apply(this))) {
                if (!foo.meta.triggered || foo.options.multiple) {
                    var result;
                    try {
                        result = foo.action.call(scope, params);
                    } catch(e) {
                        if (!foo.options.ignoreError) {
                            throw e;
                        }
                    }

                    foo.meta.triggered = true;

                    return result;
                }
//            }
        }
    };
}


// supported content type
var ContentType = {};

ContentType.Priority = {
    MAX_PRIORITY : 9,
    NORM_PRIORITY: 5,
    MIN_PRIORITY : 1
};

// hide the priority property from Object.keys
Object.defineProperty(ContentType, "Priority", {
    enumerable: false
});

ContentType.json = {
    type: "application/json",
    unmarshall: JSON.parse,
    marshall: JSON.stringify,
    priority: ContentType.Priority.NORM_PRIORITY
};
// stay tuned, add xml support here

var InvertedContentType = {};

var isEmpty = function(str) {
    return str === undefined || str === null || String(str).trim().length === 0;
};

var isNumber = function(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

var stringifyError = function(error) {
    if (!error) {
        return undefined;
    }

    return error instanceof WebApplicationError ?
            error.toString() :
            ["message", "name", "code", "columnNumber", "fileName", "lineNumber", "stack"].map(function(a) {
                return "[" + a + "]:" + JSON.stringify(error[a]);
            }).join(" ");
};

var simpleClone = function(obj, exclusives){
    var cloned = {};

    if (Object.prototype.toString.call(obj) !== "[object Object]") {
        if(Array.isArray(obj)) {
            cloned = obj.map(function(e) {
                return simpleClone(e, exclusives);
            });
        } else if (Object.prototype.toString.call(obj) === "[object Arguments]") {
            cloned = simpleClone(Array.prototype.slice.call(obj), exclusives);
        } else if (!(!!obj) || ["string", "number", "boolean"].indexOf(typeof obj) !== -1){
            cloned = obj;
        } else {
            obj.toJSON = obj.toJSON || function() {
                return Object.prototype.toString.call(obj);
            };

            cloned = obj;
        }

        return cloned;
    }


    Object.keys(obj).forEach(function(key) {
        if ([].concat(exclusives).indexOf(key) !== -1) {
            return;
        }

        var val = obj[key];
        if (Object.prototype.toString.call(val) === "[object Object]" || Array.isArray(val)) {
            cloned[key] = simpleClone(val, exclusives);
        } else if (typeof val === "function") {
            cloned[key] = val;
            cloned[key].toJSON = function() {
                return "function " + key + " () { [implementation] }";
            };
        } else {
            cloned[key] = val;
        }
    });

    return cloned;
};

function SimpleRest(params) {
    var that = this;
    this.name = params.name;
    this.desc = params.desc;
    this.request = params.request || $.request;
    this.response = params.response || $.response;

    this.routes = [{
        method: $.net.http.GET,
        scope: "member",
        action: "show",
        response: $.net.http.OK
    }, {
        method: $.net.http.GET,
        scope: "collection",
        action: "index",
        response: $.net.http.OK
    }, {
        method: $.net.http.POST,
        scope: "collection",
        action: "create",
        response: $.net.http.CREATED
    }, {
        method: $.net.http.PUT,
        scope: "member",
        action: "update",
        response: $.net.http.NO_CONTENT
    }, {
        method: $.net.http.PATCH,
        scope: "member",
        action: "update",
        response: $.net.http.NO_CONTENT
    }, {
        method: $.net.http.DEL,
        scope: "member",
        action: "destroy",
        response: $.net.http.NO_CONTENT
    }, {
        method: $.net.http.POST,
        scope: "member",
        action: "regenerate",
        response: $.net.http.NO_CONTENT
    }, {
        method: $.net.http.DEL,
        scope: "collection",
        action: "delete",
        response: $.net.http.NO_CONTENT
    }];

    this.params = {
        route: {
            method: this.request.method
        },
        format: this.request.parameters.get("format"),
        obj: {},
        get: function(key) {
            return this.request.parameters.get(key);
        }.bind(this),
        contentType: this.request.contentType ? this.request.contentType.split(";")[0] : undefined,
        body: "",
        headers: this.request.headers
    };

    this.annotation = new Annotation();
    this.defaultWarning = new Warning();

    this.marshaller = ContentType.hasOwnProperty(this.params.format) ?
            ContentType[this.params.format].marshall : undefined;

    var filterRequestFormat = function() {
        // the requested format is not yet supported
        if (!this.marshaller) {
            throw new NotImplementError("Not Supported Request Format", this.params.format);
        }

        return true;
    };

    this.beforeFilters = [
        { filter: filterRequestFormat }
    ];

    // use "a/b/c" to get 1 from {a: {b: {c: 1}}}
    this.getValue = function(hier, current) {
        if (hier.length === 0 || current === undefined) {
            return current;
        } else {
            var prop = hier.shift();
            if (!current.hasOwnProperty(prop)) {
                return undefined;
            } else {
                // recursive itself to next level
                return that.getValue(hier, current[prop]);
            }
        }
    };

    this.getArguments = function(args) {
        return [].concat(args || []).map(function(i) {
            // {a/b/c} instead of a/b/c
            var pattern = /\{([a-zA-Z0-9_\/]+)\}/;
            var matches = pattern.exec(i);

            return matches ? that.getValue(matches[1].split("/"), that.params.obj) || that.params.get(matches[1]): i;
        });
    };

    this.Validation = function() {
        this.messages = {};

        this.presence = function(value, flag) {
            this.messages.presence = "can't be blank";

            return !(!!flag) || !isEmpty(value);
        }.bind(this);

        this.format = function(value, format) {
            this.messages.format = "is invalid with format ".concat(format.expr);

            return format.expr.test(value);
        }.bind(this);

        this.inclusion = function(value, inclusion) {
            this.messages.inclusion = "is not included in the list ".concat(inclusion.scope);

            return inclusion.scope.indexOf(value) !== -1;
        }.bind(this);

        this.range = function(value, range) {
            this.messages.range = {};

            var possibilities = {
                bw: function(range) {
                    this.messages.range.bw = "is not between range ".concat(range.bw);

                    return value <= range.bw[1] && value >= range.bw[0];
                },
                eq: function(range) {
                    this.messages.range.eq = "is not equal to value ".concat(range.eq);

                    return value === range.eq;
                },
                gt: function(range) {
                    this.messages.range.gt = "is not greater than value ".concat(range.gt);

                    return value > range.gt;
                },
                lt: function(range) {
                    this.messages.range.lt = "is not less than value ".concat(range.lt);

                    return value < range.lt;
                },
                ge: function(range) {
                    this.messages.range.ge = "is not greater or equal to value ".concat(range.ge);

                    return value >= range.ge;
                },
                le: function(range) {
                    this.messages.range.le = "is not less or equal to value ".concat(range.le);

                    return value <= range.le;
                }
            };

            if (Object.keys(range).some(function(key) {
                return !possibilities.hasOwnProperty(key);
                }) || Object.keys(range) < 1) {
                throw new ValidationError("Invalid check range symbol", range);
            }

            return Object.keys(range).map(function(key) {
                return possibilities[key].call(this, range);
            }, this).reduce(function(curr, prev) {
                return curr && prev;
            });
        }.bind(this);

        this.length = function(value, length) {
            this.messages.length = {};
            var l = (value || "").length;

            var possibilities = {
                minimum: function(len) {
                    this.messages.length.minimum = "must have at least ".concat(len.minimum).concat(" characters");

                    return l >= len.minimum;
                },
                maximum: function(len) {
                    this.messages.length.maximum = "must have at most ".concat(len.maximum).concat(" characters");

                    return l <= len.maximum;
                },
                within: function(len) {
                    this.messages.length.within = "must between ".concat(len.within[0]).concat(" and ").concat(len.within[1]).concat(" characters");

                    return l <= len.within[1] && l >= len.within[0];
                },
                is: function(len) {
                    this.messages.length.is = "must exactly have ".concat(len.is).concat(" characters");

                    return l === len.is;
                }
            };

            if (Object.keys(length).some(function(key) {
                return !possibilities.hasOwnProperty(key);
                }) || Object.keys(length) < 1) {
                throw new ValidationError("Invalid check length symbol", length);
            }

            return Object.keys(length).map(function(key) {
                return possibilities[key].call(this, length);
            }, this).reduce(function(curr, prev) {
                return curr && prev;
            });
        }.bind(this);

        this.numericality = function(value, flag) {
            this.messages.numericality = "is not a number";

            return !(!!flag) || isNumber(value);
        }.bind(this);

        this.type = function(value, type) {
            this.messages.type = "is not a valid data type ".concat(type.name);

            var rules = {
                Date: function(value) {
                    if (typeof value === "string") {
                        value = new Date(Date.parse(value));
                    }

                    return Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime());
                },
                Number: isNumber,
                String: function(value) { return typeof value === "string";},
                Array: Array.isArray,
                Boolean: function(value) { return ["true", "false", "0", "1", "x", ""].indexOf(String(value).trim().toLowerCase()) !== -1; }
            };

            var name = type.name || type.prototype.constructor.name;

            return rules.hasOwnProperty(name) ? rules[name].call(null, value) : false;
        }.bind(this);

        this.uniqueness = function(value, uniqueness) {
            this.messages.uniqueness = "it has been used by someone, try another?";

            // this connection is no need to manually close since framework will handle centrally
            var conn = $.db.getConnection();
            var pstmt = conn.prepareStatement(uniqueness.sql);
            pstmt.setString(1, String(value));
            if (uniqueness.hasOwnProperty("scope")) {
                that.getArguments(uniqueness.scope).forEach(function(val, idx) {
                    pstmt.setString(2 + idx, String(val));
                });
            }

            var rs = pstmt.executeQuery();

            return !rs.next();
        }.bind(this);

        this.validateWith = function(value, customizeFunc, obj) {
            this.messages.validateWith = "failed with customer validation method";

            return customizeFunc.call(null, obj, value);
        }.bind(this);

    };

    this.setDefaultAnnotation();
    this.setModel(params.model);
    this.setDebug();

    if (this.managedConnection) {
        manageConnection();
    }

}

SimpleRest.prototype = {

    setDebug: function(flag) {
        this.debug = // $.session.hasAppPrivilege("sap.tm.trp.service.xslib::Debugger") &&
            String(this.request.parameters.get("debug")) === "true" || !!this.request.headers.get("X-SAP-TRP-Debug") || flag;
    },

    setDefaultAnnotation: function() {
        this.annotation.add("@warning", this.defaultWarning.annotationHandler);

        this.annotation.add("@deprecated", function(content) {
            this.defaultWarning.warnings.push({
                message: content || "The service has been deprecated and may later be changed, use at your own risk."
            });
        });

        this.annotation.add("@route", function(content) {
            var route = { action: this.params.route.action }; // the action should always be found in URL
            content.replace(/(:)\s+/g, "$1").split(/\s+/).forEach(function(item) {
                var arr = item.split(/:/);
                if (["method", "scope", "response"].indexOf(arr[0]) !== -1) {
                    route[arr[0]] = arr[1];
                }

            });
            route.method = $.net.http[route.method];
            route.response = $.net.http[route.response];

            this.setRoutes(route);
        }, { multiple: false, ignoreError: true, before: true });

        this.annotation.add("@redirect", function(content) {
            this.response.headers.set("Location", content);
            this.response.status = $.net.http.MOVED_PERMANENTLY;
        });
    },

    setBody: function() {
        Object.keys(ContentType).forEach(function(key) {
            var type = ContentType[key].type;
            [].concat(type).forEach(function(k) {
                InvertedContentType[k] = key;
            });
        });

        if (this.request.body) { // if the body is directly nested in request
            this.params.body = this.request.body.asString();

            var type = InvertedContentType[this.params.contentType];
            this.unmarshaller = type ? ContentType[type].unmarshall : undefined;
        } else if (this.request.entities && this.request.entities.length > 0) { // if the request is a multi-part request
            var bodies = [];
            var contentTypes = [];
            var unmarshallers = [];
            var i, entity, mapped;

            for (i = 0; i < this.request.entities.length; ++i) {
                entity = this.request.entities[i];
                if (entity.body) {
                    bodies.push(entity.body.asString());
                    contentTypes.push(InvertedContentType.hasOwnProperty(entity.contentType) ? entity.contentType : "");

                    mapped = InvertedContentType[entity.contentType];
                    unmarshallers.push(mapped ? ContentType[mapped].unmarshall : undefined);
                }
            }

            this.params.body = bodies;
            this.params.contentType = contentTypes;
            this.unmarshaller = unmarshallers;
        }
    },

    // Optional, eligible to accept both array and multiple objects
    setRoutes: function() {
        var routes = [].concat.apply([], arguments);
        routes.forEach(function(item) {
            var existed = this.routes.some(function(itm) {
                return item.method === itm.method && item.action === itm.action && item.scope === itm.scope;
            });

            if (!existed) {
                this.routes.push(item);
            }
        }, this);
    },

    // Optional, eligible to accept both array and multiple objects
    setFilters: function() {
        this.beforeFilters = [].concat.apply(this.beforeFilters, arguments);
    },

    // Optional, if not set via constructor
    setModel: function(model) {
        this.model = model;
    },

    parsePath: function(raw) {
        var parts = (raw || "").split("/").filter(function(item) {
            return item.trim().length > 0;
        });

        var part;
        while ((part = parts.shift()) !== undefined) {
            if (this.hasOwnProperty(part) && typeof this[part] === "function") {
                this.params.route.action = part;
            } else { // fallback, take the input as Primary Key of the resource
                if (!this.params.hasOwnProperty("id")) {
                    // if the primary key starts with 0 then won't parse to integer
                    this.params.id = isNumber(part) ? parseInt(part, 10) : part;
                } else { // put it as action as fallback
                    this.params.route.action = part;
                }
            }
        }

        this.params.route.scope = this.params.hasOwnProperty("id") ? "member" : "collection";

        if (!this.params.route.hasOwnProperty("action")) {
            // if the action is not specified in URL then means should be a default action
            var candidates = this.routes.filter(function(item) {
                return item.method === this.params.route.method && item.scope === this.params.route.scope;
            }, this);

            if (candidates.length > 0) {
                this.params.route.action = candidates[0].action;
            }
        }

        return this.params.route;
    },

    lookupRoutes: function(routeTable) {
        var route = this.params.route;
        var lookup = routeTable.filter(function(item) {
            return item.method === route.method && item.scope === route.scope && item.action === route.action;
        });

        if(lookup.length === 0 || typeof this[route.action] !== "function") {
            throw new MethodNotAllowedError("Invalid Route", route);
        }

        route.response = lookup[0].response ||
            ([$.net.http.GET, $.net.http.POST].indexOf(lookup[0].method) !== -1 ? $.net.http.OK : $.net.http.NO_CONTENT);
    },

    applyFilters: function(filters) {
        var entity = this;

        return !filters.some(function(item) {

            // if not specify only, then consider it the mandatory filter for every action
            var onTarget = item.hasOwnProperty("only") ? item.only.indexOf(entity.params.route.action) !== -1 : true;

            // return true if both on target and executed failed(return false), then applyFilters return false (not execute action)
            return onTarget && !item.filter.call(entity, entity.params);
        });
    },

    decorate: function(handler) {
        if (typeof handler === "string") {
            return this.decorate(this[handler]); // consider it's the function name
        }

        if (typeof handler !== "function") {
            return;
        }

        var regex = /"(@\w+)\s*\{?(.*?)\}?";/g;
        var matcher = handler.toString().match(regex);
        if (matcher) {
            this.annotation.annotations = matcher.map(function(item) {
                regex.lastIndex = 0;
                var result = regex.exec(item);

                return {
                    annotation: result[1],
                    content: result[2]
                };
            });
        }
    },

    triggerAnnotation: function(beforeFlag, result) {
        this.annotation.annotations.filter(function(item) {
            return this.annotation.registered[item.annotation].options.before === beforeFlag;
        }, this).forEach(function(item) {
            this.annotation.trigger(item.annotation, item.content, this);
        }, this);

        if (!this.defaultWarning.isEmpty()) {
            this.defaultWarning.obj = result;
            throw this.defaultWarning;
        }
    },

    handle: function() {
        this.profile();

        try {
            this.parsePath(this.request.parameters.get("raw"));
            this.decorate(this.params.route.action);
            this.triggerAnnotation(true);
            this.lookupRoutes(this.routes);

            this.setBody();
            this.unmarshall(this.params.body);
            this.validate(this.model);
            this.afterInitialize(this.model);

            if (this.applyFilters(this.beforeFilters)) {
                var handler = this[this.params.route.action];
                var result = handler.call(this, this.params);
                this.response.status = this.params.route.response;

                this.triggerAnnotation(false, result);
                this.marshall(result, this.params.format);
            }
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(e);
            }

            this.marshall(e, this.params.format);
            this.response.status = e.httpCode || $.net.http.INTERNAL_SERVER_ERROR;

            this.exceptionSignal = true;
        } finally {
            if (managedConnection) {
                var managed = $.db.getConnection();

                if (this.exceptionSignal) {
                    managed.rollback();
                } else {
                    managed.commit();
                }

                managed.readyToClose = true;
                managed.close();
            }
        }

    },

    validate: function(model) {
        if (model && model.validates) {
            var obj = this.params.obj;
            var action = this.params.route.action;
            var params = this.params;
            var errors = [];
            var that = this;

            var validation = new this.Validation();

            this.model.validates.forEach(function(itm, index, array) {
                // determine whether needs to negate the check condition
                var oppositeFlag = false;
                if (itm.hasOwnProperty("not")) {
                    itm = itm.not;
                    oppositeFlag = true;
                }

                // if the condition function is valid or not
                if(itm.hasOwnProperty("condition") && typeof itm.condition === "function"){
                    if(!itm.condition(obj , params)){
                        return;
                    }
                }

                if (!itm.hasOwnProperty("field") || // if there's no field
                    (itm.hasOwnProperty("on") && [].concat(itm.on).indexOf(action) === -1)) { // or the on attribute is not match current action
                    return;
                }

                // if cannot get it from the URL then try to get the value from the body
                var value = params.get(itm.field) || that.getValue(itm.field.split("/"), obj);

                // if the value is allow to be blank and is blank then skip
                if (!!itm.allowBlank && isEmpty(value)) {
                    return;
                }

                var blacklist = ["field", "on", "message", "args", "condition"];
                Object.keys(itm).filter(function(key) {
                    return blacklist.indexOf(key) === -1
                        && validation.hasOwnProperty(key);
                }).forEach(function(key) { // validation rules can be overlayed or separated
                    var method = validation[key];
                    var args = that.getArguments(itm.args);
                    var validateResult = method.call(itm, value, itm[key], obj);
                    var fail = oppositeFlag ? validateResult : !validateResult;

                    if (fail) {
                        if (key === "uniqueness") {
                            // find other defined validation methods on the same field
                            var constrains = array.filter(function(i){
                                return i.field === itm.field || (i.hasOwnProperty("not") && i.not.field === i.field);
                            }); // at least uniqueness itself will be find

                            var isValid = function(val) {
                                return constrains.every(function(i){
                                    return Object.keys(i).filter(function(k) {
                                        return blacklist.indexOf(k) === -1;
                                    }).every(function(validate) {
                                        return validation[validate].call(i, val, i[validate], obj);
                                    });
                                });
                            };

                            // name recommendation
                            var generateRecommendation = function() {
                                // first try to re-arrange it
                                yield value.slice(value.length / 2) + value.slice(0, value.length / 2);

                                var nameIndex = 0;
                                while(true) {
                                    nameIndex ++;
                                    // pattern TIME_FILTER_YIHAN_1
                                    var option = [value, $.session.getUsername(), nameIndex].join("_").split("");
                                    // randomly remove some characters
                                    var times = Math.floor(Math.random() * option.length);
                                    var i = 0;
                                    while (i < times) {
                                        i++;
                                        option.splice(Math.floor(Math.random() * option.length), 1);
                                    }

                                    yield option.join("");
                                }
                            };

                            const TOTAL_RECOMMENDATIONS = 3;
                            const MAX_RETRY = 1000;
                            var recommend = function() {
                                var recommendations = [];
                                var generator = generateRecommendation();
                                var i = 0;

                                do {
                                    i++;
                                    var alternative = generator.next();
                                    if (isValid(alternative)) { // only if the recommended name could fulfill other validation rules
                                        recommendations.push(alternative);
                                    }
                                } while (recommendations.length < TOTAL_RECOMMENDATIONS && i < MAX_RETRY);

                                return recommendations;
                            };

                            args = args.concat(recommend());

                        }

                        errors.push({
                            field: itm.field,
                            message: itm.message || validation.messages[key],
                            args: args.length > 0 ? args : undefined
                        });
                    }
                });
            });

            if (errors.length !== 0) {
                this.model.errors = errors;
                throw new ValidationError("Record Invalid", errors);
            }
        }
    },

    afterInitialize: function(model) {
        if (model && model.afterInitialize) {
            var params = this.params;
            var action = this.params.route.action;
            [].concat(model.afterInitialize).forEach(function(item) {
                var method = item.method || item;    //get the name first
                method = typeof method === "function" ? method : model[method];    //get the real method
                if (typeof method !== "function" || item.hasOwnProperty("on") && [].concat(item.on).indexOf(action) === -1) {
                    return;
                }

                method.call(model, params.obj, params.get);

            });
        }
    },

    unmarshall: function(body) {
        function fallback(content) { // find first feasible unmarshall method
            var obj;
            Object.keys(ContentType).sort(function(a, b) { // descending order
                return (ContentType[b].priority || ContentType.Priority.MIN_PRIORITY) -
                       (ContentType[a].priority || ContentType.Priority.MIN_PRIORITY);
            }).every(function(type) {
                try {
                    obj = ContentType[type].unmarshall(content);

                    // the unmarshall method is feasible
                    return false;
                } catch (e) {
                    // need return true to the next loop
                    return true;
                }
            });

            return obj;
        }
        if (body) {
            try {
                if (Array.isArray(body)) {
                    this.params.obj = body.map(function(c, index) {
                        return this.params.contentType[index] ? this.unmarshaller[index](c) : fallback(c);
                    }, this);
                } else {
                    // content-type is not registered
                    if (!InvertedContentType.hasOwnProperty(this.params.contentType)) {
                        this.params.obj = fallback(body);

                        if (!this.params.obj) { // still cannot parse
                            throw new BadRequestError("Invalid Content-Type", this.params.contentType);
                        }
                    } else {
                        this.params.obj = this.unmarshaller(body);
                    }
                }

            } catch (e) {
                throw new BadRequestError("Unmarshall Failed", e);
            }
        }
    },

    marshall: function(obj, format) {
        this.response.headers.set("X-TRP-SimpleRest-Version", String(VERSION));

        if (obj !== undefined) {
            var response = this.template(obj);

            if (this.marshaller) {
                this.response.setBody(this.marshaller(response));

                // set content type as desired, if multiple, then select the first
                this.response.contentType = [].concat(ContentType[format].type)[0];
            } else {
                // recursively using json as the format
                this.marshaller = ContentType.json.marshall;
                this.marshall(new NotImplementError("Invalid Requested Format", format), "json");
            }
        } else {
            if (this.debug && this.tasks) {
                this.response.followUp({
                    uri : "sap.tm.trp.service:trace.xsjs",
                    functionName : "profile",
                    parameter : {
                        user : $.session.getUsername(),
                        key : $.util.createUuid(),
                        tasks : this.tasks
                    }
                });
            }
        }
    },

    // revise this function if you want to customize the return format
    template: function(obj) {
        var response = {};
        if (obj instanceof Error) {

            var unnest = function() {
                var stack = [];

                return function(e) {
                    stack.push(e);

                    if (e.hasOwnProperty("cause") && e.cause instanceof Error) {
                        var err = e.cause;
                        e.cause = e.cause.message; // only leave the nested error message

                        // recursively get the nested error
                        unnest(err);

                    } else if (e.prototype instanceof Error) {
                        // recursively get the nested error
                        unnest(e.prototype);
                    }

                    return stack.reverse();
                };
            }();

            var errors = unnest(obj);

            var visibleErrors = [];
            var customize;
            try {
                customize = $.import("/sap/tm/trp/service/xslib/messages.xsjslib").customize;
            } catch (ex) {
                customize = function(e) {
                    return { type: ERROR, message: e.message, cause: e.cause };
                };
            }
            errors.forEach(function(e) {
                if (ValidationError.prototype.isBuiltIn(e)) {
                    e.cause.forEach(function(c) {
                        visibleErrors.push({
                            type: e.type || ERROR,
                            message: c.message,
                            args: c.args,
                            field: c.field
                        });
                    });
                } else {
                    if (e instanceof Warning && e.warnings.length > 0) {
                        e.warnings.forEach(function(w) {
                            visibleErrors.push({
                                type: WARNING,
                                message: w.message,
                                args: w.args
                            });
                        });
                    } else if (e instanceof WebApplicationError) {
                        visibleErrors.push({
                            type: e.type || ERROR,
                            message: e.message,
                            args: e.cause && e.cause.hasOwnProperty("args") ? e.cause.args : undefined,
                            cause: e.cause
                        });
                    } else {
                        visibleErrors.push(customize(e, this.debug));
                    }
                }
            }, this);

            response.messages = visibleErrors;
            response.success = !visibleErrors.some(function(err) { return err.type === ERROR;}); // if there's any error, then it's a failure
            if (response.success) {
                response.data = errors.filter(function(err) { return err instanceof Warning;})[0].obj;
            } else {
                var errorTrace = errors.map(function(error) {
                    return stringifyError(error);
                }).join("\n\tCaused by:");

                $.trace.error(errorTrace);
            }
        } else {
            response.success = true;
            response.data = obj;
            if (obj && obj.hasOwnProperty("messages")) {
                response.messages = obj.messages;
            }
        }

        if (this.debug) {
            var key = $.util.createUuid();

            if (this.tasks) {
                if (this.tasks.length > 1000) { // if profile is too large
                    response.tasks = key;
                } else {
                    response.tasks = this.tasks.sort(function(a, b) {
                        return a.timestamp - b.timestamp || a.stack.length - b.stack.length;
                    });
                }

                this.response.followUp({
                    uri : "sap.tm.trp.service:trace.xsjs",
                    functionName : "profile",
                    parameter : {
                        user: $.session.getUsername(),
                        key : key,
                        tasks : this.tasks
                    }
                });
            }
        }

        return response;
    },

    profile: function() {
        var scope = (this.request.parameters.get("$profile") || "sql,function").split(",");
        var hooked = new WeakMap();

        var hookFunction = function(foo, name) {
            if (typeof foo !== "function" || hooked.has(foo)) {
                return foo;
            }

            hooked.set(foo, foo);

            var original = foo;
            var prev = foo.prototype;
            var calls = 0;
            var source = foo.toString();

            var surrogate = function() {
                calls ++;

                hookObject(Array.prototype.slice.call(arguments));

                var context = (new Error()).stack.trim().split("\n").slice(1);
                var start = new Date();
                var stop, error, result;

                try {
                    result = original.apply(this, arguments);
                } catch (e) {
                    error = e;
                } finally {
                    stop = new Date();
                }

                // that was defined in railxs scope
                that.tasks.push({
                    method: name || "<anonymous function>",
                    arguments: simpleClone(arguments),
                    error: stringifyError(error),
                    returnValue: simpleClone(result, "tasks"),
                    stack: context,
                    duration: stop - start,
                    timestamp: start,
                    calls: calls
                });

                if (error) {
                    throw error;
                }

                hookObject(result);
                hookObject(this);

                // recursively to hook on the result if possible
                return hookFunction(result);
            };

            foo = surrogate;
            foo.prototype = prev;
            foo.toString = function() {
                return source;
            };

            return foo;
        };

        var hookObject = function(obj) {
            if (["[object Object]", "[object Array]"].indexOf(Object.prototype.toString.call(obj)) === -1
                    || hooked.has(obj)) {
                return;
            }

            for(var key in obj) {// need to loop its prototype chain
                // only if the function could be re-configurable
                if (typeof obj[key] === "function") {
                    // if it's not writable then just ignore
                    if (obj.hasOwnProperty(key) && !Object.getOwnPropertyDescriptor(obj, key).writable ||
                            obj.constructor.prototype && obj.constructor.prototype.hasOwnProperty(key)
                                    && !Object.getOwnPropertyDescriptor(obj.constructor.prototype, key).writable) {
                        continue;
                    }

                    hooked.set(obj, obj);
                    obj[key] = hookFunction(obj[key], key);
                } else {
                    // recursively to hook on object property
                    hookObject(obj[key]);
                }
            };
        };

        if (this.debug) {
            var that = this;
            this.tasks = [];

            // temporarily disable following functions hook to avoid infinite recursive
            [simpleClone, stringifyError].forEach(function(foo) {
                hooked.set(foo, true);
            });

            if (scope.indexOf("function") !== -1) {
                hookObject(this);
                hookObject(this.model);

                // if the lib was not imported, then the hook just do no-ops
                hookObject($.sap.tm.trp.service.xslib);
                hookObject($.sap.tm.trp.service.routing);
            }

            if (scope.indexOf("sql") !== -1) {
                if ($.sap.tm.trp.service.xslib.procedures) {
                    $.sap.tm.trp.service.xslib.procedures.debug = true;
                }
                hookObject($.sap.tm.trp.service.xslib.procedures);

                // trace all $.db SQL statements invoked
                var getConnection = $.db.getConnection;
                $.db.getConnection = function() {
                    var conn;

                    return function() {
                        if (!conn || conn.isClosed()) { // if the connection is closed by mistake should be able to create a new one
                            conn = getConnection.apply($.db, arguments);

                            var originalPrepareStatement = conn.prepareStatement;
                            var originalPrepareCall = conn.prepareCall;

                            conn.prepareStatement = function(sql){
                                that.tasks.push({
                                    sql: sql,
                                    timestamp: new Date(),
                                    stack: (new Error()).stack.trim().split("\n").slice(1)
                                });

                                return originalPrepareStatement.apply(conn, [sql]);
                            };

                            conn.prepareCall = function(sql){
                                that.tasks.push({
                                    sql: sql,
                                    timestamp: new Date(),
                                    stack: (new Error()).stack.trim().split("\n").slice(1)
                                });

                                return originalPrepareCall.apply(conn, [sql]);
                            };
                        }

                        return conn;
                    }
                }();
            }
        }
    },

    managedConnection: true,
    managedConnectionIsolationLevel: $.db.isolation.READ_COMMITTED

};

Object.defineProperty(SimpleRest.prototype, "constructor", {
    enumerable: false,
    value: SimpleRest
});

Object.defineProperty(SimpleRest.prototype, "profile", {
    enumerable: false
});

//managed the whole connection to make sure it consistent anywhere
var managedConnection = false;
function manageConnection() {
    var getConnection = $.db.getConnection;

    $.db.getUnmanagedConnection = getConnection;

    $.db.getConnection = (function() {
        var parameter = {
                sqlcc: SimpleRest.prototype.managedConnectionSQLCC,
                isolationLevel: SimpleRest.prototype.managedConnectionIsolationLevel,
                locale: SimpleRest.prototype.managedConnectionLocale
            };
        var managed;

        return function() {
            if (!managed || managed.isClosed()) {
                managed = getConnection.call($.db, parameter);

                var sql = "SELECT HOST, PORT, CONNECTION_ID, KEY, VALUE, SECTION FROM M_SESSION_CONTEXT WHERE CONNECTION_ID = CURRENT_CONNECTION";
                var rs = managed.prepareStatement(sql).executeQuery();
                var meta = [];
                var id;
                while(rs.next()) {
                    meta.push({
                        HOST: rs.getString(1),
                        PORT: rs.getString(2),
                        CONNECTION_ID: rs.getInteger(3),
                        KEY: rs.getString(4),
                        VALUE: rs.getString(5),
                        SECTION: rs.getString(6)
                    });

                    id = rs.getInteger(3);
                }

                managed._context = meta;
                managed._id = id;

                // the managed connection should be closed by framework
                managed.readyToClose = false;
                Object.defineProperty(managed, "readyToClose", {
                    enumerable: false
                });

                // rewrite the original close method
                var originalClose = managed.close;
                managed.close = function() {
                    if (!managed.isClosed() && managed.readyToClose) {
                        originalClose.apply(managed, arguments);
                    }
                };

                // the flag for procedure library use
                managed.railxsManaged = true;
                managedConnection = true;
            } else if(arguments.length > 0) {
                $.trace.warning("\nContext:" + (new Error()).stack + "\nArguments: " + JSON.stringify(arguments) + " won't be applied since the previous connection already defined");
            }

            return managed;
        };
    }());

    $.db.getManagedConnection = $.db.getConnection;
}
