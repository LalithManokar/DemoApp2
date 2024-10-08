var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

var DEFAULT_DEST_PACKAGE = "sap.tm.trp.service.xslib";
var DEFAULT_DEST_FILE = "remote";

function RemoteClient(conf) {
    conf = conf || {};

    this.setDefaultDestination = function() {
        this.dest = $.net.http.readDestination(DEFAULT_DEST_PACKAGE, DEFAULT_DEST_FILE);
    };

    // initialize
    this.init = function(){
        if(conf.hasOwnProperty("dest")) {
            try {
                var parts = conf.dest.split("/");
                this.dest = $.net.http.readDestination(parts[0], parts[1]);
            } catch (e) {
                // use the default
                this.setDefaultDestination();
            }
        } else {
            this.setDefaultDestination();
        }

        this.client = new $.net.http.Client();
    };

    this.fetchToken = function(url) {
        var req = new $.net.http.Request($.net.http.GET, url);

        req.headers.set("X-CSRF-Token", "Fetch");
        this.client.request(req, this.dest);

        var response = this.client.getResponse();
        var h;
        for (h = 0; h < response.headers.length; ++h) {
            if (response.headers[h].name === "x-csrf-token") {
                return response.headers[h].value;
            }
        }

        throw new InternalError(messages.MSG_ERROR_GET_TOKEN);
    };

    this.request = function(settings) {
        this.init();

        if (!settings.url) {
            throw new InternalError("MSG_INVALID_REMOTE_URL", settings);
        }

        var method = settings.method || $.net.http.GET;
        var req = new $.net.http.Request(settings.method, settings.url);
        req.contentType = settings.contentType || "application/json";

        if((!settings.csrfDisabled) && [$.net.http.POST, $.net.http.PUT, $.net.http.DEL].indexOf(method) !== -1) { // fetch token first
            req.headers.set("X-CSRF-Token", this.fetchToken(settings.url, this.dest));
        }

        if (settings.data) {
            req.setBody(typeof settings.data === "string" ? // only if the payload is string
                    settings.data: JSON.stringify(settings.data));
        }

        this.client.request(req, this.dest);
        var response = this.client.getResponse();

        var statusFlag = Math.floor(response.status / 100);

        switch(statusFlag) {
            case 2:
                (function() {
                    var res = response.body ? response.body.asString() : null;

                    if (settings.success && typeof settings.success === "function") {
                        var result;
                        try {
                            result = JSON.parse(res);
                        } catch (e) {
                            throw new InternalError("MSG_PARSE_REMOTE_RESPONSE_FAILED", e);
                        }

                        settings.success.call(null, result);
                    }

                }());
                break;
            case 4:
            case 5:
                (function() {
                    if (settings.error && typeof settings.error === "function") {
                        settings.error.call(null, response);
                    }
                }());
                break;
            default:
                break;
        }
    };
}
