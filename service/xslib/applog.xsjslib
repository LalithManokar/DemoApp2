var ApplicationLog = $.import("sap.bc.applog.api.lib", "ApplicationLog");
var utils = $.import("sap.tm.trp.service.xslib", "utils");

const TRP_NAMESPACE = "sap.tm.trp.applog";
const TRP_ORIGINATOR = "TRP";
const TRP_MESSAGES = "sap.tm.trp.applog.messages";

function AppLog(key, autoCommit) {

    var contextKey =
            (function(){
                if (key) {
                    return key;
                }

                if (!$.request || !$.request.path) {
                    return "jobManagement"; // invoked by XSEngine itself
                }
                /*
                 * initialize a new Error object to get to know the stack trace
                 * @/system-local/private/syhan/error.xsjslib:3,
                 * Err@/system-local/private/syhan/error.xsjslib:2,
                 * @/system-local/private/syhan/intermedium.xsjslib:3,
                 * @/system-local/private/syhan/error.xsjs:1
                 *
                 * therefore the 3rd line should be the right file name to determine context
                 */
                var stack = (new Error()).stack.trim().split("\n").map(function(curr) {
                    var regex = /(\w+)?@([\w\/\.]+):\d+/;

                    return regex.test(curr) ? regex.exec(curr)[2] : undefined;
                });

                if (stack.length < 3) { // at lease should have 3 levels
                    throw new Error("Invalid context", stack);
                }

                var urlPattern = /\/sap\/tm\/trp\/service\/([A-Za-z0-9_\/]+).xsjs(lib)?/;

                return urlPattern.test(stack[2]) ? urlPattern.exec(stack[2])[1] : "DEFAULT";
            }());

    var initialized = false;
    var that = this;

    this.logger = (function() {
        var applog;

        return function() {
            if (!applog) {
                var conn;
                try {
                    conn = $.hdb.getConnection();

                    var rs = conn.executeQuery('SELECT * FROM "sap.tm.trp.applog.db::AppLogContext" WHERE "Context" = ?', contextKey);
                    if (rs.length < 1) {
                        throw new Error("Invalid context", contextKey);
                    }

                    that.context = rs[0];

                    applog = new ApplicationLog.ApplicationLog(TRP_NAMESPACE, TRP_ORIGINATOR,
                        that.context.Originator, that.context.ExternalID, that.context.Description, autoCommit);

                    initialized = true;
                } catch (e) {
                    $.trace.error(JSON.stringify(errorToJSON(e)));
                } finally {
                    if (conn) {
                        conn.close();
                    }
                }
            }

            return applog;
        };
    }());

    this.Parameter = {
        Integer: ApplicationLog.MessageParameter.integer,
        String: function(index, value) {
            if (value === null || value === undefined) {
                value = "<" + String(value) + ">";
            } else if (utils.isEmpty(value)){
                value = "<empty>";
            } else if (value === "[]") {
                value = "<empty list>";
            } else if (value.length > 1000) {
                value = "!Truncated!" + value.substring(0, 989);
            }

            return ApplicationLog.MessageParameter.string(index, value);
        },
        Duration: ApplicationLog.MessageParameter.duration,
        Amount: ApplicationLog.MessageParameter.amount,
        DateTime: ApplicationLog.MessageParameter.dateTime,
        Exception: function (index, value) {
            return that.Parameter.String(index, value.cause || value.message || String(value));
        }
    };

    function normalize(args) {
        return args.map(function(arg, index) {
            if (arg.hasOwnProperty("typeCode")) {
                return arg;
            } else if (typeof arg === "number") {
                return that.Parameter.Integer(index, arg);
            } else if (typeof arg === "string") {
                return that.Parameter.String(index, arg);
            } else if (arg instanceof Error) {
                return that.Parameter.Exception(index, arg);
            } else if (typeof arg === "object") {
                return that.Parameter.String(index, JSON.stringify(arg));
            } else {
                return arg;
            }
        });
    }

    function errorToJSON(obj) {
        if (!(obj instanceof Error)) {
            return obj;
        }

        var error = {};

        ["message", "name", "code", "columnNumber", "fileName",
             "lineNumber", "stack"].filter(function(attr) {
            return obj.hasOwnProperty(attr);
        }).forEach(function(attr) {
            error[attr] = errorToJSON(obj[attr]);
        });

        return error;
    }

    this.info = function() {
        try {
            var logger = this.logger();
            var args = Array.prototype.slice.call(arguments, 0);
            var item = ApplicationLog.ApplicationLogItem.information(TRP_MESSAGES, this.context.Bundle, args[0], normalize(args.slice(1)));
            logger.createItem(item);
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };

    this.warn = function() {
        try {
            var logger = this.logger();
            var args = Array.prototype.slice.call(arguments, 0);
            var item = ApplicationLog.ApplicationLogItem.warning(TRP_MESSAGES, this.context.Bundle, args[0], normalize(args.slice(1)));
            logger.createItem(item);
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };

    this.success = function() {
        try {
            var logger = this.logger();
            var args = Array.prototype.slice.call(arguments, 0);
            var item = ApplicationLog.ApplicationLogItem.success(TRP_MESSAGES, this.context.Bundle, args[0], normalize(args.slice(1)));
            logger.createItem(item);
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };

    this.error = function() {
        try {
            var logger = this.logger();
            var args = Array.prototype.slice.call(arguments, 0);
            var item = ApplicationLog.ApplicationLogItem.error(TRP_MESSAGES, this.context.Bundle, args[0], normalize(args.slice(1)));
            logger.createItem(item);
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };

    this.close = function() {
        try {
            if(initialized && !this.logger().isClosed()) {
                this.logger().close();
            }
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };

    this.commit = function() {
        try {
            this.logger().commit();
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };


    this.getHandle = function() {
        try {
            return this.logger().getHandle();
        } catch(e) {
            $.trace.warning(JSON.stringify(errorToJSON(e)));
        }
    };



}
