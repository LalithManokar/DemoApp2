/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
describe("Repository File Unit Test", function() {

    var File = ($.import("/sap/tm/trp/service/xslib/file.xsjslib")).File;

    it("should get correct file content and metadata", function() {
        var name = "fileTest.xsjslib";
        var path = "/sap/tm/trp/service/tests/";

        var file = new File(name, path);

        expect(file.content).toBeDefined();
        expect(file.metadata).toBeDefined();
    });

    it("should be able to regenerate existed file", function() {
        var name = "fileTest.xsjslib";
        var path = "/sap/tm/trp/service/tests/";

        var prev = new File(name, path);
        expect(prev.content).toBeDefined();
        expect(prev.metadata).toBeDefined();

        prev.regenerate();

        var curr = new File(name, path);
        expect(curr.metadata.LocalTimeStamp > prev.metadata.LocalTimeStamp).toBeTruthy();
    });

    it("should be able to create a new file", function() {
        var name = "new_file_" + (new Date()).getTime() + ".json";
        var path = "/sap/tm/trp/service/tests/";

        var file = new File(name, path);
        var result = file.create(JSON.stringify({a: 42}), "application/json");

        expect(result).toBeDefined();
        expect(result.CheckResult).toBeDefined();
        expect(result.CheckResult.errorCode).toBe(0);

        file.remove();

        expect(file.metadata).toBeUndefined();
        expect(file.content).toBeUndefined();
    });

    it("should be not able to remove a not existed file", function() {
        var name = "new_file_" + (new Date()).getTime() + ".json";
        var path = "/sap/tm/trp/service/tests/";

        var file = new File(name, path);

        try {
            file.remove();
        } catch (e) {
            expect(e.errorCode).toBe(404);
            expect(e.Severity).toBe("Error");
        }

    });

    it("should be work with extensibility concept", function() {
        var connection = $.db.getConnection();
        connection.setAutoCommit(true);

        var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
        var sqlExecutor = new SqlExecutor(connection);

        var schema = $.session.getUsername().toUpperCase();

        // assume customer has a table may later be added new columns
        sqlExecutor.execSingleIgnoreFailing("DROP TABLE " + schema + ".TM_TOR");
        sqlExecutor.execSingle("CREATE COLUMN TABLE " + schema + ".TM_TOR (DB_KEY BIGINT, RC_TOR VARCHAR(32), CN_TOR VARCHAR(32), CN_PARENT_ID VARCHAR(32), PRIMARY KEY(DB_KEY))");
        sqlExecutor.execSingle("INSERT INTO " + schema + ".TM_TOR VALUES (42, '000001', '10000', '10001')");

        // create a view based on the table
        var view = new File("ExtendView.hdbview", "/sap/tm/trp/service/tests/");

        var viewDefinition = {
            schema: $.session.getUsername().toUpperCase(),
            query: 'SELECT DB_KEY FROM ' + schema + '.TM_TOR'
        };

        var generateContent = function() {
            return Object.keys(viewDefinition).map(function(key) {
                return key + ' = "' + viewDefinition[key] + '"';
            }).join(";\n") + ";";
        };
        var content = generateContent();

        view.setContent(content, "data/hdbview");

        expect(view.metadata).toBeDefined();
        expect(view.content).toBe(content);

        // create an odata based on the view
        var odata = new File("odata.xsodata", "/sap/tm/trp/service/tests/");
        content = 'service { "sap.tm.trp.service.tests::ExtendView" as "ExtendView" key ("DB_KEY"); }';
        odata.setContent(content, "data/xsodata");
        expect(odata.metadata).toBeDefined();
        expect(odata.content).toBe(content);

        // some day customer may add new column on this table
        sqlExecutor.execSingle("ALTER TABLE " + schema + ".TM_TOR ADD (TOR_ID VARCHAR(32))");
        sqlExecutor.execSingle("UPDATE " + schema + ".TM_TOR SET TOR_ID = '10000000001'"); // fill the missing value

        // so we need to extend our existed view as well, here extend means <b>register</b>
        viewDefinition.query = 'SELECT DB_KEY, TOR_ID FROM ' + schema + '.TM_TOR';
        content = generateContent();

        view.setContent(content, "data/hdbview");

        expect(view.metadata).toBeDefined();
        expect(view.content).toBe(content);

        // regenerate odata
        odata.regenerate();

        // the privilege should be granted to the default configured technical user
        var userResult = sqlExecutor.execQuery('SELECT * FROM "_SYS_XS"."SQL_CONNECTIONS" WHERE NAME = \'sap.tm.trp.service.config::TechnicalUser\'');
        var accessUser = userResult.getRow(0).USERNAME;
        var sql = 'CALL "_SYS_REPO"."GRANT_PRIVILEGE_ON_ACTIVATED_CONTENT"(\'SELECT\', \'"sap.tm.trp.service.tests::ExtendView"\', \'' + accessUser + '\')';
        sqlExecutor.callProcedure(sql);

        // the original odata service should still work
        var response = jasmine.callHTTPService("/sap/tm/trp/service/tests/odata.xsodata/ExtendView", $.net.http.GET, undefined, {Accept: "application/json"});
        var body = JSON.parse(response.body.asString());

        expect(response.status).toBe($.net.http.OK);
        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBe(1);
        expect(body.d.results[0].DB_KEY).toBe("42");
        expect(body.d.results[0].TOR_ID).toBe("10000000001"); // the extended column should display here

        // remove the testing artifacts
        odata.remove();
        view.remove();
        sqlExecutor.execSingle("DROP TABLE " + schema + ".TM_TOR");
    });

    it("should be work with extensibility concept for different resource categories by using odata projection", function() {
        var connection = $.db.getConnection();
        connection.setAutoCommit(true);

        var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
        var sqlExecutor = new SqlExecutor(connection);

        var schema = $.session.getUsername().toUpperCase();

        // assume customer has a table may later be added new columns
        sqlExecutor.execSingleIgnoreFailing("DROP TABLE " + schema + ".TM_TOR");
        sqlExecutor.execSingle("CREATE COLUMN TABLE " + schema + ".TM_TOR (DB_KEY BIGINT, RC_TOR VARCHAR(32), CN_TOR VARCHAR(32), CN_PARENT_ID VARCHAR(32), PRIMARY KEY(DB_KEY))");
        sqlExecutor.execSingle("INSERT INTO " + schema + ".TM_TOR VALUES (42, '000001', '10000', '10001')");

        var configuration = {
                RC: ["DB_KEY", "RC_TOR"],
                CN: ["DB_KEY", "CN_TOR", "CN_PARENT_ID"],
                OTHER: ["DB_KEY"]
        };

        // create different views based on the configuration
        Object.keys(configuration).forEach(function(key) {
            var view = new File("TOR_" + key + ".hdbview", "/sap/tm/trp/service/tests/");

            var viewDefinition = {
                    schema: $.session.getUsername().toUpperCase(),
                    query: 'SELECT ' + configuration[key].join(",") + ' FROM ' + schema + '.TM_TOR'
            };

            var generateContent = function() {
                return Object.keys(viewDefinition).map(function(key) {
                    return key + ' = "' + viewDefinition[key] + '"';
                }).join(";\n") + ";";
            };
            var content = generateContent();

            view.setContent(content, "data/hdbview");

            expect(view.metadata).toBeDefined();
            expect(view.content).toBe(content);

        });

        // the privilege should be granted to the default configured technical user
        // in this case, user can only access CN type extended view
        var userResult = sqlExecutor.execQuery('SELECT * FROM "_SYS_XS"."SQL_CONNECTIONS" WHERE NAME = \'sap.tm.trp.service.config::TechnicalUser\'');
        var accessUser = userResult.getRow(0).USERNAME;
        var sql = 'CALL "_SYS_REPO"."GRANT_PRIVILEGE_ON_ACTIVATED_CONTENT"(\'SELECT\', \'"sap.tm.trp.service.tests::TOR_CN"\', \'' + accessUser + '\')';
        sqlExecutor.callProcedure(sql);

        // create an odata based on the view
        var odata = new File("odata.xsodata", "/sap/tm/trp/service/tests/");
        var content = 'service { \n' + Object.keys(configuration).map(function(view) {
            return '\t"sap.tm.trp.service.tests::TOR_' + view + '" as "TOR_' + view + '" key ("DB_KEY");';
        } ).join("\n") + '\n}';
        odata.setContent(content, "data/xsodata");
        expect(odata.metadata).toBeDefined();
        expect(odata.content).toBe(content);

        // try to access the granted odata service
        var response = jasmine.callHTTPService("/sap/tm/trp/service/tests/odata.xsodata/TOR_CN", $.net.http.GET, undefined, {Accept: "application/json"});
        var body = JSON.parse(response.body.asString());

        expect(response.status).toBe($.net.http.OK);
        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBe(1);
        expect(body.d.results[0].DB_KEY).toBe("42");
        expect(body.d.results[0].CN_TOR).toBe("10000");
        expect(body.d.results[0].CN_PARENT_ID).toBe("10001");

        // try to access the non-granted odata service
        response = jasmine.callHTTPService("/sap/tm/trp/service/tests/odata.xsodata/TOR_RC", $.net.http.GET, undefined, {Accept: "application/json"});
        body = JSON.parse(response.body.asString());

        expect(response.status).toBe($.net.http.FORBIDDEN);
        expect(body.error).toBeDefined();
        expect(body.error.message).toBeDefined();
        expect(body.error.message.lang).toBeDefined();
        expect(body.error.message.value).toBeDefined();

        // remove the testing artifacts
        odata.remove();
        Object.keys(configuration).forEach(function(key) {
            var view = new File("TOR_" + key + ".hdbview", "/sap/tm/trp/service/tests/");
            view.remove();
        });
        sqlExecutor.execSingle("DROP TABLE " + schema + ".TM_TOR");
    });

    xit("should create a xsjob and configure it in runtime", function() {
        var path = "/sap/tm/trp/service/tests/";
        var password = "Abcd1234";

        var execution = new File("execution.xsjs", path);
        execution.setContent("function run(obj) { $.trace.error(JSON.stringify(obj)); }", "data/xsjs");

        var name = "job_" + (new Date()).getTime() + ".xsjob";
        var job = new File(name, path);

        var parameter = {
            key: "answer",
            value: 42
        };

        var definition = {
            description: "Generated job for schedule plan",
            action: "sap.tm.trp.service.tests:execution.xsjs::run",
            schedules: [{
                description: "Generate schedule for schedule plan 1 every 5 seconds",
                xscron: "* * * * * * */5",
                parameter: parameter
            }]
        };

        job.setContent(JSON.stringify(definition, null, 4), "data/xsjob"); // the 3rd parameter is meant to pretty-print

        // then it should be possible to manipulate the job
        var runtime = $.jobs.Job({uri: path + name});

        var now = new Date();
        runtime.configure({ // the configure is time-consuming
            user: $.session.getUsername(),
            password: password,
            status: true,
            locale: "en",
            start_time: now,
            end_time: new Date(now.getTime() + 1000 * 60) // within 1 minute
        });

        var configuration = runtime.getConfiguration();
        expect(configuration.user).toBe($.session.getUsername());
        expect(configuration.status).toBeTruthy();
        expect(configuration.start_time).toBeDefined();
        expect(configuration.end_time).toBeDefined();
        expect(configuration.locale).toBe("en");

        var schedules = runtime.schedules;
        expect(schedules).toBeDefined();

        var schedule = schedules[Object.keys(schedules)[0]];
        expect(schedule.description).toBe("Generate schedule for schedule plan 1 every 5 seconds");
        expect(schedule.xscron).toBe("* * * * * * */5");
        expect(schedule.active).toBeTruthy();
        expect(schedule.parameter).toBe(JSON.stringify(parameter));

        var logs = schedule.logs.jobLog;
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].status).toBeDefined();
        expect(logs[0].host).toBeDefined();
        expect(logs[0].port).toBeDefined();
        expect(logs[0].action).toBeDefined();
        expect(logs[0].user).toBeDefined();
        expect(logs[0].planned_time).toBeDefined();
        expect(logs[0].started_at).toBeDefined();
        expect(logs[0].finished_at).toBeDefined();

        runtime.deactivate({ // this deactivate is time-consuming
            user: $.session.getUsername(),
            password: password
        });

        execution.remove();
        job.remove();
    });

});
