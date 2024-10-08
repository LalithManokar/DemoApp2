var procLib = $.import('sap.tm.trp.service.xslib', 'procedures');
var constants = $.import('sap.tm.trp.service.xslib', 'constants');
var utils = $.import('sap.tm.trp.service.xslib', 'utils');
var TableUtils = $.import("sap.hana.testtools.unit.util", "tableUtils").TableUtils;
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("TU Test", function() {
    var connection;

    beforeEach(function() {
        connection = $.db.getConnection();
    });

    afterEach(function() {
        connection.close();
    });
    
    it("should reset UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //reset a location rule
        requestBody = {"LOCATION_RULE_ID": rulesetId};
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/reset", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should execute determination UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id = [];
        tu_output.forEach(function(item) {
            tu_id.push({
                "TU_ID": item.TRANSPORTATION_ID
            });
        });

        //execute determination
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": tu_id
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/executeDetermination", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should get suggest locations UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
                requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id = [];
        tu_output.forEach(function(item) {
            tu_id.push({
                "TU_ID": item.TRANSPORTATION_ID
            });
        });

        //get suggest locations
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": tu_id
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/getSuggestLocations", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        expect(body.data.RESULT).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });

    it("should get assigned containers UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];
        
        //get assigned containers of the ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + 1 +
            "/getAssignedContainers?TRANSPORTATION_ID=" + tu_id + "&LOCATION_RULE_ID=" + rulesetId, $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should get Tu UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;

        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();

        requestBody = {
            "COLUMN_FILTERS": [{
                "COLUMN_NAME": "RESOURCE_TYPE",
                "COLUMN_VALUE": "40HC",
                "OPERATOR_CODE": "LIKE"
            }, {
                "COLUMN_NAME": "LIFECYCLE_STATUS",
                "COLUMN_VALUE": "In Process",
                "OPERATOR_CODE": "LIKE"
            }],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {},
            "search": "",
            "SKIP_AMOUNT": 0,
            "TOP_AMOUNT": 0
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net.http
            .POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should facet filter UT", function () {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //facet filter locations
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": "1",
            "filters": { "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME":[],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": ["20ST"],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME":[]},
            "ignore": [["EQUIPMENT_ID"]],
            "search": ""
        };
        
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/facetFilter", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should get finalize TU UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id = [];
        tu_output.forEach(function(item) {
            tu_id.push({
                "TU_ID": item.TRANSPORTATION_ID
            });
        });

        //get finalize TU
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": tu_id
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/getFinalizeTU", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should finalize UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];
        
        //finalize 
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": [{"TU_ID": tu_id}]
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/finalize", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should edit date UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];
        
        //edit date of TU
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "PICKUP_DATE": "2015-03-20T03:34:00.000Z",
            "TU_ID": tu_id
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + tu_id +
            "/editDate", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT);
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should edit location UT", function() {
        //create a ruleset
        var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];
        
        //edit location of TU
        requestBody = {
            "LOCATION_NAME": "AEJEA",
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": [{"TU_ID": tu_id}]
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/editLoc", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should copy to all UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id = [];
        tu_output.forEach(function(item) {
            tu_id.push({
                "TU_ID": item.TRANSPORTATION_ID
            });
        });

        //copy to all
        requestBody = {
            "LOCATION_NAME": "AEDXBDACE",
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": tu_id
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/copyToAll", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should assign UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];

        //assign TU on location
        requestBody = {
            "LOCATION_NAME": "CNCWNDMCT",
            "LOCATION_RULE_ID": rulesetId,
            "TU_IDS": [{"TU_ID": tu_id}]
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/assign", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
    
    it("should save special instruction UT", function() {
        //create a ruleset
         var requestBody = {
            "ALLOWED_USAGE": "G",
            "DESCRIPTION": "",
            "EQUIPMENT_FILTER_ID": null,
            "EXCLUSIVE_RULE_ID": null,
            "EXPIRY_HOUR": 0,
            "EXPIRY_MINUTE": 0,
            "FILTER_EXECUTION": 0,
            "ID": "",
            "LOCATION_DETERMIN_ID": null,
            "LOCATION_FILTER_ID": 106,
            "NAME": "JOE_TEST",
            "NETWORK_SETTING_GROUP_ID": 2,
            "OPTIMIZATION": 1,
            "OP_SETTING_TYPE": 2,
            "RECURRENCE_INTERVAL": null,
            "RECURRENCE_TYPE": "MINUTE",
            "SCHEDULE_TIME_TYPE": 0,
            "SD_PLAN_ID": 5,
            "START_HOUR": 0,
            "START_MINUTE": 0,
            "TIME_RANGE_INTERVAL": 80,
            "TIME_RANGE_UNIT": 3,
            "TYPE": 1
        };
        requestBody = JSON.stringify(requestBody);
        var headers = {
            "Content-Type": "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.CREATED);
        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined(); // check response body
        expect(body.data.ID).toBeDefined();
        var rulesetId = body.data.ID;
        
        //get TUs of a location rule
        requestBody = {
            "COLUMN_FILTERS": [],
            "LOCATION_RULE_ID": rulesetId,
            "filters": {
                "CONSIGNEE_LOCATION_NAME": [],
                "CONSIGNEE_NAME": [],
                "CUR_LOCATION_NAME": [],
                "EQUIPMENT_ID": [],
                "EXECUTION_STATUS": [],
                "POD": [],
                "POL": [],
                "SHIPPER_LOCATION_NAME": [],
                "SHIPPER_NAME": []
            },
            "search": ""
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId + "/getTu", $.net
            .http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        var tu_output = body.data;
        var tu_id_list = [];
        tu_output.forEach(function(item) {
            tu_id_list.push(item.TRANSPORTATION_ID);
        });
        var tu_id = tu_id_list[0];

        //save special instruction
        requestBody = {
            "LOCATION_RULE_ID": rulesetId,
            "SPECIAL_INSTRUCTION": [{"RESOURCE_ID": "RAwBT8cq7kIXzKkRYnV6CW", "SPECIAL_INSTRUCTION_CODE": "02", "SPECIAL_INSTRUCTION_NAME": "Level 02"}],
            "TU_IDS": [{"TU_ID": tu_id}]
        };
        requestBody = JSON.stringify(requestBody);
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/transportationunits.json/" + rulesetId +
            "/saveSpecialInstruction", $.net.http.POST, requestBody, headers);
        expect(response.status).toBe($.net.http.OK);
        body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        
        //delete a ruleset
        response = jasmine.callHTTPService("/sap/tm/trp/service/pickupreturn/locationrules.json/" + rulesetId, $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);
    });
});