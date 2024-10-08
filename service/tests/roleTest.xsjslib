var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Role Unit Test", function () {
  var sqlExecutor;
  var connection;
  var url = "/sap/tm/trp/service/admin/roles.json";

  beforeEach(function(){
    connection = $.db.getConnection();
    sqlExecutor = new SqlExecutor(connection);
  });


  afterEach(function(){
    connection.close();
  });

  it("should create depot manager role", function() {
    // create a depot manager
    var requestBody =
    '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID":1,\
      "LOCATIONS":[{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';

    var headers = {
      "Content-Type": "application/json"
    };

    var response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json", $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var body = JSON.parse(response.body.asString());
    expect(body.data).toBeDefined();
    expect(body.data.ID).toBeDefined();
    expect(body.success).toBeTruthy();

    var roleId = body.data.ID;
    // fully check created role
    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
    expect(role.getRowCount()).toBe(1);

    var row = role.getRow(0);
    expect(row.DESC).toBe("test");
    expect(row.NAME).toBe("TESTDEPORT");
    expect(row.ROLE_GROUP_ID).toBe(1);

    // check the items
    // if add depot manager, add items in t_role_location
    var roleItems = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_location" WHERE ROLE_ID =' + roleId);
    expect(roleItems.getRowCount()).toBe(2);

    var roleItem = roleItems.getRow(0);
    expect(roleItem.ROLE_ID.toString()).toBe(roleId);
    expect(roleItem.LOCATION_ID).toBe("RAwBT8cq7jIXqNXFfcvUH0");

    var roleItem2 = roleItems.getRow(1);
    expect(roleItem2.ROLE_ID.toString()).toBe(roleId);
    expect(roleItem2.LOCATION_ID).toBe("RAwBT8cq7jIXqNXFfct{H0");


    // delete created role
    response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json" + roleId, $.net.http.DEL );
    expect(response.status).toBe($.net.http.NO_CONTENT);
  });

  it("should create regional planner", function () {
    // create a regional planner
    var requestBody =
    '{\
      "NAME": "TEGIONALPLANNER",\
      "DESC": "TEST",\
      "ROLE_GROUP_ID": 3,\
      "ZONES": [{"ID":"RAwBT8cq7jIXqY6j4uXVYW"}]\
    }';

    var headers = {
      "Content-Type" : "application/json"
    };

    // send request and get response
    var response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json", $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var body = JSON.parse(response.body.asString());
    expect(body.data).toBeDefined();
    expect(body.data.ID).toBeDefined();
    expect(body.success).toBeTruthy();

    var roleId = body.data.ID;
    // fully check the data in db of created role
    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
    expect(role.getRowCount()).toBe(1);


    var row = role.getRow(0);
    expect(row.DESC).toBe("TEST");
    expect(row.NAME).toBe("TEGIONALPLANNER");
    expect(row.ROLE_GROUP_ID).toBe(3);

    // check regional items
    // if add regional planner, items are added in t_role_reginon
    var roleItems = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_region" WHERE ROLE_ID = ' + roleId);
    expect(roleItems.getRowCount()).toBe(1);

    var roleItem = roleItems.getRow(0);
    expect(roleItem.ROLE_ID.toString()).toBe(roleId);
    expect(roleItem.ROOT_ID).toBe("RAwBT8cq7jIXqY6j4uXVYW");

    // delete created role
    response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json" + roleId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);
    role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
    expect(role.getRowCount()).toBe(0);

  });

  it("should create update & delete resource role", function() {
	    // create a resource manager
	    var requestBody =
	    '{\
	    	    "NAME":"TESTRESOURCEROLE",\
	    	    "DESC":"RES role test",\
	    	    "ROLE_GROUP_ID":5,\
	    	    "RESOURCE_ATTS":\
	    	    [\
	    	        {"RES_CATEGORY":"RC","RES_TYPE":"RC_20ST"},\
	    	        {"RES_CATEGORY":"RC","RES_TYPE":"RC_20HC"}\
	    	    ]\
	    }';

	    var headers = {
	      "Content-Type": "application/json"
	    };

	    var response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json", $.net.http.POST, requestBody, headers);
	    expect(response.status).toBe($.net.http.CREATED);
	    var body = JSON.parse(response.body.asString());
	    expect(body.data).toBeDefined();
	    expect(body.data.ID).toBeDefined();
	    expect(body.success).toBeTruthy();

	    var roleId = body.data.ID;
	    // fully check created role
	    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
	    expect(role.getRowCount()).toBe(1);

	    var row = role.getRow(0);
	    expect(row.DESC).toBe("RES role test");
	    expect(row.NAME).toBe("TESTRESOURCEROLE");
	    expect(row.ROLE_GROUP_ID).toBe(5);

	    // check the items
	    // if add depot manager, add items in t_role_location
	    var roleItems = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_resource" WHERE ROLE_ID =' + roleId);
	    expect(roleItems.getRowCount()).toBe(2);

	    var roleItem = roleItems.getRow(0);
	    expect(roleItem.ROLE_ID.toString()).toBe(roleId);
	    expect(roleItem.RES_CATEGORY).toBe("RC");
	    expect(roleItem.RES_TYPE).toBe("RC_20ST");

	    var roleItem2 = roleItems.getRow(1);
	    expect(roleItem2.ROLE_ID.toString()).toBe(roleId);
	    expect(roleItem2.RES_CATEGORY).toBe("RC");
	    expect(roleItem2.RES_TYPE).toBe("RC_20HC");

	    
	    // update a resource manager
	    var requestBody =
	    '{\
	    		"ID":"' + roleId + '",\
	    		"NAME":"TESTRESOURCEROLEUPDATE",\
	    	    "DESC":"RES role test updated",\
	    	    "ROLE_GROUP_ID":5,\
	    	    "RESOURCE_ATTS":\
	    	    [\
	    	        {"RES_CATEGORY":"RC","RES_TYPE":"RC_20ST"},\
	    	        {"RES_CATEGORY":"RC","RES_TYPE":"RC_20HC"},\
	    			{"RES_CATEGORY":"RC","RES_TYPE":"RC_40HC"}\
	    	    ]\
	    }';

	    response = jasmine.callHTTPService(url + roleId, $.net.http.PUT, requestBody, headers);
	    expect(response.status).toBe($.net.http.NO_CONTENT);
	    
	    // fully check updated role
	    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
	    expect(role.getRowCount()).toBe(1);

	    var row = role.getRow(0);
	    expect(row.DESC).toBe("RES role test updated");
	    expect(row.NAME).toBe("TESTRESOURCEROLEUPDATE");
	    expect(row.ROLE_GROUP_ID).toBe(5);

	    // check the items
	    // if add depot manager, add items in t_role_location
	    var roleItems = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_resource" WHERE ROLE_ID =' + roleId);
	    expect(roleItems.getRowCount()).toBe(3);

	    var roleItem = roleItems.getRow(0);
	    expect(roleItem.ROLE_ID.toString()).toBe(roleId);
	    expect(roleItem.RES_CATEGORY).toBe("RC");
	    expect(roleItem.RES_TYPE).toBe("RC_20ST");

	    var roleItem2 = roleItems.getRow(1);
	    expect(roleItem2.ROLE_ID.toString()).toBe(roleId);
	    expect(roleItem2.RES_CATEGORY).toBe("RC");
	    expect(roleItem2.RES_TYPE).toBe("RC_20HC");
	    
	    var roleItem3 = roleItems.getRow(2);
	    expect(roleItem3.ROLE_ID.toString()).toBe(roleId);
	    expect(roleItem3.RES_CATEGORY).toBe("RC");
	    expect(roleItem3.RES_TYPE).toBe("RC_40HC");
	    
	    // delete created role
	    response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json" + roleId, $.net.http.DEL );
	    expect(response.status).toBe($.net.http.NO_CONTENT);
	    
	    // check the role table
	    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
	    expect(role.getRowCount()).toBe(0);

	    // check the item table
	    var item = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_resource" WHERE ROLE_ID = ' + roleId);
	    expect(item.getRowCount()).toBe(0);
	    
	  });

  it("should create reduplicative roles ", function () {
    var requestBody = '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID":1,\
      "LOCATIONS":[{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';
    var headers = {
      "Content-Type": "application/json"
    };
    var response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json", $.net.http.POST, requestBody, headers);
    var roleId = JSON.parse(response.body.asString()).data.ID;

    response = jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json", $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.BAD_REQUEST);

    // delete created role
    jasmine.callHTTPService("/sap/tm/trp/service/admin/roles.json" + roleId, $.net.http.DEL);
  });

  it("should delete created roles", function() {
    // create a deport manager first
    var requestBody = '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID": 1,\
      "LOCATIONS": [{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';
    var headers = {
      "Content-Type": "application/json"
    };
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var roleId = JSON.parse(response.body.asString()).data.ID;

    // delete the role
    response = jasmine.callHTTPService(url + roleId, $.net.http.DEL);
    expect(response.status).toBe($.net.http.NO_CONTENT);

    // check the role table
    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
    expect(role.getRowCount()).toBe(0);

    // check the item table
    var item = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_location" WHERE ROLE_ID = ' + roleId);
    expect(item.getRowCount()).toBe(0);
  });

  
  
  it("should update roles", function () {
    // create a deport manager first
    var requestBody = '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID": 1,\
      "LOCATIONS": [{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';
    var headers = {
      "Content-Type": "application/json"
    };
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var roleId = JSON.parse(response.body.asString()).data.ID;

    // update the role, change description and locations
    requestBody = '{\
      "ID": '+ roleId +',\
      "NAME": "TESTDEPORT",\
      "DESC": "testupdate",\
      "ROLE_GROUP_ID": 1,\
      "LOCATIONS": [{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';

    response = jasmine.callHTTPService(url + roleId, $.net.http.PUT, requestBody, headers);
    expect(response.status).toBe($.net.http.NO_CONTENT);

    // check role table
    var role = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role" WHERE ID = ' + roleId);
    expect(role.getRowCount()).toBe(1);

    var row = role.getRow(0);
    expect(row.ID.toString()).toBe(roleId);
    expect(row.DESC).toBe("testupdate");

    // check item table
    var roleItemTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_role_location" WHERE ROLE_ID = ' + roleId);
    expect(roleItemTable.getRowCount()).toBe(1);

    var roleItem = roleItemTable.getRow(0);
    expect(roleItem.ROLE_ID.toString()).toBe(roleId);
    expect(roleItem.LOCATION_ID).toBe("RAwBT8cq7jIXqNXFfct{H0");


    // delete created role
    jasmine.callHTTPService(url + roleId, $.net.http.DEL);
  });

  it("should show depot manager on map", function () {
    // create a depot manager
    var requestBody = '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID": 1,\
      "LOCATIONS": [{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';

    var headers = {
      "Content-Type": "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    expect(response.body).toBeDefined();
    var roleId = JSON.parse(response.body.asString()).data.ID;

    // show return role on map
    response = jasmine.callHTTPService(url + roleId + "/showDepotManagerOnMap?min_coordinate=-180%3B85.05113642327339%3B0&max_coordinate=180%3B-85.05113642327339%3B0&MAP_LEVEL=1&FIELD=POINT&ID="+ roleId, $.net.http.GET);
    expect(response.status).toBe($.net.http.OK);
    expect(response.body).toBeDefined();

    // delete the created role
    jasmine.callHTTPService(url + roleId, $.net.http.DEL);
  });

  it("should show region planner", function() {
    // create a region planner
    var requestBody =
    '{\
      "NAME": "TEGIONALPLANNER",\
      "DESC": "TEST",\
      "ROLE_GROUP_ID": 3,\
      "ZONES": [{"ID":"RAwBT8cq7jIXqY6j4uXVYW"}]\
    }';

    var headers = {
      "Content-Type" : "application/json"
    };

    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var roleId = JSON.parse(response.body.asString()).data.ID;

    response = jasmine.callHTTPService(url + roleId + "/showRegionalPlannerOnMap?min_coordinate=-180%3B85.05113642327339%3B0&max_coordinate=180%3B-85.05113642327339%3B0&ID="+roleId, $.net.http.GET);
    expect(response.status).toBe($.net.http.OK);


    jasmine.callHTTPService(url + roleId, $.net.http.DEL);
  });


  it("test role filter", function () {
    // create a role first in case of no roles
    // create a deport manager first
    var requestBody = '{\
      "NAME": "TESTDEPORT",\
      "DESC": "test",\
      "ROLE_GROUP_ID": 1,\
      "LOCATIONS": [{"ID":"RAwBT8cq7jIXqNXFfcvUH0"},{"ID":"RAwBT8cq7jIXqNXFfct{H0"}]\
    }';
    var headers = {
      "Content-Type": "application/json"
    };
    var response = jasmine.callHTTPService(url, $.net.http.POST, requestBody, headers);
    expect(response.status).toBe($.net.http.CREATED);
    var roleId = JSON.parse(response.body.asString()).data.ID;

    requestBody = '{"search":"","filters":{"ROLE_GROUP_ID":[1]},"ignore":["ROLE_GROUP_ID"]}';

    response = jasmine.callHTTPService(url + "/queryFacetFilter", $.net.http.POST, requestBody, headers);

    expect(response.status).toBe($.net.http.OK);
    var body = JSON.parse(response.body.asString());
    expect(body.success).toBeTruthy();
    expect(body.data.ROLE_GROUP_ID[0].key).toBe(1);
    expect(body.data.ROLE_GROUP_ID[0].text).toBe("Depot Level")

    // delete the created role
    jasmine.callHTTPService(url + roleId, $.net.http.DEL);
  });


});
