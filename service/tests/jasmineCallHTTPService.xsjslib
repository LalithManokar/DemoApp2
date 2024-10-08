// use/import this patch to when prevent_xsrf set to true and need to fetch the token firstly
// by $.import("sap.tm.trp.service.tests", "jasmineCallHTTPService");
(function() {
    var client = new $.net.http.Client();
    var rootPath = "sap.hana.testtools";

    jasmine.callHTTPService = function callHTTPService(path, httpMethod, body, headers, cookies) {
        var dest = $.net.http.readDestination(rootPath + ".unit.jasminexs.lib", "localhost");
        var request = new $.net.http.Request(httpMethod || $.net.http.GET, path);
        if (body) {
            request.setBody(body);
        }
        if (headers && typeof headers === "object") {
            Object.getOwnPropertyNames(headers).forEach(function(name) {
                request.headers.set(name, headers[name]);
            });
        }
        if (cookies && typeof cookies === "object") {
            Object.getOwnPropertyNames(cookies).forEach(function(name) {
                request.cookies.set(name, cookies[name]);
            });
        }

        client.request(request, dest);
        return client.getResponse();
    };

}());