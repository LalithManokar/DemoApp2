/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import('sap.hana.testtools.unit.util','sqlExecutor').SqlExecutor;

describe("Hierarchy Unit Test", function () {
  var sqlExecutor;
  var connection;
  var url = "/sap/tm/trp/service/admin/hierarchies.json";

  beforeEach(function(){
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
  });

  afterEach(function () {
    connection.close();
  });

  it("should sync Hierarchy", function() {
    var response = jasmine.callHTTPService(url+"/sync", $.net.http.POST);
    expect(response.status).toBe($.net.http.OK);
  });

  it("should update Hierarchy", function () {
    // synchronize in order to avoid data inconsistency
    var response = jasmine.callHTTPService(url+"/sync", $.net.http.POST);
    expect(response.status).toBe($.net.http.OK);

    var hierarchyId = "RAwBT8cq7kMoiT5M2fX9Im";

    // add a Zone at first
    // rodo
    // cannot get a newly added zone's ID, assume there is a zone named 'Z_TONY_3'
    var tonyZone = sqlExecutor.execQuery('SELECT * from "sap.tm.trp.db.semantic.location::v_zone" where name=\'Z_TONY_3\'');
    if (tonyZone.getRowCount() === 0) {
      pending("no exist zone to be added into Hierarchy");
    }
    var zoneId = tonyZone.getRow(0).ID;
    var requestBodyObject = {
    "ID":"RAwBT8cq7kMoiT5M2fX9Im",
    "NAME":"TRP_ZONE_HIERARCHY",
    "DESC":"CMA Zone Hierarchy",
    "ZONES":[{"RELMETHOD":"N","ZONE_ID": zoneId,"NAME":"Z_TONY_3","PARENT_ZONE_ID":hierarchyId}]};

    var headers = {
      "Content-Type": "application/json"
    };

    var requestBody = JSON.stringify(requestBodyObject);

    response = jasmine.callHTTPService(url + hierarchyId, $.net.http.PUT, requestBody, headers);
    expect(response.status).toBe($.net.http.NO_CONTENT);

    // recover the changes
    requestBodyObject = {
      "DESC": "CMA Zone Hierarchy",
      "ID": hierarchyId,
      "NAME": "TRP_ZONE_HIERARCHY",
      "ZONES": [{"RELMETHOD": "D", "ZONE_ID": zoneId, "NAME": "Z_TONY_3", "PARENT_ZONE_ID": hierarchyId}]
    };
    requestBody = JSON.stringify(requestBodyObject);

    response = jasmine.callHTTPService(url + hierarchyId, $.net.http.PUT, requestBody, headers);
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

});
