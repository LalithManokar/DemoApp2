var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");

var SCHEMA = 'SAP_TM_TRP';
var procName = "sap.tm.trp.db.pickupreturn.algorithm::p_pickup_optimize";

var csvProperties = {
    separator: ",",
    headers: true
};


function returnTableContainsRouteIdBookingId(returnTable, correctResult) {

    var tableResults = new Array(100);
    for (var i = 0; i < tableResults.length; i++) {
        tableResults[i] = new Array(2);
    }

    for (var rowNumber in returnTable) {
        var row = returnTable[rowNumber];
        if (row.hasOwnProperty("BOOKING_ID") && row.hasOwnProperty("FROM_LOCATION")) {
            tableResults[rowNumber][0] = row.BOOKING_ID;
            tableResults[rowNumber][1] = row.FROM_LOCATION;
        }
    }

    for (var j in correctResult) {
        var found = false;
        loop: for (var k in tableResults) {
            if (correctResult[j][0] == tableResults[k][0]) {
                if (correctResult[j][1] == tableResults[k][1]) {
                    found = true;
                    break loop;
                }
            }
        }
        if (found === false) {
            return false;
        }
    }

    //all ROUTE_IDs and BOOKING_IDs found
    return true;
}


/*global jasmine, describe, beforeOnce, it, expect*/
describe('this test suite tests procedure "p_pickup"', function() {

    it('case 1', function() {

        //data packages
        var dataPackage = "sap.tm.trp.db.tests.pickupreturn.algorithm.data_haulage.pickup_case01";

        //create the input parameters
        var inputParameterMode = 'BALANCING';
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "trans_01.csv", csvProperties);
        var inputParameterConf = csvParser.csvToObjects(dataPackage, "conf_01.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "supply_demand_01.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "booking_01.csv", csvProperties);
        var inputParameterStockConf = csvParser.csvToObjects(dataPackage, "stock_conf_01.csv", csvProperties);
        var inputParameterDepotCost = csvParser.csvToObjects(dataPackage, "depot_cost_01.csv", csvProperties);
        var inputParameterProvisionStock = csvParser.csvToObjects(dataPackage, "provision_stock_01.csv", csvProperties);

        //execute 
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
            inputParameterMode,
            inputParameterTrans,
            inputParameterConf,
            inputParameterSupplyDemand,
            inputParameterBooking,
            inputParameterStockConf,
            inputParameterDepotCost,
            inputParameterProvisionStock
        );
       

        //  [BOOKING_ID, FROM_LOCATION]
        var correctResult = [
            ['b123', 'A'],
            ['b125', 'A']
        ];

        var success = returnTableContainsRouteIdBookingId(result.T_FULFILL_BOOKING, correctResult);
        expect(success).toBe(true);
    });
    
    it('case 2', function() {

        //data packages
        var dataPackage = "sap.tm.trp.db.tests.pickupreturn.algorithm.data_haulage.pickup_case02";

        //create the input parameters
        var inputParameterMode = 'BALANCING';
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "trans_02.csv", csvProperties);
        var inputParameterConf = csvParser.csvToObjects(dataPackage, "conf_02.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "supply_demand_02.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "booking_02.csv", csvProperties);
        var inputParameterStockConf = csvParser.csvToObjects(dataPackage, "stock_conf_02.csv", csvProperties);
        var inputParameterDepotCost = csvParser.csvToObjects(dataPackage, "depot_cost_02.csv", csvProperties);
        var inputParameterProvisionStock = csvParser.csvToObjects(dataPackage, "provision_stock_02.csv", csvProperties);

        //execute 
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
            inputParameterMode,
            inputParameterTrans,
            inputParameterConf,
            inputParameterSupplyDemand,
            inputParameterBooking,
            inputParameterStockConf,
            inputParameterDepotCost,
            inputParameterProvisionStock
        );


        //  [BOOKING_ID, FROM_LOCATION]
        var correctResult = [
            ['bp1', 'Dep1'],
            ['bp2', 'Dep1'],
            ['bp3', 'Dep2'],
            ['bp4', 'Dep2']
        ];

        var success = returnTableContainsRouteIdBookingId(result.T_FULFILL_BOOKING, correctResult);
        expect(success).toBe(true);
    });
    
    it('case 3', function() {

        //data packages
        var dataPackage = "sap.tm.trp.db.tests.pickupreturn.algorithm.data_haulage.pickup_case03";

        //create the input parameters
        var inputParameterMode = 'BALANCING';
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "trans_03.csv", csvProperties);
        var inputParameterConf = csvParser.csvToObjects(dataPackage, "conf_03.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "supply_demand_03.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "booking_03.csv", csvProperties);
        var inputParameterStockConf = csvParser.csvToObjects(dataPackage, "stock_conf_03.csv", csvProperties);
        var inputParameterDepotCost = csvParser.csvToObjects(dataPackage, "depot_cost_03.csv", csvProperties);
        var inputParameterProvisionStock = csvParser.csvToObjects(dataPackage, "provision_stock_03.csv", csvProperties);

        //execute 
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
            inputParameterMode,
            inputParameterTrans,
            inputParameterConf,
            inputParameterSupplyDemand,
            inputParameterBooking,
            inputParameterStockConf,
            inputParameterDepotCost,
            inputParameterProvisionStock
        );

        //  [BOOKING_ID, FROM_LOCATION]
        var correctResult = [
            ['bp1', 'Dep2'],
            ['bp2', 'Dep2'],
            ['bp3', 'Dep3'],
            ['bp4', 'Dep3'],
            ['bp5', 'Dep3']
        ];

        var success = returnTableContainsRouteIdBookingId(result.T_FULFILL_BOOKING, correctResult);
        expect(success).toBe(true);
    });
    
    
    it('case 4', function() {

        //data packages
        var dataPackage = "sap.tm.trp.db.tests.pickupreturn.algorithm.data_haulage.pickup_case04";

        //create the input parameters
        var inputParameterMode = 'BALANCING';
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "trans_04.csv", csvProperties);
        var inputParameterConf = csvParser.csvToObjects(dataPackage, "conf_04.csv", csvProperties);
        var inputParameterSupplyDemand = csvParser.csvToObjects(dataPackage, "supply_demand_04.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "booking_04.csv", csvProperties);
        var inputParameterStockConf = csvParser.csvToObjects(dataPackage, "stock_conf_04.csv", csvProperties);
        var inputParameterDepotCost = csvParser.csvToObjects(dataPackage, "depot_cost_04.csv", csvProperties);
        var inputParameterProvisionStock = csvParser.csvToObjects(dataPackage, "provision_stock_04.csv", csvProperties);

        //execute 
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
            inputParameterMode,
            inputParameterTrans,
            inputParameterConf,
            inputParameterSupplyDemand,
            inputParameterBooking,
            inputParameterStockConf,
            inputParameterDepotCost,
            inputParameterProvisionStock
        );

        //  [BOOKING_ID, FROM_LOCATION]
        var correctResult = [
            ['bp1', 'Dep1'],
            ['bp2', 'Dep1'],
            ['bp3', 'Dep2'],
            ['bp4', 'Dep2'],
            ['bp5', 'Dep3']
        ];

        var success = returnTableContainsRouteIdBookingId(result.T_FULFILL_BOOKING, correctResult);
        expect(success).toBe(true);
    });
   

});