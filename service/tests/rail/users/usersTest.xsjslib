var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var Proc = $.import("sap.tm.trp.service.xslib", "procedures");
/*
 * Executing this test requires (needs to be done by system administrator):
 *  - Assertion Tickets set up for this HANA instance
 *  - Logon via SAP Assertion Tickets enabled for your user
 *  - Logon via Logon Tickets enabled for your application
 *  - Update HTTP destination sap.hana.testtools.unit.jasminexs:localhost.xshttpdest
 */
describe('User Unit Test ', function() {

	function getResponseBody(response) {
		var body = response.body ? response.body.asString() : "";
		return JSON.parse(body);
	}
	
    var url = "/sap/tm/trp/service/odata.xsodata";
    var schema = 'SAP_TM_TRP';

    beforeEach(function(){
    });


    afterEach(function(){
    });

    it("should be only 1 role", function() {
        //insert mock data 
        var insertMockDataSP = new Proc.procedure(schema, "sap.tm.trp.service.tests.rail.users::p_insert_mockdata");
        var userID = insertMockDataSP().USERID;
       
        var response = jasmine.callHTTPService(url + "/Users(" + userID + "L)/Roles?$format=json");
        expect(response.status).toBe($.net.http.OK);
        var responseBody = getResponseBody(response);
        expect(responseBody.d.results.length).toBe(1);
        
        //delete mock data
        var deleteMockDataSP = new Proc.procedure(schema, "sap.tm.trp.service.tests.rail.users::p_delete_mockdata");
        deleteMockDataSP();
    });


});