var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Time Filters Unit Test", function() {
    var sqlExecutor;
    var connection;

    var csrfToken;

    function fetchToken() {
        var headers = {
            "X-CSRF-Token": "Fetch"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.GET, undefined, headers);

        for (var h = 0; h < response.headers.length; ++h) {
            if (response.headers[h].name === 'x-csrf-token') {
                return response.headers[h].value;
            }
        }
    }

    beforeEach(function() {
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
        csrfToken = fetchToken();
    });

    afterEach(function() {
        connection.close();
    });

    it("should create time filter", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        // check the database table
        var timeFiltersTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(timeFiltersTable.getRowCount()).toBe(1);

        // finally call the service to delete all records
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should update time filter", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        // update the created time filter
        requestBody =
            '{\
            "NAME": "TFCREAT",\
            "DESC": "for supply demand in Shanghai Update",\
            "VISIBILITY": "P",\
            "DIRECTION_FLAG": 2,\
            "TIME_ZONE_ID": "CET",\
            "ENABLE_OFFSET_MOMENT": 0,\
            "OFFSET_START_TIME_HOUR": "0",\
            "OFFSET_START_TIME_MINUTE": "0",\
            "OFFSET_START_TIME_WEEK_DAY": "0",\
            "OFFSET_START_TIME_MONTH_DAY": 1,\
            "ITEMS": [\
                {\
                    "VALUE": "1",\
                    "UNIT": "HOUR",\
                    "REPEAT_TIME": "1"\
                }\
            ]\
        }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database being updated
        var groupHeaderTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(groupHeaderTable.getRowCount()).toBe(1);
        var row = groupHeaderTable.getRow(0);
        expect(row.DESC).toBe("for supply demand in Shanghai Update");
        expect(row.DIRECTION_FLAG).toBe(2);
        expect(row.VISIBILITY).toBe("P");

        // finally call the service to delete all records
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should destroy time filter", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database table
        var timeFiltersTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(timeFiltersTable.getRowCount()).toBe(0);

    });

    it("should get list of time filters from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/TimeFilters", $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);

        var body = JSON.parse(response.body.asString());

        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
        //expect(body.d.results[0].CODE).toBeDefined();
    });

    it("should get a single time filter from OData", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };

        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/TimeFilters(" + timeFilterId + ")", $.net.http.GET, null,
            headers);
        expect(response.status).toBe($.net.http.OK);

        body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        expect(body.d.ID).toBe(timeFilterId);

        // delete time filter
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database table
        var timeFiltersTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(timeFiltersTable.getRowCount()).toBe(0);
    });

    it("Should Get items of a Time Filter From OData", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/TimeFilters(" + timeFilterId + ")/Items", $.net.http.GET,
            null, headers);
        expect(response.status).toBe($.net.http.OK);

        body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        expect(body.d.results[0].TIME_FILTER_ID).toBe(timeFilterId);
        //expect(body.d.results[0].ID).toBe(timeFilterId);

        // delete time filter
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database table
        var timeFiltersTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(timeFiltersTable.getRowCount()).toBe(0);
    });

    it("should Get preview time intervals of a Time Filter from OData", function() {
        // create the time filter first
        var requestBody =
            '{\
                "NAME": "TFCREAT",\
                "DESC": "for supply demand in Shanghai",\
                "VISIBILITY": "G",\
                "DIRECTION_FLAG": 1,\
                "TIME_ZONE_ID": "CET",\
                "ENABLE_OFFSET_MOMENT": 0,\
                "OFFSET_START_TIME_HOUR": "0",\
                "OFFSET_START_TIME_MINUTE": "0",\
                "OFFSET_START_TIME_WEEK_DAY": "0",\
                "OFFSET_START_TIME_MONTH_DAY": 1,\
                "ITEMS": [\
                    {\
                        "VALUE": "1",\
                        "UNIT": "HOUR",\
                        "REPEAT_TIME": "1"\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json",
            "debug": "true"
            //"x-csrf-token" : csrfToken
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var timeFilterId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/TimeFilters(" + timeFilterId + ")/Intervals", $.net.http
            .GET, null, headers);
        expect(response.status).toBe($.net.http.OK);

        body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        //expect(body.d.results[0].ID).toBe(timeFilterId);
        expect(body.d.results[0].ID).toBe(timeFilterId);

        // delete time filter
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/timeFilters.json/" + timeFilterId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database table
        var timeFiltersTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_time_filter" WHERE ID = ' +
            timeFilterId);
        expect(timeFiltersTable.getRowCount()).toBe(0);
    });
});