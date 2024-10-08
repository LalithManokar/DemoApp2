var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");

var SCHEMA = 'SAP_TM_TRP';
var procName = "sap.tm.trp.db.streetturn.algorithm::p_streetturn_suggest";


/*global jasmine, describe, beforeOnce, it, expect*/
describe('this test suit tests the content of the result tables', function() {

    beforeOnce(function() {});

    beforeEach(function() {});

    it('case01', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.streetturn.algorithm.data.case01";

        // create the three input parameters
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "t_trans.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "t_booking.csv", csvProperties);
        var inputParameterDec = csvParser.csvToObjects(dataPackage, "t_dec.csv", csvProperties);

        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
        		1,
        		inputParameterTrans,
        		inputParameterBooking,
        		inputParameterDec);


        //create the 1 output parameters
        var outputParameterPair = csvParser.csvToObjects(dataPackage, "t_pair.csv", csvProperties);

        expect(result.T_PAIR.toString()).toBe(outputParameterPair.toString());
    });
    
    it('case02', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.streetturn.algorithm.data.case02";

        // create the three input parameters
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "t_trans.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "t_booking.csv", csvProperties);
        var inputParameterDec = csvParser.csvToObjects(dataPackage, "t_dec.csv", csvProperties);

        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
        		1,
        		inputParameterTrans,
        		inputParameterBooking,
        		inputParameterDec);


        //create the 1 output parameters
        var outputParameterPair = csvParser.csvToObjects(dataPackage, "t_pair.csv", csvProperties);

        expect(result.T_PAIR.toString()).toBe(outputParameterPair.toString());
    });
    
    it('case03', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.streetturn.algorithm.data.case03";

        // create the three input parameters
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "t_trans.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "t_booking.csv", csvProperties);
        var inputParameterDec = csvParser.csvToObjects(dataPackage, "t_dec.csv", csvProperties);

        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
        		1,
        		inputParameterTrans,
        		inputParameterBooking,
        		inputParameterDec);


        //create the 1 output parameters
        var outputParameterPair = csvParser.csvToObjects(dataPackage, "t_pair.csv", csvProperties);

        expect(result.T_PAIR.toString()).toBe(outputParameterPair.toString());
    });
    
    it('case04', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.streetturn.algorithm.data.case04";

        // create the three input parameters
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "t_trans.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "t_booking.csv", csvProperties);
        var inputParameterDec = csvParser.csvToObjects(dataPackage, "t_dec.csv", csvProperties);

        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
        		1,
        		inputParameterTrans,
        		inputParameterBooking,
        		inputParameterDec);


        //create the 1 output parameters
        var outputParameterPair = csvParser.csvToObjects(dataPackage, "t_pair.csv", csvProperties);

        expect(result.T_PAIR.toString()).toBe(outputParameterPair.toString());
    });
    
    it('case05', function() {

        var csvProperties = {
            separator: ",",
            headers: true
        };

        var dataPackage = "sap.tm.trp.db.tests.streetturn.algorithm.data.case05";

        // create the three input parameters
        var inputParameterTrans = csvParser.csvToObjects(dataPackage, "t_trans.csv", csvProperties);
        var inputParameterBooking = csvParser.csvToObjects(dataPackage, "t_booking.csv", csvProperties);
        var inputParameterDec = csvParser.csvToObjects(dataPackage, "t_dec.csv", csvProperties);

        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });

        var result = executeSP(
        		1,
        		inputParameterTrans,
        		inputParameterBooking,
        		inputParameterDec);


        //create the 1 output parameters
        var outputParameterPair = csvParser.csvToObjects(dataPackage, "t_pair.csv", csvProperties);

        expect(result.T_PAIR.toString()).toBe(outputParameterPair.toString());
    });
});