/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

//Tile Unit Test
describe("Tile Unit Test", function() {
    var sqlExecutor;
    var connection;

    beforeEach(function(){
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
    });

    afterEach(function(){
        connection.close();
    });

    it("should create tile", function() {
        // create the time filter first
        var requestBody =
        '{\
            "TYPE": "KPI",\
            "SETTINGS": {\
                "PLAN_ID_LIST": ["1112", "158"]\
            }\
        }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();

        var tileId = body.data.ID;

        // check the database table
        var tileTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile" WHERE ID = ' + tileId);
        expect(tileTable.getRowCount()).toBe(1);

        var row = tileTable.getRow(0);
        expect(row.SEQ).toBe(1);

        // check the item table
        var tileItemTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile_item" WHERE TILE_ID = ' + tileId);
        expect(tileItemTable.getRowCount()).toBe(1);

        var row = tileItemTable.getRow(0);
        expect(row.KEY).toBe("PLAN_ID_LIST");
        expect(row.VALUE).toBe('["1112","158"]');

        // finally call the service to delete all records
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json/" + tileId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should update tile", function() {
        // create the time filter first
        var requestBody =
        '{\
            "TYPE": "KPI",\
            "SETTINGS": {\
                "PLAN_ID_LIST": ["1112", "158"]\
            }\
        }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);  // make sure it is created

        var body = JSON.parse(response.body.asString());
        var tileId = body.data.ID;

        // update the created time filter
        requestBody =
        '{\
            "TYPE": "SUPPLY_DEMAND",\
            "SETTINGS": {\
                "PLAN_ID": "170",\
                "LOCATION_FILTER_ID": "1"\
            }\
        }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId, $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database being updated
        var tileTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile" WHERE ID = ' + tileId);
        expect(tileTable.getRowCount()).toBe(1);

        var row = tileTable.getRow(0);
        expect(row.SEQ).toBe(1);

        // check the item table
        var tileItemTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile_item" WHERE TILE_ID = ' + tileId);
        expect(tileItemTable.getRowCount()).toBe(2);

        var row = tileItemTable.getRow(0);
        expect(row.KEY).toBe("PLAN_ID");
        expect(row.VALUE).toBe('"170"');

        row = tileItemTable.getRow(1);
        expect(row.KEY).toBe("LOCATION_FILTER_ID");
        expect(row.VALUE).toBe('"1"');

        // finally call the service to delete all records
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should delete tile", function() {
        // create the time filter first
        var requestBody =
        '{\
            "TYPE": "KPI",\
            "SETTINGS": {\
                "PLAN_ID_LIST": ["1112", "158"]\
            }\
        }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);  // make sure it is created

        var body = JSON.parse(response.body.asString());
        var tileId = body.data.ID;

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database table
        var tileTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile" WHERE ID = ' + tileId);
        expect(tileTable.getRowCount()).toBe(0);

        // check the item table
        var tileItemTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.dashboard::t_tile_item" WHERE TILE_ID = ' + tileId);
        expect(tileItemTable.getRowCount()).toBe(0);

    });

    it("should get tile list", function() {
        // create the time filter first
        var requestBody =
        '{\
            "TYPE": "KPI",\
            "SETTINGS": {\
                "PLAN_ID_LIST": ["1112", "158"]\
            }\
        }';
        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);  // make sure it is created

        var body = JSON.parse(response.body.asString());
        var tileId1 = body.data.ID;

        // create another
        requestBody =
        '{\
            "TYPE": "SUPPLY_DEMAND",\
            "SETTINGS": {\
                "PLAN_ID": "170",\
                "LOCATION_FILTER_ID": "1"\
            }\
        }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);

        body = JSON.parse(response.body.asString());
        var tileId2 = body.data.ID;

        // get the list
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK);  // make sure it works

        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        expect(body.data.results).toBeDefined();

        var tiles = body.data.results;
        expect(Array.isArray(tiles)).toBeTruthy();

        var created1 = tiles.filter(function(item) { return tileId1 === item.ID; });
        expect(created1.length).toBe(1);
        expect(created1[0].SEQUENCE).toBe(2);
        expect(created1[0].TYPE).toBe("KPI");
        expect(created1[0].SETTINGS).toBeDefined();
        expect(created1[0].SETTINGS.PLAN_ID_LIST).toBeDefined();
        expect(created1[0].SETTINGS.PLAN_ID_LIST).toEqual(["1112", "158"]);

        var created2 = tiles.filter(function(item) { return tileId2 === item.ID; });
        expect(created2.length).toBe(1);
        expect(created2[0].SEQUENCE).toBe(1);
        expect(created2[0].TYPE).toBe("SUPPLY_DEMAND");
        expect(created2[0].SETTINGS).toBeDefined();
        expect(created2[0].SETTINGS.PLAN_ID).toBeDefined();
        expect(created2[0].SETTINGS.PLAN_ID).toBe("170");
        expect(created2[0].SETTINGS.LOCATION_FILTER_ID).toBeDefined();
        expect(created2[0].SETTINGS.LOCATION_FILTER_ID).toBe("1");

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId1, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId2, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

    });

    it("should update sequence", function() {
        // create the time filter first
        var requestBody =
        '{\
            "TYPE": "KPI",\
            "SETTINGS": {\
                "PLAN_ID_LIST": ["1112", "158"]\
            }\
        }';
        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);  // make sure it is created

        var body = JSON.parse(response.body.asString());
        var tileId1 = body.data.ID;

        // create another
        requestBody =
        '{\
            "TYPE": "SUPPLY_DEMAND",\
            "SETTINGS": {\
                "PLAN_ID": "170",\
                "LOCATION_FILTER_ID": "1"\
            }\
        }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);

        body = JSON.parse(response.body.asString());
        var tileId2 = body.data.ID;

        // update sequence
        requestBody =
        '{\
            "ITEMS": [\
                  {\
                      "ID": "' + tileId1 + '", \
                      "SEQUENCE": 1\
                  },\
                  {\
                      "ID": "' + tileId2 + '",\
                      "SEQUENCE": 2\
                  }\
              ]\
        }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json/updateSequence", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // get the list
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK);  // make sure it works

        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        expect(body.data.results).toBeDefined();

        var tiles = body.data.results;
        expect(Array.isArray(tiles)).toBeTruthy();

        var created1 = tiles.filter(function(item) { return tileId1 === item.ID; });
        expect(created1.length).toBe(1);
        expect(created1[0].SEQUENCE).toBe(1);
        expect(created1[0].TYPE).toBe("KPI");

        var created2 = tiles.filter(function(item) { return tileId2 === item.ID; });
        expect(created2.length).toBe(1);
        expect(created2[0].SEQUENCE).toBe(2);
        expect(created2[0].TYPE).toBe("SUPPLY_DEMAND");

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId1, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/dashboard/tiles.json" + tileId2, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

});