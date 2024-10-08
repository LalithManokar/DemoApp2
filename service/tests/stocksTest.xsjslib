var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
describe('Stock Unit Test', function() {
	var connection;
	var sqlExecutor;
	var url = "/sap/tm/trp/service/stock/stocks.json";
	var LOCATION_ID_TEST = "LOCATION_ID_TEST_111";
	var LOCATION_TYPE = 5;
	var RESOURCE_CATEGORY = "CN";
	var RESOURCE_ID = "R_ID_1";
	var RESOURCE_FILTER_DESC = "equipment_filter_test";
	var LOCATION_FILTER_ID = 999998;
	var LOCATION_FILTER_DESC = "location_filter_test";
	var LOCATION_ID = "RAwBT8cq7jIXpIthqLHMH0";
	var LOCATION_GROUP_ID = "2";
	var LOCATION_NAME = "INTKDDTKD";
	var LOCATION_FILTER_CODE = "l_code_test_1";
	var RESOURCE_FILTER_ID = 888888;
	var RESOURCE_FILTER_CODE = "r_code_test_1";

	function cleanData() {
		var list = [];
		list.push('DELETE FROM "sap.tm.trp.db.filter::t_location_filter_location" WHERE LOCATION_FILTER_ID=' + LOCATION_FILTER_ID);
		list.push('DELETE FROM "sap.tm.trp.db.stock::t_stock_config" WHERE LOCATION_ID = \'' + LOCATION_ID_TEST + '\'');
		list.push('DELETE FROM "sap.tm.trp.db.filter::t_location_filter" WHERE ID=' + LOCATION_FILTER_ID);
		list.push('DELETE FROM "sap.tm.trp.db.filter::t_equipment_filter" WHERE ID = ' + RESOURCE_FILTER_ID);
		list.push('DELETE FROM "sap.tm.trp.db.stock::t_stock_config" WHERE LOCATION_ID = \'' + LOCATION_ID + '\'');
		list.forEach(function(item) {
			sqlExecutor.execQuery(item);
		});
	}

	function prepareData() {
		var sql =
			'INSERT INTO "sap.tm.trp.db.stock::t_stock_config" \
			("LOCATION_ID","LOCATION_TYPE","EQUIP_CODE","EQUIP_CODE_TYPE",\
			"LOCATION_HEAD_FLAG",\
			"RESOURCE_CATEGORY") VALUES (?,?,?,?,?,?)';
		var pstmt = connection.prepareStatement(sql);
		pstmt.setString(1, LOCATION_ID_TEST);
		pstmt.setInt(2, LOCATION_TYPE);
		pstmt.setString(3, RESOURCE_ID);
		pstmt.setInt(4, 1);
		pstmt.setInt(5, 1);
		pstmt.setString(6, RESOURCE_CATEGORY);
		pstmt.executeQuery();

		sql =
			'INSERT INTO "sap.tm.trp.db.filter::t_location_filter"\
			("ID","DESC","VISIBLE_FLAG","LOCATION_TYPE","CODE") \
			VALUES(?,?,?,?,?)';
		pstmt = connection.prepareStatement(sql);
		pstmt.setInt(1, LOCATION_FILTER_ID);
		pstmt.setString(2, LOCATION_FILTER_DESC);
		pstmt.setString(3, "G");
		pstmt.setInt(4, 1);
		pstmt.setString(5, LOCATION_FILTER_CODE);
		pstmt.executeQuery();

		sql =
			'INSERT INTO "sap.tm.trp.db.filter::t_equipment_filter"\
			("ID","DESC","VISIBLE_FLAG","CODE","RESOURCE_CATEGORY","FILTER_TYPE")\
			VALUES(?,?,?,?,?,?)';
		pstmt = connection.prepareStatement(sql);
		pstmt.setInt(1, RESOURCE_FILTER_ID);
		pstmt.setString(2, RESOURCE_FILTER_DESC);
		pstmt.setString(3, "p");
		pstmt.setString(4, RESOURCE_FILTER_CODE);
		pstmt.setString(5, RESOURCE_CATEGORY);
		pstmt.setInt(6, 1);
		pstmt.executeQuery();

		sql = 'INSERT INTO "sap.tm.trp.db.filter::t_location_filter_location"\
			("LOCATION_FILTER_ID","LOCATION_ID")\
			VALUES(?,?)';
		pstmt = connection.prepareStatement(sql);
		pstmt.setInt(1, LOCATION_FILTER_ID);
		pstmt.setString(2, LOCATION_ID);
		pstmt.executeQuery();

		//LOC_ID;NAME;XPOS;YPOS
		//RAwBT8cq7jIXpIthqLHMH0;INTKDDTKD;77;20

		sql =
			'INSERT INTO "sap.tm.trp.db.stock::t_stock_config" \
			("LOCATION_ID","LOCATION_TYPE","EQUIP_CODE","EQUIP_CODE_TYPE",\
			"LOCATION_HEAD_FLAG","RESOURCE_CATEGORY") VALUES (?,?,?,?,?,?)';
		pstmt = connection.prepareStatement(sql);
		pstmt.setString(1, LOCATION_ID);
		pstmt.setInt(2, LOCATION_TYPE);
		pstmt.setString(3, RESOURCE_ID);
		pstmt.setInt(4, 1);
		pstmt.setInt(5, 1);
		pstmt.setString(6, RESOURCE_CATEGORY);
		pstmt.executeQuery();
	}

	beforeOnce(function() {

		connection = $.db.getConnection();
		connection.setAutoCommit(false);
		sqlExecutor = new SqlExecutor(connection);
		//delete test data
		cleanData();

		//insert test data
		prepareData();

		connection.commit();

	});

	afterOnce(function() {
		//delete test data;
		cleanData();
		connection.commit();
		connection.close();
	});

	it('should update Settings', function() {
		var paramsObject = {
			GEO_ID: LOCATION_ID_TEST,
			GEO_NAME: "ADMI",
			GEO_TYPE: LOCATION_TYPE,
			STOCK_SETTINGS: {
				"MIN_SAFETY_STOCK": 1,
				"MAX_SAFETY_STOCK": 11
			},
			STOCK_THRESHOLDS: [{
				RESOURCE_ID: "R_ID_1",
				RESOURCE_NAME: "RESOURCE_NAME_TEST_1",
				RESOURCE_DESC: "RESOURCE_DESC_TEST_1",
				RESOURCE_TYPE: 1,
				MIN_SAFETY_STOCK: 10,
				MAX_SAFETY_STOCK: 100
			    }],
			RESOURCE_CATEGORY: RESOURCE_CATEGORY
		};
		var requestBody = JSON.stringify(paramsObject);

		var headers = {
			"Content-Type": "application/json"
		};

		var response = jasmine.callHTTPService(url + "/updateSettings", $.net.http.PUT, requestBody, headers);

		expect(response.status).toBe($.net.http.NO_CONTENT);

		var sql = 'SELECT * FROM "sap.tm.trp.db.stock::t_stock_config" \
			where LOCATION_ID = \'' + LOCATION_ID_TEST +
			'\' \
			AND LOCATION_TYPE = ' + LOCATION_TYPE + ' \
			AND RESOURCE_CATEGORY =\'' + RESOURCE_CATEGORY + '\'';

		var stock = sqlExecutor.execQuery(sql);

		expect(stock.getRowCount()).toBe(2);

		var row1 = stock.getRow(0);
		expect(row1.LOCATION_ID).toBe(LOCATION_ID_TEST);
		expect(row1.LOCATION_TYPE).toBe(LOCATION_TYPE);
		expect(row1.RESOURCE_CATEGORY).toBE = (RESOURCE_CATEGORY);
		expect(row1.MAX_SAFETY).toBe(11);
		expect(row1.MIN_SAFETY).toBe(1);

		var row2 = stock.getRow(1);
		expect(row2.LOCATION_ID).toBe(LOCATION_ID_TEST);
		expect(row2.LOCATION_TYPE).toBe(LOCATION_TYPE);
		expect(row2.RESOURCE_CATEGORY).toBE = (RESOURCE_CATEGORY);
		expect(row2.MAX_SAFETY).toBe(100);
		expect(row2.MIN_SAFETY).toBe(10);
	});

	it('should bubble on map', function() {
		var paramsObject = {
			min_coordinate: "70;15;0",
			max_coordinate: "80;25;0",
			location_filter_id: LOCATION_FILTER_ID,
			resource_filter_id: RESOURCE_FILTER_ID,
			hierarchy_level: 100,
			attribute_group_items: "",
			resource_type: "all_types"
		};

		var params = Object.keys(paramsObject).map(function(k) {
			return k + "=" + paramsObject[k];
		}).join("&");

		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/bubbleOnMap?" + params, $.net.http.GET, null, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.data).toBeDefined();
		expect(body.data.RESULTS).toBeDefined();
		expect(body.data.FIELD).toBe("POINT");
		var rows = body.data.RESULTS;
		expect(rows.length).toBe(1);
		expect(rows[0].LOCATION_ID).toBe(LOCATION_ID);
		expect(rows[0].LATITUDE).toBe(77);
		expect(rows[0].LONGITUDE).toBe(20);
	});

	it('should alert on map', function() {
		var paramsObject = {
			min_coordinate: "70;15;0",
			max_coordinate: "80;25;0",
			location_filter_id: LOCATION_FILTER_ID,
			resource_filter_id: RESOURCE_FILTER_ID,
			hierarchy_level: 100,
			attribute_group_items: "",
			resource_type: "all_types"
		};

		var params = Object.keys(paramsObject).map(function(k) {
			return k + "=" + paramsObject[k];
		}).join("&");
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/alertsOnMap?" + params, $.net.http.GET, null, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.data).toBeDefined();
		expect(body.data.ALERTS).toBeDefined();
		expect(body.data.FIELD).toBe("POINT");
		expect(body.data.ALERTS.length).toBe(1);
		var rows = body.data.ALERTS;
		expect(rows[0].LOCATION_ID).toBe(LOCATION_ID);
		expect(rows[0].LATITUDE).toBe(77);
		expect(rows[0].LONGITUDE).toBe(20);

	});

	it('should display pie on map', function() {

		var paramsObject = {
			min_coordinate: "70;15;0",
			max_coordinate: "80;25;0",
			location_filter_id: LOCATION_FILTER_ID,
			resource_filter_id: RESOURCE_FILTER_ID,
			hierarchy_level: 100,
			attribute_group_items: "",
			resource_type: "all_types"
		};

		var params = Object.keys(paramsObject).map(function(k) {
			return k + "=" + paramsObject[k];
		}).join("&");
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/pieOnMap?" + params, $.net.http.GET, null, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.data).toBeDefined();
		expect(body.data.RESULTS).toBeDefined();
		expect(body.data.FIELD).toBe("POINT");
		expect(body.data.RESULTS.length).toBe(1);
		var rows = body.data.RESULTS;
		expect(rows[0].LOCATION_ID).toBe(LOCATION_ID);
		expect(rows[0].LATITUDE).toBe(77);
		expect(rows[0].LONGITUDE).toBe(20);
	});

	it('should display location Hierarchy', function() {
		var paramsObject = {
			location_filter_id: LOCATION_FILTER_ID,
			RESOURCE_CATEGORY_ID: RESOURCE_CATEGORY
		};
		var params = Object.keys(paramsObject).map(function(k) {
			return k + "=" + paramsObject[k];
		}).join("&");
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/locationHierarchy?" + params, $.net.http.GET, null, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.data).toBeDefined();
		expect(body.success).toBe(true);
		expect(body.data.locations).toBeDefined();
		expect(body.data.locationRelationships).toBeDefined();
		expect(body.data.locationRelationships.length).toBe(0);
		var locations = body.data.locations;
		expect(locations.length).toBe(1);
		expect(locations[0].ID).toBe(LOCATION_ID);
		expect(locations[0].XPOS).toBe(77);
		expect(locations[0].YPOS).toBe(20);
		expect(locations[0].NAME).toBe(LOCATION_NAME);

	});

	it('should display location Hierarchy For Map', function() {
		var paramsObject = {
			location_filter_id: LOCATION_FILTER_ID,
			RESOURCE_CATEGORY_ID: RESOURCE_CATEGORY
		};
		var params = Object.keys(paramsObject).map(function(k) {
			return k + "=" + paramsObject[k];
		}).join("&");
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/locationHierarchyForMap?" + params, $.net.http.GET, null, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.length).toBe(1);
		expect(body.data[0].LEVEL).toBe(100);
		expect(body.data[0].NAME).toBe('LEVEL_1');

	});

	it('should display stock chart ', function() {
		var paramsObject = {
			LOCATION_FILTER_ID: LOCATION_FILTER_ID,
			LOCATION_FILTER_NAME: LOCATION_FILTER_DESC,
			RESOURCE_FILTER_ID: RESOURCE_FILTER_ID,
			RESOURCE_FILTER_NAME: RESOURCE_FILTER_DESC,
			LOCATIONS: [{
				ID: LOCATION_ID,
				NAME: LOCATION_NAME,
				TYPE: 1
			}]
		};
		var requestBody = JSON.stringify(paramsObject);
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/stockChart", $.net.http.POST, requestBody, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		var data = body.data;
		expect(data.resultsByLocation).toBeDefined();
		expect(data.resultsByResource).toBeDefined();
		expect(data.resultsByLocation[0].GEO_ID).toBe(LOCATION_ID);
		expect(data.resultsByResource.length).toBe(0);

	});

	it('should display stock table', function() {
		var paramsObject = {
			LOCATION_FILTER_ID: LOCATION_FILTER_ID,
			RESOURCE_FILTER_ID: RESOURCE_FILTER_ID,
			LOCATIONS: [{
				ID: LOCATION_ID,
				NAME: LOCATION_NAME,
				TYPE: 1
			}],
			ATTRIBUTE_GROUP_ID: "2",
			ATTRIBUTE_GROUP_ITEMS: [{
				ID: LOCATION_GROUP_ID,
				NAME: "Resource Type"
			}],
			RESOURCE_CATEGORY_ID: "CN"
		};
		var requestBody = JSON.stringify(paramsObject);
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/stockTable", $.net.http.POST, requestBody, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		var data = body.data;

		expect(data.results).toBeDefined();
		var results = data.results;
		expect(results.length).toBe(1);
		expect(results[0].GEO_ID).toBe(LOCATION_ID);
		expect(results[0].GEO_NAME).toBe(LOCATION_NAME);
		expect(results[0].GEO_TYPE).toBe(1);

		expect(data.facetFilterItems).toBeDefined();
		expect(data.facetFilterItems.RESOURCE).toBeDefined();
		var resource = data.facetFilterItems.RESOURCE;
		expect(resource.length).toBe(1);

	});

	it('should display geo table', function() {
		var paramsObject = {
			LOCATION_FILTER_ID: LOCATION_FILTER_ID,
			RESOURCE_FILTER_ID: RESOURCE_FILTER_ID,
			LOCATIONS: [{
				ID: LOCATION_ID,
				NAME: LOCATION_NAME,
				TYPE: 1
			}],
			ATTRIBUTE_GROUP_ID: "2",
			ATTRIBUTE_GROUP_ITEMS: [{
				ID: LOCATION_GROUP_ID,
				NAME: "Resource Type"
			}],
			RESOURCE_CATEGORY_ID: "CN"
		};
		var requestBody = JSON.stringify(paramsObject);
		var headers = {
			"Content-Type": "application/json"
		};
		var response = jasmine.callHTTPService(url + "/geoTable", $.net.http.POST, requestBody, headers);
		expect(response.status).toBe($.net.http.OK);
		expect(response.body).toBeDefined();
		var body = JSON.parse(response.body.asString());
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		var data = body.data;
		expect(data.results).toBeDefined();
		expect(data.facetFilterItems).toBeDefined();

	});

});