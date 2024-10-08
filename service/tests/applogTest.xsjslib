/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Application Log Unit Test", function() {
    var applog;
    var sqlExecutor;
    var connection;

    beforeOnce(function() {
        Object.defineProperty($.request, "path", {
            writable: true,
            configurable: true
        });

        $.request.path = undefined;
    });

    beforeEach(function() {
        applog = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
    });

    afterEach(function() {
        applog.close();
        connection.close();
    });

    afterOnce(function() {
        Object.defineProperty($.request, "path", {
            writable: false,
            configurable: false
        });
    });

    function getAppLog(parameterValue) {
        var query = 'SELECT a."OriginatorObject.Code",\
            a."OriginatorSubObject.ParentObject.Code",\
            a."ExternalID",\
            a."ClosureStatus.Code",\
            b."Message.Bundle",\
            b."Message.Key",\
            b."Message.SeverityCode",\
            c."ParameterType.Code",\
            c."ParameterValue.String"\
            FROM \"sap.tm.trp.applog.db::AppLogHeader" AS a\
            INNER JOIN "sap.tm.trp.applog.db::AppLogItem" AS b\
            ON a."LogHandle.ID" = b."_Header.ID"\
            INNER JOIN "sap.tm.trp.applog.db::AppLogItemMsgParam" AS c\
            ON a."LogHandle.ID" = c."_Header.ID" \
            AND c."ParameterValue.String" = \'' + parameterValue + '\'';

        return sqlExecutor.execQuery(query);
    }

    it("should have correct interfaces", function() {
        expect(applog.logger).toBeDefined();
        expect(applog.info).toBeDefined();
        expect(applog.error).toBeDefined();
        expect(applog.success).toBeDefined();
        expect(applog.warn).toBeDefined();
        expect(applog.commit).toBeDefined();
        expect(applog.getHandle).toBeDefined();
        expect(applog.close).toBeDefined();
        expect(applog.Parameter.Integer).toBeDefined();
        expect(applog.Parameter.Exception).toBeDefined();
        expect(applog.Parameter.DateTime).toBeDefined();
        expect(applog.Parameter.Amount).toBeDefined();
        expect(applog.Parameter.Duration).toBeDefined();
        expect(applog.Parameter.String).toBeDefined();
    });

    it("should log info level log", function() {
        var magicFlag = "---CREATE_NEXT_SCHEDULE_GET_FLAG_" + (new Date()).getTime() + "---";
        applog.info("CREATE_NEXT_SCHEDULE_GET_FLAG", magicFlag);
        applog.close();

        var result = getAppLog(magicFlag);

        expect(result.getRowCount()).toBe(1);

        var row = result.getRow(0);

        expect(row["OriginatorObject.Code"]).toBe("TRP");
        expect(row["ClosureStatus.Code"]).toBe(2);
        expect(row["Message.Bundle"]).toBe("jobManagement");
        expect(row["Message.Key"]).toBe("CREATE_NEXT_SCHEDULE_GET_FLAG");
        expect(row["Message.SeverityCode"]).toBe(2);
        expect(row["ParameterType.Code"]).toBe(0);
        expect(row["ParameterValue.String"]).toBe(magicFlag);

    });

    it("should log success level log", function() {
        var magicFlag = "---CREATE_NEXT_SCHEDULE_GET_FLAG_" + (new Date()).getTime() + "---";
        applog.success("CREATE_NEXT_SCHEDULE_GET_FLAG", magicFlag);
        applog.close();

        var result = getAppLog(magicFlag);

        expect(result.getRowCount()).toBe(1);

        var row = result.getRow(0);

        expect(row["OriginatorObject.Code"]).toBe("TRP");
        expect(row["ClosureStatus.Code"]).toBe(2);
        expect(row["Message.Bundle"]).toBe("jobManagement");
        expect(row["Message.Key"]).toBe("CREATE_NEXT_SCHEDULE_GET_FLAG");
        expect(row["Message.SeverityCode"]).toBe(1);
        expect(row["ParameterType.Code"]).toBe(0);
        expect(row["ParameterValue.String"]).toBe(magicFlag);

    });

    it("should log warn level log", function() {
        var magicFlag = "---CREATE_NEXT_SCHEDULE_GET_FLAG_" + (new Date()).getTime() + "---";
        applog.warn("CREATE_NEXT_SCHEDULE_GET_FLAG", magicFlag);
        applog.close();

        var result = getAppLog(magicFlag);

        expect(result.getRowCount()).toBe(1);

        var row = result.getRow(0);

        expect(row["OriginatorObject.Code"]).toBe("TRP");
        expect(row["ClosureStatus.Code"]).toBe(2);
        expect(row["Message.Bundle"]).toBe("jobManagement");
        expect(row["Message.Key"]).toBe("CREATE_NEXT_SCHEDULE_GET_FLAG");
        expect(row["Message.SeverityCode"]).toBe(3);
        expect(row["ParameterType.Code"]).toBe(0);
        expect(row["ParameterValue.String"]).toBe(magicFlag);

    });

    it("should log error level log", function() {
        var magicFlag = "---CREATE_NEXT_SCHEDULE_GET_FLAG_" + (new Date()).getTime() + "---";
        applog.error("CREATE_NEXT_SCHEDULE_GET_FLAG", magicFlag);
        applog.close();

        var result = getAppLog(magicFlag);

        expect(result.getRowCount()).toBe(1);

        var row = result.getRow(0);

        expect(row["OriginatorObject.Code"]).toBe("TRP");
        expect(row["ClosureStatus.Code"]).toBe(2);
        expect(row["Message.Bundle"]).toBe("jobManagement");
        expect(row["Message.Key"]).toBe("CREATE_NEXT_SCHEDULE_GET_FLAG");
        expect(row["Message.SeverityCode"]).toBe(4);
        expect(row["ParameterType.Code"]).toBe(0);
        expect(row["ParameterValue.String"]).toBe(magicFlag);

    });

    it("should recognize exception type log parameter", function() {
        var magicFlag = new Error("---CREATE_NEXT_SCHEDULE_GET_FLAG_" + (new Date()).getTime() + "---");
        applog.error("CREATE_NEXT_SCHEDULE_GET_FLAG", magicFlag);
        applog.close();

        var result = getAppLog(magicFlag.message);

        expect(result.getRowCount()).toBe(1);

        var row = result.getRow(0);

        expect(row["OriginatorObject.Code"]).toBe("TRP");
        expect(row["ClosureStatus.Code"]).toBe(2);
        expect(row["Message.Bundle"]).toBe("jobManagement");
        expect(row["Message.Key"]).toBe("CREATE_NEXT_SCHEDULE_GET_FLAG");
        expect(row["Message.SeverityCode"]).toBe(4);
        expect(row["ParameterType.Code"]).toBe(0);
        expect(row["ParameterValue.String"]).toBe(magicFlag.message);

    });
});