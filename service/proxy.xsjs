var dest = $.net.http.readDestination("sap.tm.trp.service", "proxy");
var client = new $.net.http.Client();

var fetchToken = function() {
    var req = new $.web.WebRequest($.net.http.GET, "/sap/tm/trp/service/token.xsjs");
    req.headers.set("X-CSRF-Token", "Fetch");
    client.request(req, dest);
    var response = client.getResponse();
    
    for (var h = 0; h < response.headers.length; ++h) {
        if (response.headers[h].name === "x-csrf-token") {
            return response.headers[h].value;
        }
    }
}

var forward = function(url) {
    var request = new $.web.WebRequest($.request.method, "/sap/tm/trp/service" + url);
    
    if ($.request.body) {
        request.setBody($.request.body);
    } /*else if ($.request.entities) { 
    }*/
    
    // set headers
    for (var i = 0; i < $.request.headers.length; ++i) {
        var header = $.request.headers[i];
        request.headers.set(header.name, header.value);
    }
    
    var token = fetchToken();
    if (token) { // set token if needed
        request.headers.set("X-CSRF-Token", token);
    }
    
    // set cookies
    for (var i = 0; i < $.request.cookies.length; ++i) {
        var cookie = $.request.cookies[i];
        request.cookies.set(cookie.name, cookie.value);
    }
    
    // set parameters
    for (var i = 0; i < $.request.parameters.length; ++i) {
        var parameter = $.request.parameters[i];
        request.parameters.set(parameter.name, parameter.value);
    }
    
    client.request(request, dest);
        
    var response = client.getResponse();
    
    if (response.body) {
        $.response.setBody(response.body.asString());
    }
    
    // set headers
/*    for (var i = 0; i < response.headers.length; ++i) {
        var header = response.headers[i];
        $.response.headers.set(header.name, header.value);
    }*/
    
    // set cookies
    for (var i = 0; i < response.cookies.length; ++i) {
        var cookie = response.cookies[i];
        $.response.cookies.set(cookie.name, cookie.value);
    }
    
    $.response.contentType = response.contentType;
    $.response.status = response.status;
};

forward($.request.parameters.get("original"));
