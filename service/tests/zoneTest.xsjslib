/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import("sap.hana.testtools.unit.util", "sqlExecutor").SqlExecutor;


describe("zone unit test", function () {
  var sqlExecutor;
  var connection;
  var url = "/sap/tm/trp/service/admin/zones.json";

  beforeEach(function() {
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
  });

  afterEach(function () {
    connection.close();
  });

  it("should create new zone", function(){
    var name = "ZONE_" + (new Date()).getTime();
    // create a new zone
    var requestBody = '{\
      "ADMIN_DIVISIONS": [],\
      "NAME": "' + name + '",\
      "DESC": "test a new zone",\
      "LOCATIONS":[{"ID": "RAwBT8cq7jIXqNXFfe7UH0", "NAME": "CNFAN"}, {"ID": "RAwBT8cq7jIXpPfsLv{MvG", "NAME": "CNFANDFAN"}],\
      "POSTAL_CODES": []\
    }';


    var headers = {
      "content-Type": "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var body = JSON.parse(response.body.asString());
    expect(body.data).toBeDefined();
    expect(body.data.ID).toBeDefined();
    expect(body.success).toBeTruthy();

    var zoneId = body.data.ID;
    // delete the created zone
    response = jasmine.callHTTPService(url + zoneId, $.net.http.DEL);
    // test if deleted success
    expect(response.status).toBe($.net.http.NO_CONTENT);

  });

  it("test create a new zone with primary location nested", function() {
    var name = "ZONE_" + (new Date()).getTime();
    // create a new zone
    var requestBodyJSON = {
      "ADMIN_DIVISIONS": [],
      "LOCATIONS": [{"ID": "RAwBT8cq7jIXpPfp8CssvG", "NAME": "AEDXBDACE"}, {"ID": "RAwBT8cq7jIXqNXFfcuUH0", "NAME": "AEJEA"}],
      "NAME": name,
      "DESC": "test primary location nested",
      "POSTAL_CODES": [],
      "PRIME_LOC_ID": "RAwBT8cq7jIXpPfp8CssvG",
      "PRIME_LOC_NAME": "AEJEA"
    };

    var headers = {
      "content-Type": "application/json"
    };

    var requestBody = JSON.stringify(requestBodyJSON);
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var zoneId = (JSON.parse(response.body.asString())).data.ID;
    // check primary_location table
    var zonePrimaryLocationTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.location::t_zone_primary_location" WHERE ZONE_NAME = \''+ name + '\'');
    expect(zonePrimaryLocationTable.getRowCount()).toBe(1);

    // delete created zone
    response = jasmine.callHTTPService(url + zoneId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);

  });

  it("should update the zone", function() {
    // create a zone
    var name = "ZONE_" + (new Date()).getTime() + 1;

    var requestBody = '{\
      "ADMIN_DIVISIONS": [],\
      "NAME": "' + name + '",\
      "DESC": "test a new zone",\
      "LOCATIONS":[{"ID": "RAwBT8cq7jIXqNXFfe7UH0", "NAME": "CNFAN"}, {"ID": "RAwBT8cq7jIXpPfsLv{MvG", "NAME": "CNFANDFAN"}],\
      "POSTAL_CODES": []\
    }';

    var headers = {
      "content-Type": "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var zoneId = (JSON.parse(response.body.asString())).data.ID;

    // update the created zone
    response = jasmine.callHTTPService(url + "/" + zoneId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

  it("should show on map", function() {
    // create a zone
    var name = "ZONE_" + (new Date()).getTime()+2;

    var requestBody = '{\
      "ADMIN_DIVISIONS": [],\
      "NAME": "' + name + '",\
      "DESC": "test a new zone",\
      "LOCATIONS":[{"ID": "RAwBT8cq7jIXqNXFfe7UH0", "NAME": "CNFAN"}, {"ID": "RAwBT8cq7jIXpPfsLv{MvG", "NAME": "CNFANDFAN"}],\
      "POSTAL_CODES": []\
    }';

    var headers = {
      "content-Type": "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var zoneId = (JSON.parse(response.body.asString())).data.ID;

    // show location on map
    var requestUrl = url + zoneId +"/showOnMap?ID=" + zoneId + "&SELECTED_TYPE=1&min_coordinate=-180;90;0&max_coordinate=180;-90;0";

    headers = {
      "content-Type": "application/json"
    };

    response = jasmine.callHTTPService(requestUrl, $.net.http.GET,"", headers);
    expect(response.status).toBe($.net.http.OK);
    expect(response.body).toBeDefined();

    var body = JSON.parse(response.body.asString());
    expect(body.success).toBeTruthy();
    expect(body.data.FIELD).toBe("POLYGON");

    //delete the created zone
    response = jasmine.callHTTPService(url + zoneId, $.net.http.DEL);
    // test if deleted success
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

  it("should show convex hull on map", function() {
    // create a zone
    var name = "ZONE_" + (new Date()).getTime();

    var requestBody = '{\
      "ADMIN_DIVISIONS": [],\
      "NAME": "' + name + '",\
      "DESC": "test a new zone",\
      "LOCATIONS":[{"ID": "RAwBT8cq7jIXqNXFfe7UH0", "NAME": "CNFAN"}, {"ID": "RAwBT8cq7jIXpPfsLv{MvG", "NAME": "CNFANDFAN"}],\
      "POSTAL_CODES": []\
    }';

    var headers = {
      "content-Type": "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var body = JSON.parse(response.body.asString());
    var zoneId = body.data.ID;
    // get location ids
    var locations = body.data.LOCATIONS;
    expect(locations.length).toBe(2);

    // show convex hull on map
    var requestBodyJSON = {
      "ID": zoneId,
      "SELECTED_TYPE": 1,
      "SELECTED_ITEMS": {
        "IDS": [
          {
            "ID": locations[0].ID
          },{
            "ID": locations[1].ID
          }
        ]
      },
      "MAX_COORDINATE": "180;-85.05113642327339;0",
      "MIN_COORDINATE": "-180;85.05113642327339;0"
    };

    requestBody = JSON.stringify(requestBodyJSON);
    response = jasmine.callHTTPService(url + zoneId + "/showConvexHullOnMap", $.net.http.POST, requestBody, headers);

    expect(response.status).toBe($.net.http.OK);
    body = JSON.parse(response.body.asString());

    expect(body.success).toBe(true);
    expect(body.data.FIELD).toBe('POLYGON');

    // delete the created zone
    response = jasmine.callHTTPService(url + zoneId, $.net.http.DEL);
    // test if deleted success
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });
});
