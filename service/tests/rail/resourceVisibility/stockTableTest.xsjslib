var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");

var SCHEMA = 'SAP_TM_TRP';
var procName = "sap.tm.trp.db.equipment::p_get_stock_table";


describe('Unit test for get stock table', function() {

    beforeOnce(function() {});

    beforeEach(function() {});

    it('should return stock table data', function() {
        var csvProperties = {
            separator: ",",
            headers: true
        };
        
        var attributeGroupId = -1;
        var locationFilterId = 158;
        var resourceFilterId = 150;
        
        var dataPackage = "sap.tm.trp.service.tests.rail.resourceVisibility";
        
        var locations = csvParser.csvToObjects(dataPackage, "locations.csv", csvProperties);
        var resourceTypeList = [];
        var nodeIdList = [];
        
        var executeSP = new proc.procedure(SCHEMA, procName, {
            tempSchema: "SAP_TM_TRP"
        });
        
        var result = executeSP(attributeGroupId,
        		resourceFilterId,
        		locationFilterId,
        		nodeIdList,
        		resourceTypeList,
        		locations
        );
        
        expect(result.OUTPUT_STOCK.length).toBeGreaterThan(0);
    });
});