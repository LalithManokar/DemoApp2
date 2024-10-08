/*global jasmine, describe, beforeOnce, beforeEach, xit, it, expect*/
var SqlExecutor = $.import("sap.hana.testtools.unit.util", "sqlExecutor").SqlExecutor;
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var TableUtils = $.import("sap.hana.testtools.unit.util", "tableUtils").TableUtils;
var mockstarEnvironment = $.import("sap.hana.testtools.mockstar", "mockstarEnvironment");

describe("sap.tm.trp.db.equipment::p_get_stock_table Unit Test", function() {

    var testEnvironment = null;
    var testProcedure = "sap.tm.trp.db.equipment::p_get_stock_table";

    var TM = "SAPX0M";
    var p_stock_table;
    beforeOnce(function() {
        var definition = {
            mockstarProperties : {
                truncOption : mockstarEnvironment.TruncOptions.FULL
            },
            schema : "SAP_TM_TRP",
            model : {
                name : testProcedure
            },
            substituteTables : {
            	RESTMSHD: {
                    name: "/SCMB/RESTMSHD",
                    schema: TM
                },
                TOENTITY: {
                    name: "/SCMB/TOENTITY",
                    schema: TM
                },
                RES_SHTRK: {
                    name: "/TRP/RES_SHTRK",
                    schema: TM
                },
                EQUI_CODET: {
                    name: "/SCMB/EQUI_CODET",
                    schema: TM
                },
                EQUI_CODE: {
                    name: "/SCMB/EQUI_CODE",
                    schema: TM
                }
            },
            substituteViews : {
                // v_resource_category: {
                //     name: "sap.tm.trp.db.systemmanagement::v_resource_category",
                //     schema: "SAP_TM_TRP"
                // },
                v_location: {
                    name: "sap.tm.trp.db.systemmanagement.location::v_location",
                    schema: "SAP_TM_TRP"
                }//,
                //  v_client_code: {
                //      name: "sap.tm.trp.db.systemmanagement::v_client_code",
                //      schema: "SAP_TM_TRP"
                //  }
            },
            csvPackage: "sap.tm.trp.db.tests.stock.data"
        };
        testEnvironment = mockstarEnvironment.defineAndCreate(definition);
        
        var conn = $.db.getConnection();
        p_stock_table = new Procedure(
				mockstarEnvironment.userSchema,
				testEnvironment.targetPackage +"::p_get_stock_table", 
				{
					connection: conn,
					tempSchema: mockstarEnvironment.userSchema
				}
			);
    });

    beforeEach(function() {
        testEnvironment.clearAllTestTables();
    });

    it("length should be greater than 0", function() {

        var sqlExecutor = new SqlExecutor(jasmine.dbConnection);
        var tableUtils = new TableUtils(jasmine.dbConnection);
        
        var NODE_ID_LIST = [];
        var RESOURCE_TYPE_LIST = [{RESOURCE_ID: "20ST", RESOURCE_NAME: "20ST", RESOURCE_TYPE: 1}];
        var LOCATION_ID_LIST = [{ID: "RAwBT8cq7jIXpPfsLvtsvG", NAME: "CNCWNDKFT",TYPE: 1}];
        
         testEnvironment.fillTestTableFromCsv("EQUI_CODE", "EQUI_CODE.csv");
         testEnvironment.fillTestTableFromCsv("EQUI_CODET", "EQUI_CODET.csv");
         testEnvironment.fillTestTableFromCsv("RES_SHTRK", "RES_SHTRK.csv");
         testEnvironment.fillTestTableFromCsv("TOENTITY", "TOENTITY.csv");
         testEnvironment.fillTestTableFromCsv("RESTMSHD", "RESTMSHD.csv");
         testEnvironment.fillTestTableFromCsv("v_location", "v_location_for_stock_table.csv");
        
        var result = p_stock_table(
                -1,
                -1,
                106,
                'CN',
                NODE_ID_LIST,
                RESOURCE_TYPE_LIST,
                LOCATION_ID_LIST
            );
        var stock = result.OUTPUT_STOCK.length;
        expect(stock).toBeGreaterThan(0);


    });
});