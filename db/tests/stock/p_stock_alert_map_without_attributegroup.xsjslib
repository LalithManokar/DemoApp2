var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var mockstarEnvironment = $.import('sap.hana.testtools.mockstar', 'mockstarEnvironment');
var TableUtils = $.import('sap.hana.testtools.unit.util', 'tableUtils').TableUtils;
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;


var TRP_SCHEMA = 'SAP_TM_TRP';
var TEST_DATA_PACKAGE = 'sap.tm.trp.db.test.stock.data';

var procName = "sap.tm.trp.db.stock::p_stock_alert_map_without_attributegroup";

var csvProperties = {
	    separator: ";",
	    headers: true
	};

var p_stock_alert_map_without_attributegroup;

var substituteTables = {
		"t_region_item": {
			name: 'sap.tm.trp.db.systemmanagement.location::t_region_item',
		    testTable : '"sap.tm.trp.db.tests.testtable::t_region_item_test"'	
		},
		
		
		//location filter and region filter
		"t_location_filter": {
			name: 'sap.tm.trp.db.filter::t_location_filter',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_filter_test"'	
		},
		"t_location_filter_location": {
			name: 'sap.tm.trp.db.filter::t_location_filter_location',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_filter_location_test"'	
		},
		"t_location_filter_region": {
			name: 'sap.tm.trp.db.filter::t_location_filter_region',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_filter_region_test"'	
		},
		
		//location/region group and group item
		"t_location_group": {
			name: 'sap.tm.trp.db.systemmanagement::t_location_group',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_group_test"'	
		},
	
		"t_location_group_item": {
			name: 'sap.tm.trp.db.systemmanagement::t_location_group_item',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_group_item_test"'	
		},
		
		"t_region_group": {
			name: 'sap.tm.trp.db.systemmanagement::t_region_group',
			testTable:'"sap.tm.trp.db.tests.testtable::t_region_group_test"'	
		},
		"t_region_group_item": {
			name: 'sap.tm.trp.db.systemmanagement::t_region_group_item',
			testTable: '"sap.tm.trp.db.tests.testtable::t_region_group_item_test"'	
		},
		
		
		//equipment filter
		
		"t_equipment_filter": {
			name: 'sap.tm.trp.db.filter::t_equipment_filter',
			testTable: '"sap.tm.trp.db.tests.testtable::t_equipment_filter_test"'	
		},
		
		
		"t_equipment_filter_equipment": {
			name: 'sap.tm.trp.db.filter::t_equipment_filter_equipment',
			testTable: '"sap.tm.trp.db.tests.testtable::t_equipment_filter_equipment_test"'	
		},
		
		//equipment group and equipment group item:
		"t_equipment_group": {
			name: 'sap.tm.trp.db.systemmanagement::t_equipment_group',
			testTable:'"sap.tm.trp.db.tests.testtable::t_equipment_group_test"'	
		},
		
		"t_equipment_group_item": {
			name: 'sap.tm.trp.db.systemmanagement::t_equipment_group_item',
			testTable:'"sap.tm.trp.db.tests.testtable::t_equipment_group_item_test"'	
		},
		
		"t_stock_config": {
			name: 'sap.tm.trp.db.stock::t_stock_config',
			testTable:'"sap.tm.trp.db.tests.testtable::t_stock_config_test"'	
		},
		
	};
	

	var substituteViews = {
		"v_location": {
			name: 'sap.tm.trp.db.semantic.location::v_location',
			testTable:'"sap.tm.trp.db.tests.testtable::t_location_test"'	
		},
		
	    "v_zone":{
	        schema : TRP_SCHEMA,
	        name: 'sap.tm.trp.db.semantic.location::v_zone',
	        testTable:'"sap.tm.trp.db.tests.testtable::t_zone_test"'	
	    },
	    
	    "cv_get_locations_of_regions":{
	        schema : "_SYS_BIC",
	        name: 'sap.tm.trp.db.systemmanagement.location/cv_get_locations_of_regions',
	        testTable:'"sap.tm.trp.db.tests.testtable::t_cv_get_locations_of_regions_test"'	
	    },
	   
	    "v_equipment_type":{
	        schema : TRP_SCHEMA,
	        name: 'sap.tm.trp.db.equipment::v_equipment_type',
	        testTable:'"sap.tm.trp.db.tests.testtable::t_v_equipment_type_test"'
	    },
	    "v_resource_last_status":{
	        schema : TRP_SCHEMA,
	        name: 'sap.tm.trp.db.eventprocessing::v_resource_last_status',
	        testTable:'"sap.tm.trp.db.tests.testtable::t_v_resource_last_status_test"'
	    },
	    "v_resource":{
	        schema : TRP_SCHEMA,
	        name: 'sap.tm.trp.db.equipment::v_resource',
	        testTable:'"sap.tm.trp.db.tests.testtable::t_v_resource_test"'
	    }
	    
	};
	
	var substituteProcedures = {
            'getstockalertformap' : {
                schema : 'SAP_TM_TRP',
                name : 'sap.tm.trp.db.hrf.resourceStock::p_get_stock_alert_for_map',
                testProcedure : '"sap.tm.trp.db.tests.stock::p_get_stock_alert_for_map"'
            }
};

	

