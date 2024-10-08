var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;

describe("Empty Bookings Unit Test", function() {
    var sqlExecutor;
    var connection;
    
    beforeEach(function(){
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
    });
    
    afterEach(function(){
        connection.close();
    });
    
    it("should get list of empty bookings", function() {
        var headers = {
            "Accept" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/odata.xsodata/EmptyBookingMasterTableParameters(LOCATION_FILTER_ID=129,EQUIPMENT_FILTER_ID=134,FILTER_ON=0,FROM_DATE=datetime'',TO_DATE=datetime'',BOOKING_TYPE='',LOCATION='',EQUIPMENT_TYPE='',DATA_PROVIDER_TYPE='')/Results?$skip=0&$top=129&$orderby=ORDER_ID%20asc", $.net.http.GET, null, headers);
        expect(response.status).toBe($.net.http.OK); 
        
        var body = JSON.parse(response.body.asString());
        
        expect(body.d.results).toBeDefined();
        expect(body.d.results.length).toBeGreaterThan(0);
        expect(body.d.results[0].ORDER_ID).toBeDefined();
    });
    
});
