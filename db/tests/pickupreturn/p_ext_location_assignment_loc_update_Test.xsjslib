/*global jasmine, describe, beforeOnce, beforeEach, xit, it, expect*/
var SqlExecutor = $.import("sap.hana.testtools.unit.util", "sqlExecutor").SqlExecutor;
var TableUtils = $.import("sap.hana.testtools.unit.util", "tableUtils").TableUtils;
var mockstarEnvironment = $.import("sap.hana.testtools.mockstar", "mockstarEnvironment");

describe("sap.tm.trp.db.pickupreturn::p_ext_location_assignment_loc_update Unit Test", function() {

    var testEnvironment = null;
    var testProcedure = "sap.tm.trp.db.pickupreturn::p_ext_location_assignment_loc_update";

    var TU_ID = "000001";
    var USERNAME = "TRPADM";

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
                t_location_rule_assignment_draft: {
                    name: "sap.tm.trp.db.pickupreturn::t_location_rule_assignment_draft",
                    schema: "SAP_TM_TRP"
                },
                t_location_assignment_rule: {
                    name: "sap.tm.trp.db.pickupreturn::t_location_assignment_rule",
                    schema: "SAP_TM_TRP"
                }
            },
            substituteViews : {
                v_location: {
                    name: "sap.tm.trp.db.semantic.location::v_location",
                    schema: "SAP_TM_TRP"
                },
                v_user_location_all_ui: {
                    name: "sap.tm.trp.db.systemmanagement.user::cv_user_location_all_ui",
                    schema: "SAP_TM_TRP"
                },
                cv_get_username: {
                    name: "sap.tm.trp.db.systemmanagement.user/cv_get_username",
                    schema: "_SYS_BIC"
                }
            },
            csvPackage: "sap.tm.trp.db.tests.pickupreturn"
        };
        testEnvironment = mockstarEnvironment.define(definition);
        testEnvironment.addProcedureSubstitution("CompareCapacity", {
            schema : "SAP_TM_TRP",
            name : "sap.tm.trp.db.pickupreturn::p_required_compare_capacity",
            testProcedure : '"sap.tm.trp.db.tests.pickupreturn::_CompareCapacity"'
        });
        testEnvironment.addProcedureSubstitution("GetStagingTU", {
            schema : "SAP_TM_TRP",
            name : "sap.tm.trp.db.pickupreturn::p_ext_get_staging_tu",
            testProcedure : '"sap.tm.trp.db.tests.pickupreturn::_GetStagingTU"'
        });

        testEnvironment.create();
    });

    beforeEach(function() {
        testEnvironment.clearAllTestTables();
    });

    it("should clear previous assign location if location is empty", function() {
        var assignment = {
            RULE_ID: 1,
            USER: USERNAME,
            TU_ID: TU_ID,
            PRE_LOCATION_ID: "Shanghai",
            ASSIGN_STATUS: 1,
            FLAG: 1
        };

        testEnvironment.fillTestTable("t_location_rule_assignment_draft", assignment);
        testEnvironment.fillTestTableFromCsv("cv_get_username", "cv_get_username.csv");

        var sqlExecutor = new SqlExecutor(jasmine.dbConnection);
        var tableUtils = new TableUtils(jasmine.dbConnection);

        var inTU = tableUtils.createTemporaryTable("TU", "SAP_TM_TRP", "sap.tm.trp.db.pickupreturn::tt_tu_list", {TU_ID: TU_ID});
        var outInvalid = tableUtils.createTemporaryTable("Invalid", "SAP_TM_TRP", "sap.tm.trp.db.pickupreturn::tt_tu_assign_status");
        var outSuccess = tableUtils.createTemporaryTable("Success", "SAP_TM_TRP", "sap.tm.trp.db.pickupreturn::tt_tu_assign_status");

        var sql = "CALL " + testEnvironment.getTestModelName() + "(1, " + inTU + ",'',?," + outInvalid + "," + outSuccess +") WITH OVERVIEW";
        sqlExecutor.callProcedure(sql);
        var invalid = sqlExecutor.execQuery("SELECT * FROM " + outInvalid);
        expect(invalid.getRowCount()).toBe(0);

        var success = sqlExecutor.execQuery("SELECT * FROM " + outSuccess);
        expect(success.getRowCount()).toBe(0);

        var draft = sqlExecutor.execQuery('SELECT * FROM ' + mockstarEnvironment.userSchema + '."sap.tm.trp.db.pickupreturn::t_location_rule_assignment_draft"');
        expect(draft.getRowCount()).toBe(1);
        var row = draft.getRow(0);

        expect(row.PRE_LOCATION_ID).toBe("");
        expect(row.ASSIGN_STATUS).toBe(0);
        expect(row.FLAG).toBe(0);

    });
});