var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("User Setting Unit Test", function() {
    var sqlExecutor;
    var connection;
    var username;
    var userId;

    beforeEach(function(){
        connection = $.db.getConnection();
        connection.setAutoCommit(false);
        sqlExecutor = new SqlExecutor(connection);

        var result = sqlExecutor.execQuery('SELECT "sap.tm.trp.db.systemmanagement.user::s_user".NEXTVAL AS USER_ID FROM DUMMY');

        userId = Number(result.getRow(0).USER_ID);
        username = "TEST_USER_" + userId;

        sqlExecutor.execSingle("CREATE USER " + username + " PASSWORD Initial0");
        sqlExecutor.execSingle("INSERT INTO \"sap.tm.trp.db.systemmanagement.user::t_user\" (ID, USERNAME) VALUES (" + userId + ", '" + username + "')");

        connection.commit();
    });

    afterEach(function(){
        sqlExecutor.execSingle("DROP USER " + username);
        sqlExecutor.execSingle("DELETE FROM \"sap.tm.trp.db.systemmanagement.user::t_user\" WHERE ID = " + userId);
        sqlExecutor.execSingle('DELETE FROM "sap.tm.trp.db.systemmanagement.user::t_user_role" WHERE USER_ID = ' + userId);

        connection.close();
    });

    it("should update user profile by admin", function() {
        var requestBody = '{\
            "TEMPERATURE_UNIT_CODE":"GC",\
            "DISTANCE_CODE":"CM",\
            "VOLUME_UNIT_CODE":"3G",\
            "WEIGHT_UNIT_CODE":"G",\
            "ROLES":[\
                {"ID":"11003","NAME":"DEPOT_ZJ_LN"}\
            ]}';

        var headers = {
            "Content-Type" : "application/json"
        };

        var response = jasmine.callHTTPService("/sap/tm/trp/service/admin/users.json/" + userId, $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code
        // check the database table
        var userTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_user" WHERE ID = ' + userId);
        expect(userTable.getRowCount()).toBe(1);

        var row = userTable.getRow(0);
        expect(row.TEMPERATURE_UNIT_CODE).toBe("GC");
        expect(row.DISTANCE_CODE).toBe("CM");
        expect(row.VOLUMN_UNIT_CODE).toBe("3G");
        expect(row.WEIGHT_UNIT_CODE).toBe("G");

        var roleTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_user_role" WHERE USER_ID = ' + userId);
        expect(roleTable.getRowCount()).toBe(1);

        row = roleTable.getRow(0);
        expect(Number(row.USER_ID)).toBe(userId);
        expect(Number(row.ROLE_ID)).toBe(11003);
    });

    it("should update user itself profile", function() {
        var requestBody = '{"TEMPERATURE_UNIT_CODE":"GC","DISTANCE_CODE":"CM","VOLUME_UNIT_CODE":"3G","WEIGHT_UNIT_CODE":"G"}';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/profile.json", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        // check the database table
        var userTable = sqlExecutor.execQuery('SELECT * FROM "sap.tm.trp.db.systemmanagement.user::t_user" WHERE USERNAME = \'' + $.session.getUsername() + "'");
        expect(userTable.getRowCount()).toBe(1);

        var row = userTable.getRow(0);
        expect(row.TEMPERATURE_UNIT_CODE).toBe("GC");
        expect(row.DISTANCE_CODE).toBe("CM");
        expect(row.VOLUMN_UNIT_CODE).toBe("3G");
        expect(row.WEIGHT_UNIT_CODE).toBe("G");
    });

});