function File(name, path) {
    // pad path end with slash
    path += path.endsWith("/") ? "" : "/";

    var orion = "/sap/hana/xs/dt/base/file";

    this.dest = $.net.http.readDestination("sap.tm.trp.service.xslib", "file");
    this.client = new $.net.http.Client();
    this.url = orion + path.replace(/\./g, "\\") + name;

    var retrieve = function() {
        var request = new $.net.http.Request($.net.http.GET, this.url);
        request.parameters.set("parts", "meta,body");

        var response = this.client.request(request, this.dest).getResponse();

        if (response.status === $.net.http.OK) {
            this.existence = true;
            this.metadata = JSON.parse(response.entities[0].body.asString());
            this.content = response.entities[1].body.asString();
        } else if (response.status === $.net.http.NOT_FOUND) { // then check the package/path is existed or not
            request = new $.net.http.Request($.net.http.GET, orion + path);
            response = this.client.request(request, this.dest).getResponse();

            if (response.status === $.net.http.OK) {
                this.packageExisted = true;
            }
        } else if (response.status === $.net.http.SEE_OTHER) {
            throw new Error("Please check the confidential used in file.xshttpdest");
        }
    }.bind(this);

    var fetchToken = function() {
        var request = new $.net.http.Request($.net.http.GET, orion);
        request.headers.set("X-CSRF-Token", "Fetch");

        var token, h;
        var response = this.client.request(request, this.dest).getResponse();
        for (h = 0; h < response.headers.length; ++h) {
            if (response.headers[h].name === "x-csrf-token") {
                token = response.headers[h].value;
                break;
            }
        }

        return token;
    }.bind(this);

    var createPackage = function(parent, dir) {
        var request = new $.net.http.Request($.net.http.POST, orion + parent);
        var token = fetchToken();
        request.headers.set("X-CSRF-Token", token);
        request.setBody(JSON.stringify({Name: dir, Directory: true}));

        var response = this.client.request(request, this.dest).getResponse();

        if (response.status !== $.net.http.CREATED && response.status !== 555) {
            throw response.body.asString();
        }
    }.bind(this);

    var createParentPackage = function() {
        var hier = path.split("/").slice(0, -1);
        var dir = hier.pop();
        var parent = hier.join("/");

        createPackage(parent + "/", dir);
    };


    this.activate = function(regenerate) {
        if (!this.existence) {
            throw new Error(this.url + " not existed");
        }

        var sapBackPack = { Activate: true, Regenerate: regenerate }; // Regenerate has a higher priority then Activate
        var request = new $.net.http.Request($.net.http.PUT, this.url);
        var token = fetchToken();

        request.headers.set("Orion-Verison", "1.0");
        request.headers.set("X-CSRF-Token", token);
        request.headers.set("Content-Type", "application/json");
        request.headers.set("If-Match", this.metadata.ETag);
        request.headers.set("SapBackPack", JSON.stringify(sapBackPack));

        request.parameters.set("parts", "meta");

        var response = this.client.request(request, this.dest).getResponse();
        var result = JSON.parse(response.body.asString());

        if (result.error_code !== 0) {
            throw JSON.stringify(result);
        }

        return result;
    };

    this.regenerate = function() {
        return this.activate(true);
    };

    this.create = function(content, contentType, etag) {
        if (!this.packageExisted) {
            createParentPackage();
        }

        var request = new $.net.http.Request($.net.http.PUT, this.url);
        var token = fetchToken();

        request.headers.set("Orion-Verison", "1.0");
        request.headers.set("X-CSRF-Token", token);

        if (contentType) {
            request.headers.set("Content-Type", contentType);
        }

        if (etag) {
            request.headers.set("If-Match", etag);
        }

        var body = typeof content.toString === "function" ? content.toString() : JSON.stringify(content);
        request.setBody(body);

        var response = this.client.request(request, this.dest).getResponse();
        var result = JSON.parse(response.body.asString());

        if (result.CheckResult.errorCode !== 0) {
            throw JSON.stringify(result);
        }

        retrieve();

        return result;
    };

    this.setContent = function(content, contentType) {
        return this.create(content, contentType, this.metadata ? this.metadata.ETag : undefined);
    };

    this.remove = function(revert, force) {
        var sapBackPack = { Revert: revert, ForceDelete: force };

        var request = new $.net.http.Request($.net.http.DEL, this.url);
        var token = fetchToken();

        request.headers.set("Orion-Verison", "1.0");
        request.headers.set("X-CSRF-Token", token);
        request.headers.set("SapBackPack", JSON.stringify(sapBackPack));

        if (this.metadata) {
            request.headers.set("If-Match", this.metadata.ETag);
        }

        var response = this.client.request(request, this.dest).getResponse();

        if (response.status !== $.net.http.NO_CONTENT) {
            throw JSON.parse(response.body.asString());
        }

        this.metadata = undefined;
        this.content = undefined;
    };

    this.revert = function() {
        this.remove(true);
    };

    this.grant = function(type, sqlcc) {
        sqlcc = sqlcc || "sap.tm.trp.service.config::TechnicalUser";
        var conn = $.hdb.getConnection();
        try {
            var result = conn.executeQuery('SELECT USERNAME FROM "_SYS_XS"."SQL_CONNECTIONS" WHERE NAME = ?', sqlcc);
            var accessUser = result[0].USERNAME;

            var grantPrivilege = conn.loadProcedure("_SYS_REPO", "GRANT_PRIVILEGE_ON_ACTIVATED_CONTENT");
            grantPrivilege(type, '"'.concat(path.slice(1, -1).replace(/\//g, ".")).concat("::").concat(name.split(".")[0]).concat('"'), accessUser);
        } finally {
            conn.close();
        }
    };

    retrieve();
}