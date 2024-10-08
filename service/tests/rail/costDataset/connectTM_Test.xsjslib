var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var calculate = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");

describe('connect TM test', function() {
	var dataPackage = "sap.tm.trp.service.tests.rail.costDataset.data";
	var csvProperties = {
            separator: ",",
            headers: true
        };
	
	
	beforeOnce(function() {});

	beforeEach(function() {});
	
	it('with cost profile', function() {
		var conn = $.db.getConnection($.db.isolation.SERIALIZABLE);       
		var costModelId = 78; // actually it is useless here
		var costDataset = csvParser.csvToObjects(dataPackage, "costDataset_profile.csv", csvProperties);
		var	outdatedCost = csvParser.csvToObjects(dataPackage, "outdatedCost_profile.csv", csvProperties);
		var cost = calculate.calculateCostFromTM(costModelId, costDataset[0], outdatedCost, conn);		
	
		expect(cost).toMatchData({

		   CARRIER_ID : ['CARRIER_FR', 'CARRIER_FR', 'CARRIER_FR'],
		   COST : [59, 59, 59],
		   FROM_LOCATION_NAME : ['*','*','*'],
		   RESOURCE_TYPE : ['RC_20ST', 'RC_40RP', 'RC_40OR'],
		   TO_LOCATION_NAME : ['*','*','*'],
		   TRANSPORTATION_MODE_CODE : ['0002', '0002', '0002'],
		   UOM_CODE : ['PCS', 'PCS', 'PCS'],
		   WILD_STAR_COUNT : ['0','0','0']
	
		},  ['RESOURCE_TYPE', 'TRANSPORTATION_MODE_CODE', 'UOM_CODE']);
			
	});
	
	it('with Transportation Charge Management', function() {
		var conn = $.db.getConnection($.db.isolation.SERIALIZABLE);    
		var costModelId = 67;
		var costDataset = csvParser.csvToObjects(dataPackage, "costDataset_TCM.csv", csvProperties);
		var	outdatedCost = csvParser.csvToObjects(dataPackage, "outdatedCost_TCM.csv", csvProperties);
		var cost = calculate.calculateCostFromTM(costModelId, costDataset[0], outdatedCost, conn);
		
		
	
		expect(cost).toMatchData({

		   CARRIER_ID : ['CARRIER_FR', 'CARRIER_FR', 'CARRIER_FR'],
		   COST : [911.808511, 1967.478723, 1779.829787],
		   FROM_LOCATION_NAME : ['CNYNFDLIU','CNYNFDLIU','CNYNFDLIU'],
		   RESOURCE_TYPE : ['RC_40OR', 'RC_40OR', 'RC_40OR'],
		   TO_LOCATION_NAME : ['CNWUHDWUH','CNTSNDGAD','CNTAODGAD'],
		   TRANSPORTATION_MODE_CODE : ['0002', '0002', '0002'],
		   UOM_CODE : ['PCS', 'PCS', 'PCS'],
		   WILD_STAR_COUNT : ['0','0','0']
	
		},  ['RESOURCE_TYPE', 'TRANSPORTATION_MODE_CODE', 'UOM_CODE','FROM_LOCATION_NAME','TO_LOCATION_NAME']);
			
	});
	
});