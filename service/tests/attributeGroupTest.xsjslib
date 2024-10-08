var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Attribute Group Unit Test", function() {
    var sqlExecutor;
    var connection;

    beforeEach(function() {
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
    });

    afterEach(function() {
        connection.close();
    });

    it("should create attribute group", function() {
        // create the attribute group
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // check the response code
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body 
        expect(body.data.ID).toBeDefined();

        var groupId = body.data.ID;

        // check the database table
        var groupHeaderTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group" WHERE ID = ' +
            groupId);
        expect(groupHeaderTable.getRowCount()).toBe(1);

        var groupItemTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item" WHERE GROUP_ID = ' + groupId);
        expect(groupItemTable.getRowCount()).toBe(5);

        var groupNodeTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node" WHERE GROUP_ID = ' + groupId);
        expect(groupNodeTable.getRowCount()).toBe(3);

        var groupValueTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node_values" WHERE GROUP_ID = ' + groupId);
        expect(groupValueTable.getRowCount()).toBe(7);

        // finally call the service to delete all records
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should update attribute group", function() {
        // create the attribute group first
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // make sure it is created

        var body = JSON.parse(response.body.asString());
        var groupId = body.data.ID;

        // update the created attribute group
        requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_2",\
                "DESC": "Changed Description",\
                "VISIBILITY": "P",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    }\
                ]\
            }';
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database being updated
        var groupHeaderTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group" WHERE ID = ' +
            groupId);
        expect(groupHeaderTable.getRowCount()).toBe(1);
        var row = groupHeaderTable.getRow(0);
        expect(row.NAME).toBe("ATTR_GROUP_TEST_2");
        expect(row.DESC).toBe("Changed Description");
        expect(row.VISIBILITY).toBe("P");

        var groupItemTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item" WHERE GROUP_ID = ' + groupId);
        expect(groupItemTable.getRowCount()).toBe(1);

        var groupNodeTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node" WHERE GROUP_ID = ' + groupId);
        expect(groupNodeTable.getRowCount()).toBe(1);

        var groupValueTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node_values" WHERE GROUP_ID = ' + groupId);
        expect(groupValueTable.getRowCount()).toBe(3);

        // delete it
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should destroy attribute group", function() {
        // create the attribute group first
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // make sure it's created

        var body = JSON.parse(response.body.asString());
        var groupId = body.data.ID;

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        // check the database 
        var groupHeaderTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group" WHERE ID = ' +
            groupId);
        expect(groupHeaderTable.getRowCount()).toBe(0);

        var groupItemTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item" WHERE GROUP_ID = ' + groupId);
        expect(groupItemTable.getRowCount()).toBe(0);

        var groupNodeTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node" WHERE GROUP_ID = ' + groupId);
        expect(groupNodeTable.getRowCount()).toBe(0);

        var groupValueTable = sqlExecutor.execQuery(
            'SELECT * FROM "sap.tm.trp.db.filter::t_attribute_group_item_node_values" WHERE GROUP_ID = ' + groupId);
        expect(groupValueTable.getRowCount()).toBe(0);
    });

    it("should get list of attribute categories from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/ResourceAttributeCategories", $.net.http.GET, null,
            headers);
        expect(response.status).toBe($.net.http.OK);

        var body = JSON.parse(response.body.asString());

        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
        expect(body.d.results[0].Attributes).toBeDefined();
    });

    it("should get a single attribute category from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/ResourceAttributeCategories(1)", $.net.http.GET, null,
            headers);
        expect(response.status).toBe($.net.http.OK);

        var body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        expect(body.d.ID).toBe("1");
        expect(body.d.Attributes).toBeDefined();
    });

    it("should get all attributes from a category from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/ResourceAttributeCategories(1)/Attributes", $.net.http.GET,
            null, headers);
        expect(response.status).toBe($.net.http.OK);

        var body = JSON.parse(response.body.asString());

        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
        expect(body.d.results[0].CODE).toBeDefined();
        expect(body.d.results[0].VALUE_TYPE).toBeDefined();
    });

    it("should get a list attributes by a category id from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/ResourceAttributes?$filter=CATEGORY_ID%20eq%202", $.net
            .http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);
        var body = JSON.parse(response.body.asString());

        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
    });

    it("should get a single attribute from OData", function() {
        var headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/ResourceAttributes(1)", $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);
        var body = JSON.parse(response.body.asString());

        expect(body.d.ID).toBe("1");
        expect(body.d.CODE).toBeDefined();
        expect(body.d.VALUE_TYPE).toBeDefined();
    });

    it("should get a list of attribute groups from OData", function() {
        // create the attribute group first
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // make sure it's created

        var body = JSON.parse(response.body.asString());
        var groupId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/AttributeFilters", $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());

        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
        expect(body.d.results[0].ID).toBeDefined();
        expect(body.d.results[0].NAME).toBeDefined();
        expect(body.d.results[0].Items).toBeDefined();

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

    });

    it("should get a single attribute group from OData", function() {
        // create the attribute group first
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // make sure it's created

        var body = JSON.parse(response.body.asString());
        var groupId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/AttributeFilters(" + groupId + ")", $.net.http.GET,
            null, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        expect(body.d.ID).toBe(groupId);
        expect(body.d.Items).toBeDefined();

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should get a single attribute group items and expand its values nested from OData", function() {
        // create the attribute group first
        var requestBody =
            '{\
                "NAME": "ATTR_GROUP_TEST_1",\
                "DESC": "description",\
                "VISIBILITY": "G",\
                "ITEMS": [\
                    {\
                        "ATTRIBUTE_ID": "1",\
                        "ATTRIBUTE_CODE": "RESOURCE_NAME",\
                        "OPERATOR": "EQ",\
                        "VALUES": ["123", "456", "789"]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "2",\
                        "ATTRIBUTE_CODE": "RESOURCE_TYPE_CODE",\
                        "OPERATOR": "BT",\
                        "VALUES": [10, 20]\
                    },\
                    {\
                        "ATTRIBUTE_ID": "28",\
                        "ATTRIBUTE_CODE": "OFF_HIRE_DT",\
                        "OPERATOR": "BT",\
                        "VALUES": ["2014-09-14T16:00:00.000Z", "2014-09-19T16:00:00.000Z"]\
                    }\
                ]\
            }';

        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED); // make sure it's created

        var body = JSON.parse(response.body.asString());
        var groupId = body.data.ID;

        headers = {
            "Accept": "application/json",
            "Accept-Language" : "en-US"
        };
        response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/AttributeFilters(" + groupId +
            ")/Items?$expand=Values", $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());

        expect(body.d).toBeDefined();
        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBe(3);
        expect(body.d.results[0].ATTRIBUTE_ID).toBe("1");
        expect(body.d.results[0].ATTRIBUTE_CODE).toBe("RESOURCE_NAME");
        expect(body.d.results[0].OPERATOR).toBe("EQ");
        expect(body.d.results[0].Values).toBeDefined();
        expect(body.d.results[0].Values.results.length).toBe(3);
        expect(body.d.results[0].Values.results.map(function(item) {
            return item.VALUE;
        })).toEqualObject(["123", "456", "789"]);

        // delete the record
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/attributeGroups.json/" + groupId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
});