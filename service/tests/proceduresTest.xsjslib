/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import("sap.hana.testtools.unit.util", "sqlExecutor").SqlExecutor;
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");

describe("Procedure Library Unit Test", function() {
    var sqlExecutor;
    var connection;

    beforeOnce(function() {
        connection = $.db.getConnection();
        connection.setAutoCommit(false);
        sqlExecutor = new SqlExecutor(connection);
        sqlExecutor.execSingleIgnoreFailing("DROP SCHEMA TEST_PROC_LIB_SCHEMA CASCADE");
        sqlExecutor.execSingleIgnoreFailing("CREATE SCHEMA TEST_PROC_LIB_SCHEMA");
        sqlExecutor.execSingle("SET TRANSACTION AUTOCOMMIT DDL OFF");
    });

    beforeEach(function() {
        sqlExecutor.execSingle("CREATE TYPE TEST_PROC_LIB_SCHEMA.DUMMY_TYPE AS TABLE ( VAL INT CS_INT)");

        var sql = "\
            CREATE PROCEDURE TEST_PROC_LIB_SCHEMA.DUMMY_PROC (\
                    IN IN_PARAM TEST_PROC_LIB_SCHEMA.DUMMY_TYPE, \
                    OUT OUT_PARAM_SCALAR INTEGER, \
                    OUT OUT_PARAM TEST_PROC_LIB_SCHEMA.DUMMY_TYPE, \
                    OUT OUT_PARAM_SCALAR_1 INTEGER)\
            READS SQL DATA AS\
            BEGIN\
                OUT_PARAM = SELECT * FROM :IN_PARAM UNION ALL SELECT * FROM :IN_PARAM;\
                OUT_PARAM_SCALAR := 1;\
                OUT_PARAM_SCALAR_1 := 2;\
            END;";

        sqlExecutor.execSingle(sql);
    });

    afterEach(function() {
        connection.rollback();
    });

    afterOnce(function() {
        sqlExecutor.execSingleIgnoreFailing("DROP SCHEMA TEST_PROC_LIB_SCHEMA CASCADE");
        connection.close();
    });

    it("should be able to disable native output", function() {
        var dummy = new proc.procedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC", {
            overview: true,
            connection: connection
        });

        var result = dummy([{VAL: 1}]);

        expect(result.OUT_PARAM_SCALAR).toBe(1);
        expect(result.OUT_PARAM_SCALAR_1).toBe(2);
        expect(result.OUT_PARAM).toBeDefined();
        expect(typeof result.OUT_PARAM).toBe("string");

    });

    it("should be able to use object as parameter", function() {
        var dummy = new proc.procedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC", {
            connection: connection
        });

        var result = dummy({IN_PARAM: [{VAL: 1}]});

        expect(result.OUT_PARAM_SCALAR).toBe(1);
        expect(result.OUT_PARAM_SCALAR_1).toBe(2);
        expect(result.OUT_PARAM).toEqual([{VAL: 1}, {VAL: 1}]);
    });

    it("should be able to use physical table as input directly", function() {
        sqlExecutor.execSingle("CREATE TABLE TEST_PROC_LIB_SCHEMA.DUMMY_TABLE LIKE TEST_PROC_LIB_SCHEMA.DUMMY_TYPE");
        sqlExecutor.execSingle("INSERT INTO TEST_PROC_LIB_SCHEMA.DUMMY_TABLE VALUES (1)");

        var dummy = new proc.procedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC", {
            connection: connection
        });

        var result = dummy('"TEST_PROC_LIB_SCHEMA"."DUMMY_TABLE"');

        expect(result.OUT_PARAM_SCALAR).toBe(1);
        expect(result.OUT_PARAM_SCALAR_1).toBe(2);
        expect(result.OUT_PARAM).toEqual([{VAL: 1}, {VAL: 1}]);
    });

    it("should be able to combine both object parameter and physical table as its input", function() {
        sqlExecutor.execSingle("CREATE TABLE TEST_PROC_LIB_SCHEMA.DUMMY_TABLE LIKE TEST_PROC_LIB_SCHEMA.DUMMY_TYPE");
        sqlExecutor.execSingle("INSERT INTO TEST_PROC_LIB_SCHEMA.DUMMY_TABLE VALUES (1)");

        var dummy = new proc.procedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC", {
            connection: connection
        });

        var result = dummy({IN_PARAM: '"TEST_PROC_LIB_SCHEMA"."DUMMY_TABLE"'});

        expect(result.OUT_PARAM_SCALAR).toBe(1);
        expect(result.OUT_PARAM_SCALAR_1).toBe(2);
        expect(result.OUT_PARAM).toEqual([{VAL: 1}, {VAL: 1}]);
    });

    it("should be able to use the new interface", function() {
        sqlExecutor.execSingle("CREATE TABLE TEST_PROC_LIB_SCHEMA.DUMMY_TABLE LIKE TEST_PROC_LIB_SCHEMA.DUMMY_TYPE");
        sqlExecutor.execSingle("INSERT INTO TEST_PROC_LIB_SCHEMA.DUMMY_TABLE VALUES (1)");

        var dummy = proc.defineProcedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC", {
            connection: connection
        });

        var result = dummy({IN_PARAM: '"TEST_PROC_LIB_SCHEMA"."DUMMY_TABLE"'});

        expect(result.OUT_PARAM_SCALAR).toBe(1);
        expect(result.OUT_PARAM_SCALAR_1).toBe(2);
        expect(result.OUT_PARAM).toEqual([{VAL: 1}, {VAL: 1}]);
    });

    it("should be able to work with inline table type", function() {
        var sql = "\
            CREATE PROCEDURE TEST_PROC_LIB_SCHEMA.DUMMY_PROC_INLINE (\
                    IN IN_PARAM TABLE (NAME VARCHAR(100)), \
                    OUT OUT_PARAM TABLE (NAME VARCHAR(100)) )\
            READS SQL DATA AS\
            BEGIN\
                OUT_PARAM = SELECT * FROM :IN_PARAM UNION ALL SELECT 'Morty' AS NAME FROM DUMMY;\
            END;";

        sqlExecutor.execSingle(sql);

        var dummy = new proc.Procedure("TEST_PROC_LIB_SCHEMA", "DUMMY_PROC_INLINE", {
            connection: connection
        });

        var result = dummy([{NAME: "Rick"}]);

        expect(result.OUT_PARAM).toEqual([{NAME: "Rick"}, {NAME: "Morty"}]);
    });

});