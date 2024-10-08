var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");
 
var SCHEMA = 'SAP_TM_TRP';
var procName = "sap.tm.trp.db.planningcockpit.reposition::p_balancing_v2";


/*global jasmine, describe, beforeOnce, it, expect*/
describe('this test suite tests procedure "p_balancing_v2"', function() {

	
    beforeOnce(function() {});

    beforeEach(function() {});

    it('case 1', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.planningcockpit.reposition.data_balancing.case01";
        // create the three input parameters
        // case01
        var inputParameterNameValueConf = csvParser.csvToObjects(dataPackage, "NAME_VALUE_CONF.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "SD_PLAN.csv", csvProperties);
		var inputParameterRoute = csvParser.csvToObjects(dataPackage, "ROUTE.csv", csvProperties);
        var inputParameterRouteCap = csvParser.csvToObjects(dataPackage, "ROUTE_CAP.csv", csvProperties);
        var inputParameterRouteMinload = csvParser.csvToObjects(dataPackage, "ROUTE_MINLOAD.csv", csvProperties);
        var inputParameterTypeTeu = csvParser.csvToObjects(dataPackage, "TYPE_TEU.csv", csvProperties);
        // execute
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(
        		inputParameterNameValueConf,
        		inputParameterSupplyDemand,
				inputParameterRoute,
        		inputParameterRouteCap,
        		inputParameterRouteMinload,
        		inputParameterTypeTeu);
        var outputParameterRouteRes = csvParser.csvToObjects(dataPackage, "ROUTE_RES.csv", csvProperties);
        for (var entries2 in outputParameterRouteRes) { 
            if (outputParameterRouteRes[entries2].hasOwnProperty("ROUTE_ID") && outputParameterRouteRes[entries2].hasOwnProperty("QUANTITY") && outputParameterRouteRes[entries2].hasOwnProperty("TOTAL_COST") && outputParameterRouteRes[entries2].hasOwnProperty("FROM_TIME") && outputParameterRouteRes[entries2].hasOwnProperty("TO_TIME")) {
            	outputParameterRouteRes[entries2].ROUTE_ID = parseInt(outputParameterRouteRes[entries2].ROUTE_ID, 10);
            	outputParameterRouteRes[entries2].QUANTITY = parseInt(outputParameterRouteRes[entries2].QUANTITY, 10);
            	outputParameterRouteRes[entries2].TOTAL_COST = parseInt(outputParameterRouteRes[entries2].TOTAL_COST, 10);
            	outputParameterRouteRes[entries2].FROM_TIME = new Date(outputParameterRouteRes[entries2].FROM_TIME);
            	outputParameterRouteRes[entries2].TO_TIME = new Date(outputParameterRouteRes[entries2].TO_TIME);
            }
        }
        expect(result.FLAG).toBe('OPTIMAL SOLUTION');
        expect(result.T_ROUTE_RES.toString()).toBe(outputParameterRouteRes.toString());
    });
    

    it('case 2', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.planningcockpit.reposition.data_balancing.case02";
        // create the three input parameters
        // case01
        var inputParameterNameValueConf = csvParser.csvToObjects(dataPackage, "NAME_VALUE_CONF.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "SD_PLAN.csv", csvProperties);
		var inputParameterRoute = csvParser.csvToObjects(dataPackage, "ROUTE.csv", csvProperties);
        var inputParameterRouteCap = csvParser.csvToObjects(dataPackage, "ROUTE_CAP.csv", csvProperties);
        var inputParameterRouteMinload = csvParser.csvToObjects(dataPackage, "ROUTE_MINLOAD.csv", csvProperties);
        var inputParameterTypeTeu = csvParser.csvToObjects(dataPackage, "TYPE_TEU.csv", csvProperties);
        // execute
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(
        		inputParameterNameValueConf,
        		inputParameterSupplyDemand,
				inputParameterRoute,
        		inputParameterRouteCap,
        		inputParameterRouteMinload,
        		inputParameterTypeTeu);
        var outputParameterRouteRes = csvParser.csvToObjects(dataPackage, "ROUTE_RES.csv", csvProperties);
        for (var entries2 in outputParameterRouteRes) { 
            if (outputParameterRouteRes[entries2].hasOwnProperty("ROUTE_ID") && outputParameterRouteRes[entries2].hasOwnProperty("QUANTITY") && outputParameterRouteRes[entries2].hasOwnProperty("TOTAL_COST") && outputParameterRouteRes[entries2].hasOwnProperty("FROM_TIME") && outputParameterRouteRes[entries2].hasOwnProperty("TO_TIME")) {
            	outputParameterRouteRes[entries2].ROUTE_ID = parseInt(outputParameterRouteRes[entries2].ROUTE_ID, 10);
            	outputParameterRouteRes[entries2].QUANTITY = parseInt(outputParameterRouteRes[entries2].QUANTITY, 10);
            	outputParameterRouteRes[entries2].TOTAL_COST = parseInt(outputParameterRouteRes[entries2].TOTAL_COST, 10);
            	outputParameterRouteRes[entries2].FROM_TIME = new Date(outputParameterRouteRes[entries2].FROM_TIME);
            	outputParameterRouteRes[entries2].TO_TIME = new Date(outputParameterRouteRes[entries2].TO_TIME);
            }
        }
        expect(result.FLAG).toBe('OPTIMAL SOLUTION');
        expect(result.T_ROUTE_RES.toString()).toBe(outputParameterRouteRes.toString());
    });

    it('case 3', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.planningcockpit.reposition.data_balancing.case03";
        // create the three input parameters
        // case01
        var inputParameterNameValueConf = csvParser.csvToObjects(dataPackage, "NAME_VALUE_CONF.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "SD_PLAN.csv", csvProperties);
		var inputParameterRoute = csvParser.csvToObjects(dataPackage, "ROUTE.csv", csvProperties);
        var inputParameterRouteCap = csvParser.csvToObjects(dataPackage, "ROUTE_CAP.csv", csvProperties);
        var inputParameterRouteMinload = csvParser.csvToObjects(dataPackage, "ROUTE_MINLOAD.csv", csvProperties);
        var inputParameterTypeTeu = csvParser.csvToObjects(dataPackage, "TYPE_TEU.csv", csvProperties);
        // execute
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(
        		inputParameterNameValueConf,
        		inputParameterSupplyDemand,
				inputParameterRoute,
        		inputParameterRouteCap,
        		inputParameterRouteMinload,
        		inputParameterTypeTeu);
        var outputParameterRouteRes = csvParser.csvToObjects(dataPackage, "ROUTE_RES.csv", csvProperties);
        for (var entries2 in outputParameterRouteRes) { 
            if (outputParameterRouteRes[entries2].hasOwnProperty("ROUTE_ID") && outputParameterRouteRes[entries2].hasOwnProperty("QUANTITY") && outputParameterRouteRes[entries2].hasOwnProperty("TOTAL_COST") && outputParameterRouteRes[entries2].hasOwnProperty("FROM_TIME") && outputParameterRouteRes[entries2].hasOwnProperty("TO_TIME")) {
            	outputParameterRouteRes[entries2].ROUTE_ID = parseInt(outputParameterRouteRes[entries2].ROUTE_ID, 10);
            	outputParameterRouteRes[entries2].QUANTITY = parseInt(outputParameterRouteRes[entries2].QUANTITY, 10);
            	outputParameterRouteRes[entries2].TOTAL_COST = parseInt(outputParameterRouteRes[entries2].TOTAL_COST, 10);
            	outputParameterRouteRes[entries2].FROM_TIME = new Date(outputParameterRouteRes[entries2].FROM_TIME);
            	outputParameterRouteRes[entries2].TO_TIME = new Date(outputParameterRouteRes[entries2].TO_TIME);
            }
        }
        expect(result.FLAG).toBe('OPTIMAL SOLUTION');
        expect(result.T_ROUTE_RES.toString()).toBe(outputParameterRouteRes.toString());
    });

    it('case 4', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.planningcockpit.reposition.data_balancing.case04";
        // create the three input parameters
        // case01
        var inputParameterNameValueConf = csvParser.csvToObjects(dataPackage, "NAME_VALUE_CONF.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "SD_PLAN.csv", csvProperties);
		var inputParameterRoute = csvParser.csvToObjects(dataPackage, "ROUTE.csv", csvProperties);
        var inputParameterRouteCap = csvParser.csvToObjects(dataPackage, "ROUTE_CAP.csv", csvProperties);
        var inputParameterRouteMinload = csvParser.csvToObjects(dataPackage, "ROUTE_MINLOAD.csv", csvProperties);
        var inputParameterTypeTeu = csvParser.csvToObjects(dataPackage, "TYPE_TEU.csv", csvProperties);
        // execute
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(
        		inputParameterNameValueConf,
        		inputParameterSupplyDemand,
				inputParameterRoute,
        		inputParameterRouteCap,
        		inputParameterRouteMinload,
        		inputParameterTypeTeu);
        var outputParameterRouteRes = csvParser.csvToObjects(dataPackage, "ROUTE_RES.csv", csvProperties);
        for (var entries2 in outputParameterRouteRes) { 
            if (outputParameterRouteRes[entries2].hasOwnProperty("ROUTE_ID") && outputParameterRouteRes[entries2].hasOwnProperty("QUANTITY") && outputParameterRouteRes[entries2].hasOwnProperty("TOTAL_COST") && outputParameterRouteRes[entries2].hasOwnProperty("FROM_TIME") && outputParameterRouteRes[entries2].hasOwnProperty("TO_TIME")) {
            	outputParameterRouteRes[entries2].ROUTE_ID = parseInt(outputParameterRouteRes[entries2].ROUTE_ID, 10);
            	outputParameterRouteRes[entries2].QUANTITY = parseInt(outputParameterRouteRes[entries2].QUANTITY, 10);
            	outputParameterRouteRes[entries2].TOTAL_COST = parseInt(outputParameterRouteRes[entries2].TOTAL_COST, 10);
            	outputParameterRouteRes[entries2].FROM_TIME = new Date(outputParameterRouteRes[entries2].FROM_TIME);
            	outputParameterRouteRes[entries2].TO_TIME = new Date(outputParameterRouteRes[entries2].TO_TIME);
            }
        }
        expect(result.FLAG).toBe('OPTIMAL SOLUTION');
        expect(result.T_ROUTE_RES.toString()).toBe(outputParameterRouteRes.toString());
    });
    
    it('case 5', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.planningcockpit.reposition.data_balancing.case05";
        // create the three input parameters
        // case01
        var inputParameterNameValueConf = csvParser.csvToObjects(dataPackage, "NAME_VALUE_CONF.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "SD_PLAN.csv", csvProperties);
		var inputParameterRoute = csvParser.csvToObjects(dataPackage, "ROUTE.csv", csvProperties);
        var inputParameterRouteCap = csvParser.csvToObjects(dataPackage, "ROUTE_CAP.csv", csvProperties);
        var inputParameterRouteMinload = csvParser.csvToObjects(dataPackage, "ROUTE_MINLOAD.csv", csvProperties);
        var inputParameterTypeTeu = csvParser.csvToObjects(dataPackage, "TYPE_TEU.csv", csvProperties);
        // execute
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(
        		inputParameterNameValueConf,
        		inputParameterSupplyDemand,
				inputParameterRoute,
        		inputParameterRouteCap,
        		inputParameterRouteMinload,
        		inputParameterTypeTeu);
        var outputParameterRouteRes = csvParser.csvToObjects(dataPackage, "ROUTE_RES.csv", csvProperties);
        for (var entries2 in outputParameterRouteRes) { 
            if (outputParameterRouteRes[entries2].hasOwnProperty("ROUTE_ID") && outputParameterRouteRes[entries2].hasOwnProperty("QUANTITY") && outputParameterRouteRes[entries2].hasOwnProperty("TOTAL_COST") && outputParameterRouteRes[entries2].hasOwnProperty("FROM_TIME") && outputParameterRouteRes[entries2].hasOwnProperty("TO_TIME")) {
            	outputParameterRouteRes[entries2].ROUTE_ID = parseInt(outputParameterRouteRes[entries2].ROUTE_ID, 10);
            	outputParameterRouteRes[entries2].QUANTITY = parseInt(outputParameterRouteRes[entries2].QUANTITY, 10);
            	outputParameterRouteRes[entries2].TOTAL_COST = parseInt(outputParameterRouteRes[entries2].TOTAL_COST, 10);
            	outputParameterRouteRes[entries2].FROM_TIME = new Date(outputParameterRouteRes[entries2].FROM_TIME);
            	outputParameterRouteRes[entries2].TO_TIME = new Date(outputParameterRouteRes[entries2].TO_TIME);
            }
        }
        expect(result.FLAG).toBe('OPTIMAL SOLUTION');
        expect(result.T_ROUTE_RES.toString()).toBe(outputParameterRouteRes.toString());
    });
    
});