describe('test location type is: location, resource type is: equipment', function() {
	var testEnvironment = null;
	var conn;
	
	
	beforeOnce(function() {
		conn = $.db.getConnection();
		var tableUtils = new TableUtils(conn);
		var definition = {
				mockstarProperties: {
					truncOption: mockstarEnvironment.TruncOptions.FULL
				},
				schema: TRP_SCHEMA,
				model: {
					schema: TRP_SCHEMA,
					name: procName
				},

				substituteTables: substituteTables,
				substituteViews: substituteViews,
				substituteProcedures : substituteProcedures
			};
		
		testEnvironment = mockstarEnvironment.defineAndCreate(definition);
		

		p_stock_alert_map_without_attributegroup = new Procedure(
				mockstarEnvironment.userSchema,
				testEnvironment.targetPackage + '::p_stock_alert_map_without_attributegroup', 
				{
					connection: conn,
					tempSchema: mockstarEnvironment.userSchema
				}
			);
			
		
	});
	
	
	
	beforeEach(function() {
		//Note: This line will casue can not find xxx table in TRPADM issue. this should be a bug of hana i think
		//testEnvironment.clearAllTestTables();
	});

	    
	/**
	 *Test the input EQUIPMENT_FILTER_ID is a equipment 
	 *The LOCATION_FILTER_ID is a location
	 *  
	 */
	it('The input location filter type is: location, equipment filter type is equipment', function(){
		var equipment_filter_id = 138;
		var location_filter_id = 116;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 500; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: null,
				LATITUDE: 118.21424936,
				LONGITUDE: 31.73368068,
				LOCATION_ID:'RAwBT8cq7jIXpPfsLwFMvG',
				LOCATION_NAME: 'CNMAADMAS'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POINT');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	
	
	
	it('The input location filter type is: location group, equipment filter type is equipment', function(){
		var equipment_filter_id = 138;
		var location_filter_id = 118;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 500; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: null,
				LATITUDE: 118.21424936,
				LONGITUDE: 31.73368068,
				LOCATION_ID:'104',
				LOCATION_NAME: 'LOCATION_GROUP_1'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POINT');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	it('The input location filter type is: location, equipment filter type is equipment group', function(){
		var equipment_filter_id = 139;
		var location_filter_id = 116;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 500; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: null,
				LATITUDE: 118.21424936,
				LONGITUDE: 31.73368068,
				LOCATION_ID:'RAwBT8cq7jIXpPfsLwFMvG',
				LOCATION_NAME: 'CNMAADMAS'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POINT');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	it('The input location filter type is: location group, equipment filter type is equipment group', function(){
		var equipment_filter_id = 139;
		var location_filter_id = 118;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 500; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: null,
				LATITUDE: 118.21424936,
				LONGITUDE: 31.73368068,
				LOCATION_ID:'104',
				LOCATION_NAME: 'LOCATION_GROUP_1'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POINT');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	
	it('The input location filter type is: region, equipment filter type is equipment', function(){
		var equipment_filter_id = 138;
		var location_filter_id = 117;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 300; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: 'POLYGON ((117.05 30.51,120.74 31.64,120.973811 32.798661,119.115362 32.559246,118.453355 32.202282,117.05 30.51))',
				LATITUDE: null,
				LONGITUDE: null,
				LOCATION_ID:'RAwBT8cq7jIXqY6j4wKVYW',
				LOCATION_NAME: '92'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POLYGON');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	

	it('The input location filter type is: region, equipment filter type is equipment group', function(){
		var equipment_filter_id = 139;
		var location_filter_id = 117;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 300; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: 'POLYGON ((117.05 30.51,120.74 31.64,120.973811 32.798661,119.115362 32.559246,118.453355 32.202282,117.05 30.51))',
				LATITUDE: null,
				LONGITUDE: null,
				LOCATION_ID:'RAwBT8cq7jIXqY6j4wKVYW',
				LOCATION_NAME: '92'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POLYGON');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	
	it('The input location filter type is: region group, equipment filter type is equipment', function(){
		var equipment_filter_id = 138;
		var location_filter_id = 119;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 300; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: 'POLYGON ((117.05 30.51,120.74 31.64,120.973811 32.798661,119.115362 32.559246,118.453355 32.202282,117.05 30.51))',
				LATITUDE: null,
				LONGITUDE: null,
				LOCATION_ID:'105',
				LOCATION_NAME: 'REGION_GROUP_1'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POLYGON');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	
	it('The input location filter type is: region group, equipment filter type is equipment group', function(){
		var equipment_filter_id = 139;
		var location_filter_id = 119;
		var xmin = -270;
		var xmax = 360;
		var ymin = -85.05113642327339;
		var ymax = 85.05113642327339;
		var hierachy_level = 300; 
		
		var stock_alert_out1 = {
				ALERT_NUM: 1,
				ALERT_SCORE: 10,
				BOUNDARY: 'POLYGON ((117.05 30.51,120.74 31.64,120.973811 32.798661,119.115362 32.559246,118.453355 32.202282,117.05 30.51))',
				LATITUDE: null,
				LONGITUDE: null,
				LOCATION_ID:'105',
				LOCATION_NAME: 'REGION_GROUP_1'
			};
		
		
		
		var	result = p_stock_alert_map_without_attributegroup(equipment_filter_id,location_filter_id,xmin,xmax,ymin,ymax,hierachy_level);
	    var gis_type = result.GIS_TYPE;
	    var OUT_STOCK_ALERT_MAP = result.OUT_STOCK_ALERT_MAP;
		expect(gis_type).toBe('POLYGON');
		expect(OUT_STOCK_ALERT_MAP).toContain(
				stock_alert_out1
			);

	});
	
	
	
});
