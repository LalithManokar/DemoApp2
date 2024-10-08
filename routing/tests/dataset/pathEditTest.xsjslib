var csvParser = $.import("sap.hana.testtools.unit.util.internal", "csvParser");
var tableDataSet = $.import('sap.hana.testtools.unit.util', 'tableDataSet');
var TableUtils = $.import('sap.hana.testtools.unit.util', 'tableUtils').TableUtils;
var mockstarEnvironment = $.import('sap.hana.testtools.mockstar', 'mockstarEnvironment');
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var i18nLib = $.import('sap.hana.xs.i18n', 'text');
var TMCXSProc = $.import("sap.hana.xs.libs.dbutils", "procedures");
var testUtilLib = $.import("sap.tm.trp.routing.tests.util", "testUtil");
var RepositoryPath = $.import("sap.hana.testtools.unit.util.internal", "repositoryPath").RepositoryPath;
var Repository = $.import("sap.hana.testtools.unit.util.internal", "repository").Repository;
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;

var SCHEMA = 'SAP_TM_ROUTING';
var TRP_SCHEMA = 'SAP_TM_TRP';
var TEST_SCHEMA = 'SAP_TM_ROUTING_TEST';
var GLOBAL_DATASET_ID = 0;
var GLOBAL_DATASET_CODE = 'TM_INTERMODAL';
var LOCAL_DATASET_CODE = 'MY_LOCAL_DATASET';
var DELTA_DATASET_CODE = 'DELTA_DATASET_CODE';
var PROCEDURE_PACKAGE = 'sap.tm.trp.routing.db.dataset';
var TEST_DATA_PACKAGE = 'sap.tm.trp.routing.tests.data.dataset';
var ACTION_DELETE = 'D';
var ACTION_CREATE = 'C';
var ACTION_UPDATE = 'U';
var SOURCE_SYSTEM = 'S';
var SOURCE_MANUAL = 'M';
var MERGED_VIEW = 'M';

describe('test basic path function', function() {
	var testEnvironmentCreateGlobalDataset;
	var testEnvironmentCreateLocalDataset;
	var testEnvironmentReadDataset;


	var conn;
	var bundle;
	var repository;
	var csvProperties;
	var testUtil;
	var sqlExecutor;
	var config;
	var tableUtils;
	
	var readDatasetProc;
	var createPathProc;
	var updatePathProc;
	var deletePathProc;
	var queryPathProc;
	
	var createDepartureRuleProc;
	var generateTripProc;
	var listTripProc;
	var queryTripLocationCapacityProc;
	var updateTripCapacityProc;
	
	var departureRuleTestTable;

	beforeOnce(function() {
		conn = $.db.getConnection();
		testUtil = new testUtilLib.testUtil(conn);
		sqlExecutor = new SqlExecutor(conn);
		bundle = i18nLib.loadBundle('sap.tm.trp.routing.db.common', 'message', $.request.language);
		repository = new Repository(jasmine.hdbConnection); // Seems db connection does not work (isolation level not correctly set)
		// Create global dataset
		csvProperties = {
			separator: ',',
			headers: true
		};
		
		tableUtils = new TableUtils(conn);
		
		departureRuleTestTable = tableUtils.copyIntoUserSchema(SCHEMA, 'sap.tm.trp.routing.db.dataset::t_path_departure_rule');

		var substituteTables = {
			"dataset": {
				name: 'sap.tm.trp.routing.db.dataset::t_dataset'
			},
			"dataset_conf": {
				name: 'sap.tm.trp.routing.db.dataset::t_dataset_conf'
			},
			"dataset_location": {
				name: 'sap.tm.trp.routing.db.dataset::t_dataset_location'
			},
			"connection": {
				name: 'sap.tm.trp.routing.db.dataset::t_connection'
			},
			"connection_carrier": {
				name: 'sap.tm.trp.routing.db.dataset::t_connection_carrier'
			},
			"path": {
				name: 'sap.tm.trp.routing.db.dataset::t_path'
			},
			"path_connection": {
				name: 'sap.tm.trp.routing.db.dataset::t_path_connection'
			},
			"departure_rule": {
			    name: 'sap.tm.trp.routing.db.dataset::t_path_departure_rule',
			    testTable: departureRuleTestTable
			},
			"trip": {
			    name: 'sap.tm.trp.routing.db.dataset::t_trip'
			},
			"trip_sequence": {
			    name: 'sap.tm.trp.routing.db.dataset::t_trip_sequence'
			},
			"trip_sequence_capacity": {
			    name: 'sap.tm.trp.routing.db.dataset::t_trip_sequence_capacity'
			}
		};
		
		sqlExecutor = new SqlExecutor(conn);
		var tableResult = sqlExecutor.execQuery("select schema_name from views where view_name = 'sap.tm.trp.db.semantic.location::v_all_location'");
	    var semanticSchema = tableResult.columns.SCHEMA_NAME.rows[0];
		
		var substituteViews = {
			"location": {
			    schema : semanticSchema,
				name: 'sap.tm.trp.db.semantic.location::v_all_location'
			},
		    "mtr":{
		        schema : semanticSchema,
		        name: 'sap.tm.trp.db.semantic.common::v_transportation_means'
		    }
		};

		var definition = {
			//targetPackage: TMP_PACKAGE,
			mockstarProperties: {
				truncOption: mockstarEnvironment.TruncOptions.FULL
			},
			schema: SCHEMA,
			model: {
				schema: SCHEMA,
				name: "sap.tm.trp.routing.db.dataset/p_create_global_dataset"
			},

			substituteTables: substituteTables,
			substituteViews: substituteViews
		};

		testEnvironmentCreateGlobalDataset = mockstarEnvironment.define(definition, conn);

		testEnvironmentCreateGlobalDataset.addProcedureSubstitution("BuildBasicPath", {
			schema: SCHEMA,
			name: "sap.tm.trp.routing.db.connector::p_build_basic_path",
			testProcedure: '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_build_basic_path"'
		});

		testEnvironmentCreateGlobalDataset.create();
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_local_dataset";
		testEnvironmentCreateLocalDataset = mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_delta_dataset";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_path";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_path";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_delete_path";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_query_basic_path";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_departure_rule";
		mockstarEnvironment.defineAndCreate(definition, conn);
      
        definition.model.name = "sap.tm.trp.routing.db.dataset/p_generate_trip";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_list_trip";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_query_trip_locations";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_query_trip_location_capacity";
		mockstarEnvironment.defineAndCreate(definition, conn);

        definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_path_global_capacity";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_trip_capacity";
		mockstarEnvironment.defineAndCreate(definition, conn);

        definition.model.name = "sap.tm.trp.routing.db.dataset/p_roll_forward_trip";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_roll_forward_dataset_trip";
		mockstarEnvironment.defineAndCreate(definition, conn);

		definition.model.name = "sap.tm.trp.routing.db.dataset/p_read_dataset";
		testEnvironmentReadDataset = mockstarEnvironment.defineAndCreate(definition, conn);
		
		TMCXSProc.setTempSchema(mockstarEnvironment.userSchema);
		
		readDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_read_dataset', {
				connection: conn
			}
		);
		
		queryPathProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_query_basic_path', {
				connection: conn
			}
		);
		
		createPathProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_path', {
				connection: conn
			}
		);
		
		updatePathProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_update_path', {
				connection: conn
			}
		);
		
		deletePathProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_delete_path', {
				connection: conn
			}
		);
		
		createDepartureRuleProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_departure_rule', {
				connection: conn
			}
		);
		
		generateTripProc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_generate_trip', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
        listTripProc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_list_trip', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
		queryTripLocationCapacityProc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_query_trip_location_capacity', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
		updateTripCapacityProc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_update_trip_capacity', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
	});

	beforeEach(function() {
		//testEnvironmentReadDataset.clearAllTestTables();
		
		testEnvironmentCreateGlobalDataset.getTestTableNames()
		.forEach(tableUtils.clearTableInUserSchema.bind(tableUtils));
		
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path"');
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path_connection"');

		// Fill location data which is used to check locations in connection
		
		tableUtils.fillFromCsvFile(
			mockstarEnvironment.userSchema +
			'."sap.tm.trp.db.semantic.location::v_all_location"',
			TEST_DATA_PACKAGE,
			'location.csv',
			csvProperties
		);
		
		tableUtils.fillFromCsvFile(
			mockstarEnvironment.userSchema +
			'."sap.tm.trp.db.semantic.common::v_transportation_means"',
			TEST_DATA_PACKAGE,
			'mtr.csv',
			csvProperties
		);
		
        conn.commit();

	});

	afterOnce(function() {
		conn.close();
		var storedProcedures = [
		    'p_create_global_dataset',
		    'p_create_local_dataset',
		    'p_create_delta_dataset',
		    'p_create_dataset',
		    'p_create_path',
		    'p_update_path',
		    'p_delete_path',
		    'p_get_path_by_hash',
		    'p_validate_connection',
		    'p_validate_location_list',
		    'p_validate_path',
		    'p_read_dataset',
		    'p_query_basic_path',
		    'p_get_basic_path_merged_view',
		    'p_get_dataset_chain',
		    'p_apply_delta',
		    'p_roll_forward_dataset_trip',
		    'p_roll_forward_trip',
		    'p_generate_trip_by_departure_time',
		    'p_generate_trip',
		    'p_update_trip_capacity',
		    'p_update_path_global_capacity',
		    'p_list_trip',
		    'p_query_trip_locations',
		    'p_filter_path_by_from_to_loc_mtr',
		    'p_create_departure_rule'
		];
		
		/*
		storedProcedures.forEach(function(sp){
		    var repositoryPath = RepositoryPath.fromPackageFilenameAndSuffix(
			testEnvironmentReadDataset.targetPackage, sp, 'hdbprocedure');
		    try{
		        repository.deleteFile(repositoryPath); 
		    } catch (e){
		       // Error is ignored 
		    }
		});
		*/
	});
	
	function transformPath(path, pathConnection){
	    var map = {};
	    
	    // Sort path connection first
	    pathConnection.sort(function(c1, c2){
	        return c1.SEQUENCE < c2.SEQUENCE?-1:1;
	    });
	    
		pathConnection.forEach(function(c) {
			if (!map[c.PATH_ID.toString()]) {
				map[c.PATH_ID.toString()] = {
					CONNECTION: []
				};
			}

			map[c.PATH_ID.toString()].CONNECTION.push({
			    SEQUENCE: c.SEQUENCE,
				FROM_LOCATION: c.FROM_LOCATION,
				TO_LOCATION: c.TO_LOCATION,
				DISTANCE: c.DISTANCE,
				DURATION: c.DURATION,
				STAY_TIME: c.STAY_TIME,
        		CUTOFF_OFFSET: c.CUTOFF_OFFSET,
        		AVAILABILITY_OFFSET: c.AVAILABILITY_OFFSET
			});
		});
		
		return path.map(function(p){
		    var tmp = {};
		    tmp.ID = p.ID.toString();
		    if (p.NAME){
		        tmp.NAME = p.NAME;
		        tmp.TYPE = p.EXTERNAL_TYPE;
		    }
		    tmp.FROM_LOCATION = p.FROM_LOCATION;
		    tmp.TO_LOCATION = p.TO_LOCATION;
		    tmp.MTR = p.MTR;
			tmp.CARRIER = p.CARRIER;
			tmp.CONNECTION = map[p.ID.toString()].CONNECTION;
			return tmp;
		});
	}
	
	function preparePath(paths){
	    var result = { PATHS: [], PATH_CONNECTION: []};
	    
	    paths.forEach(function(p){
	        result.PATHS.push({
	            ID: p.ID,
		        FROM_LOCATION: p.FROM_LOCATION,
    		    TO_LOCATION: p.TO_LOCATION,
		        MTR: p.MTR,
			    CARRIER: p.CARRIER
	        });
	        
	        if (p.CONNECTION){
    	        p.CONNECTION.forEach(function(c){
    	            result.PATH_CONNECTION.push({
        	            PATH_ID: p.ID,
        	            SEQUENCE: c.SEQUENCE,
        		        FROM_LOCATION: c.FROM_LOCATION,
            		    TO_LOCATION: c.TO_LOCATION,
        		        DISTANCE: c.DISTANCE,
        			    DURATION: c.DURATION,
        			    STAY_TIME: c.STAY_TIME,
                		CUTOFF_OFFSET: c.CUTOFF_OFFSET,
                		AVAILABILITY_OFFSET: c.AVAILABILITY_OFFSET
    	            });
    	        });
	        }
	    });
	    
	    return result;
	}
	
	function queryDepartureRule(pathId){
	    var SQL = 'SELECT TO_VARCHAR(path_id) AS path_id, rule_number, cycle_type, pattern, departure_time, timezone FROM ' + 
	    //mockstarEnvironment.userSchema + '."sap.tm.trp.routing.db.dataset::t_path_departure_rule" ' + 
	    departureRuleTestTable +
		'WHERE path_id = ' + pathId;
	    return sqlExecutor.execQuery(SQL);
	}
	
	function transformTrip(trip, tripLocation){
	    var map = {};
	    
	    // Sort path connection first
	    tripLocation.sort(function(l1, l2){
	        return l1.SEQUENCE < l2.SEQUENCE?-1:1;
	    });
	    
		tripLocation.forEach(function(l) {
			if (!map[l.TRIP_ID]) {
				map[l.TRIP_ID] = {
					STOP: []
				};
			}

			map[l.TRIP_ID.toString()].STOP.push({
			    SEQUENCE: l.SEQUENCE,
				LOCATION: l.LOCATION,
				DISTANCE: l.DISTANCE,
				DEPART_TIME: l.DEPART_TIME,
				ARRIVAL_TIME: l.ARRIVAL_TIME,
        		CUTOFF_OFFSET: l.CUTOFF_OFFSET,
        		AVAILABILITY_OFFSET: l.AVAILABILITY_OFFSET
			});
		});
		
		return trip.map(function(t){
		    var tmp = {};
		    tmp.BASIC_PATH_ID = t.BASIC_PATH_ID.toString();
		    tmp.RULE_ID = t.RULE_ID;
		    tmp.FROM_LOCATION = t.FROM_LOCATION;
		    tmp.TO_LOCATION = t.TO_LOCATION;
		    tmp.MTR = t.MTR;
			tmp.DEPART_TIME = t.DEPART_TIME;
			tmp.ARRIVAL_TIME = t.ARRIVAL_TIME;
			tmp.STOP = map[t.ID].STOP;
			return tmp;
		});
	}
	
	function generateTrip(departureTime, ruleId, path){
	    var trip = {};
	    trip.BASIC_PATH_ID = path.ID;
	    trip.RULE_ID = ruleId;
	    trip.FROM_LOCATION = path.FROM_LOCATION;
	    trip.TO_LOCATION = path.TO_LOCATION;
	    trip.MTR = path.MTR;
		trip.DEPART_TIME = departureTime;
		
		trip.STOP = [];
		
		var currentTime = departureTime;
		
		trip.STOP.push({
            SEQUENCE: 0,
            LOCATION: path.CONNECTION[0].FROM_LOCATION,
            DISTANCE: 0,
    	    DEPART_TIME: currentTime,
    		ARRIVAL_TIME: null,
    		CUTOFF_OFFSET: path.CONNECTION[0].CUTOFF_OFFSET,
    		AVAILABILITY_OFFSET: path.CONNECTION[0].AVAILABILITY_OFFSET
        });
		
		path.CONNECTION.forEach(function(c){
		    trip.STOP.push({
	            SEQUENCE: c.SEQUENCE,
		        LOCATION: c.TO_LOCATION,
		        DISTANCE: c.DISTANCE,
			    DEPART_TIME: testUtil.addSeconds(testUtil.addSeconds(currentTime, c.DURATION), c.STAY_TIME),
    		    ARRIVAL_TIME: testUtil.addSeconds(currentTime, c.DURATION),
        		CUTOFF_OFFSET: c.CUTOFF_OFFSET,
        		AVAILABILITY_OFFSET: c.AVAILABILITY_OFFSET
	            });
	        currentTime = testUtil.addSeconds(testUtil.addSeconds(currentTime, c.DURATION), c.STAY_TIME);
		});
		
		trip.STOP[trip.STOP.length - 1].DEPART_TIME = null;
		trip.ARRIVAL_TIME = trip.STOP[trip.STOP.length - 1].ARRIVAL_TIME;
	    
	    return trip;
	}

	/**
	 * Test success creation, update, deletion and read	 *
	 */
	it("edit of path should run successfully", function(){
	   
	    var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			NAME: '1000064',
			TYPE: 'S',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L4',
			MTR: '0002',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 100,
        			DURATION: 1000,
        			STAY_TIME: 150,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 200,
        			DURATION: 2000,
        			STAY_TIME: 250,
            		CUTOFF_OFFSET: 100,
            		AVAILABILITY_OFFSET: 150
		        }
			]
		};
		
		var globalPath2 = {
			ID: 'P2',
			NAME: '1000065',
			TYPE: 'S',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L4',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 300,
        			DURATION: 3000,
        			STAY_TIME: 350,
            		CUTOFF_OFFSET: 200,
            		AVAILABILITY_OFFSET: 250
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 400,
        			DURATION: 4000,
        			STAY_TIME: 450,
            		CUTOFF_OFFSET: 300,
            		AVAILABILITY_OFFSET: 350
        		}
			]
		};
		
		var globalPath3 = {
			ID: 'P3',
			NAME: '6000003',
			TYPE: 'B',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L5',
			MTR: '0002',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L3',
        			TO_LOCATION: 'L4',
        			DISTANCE: 500,
        			DURATION: 5000,
        			STAY_TIME: 550,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L5',
        			DISTANCE: 600,
        			DURATION: 6000,
        			STAY_TIME: 650,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		}
			]
		};
	    
	    // Two paths have the same sequence
	    paths.push(globalPath1);
	    paths.push(globalPath2);
	    paths.push(globalPath3);
		
		testUtil.insertPath(paths);
		
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);

		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		var result = proc(
			fromDate,
			toDate,
			config,
			[],      // Basic connection
			[]       // Connection carrier
		);

		expect(result.RETURN_CODE).toBe(0);

		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		globalPath1.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		globalPath2.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath2.ID;
		}).ID.toString();
		
		globalPath3.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath3.ID;
		}).ID.toString();
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {
		        LOCATION_ID: 'L2'
		    }, 
		    {
		        LOCATION_ID: 'L4'
		    }
		];
        
		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			[],
			[]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		var deltaPath1 = {
			ID: 'P1',                 // This external id is temporarily used
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L6',
			MTR: '0002',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L3',
        			TO_LOCATION: 'L5',
        			DISTANCE: 700,
        			DURATION: 7000,
        			STAY_TIME: 750,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L5',
        			TO_LOCATION: 'L6',
        			DISTANCE: 800,
        			DURATION: 8000,
        			STAY_TIME: 850,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var deltaPath2 = {
			ID: 'P2',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L7',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L6',
        			DISTANCE: 910,
        			DURATION: 9100,
        			STAY_TIME: 951,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L6',
        			TO_LOCATION: 'L7',
        			DISTANCE: 1010,
        			DURATION: 10000,
        			STAY_TIME: 1050,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		}
			]
		};
		
		var param = preparePath([deltaPath1, deltaPath2]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(2);

        deltaPath1.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath1.ID;
		}).ID.toString();
		
		deltaPath2.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath2.ID;
		}).ID.toString();
		
		result = queryPathProc(localDatasetId, 'F', '', '', '');

		var actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(globalPath3);
		
		expect(actualPaths).toContain(deltaPath1);
		expect(actualPaths).toContain(deltaPath2);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath1.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath2.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath3.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath1.ID;
		}).SOURCE).toBe(SOURCE_SYSTEM);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath2.ID;
		}).SOURCE).toBe(SOURCE_SYSTEM);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath3.ID;
		}).SOURCE).toBe(SOURCE_SYSTEM);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPath1.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPath2.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPath1.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPath2.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		result = queryPathProc(localDatasetId, 'D', '', '', '');
		expect(result.PATHS.length).toBe(2);
		
		// Update global path and delta path
		var globalPathUpdated = testUtil.cloneObject(globalPath3);
		delete globalPathUpdated.NAME;
		delete globalPathUpdated.TYPE;
		globalPathUpdated.CONNECTION[0].DISTANCE += 5;
		globalPathUpdated.CONNECTION[1].DISTANCE += 10;
		
		var deltaPathUpdated = testUtil.cloneObject(deltaPath2);
		deltaPathUpdated.TO_LOCATION = 'L8';
		deltaPathUpdated.CONNECTION[1].TO_LOCATION = 'L8';
		
		param = preparePath([globalPathUpdated, deltaPathUpdated]);
		
		result =updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(1);
		
		globalPathUpdated.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === globalPathUpdated.ID.toString();
		}).ID.toString();
		
		result = queryPathProc(localDatasetId, 'D', '', '', '');
		expect(result.PATHS.length).toBe(3);
		
		result = queryPathProc(localDatasetId, 'F', '', '', '');
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(globalPathUpdated);
		
		expect(actualPaths).toContain(deltaPath1);
		expect(actualPaths).toContain(deltaPathUpdated);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPathUpdated.ID;
		}).ACTION).toBe(ACTION_UPDATE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPathUpdated.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPathUpdated.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPathUpdated.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		// Update the update delta. Action type should not be changed
		globalPathUpdated.CONNECTION[0].DISTANCE += 5;
		globalPathUpdated.CONNECTION[1].DISTANCE += 10;
		globalPathUpdated.CARRIER = 'CARRIER5';
		
		param = preparePath([globalPathUpdated]);
		
		result =updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);

		result = queryPathProc(localDatasetId, 'F', '', '', '');
		expect(result.PATHS.length).toBe(5);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPathUpdated);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPathUpdated.ID;
		}).ACTION).toBe(ACTION_UPDATE);
		
		// Delete UPDATE delta
		// Delete CREATE delta
		// Delete path from layer below. DELETE delta will be created
		var pathIdList = [];
		
		pathIdList.push({ID: globalPathUpdated.ID});
		pathIdList.push({ID: deltaPathUpdated.ID});
		pathIdList.push({ID: globalPath1.ID});
		
		result = deletePathProc(
		    localDatasetId,
		    pathIdList
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(1);
        
        var globalPathDeleted = testUtil.cloneObject(globalPath1);
        delete globalPathDeleted.NAME;
        delete globalPathDeleted.TYPE;
		globalPathDeleted.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		result = queryPathProc(localDatasetId, 'D', '', '', '');
		expect(result.PATHS.length).toBe(2);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPathDeleted);
		expect(actualPaths).toContain(deltaPath1);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPathDeleted.ID;
		}).ACTION).toBe(ACTION_DELETE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPathDeleted.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		result = queryPathProc(localDatasetId, 'M', '', '', '');
		expect(result.PATHS.length).toBe(2);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath3);
		expect(actualPaths).toContain(deltaPath1);
		
		result = queryPathProc(localDatasetId, 'F', '', '', '');
		expect(result.PATHS.length).toBe(3);
		
		// Two global path will be shadowed
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath3);
		expect(actualPaths).toContain(deltaPath1);
		expect(actualPaths).toContain(globalPathDeleted);
		
		// Delete the DELETE delta
		pathIdList = [];
		
		pathIdList.push({ID: globalPathDeleted.ID});
		result = deletePathProc(
		    localDatasetId,
		    pathIdList
		);
		
		expect(result.RETURN_CODE).toBe(0);

		result = queryPathProc(localDatasetId, 'D', '', '', '');
		expect(result.PATHS.length).toBe(1);
		
		result = queryPathProc(localDatasetId, 'M', '', '', '');
		expect(result.PATHS.length).toBe(4);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(globalPath3);
		expect(actualPaths).toContain(deltaPath1);
		
		
		// Add one void path
		var voidPath = testUtil.cloneObject(globalPath3);
		delete voidPath.NAME;
		delete voidPath.TYPE;
		voidPath.ID = 'P1';
		voidPath.CARRIER = 'CARRIER3';
		
		param = preparePath([voidPath]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);

		var msgParam = [voidPath.MTR, voidPath.CONNECTION[0].FROM_LOCATION, 
		voidPath.CONNECTION[0].TO_LOCATION, voidPath.CONNECTION[1].TO_LOCATION];
		expect(result.MESSAGE).toContain(
			{
				SEVERITY: 'W',
				MESSAGE: bundle.getText('MSG_PATH_VOID', 
				[msgParam.join(':')])
		    }
		);
		
		voidPath.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === voidPath.ID;
		}).ID.toString();
		
		result = queryPathProc(localDatasetId, 'F', '', '', '');
		expect(result.PATHS.length).toBe(5);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(voidPath);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === voidPath.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === voidPath.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		result = queryPathProc(localDatasetId, 'M', '', '', '');
		expect(result.PATHS.length).toBe(4);
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_delta_dataset', {
				connection: conn
			}
		);
		
		result = proc(
		    DELTA_DATASET_CODE,
			LOCAL_DATASET_CODE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var deltaDatasetId = result.DATASET_ID;
		
		result = queryPathProc(deltaDatasetId, 'M', '', '', '');
		expect(result.PATHS.length).toBe(4);
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(globalPath3);
		expect(actualPaths).toContain(deltaPath1);
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath1.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath2.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === globalPath3.ID;
		}).ACTION).toBeNull();
		
		expect(result.PATHS.find(function(p){
		    return p.ID.toString() === deltaPath1.ID;
		}).ACTION).toBeNull();
		
	});

	/**
	 * Test success creation, update, deletion and read
	 */
	it("edit of departure rule should run successfully", function(){
		var result;
		var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L4',
			MTR: '0002',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 100,
        			DURATION: 1000,
        			STAY_TIME: 150,
        			CUTOFF_OFFSET: 0,
        			AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 200,
        			DURATION: 2000,
        			STAY_TIME: 250,
        			CUTOFF_OFFSET: 0,
        			AVAILABILITY_OFFSET: 0
		        }
			]
		};
	   
	    paths.push(globalPath1);
		
		testUtil.insertPath(paths);
		
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		result = proc(
			fromDate,
			toDate,
			config,
			[],      // Basic connection
			[]       // Connection carrier
		);

		expect(result.RETURN_CODE).toBe(0);
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		globalPath1.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		var locations = [
		    {
		        LOCATION_ID: 'L2'
		    }, 
		    {
		        LOCATION_ID: 'L4'
		    }
		];
        
		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			[],
			[]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_delta_dataset', {
				connection: conn
			}
		);
		
		var deltaDatasetCode = 'DELTA_DATASET_CODE';
		
		result = proc(
		    deltaDatasetCode,
			LOCAL_DATASET_CODE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		var deltaPath1 = {
			ID: 'P1',                 // This external id is temporarily used
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L6',
			MTR: '0002',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L3',
        			TO_LOCATION: 'L5',
        			DISTANCE: 700,
        			DURATION: 4800,
        			STAY_TIME: 1800,
        			CUTOFF_OFFSET: 0,
        			AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L5',
        			TO_LOCATION: 'L6',
        			DISTANCE: 800,
        			DURATION: 7200,
        			STAY_TIME: 0,
        			CUTOFF_OFFSET: 0,
        			AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(1);

        deltaPath1.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath1.ID;
		}).ID.toString();
		
		// Update global path and delta path
		var globalPathUpdated = testUtil.cloneObject(globalPath1);
		globalPathUpdated.CONNECTION[0].DISTANCE += 5;		
		globalPathUpdated.CONNECTION[1].DISTANCE += 10;
		
		param = preparePath([globalPathUpdated]);
		
		result =updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(1);
		
		globalPathUpdated.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === globalPathUpdated.ID.toString();
		}).ID.toString();
		
		// CET - UTC+01
		var departureRule1 = {
		    PATH_ID: globalPathUpdated.ID,
		    CYCLE_TYPE: 'W',
		    PATTERN: '2,4',
		    DEPARTURE_TIME: new Date('2015-01-01T08:00:00'),
		    TIMEZONE: 'CET'
		};
		
		result = createDepartureRuleProc(
		    departureRule1.PATH_ID,
		    departureRule1.CYCLE_TYPE,
		    departureRule1.PATTERN,
		    departureRule1.DEPARTURE_TIME,
		    departureRule1.TIMEZONE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		departureRule1.RULE_NUMBER = result.RULE_NUMBER;
		
		var departureRule2 = {
		    PATH_ID: globalPathUpdated.ID,
		    CYCLE_TYPE: 'M',
		    PATTERN: '1,10,20,31',
		    DEPARTURE_TIME: new Date('2015-01-01T10:00:00'),
		    TIMEZONE: 'CET'
		};
		
		result = createDepartureRuleProc(
		    departureRule2.PATH_ID,
		    departureRule2.CYCLE_TYPE,
		    departureRule2.PATTERN,
		    departureRule2.DEPARTURE_TIME,
		    departureRule2.TIMEZONE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		departureRule2.RULE_NUMBER = result.RULE_NUMBER;
		
		var actual = queryDepartureRule(departureRule2.PATH_ID);
		actual.columns.DEPARTURE_TIME.rows = 
		actual.columns.DEPARTURE_TIME.rows.map(function(t){
		    return t.getHours() + t.getMinutes() + t.getSeconds();
		});
		
		var expected = tableDataSet.createFromArray(
		    [departureRule1, departureRule2]);
		expected.columns.DEPARTURE_TIME.rows = 
		expected.columns.DEPARTURE_TIME.rows.map(function(t){
		    return t.getHours() + t.getMinutes() + t.getSeconds();
		});
		
		expect(actual).toMatchData(expected, ['PATH_ID', 'RULE_NUMBER']);
		
		// Month starts from 0
		// There are just 29 days in February
		var fromTime = new Date(Date.UTC(2016, 1, 6, 0, 0, 0));
		var toTime = new Date(Date.UTC(2016, 1, 29, 0, 0, 0));
		result = generateTripProc(
		    fromTime,
		    toTime,
		    globalPathUpdated.ID,
		    []
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		result = listTripProc(
		    fromTime,
		    toTime,
		    [{ID:  globalPathUpdated.ID}]
		);
		
		expect(result.TRIP.length).toBe(8);
		
		expected = [
		    generateTrip(new Date(Date.UTC(2016, 1, 10, 9, 0, 0)), departureRule2.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 20, 9, 0, 0)), departureRule2.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 10, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 17, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 24, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 12, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 19, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated),
		    generateTrip(new Date(Date.UTC(2016, 1, 26, 7, 0, 0)), departureRule1.RULE_NUMBER, globalPathUpdated)
		];
		
		actual = transformTrip(result.TRIP, result.TRIP_LOCATION);
		
		expect(actual).toMatchData(expected, ['BASIC_PATH_ID', 'RULE_ID']);
		
		// EST - UTC -5
		// Depart time is 00:00:00 
		// Daily
		// 
		var departureRule3 = {
		    PATH_ID: deltaPath1.ID,
		    CYCLE_TYPE: 'D',
		    PATTERN: '',
		    DEPARTURE_TIME: new Date('2015-01-01T00:00:00'),
		    TIMEZONE: 'EST'
		};
		
		result = createDepartureRuleProc(
		    departureRule3.PATH_ID,
		    departureRule3.CYCLE_TYPE,
		    departureRule3.PATTERN,
		    departureRule3.DEPARTURE_TIME,
		    departureRule3.TIMEZONE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		departureRule3.RULE_NUMBER = result.RULE_NUMBER;
		
		fromTime = new Date(Date.UTC(2015, 11, 28, 0, 0, 0));
		toTime = new Date(Date.UTC(2016, 0, 3, 0, 0, 0));
		result = generateTripProc(
		    fromTime,
		    toTime,
		    departureRule3.PATH_ID,
		    []
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
    	result = listTripProc(
		    fromTime,
		    toTime,
		    [{ID:  departureRule3.PATH_ID}]
		);
		
		expect(result.TRIP.length).toBe(6);
		
		expected = [
		    generateTrip(new Date(Date.UTC(2015, 11, 28, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1),
		    generateTrip(new Date(Date.UTC(2015, 11, 29, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1),
		    generateTrip(new Date(Date.UTC(2015, 11, 30, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1),
		    generateTrip(new Date(Date.UTC(2015, 11, 31, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1),
		    generateTrip(new Date(Date.UTC(2016, 0, 1, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1),
		    generateTrip(new Date(Date.UTC(2016, 0, 2, 5, 0, 0)), departureRule3.RULE_NUMBER, deltaPath1)
		];
		
		actual = transformTrip(result.TRIP, result.TRIP_LOCATION);
		
		expect(actual).toMatchData(expected, ['BASIC_PATH_ID', 'RULE_ID']);
		
		// Update trip capacity in local layer
		var trip1ID = result.TRIP[0].ID;
		var trip2ID = result.TRIP[1].ID;
		
		var updateObject1 = {
		    TRIP_ID: trip1ID,
		    SEQUENCE: 1,
    		CAPACITY: 100,
		    CAPACITY_UOM:'TON' };
		    
		var updateObject2 = {
		    TRIP_ID: trip1ID,
		    SEQUENCE: 2,
    		CAPACITY: 110,
		    CAPACITY_UOM:'TON' };
		    
		var updateObject3 = {
		    TRIP_ID: trip2ID,
		    SEQUENCE: 1,
    		CAPACITY: 200,
		    CAPACITY_UOM:'M3' };
		    
		var updateObject4 = {
		    TRIP_ID: trip2ID,
		    SEQUENCE: 2,
    		CAPACITY: 220,
		    CAPACITY_UOM:'M3' };
		
		result = updateTripCapacityProc(
		    LOCAL_DATASET_CODE, [updateObject1, updateObject2, updateObject3, updateObject4]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		result = queryTripLocationCapacityProc(
		    LOCAL_DATASET_CODE,
		    [{TRIP_ID: trip1ID}, {TRIP_ID: trip2ID}]
		);
		
		var tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject1.TRIP_ID && l.SEQUENCE === updateObject1.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject1.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject1.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject2.TRIP_ID && l.SEQUENCE === updateObject2.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject2.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject2.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject3.TRIP_ID && l.SEQUENCE === updateObject3.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject3.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject3.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject4.TRIP_ID && l.SEQUENCE === updateObject4.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject4.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject4.CAPACITY_UOM);
		
		// Update capacity in delta layer
		// The capacity should be merged on location basis
		updateObject1.CAPACITY += 50;
		updateObject4.CAPACITY += 100;
		
		result = updateTripCapacityProc(
		    DELTA_DATASET_CODE, [updateObject1, updateObject4]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		result = queryTripLocationCapacityProc(
		    DELTA_DATASET_CODE,
		    [{TRIP_ID: trip1ID}, {TRIP_ID: trip2ID}]
		);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject1.TRIP_ID && l.SEQUENCE === updateObject1.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject1.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject1.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject2.TRIP_ID && l.SEQUENCE === updateObject2.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject2.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject2.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject3.TRIP_ID && l.SEQUENCE === updateObject3.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject3.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject3.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject4.TRIP_ID && l.SEQUENCE === updateObject4.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject4.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject4.CAPACITY_UOM);
		
		// Capacity in local layer should remain unchanged
		updateObject1.CAPACITY -= 50;
		updateObject4.CAPACITY -= 100;
		
		result = queryTripLocationCapacityProc(
		    LOCAL_DATASET_CODE,
		    [{TRIP_ID: trip1ID}, {TRIP_ID: trip2ID}]
		);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject1.TRIP_ID && l.SEQUENCE === updateObject1.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject1.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject1.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject2.TRIP_ID && l.SEQUENCE === updateObject2.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject2.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject2.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject3.TRIP_ID && l.SEQUENCE === updateObject3.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject3.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject3.CAPACITY_UOM);
		
		tripLocationCapacity = result.TRIP_LOCATION_CAPACITY.find(function(l){
		    return l.TRIP_ID === updateObject4.TRIP_ID && l.SEQUENCE === updateObject4.SEQUENCE;
		});
		
		expect(tripLocationCapacity.CAPACITY).toBe(updateObject4.CAPACITY);
		expect(tripLocationCapacity.CAPACITY_UOM).toBe(updateObject4.CAPACITY_UOM);
		
		proc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_roll_forward_trip', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
		// Rollfoward trip
		fromTime = new Date(Date.UTC(2016, 1, 6, 0, 0, 0));
		toTime = new Date(Date.UTC(2016, 1, 29, 0, 0, 0));
		result = proc(
		    fromTime,
		    toTime,
		    departureRule3.PATH_ID
		);
		
		result = listTripProc(
		    fromTime,
		    toTime,
		    [{ID:  departureRule3.PATH_ID}]
		);
		
		expect(result.TRIP.length).toBe(23);
		
		proc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_roll_forward_dataset_trip', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
	    
		// Rollfoward trip
		fromTime = new Date(Date.UTC(2016, 1, 28, 0, 0, 0));
		toTime = new Date(Date.UTC(2016, 2, 11, 0, 0, 0));
	
		result = proc(
		    fromTime,
		    toTime,
		    LOCAL_DATASET_CODE
		);

		result = listTripProc(
		    fromTime,
		    toTime,
		    [{ID:  departureRule3.PATH_ID}]
		);
		
		expect(result.TRIP.length).toBe(12);
		
		result = listTripProc(
		    fromTime,
		    toTime,
		    [{ID: departureRule2.PATH_ID}]
		);
		
		expect(result.TRIP.length).toBe(5);
		
	});
	
	/**
	 * Test success creation, update, deletion and read	 *
	 */
	it("path query should run successfully", function(){
	   
	    var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			NAME: '1000066',
			TYPE: 'S',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L4',
			MTR: '0003',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 1,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var globalPath2 = {
			ID: 'P2',
			NAME: '1000067',
			TYPE: 'S',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L6',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L5',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L5',
        			TO_LOCATION: 'L1',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 3,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L6',
        			DISTANCE: 3,
        			DURATION: 3,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		}
			]
		};
	
	    paths.push(globalPath1);
	    paths.push(globalPath2);
		
		testUtil.insertPath(paths);
		
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);

		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		var result = proc(
			fromDate,
			toDate,
			config,
			[],      // Basic connection
			[]       // Connection carrier
		);

		expect(result.RETURN_CODE).toBe(0);
		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		globalPath1.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		globalPath2.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath2.ID;
		}).ID.toString();
	
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {
		        LOCATION_ID: 'L2'
		    }, 
		    {
		        LOCATION_ID: 'L4'
		    }
		];
        
		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			[],
			[]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		var deltaPath1 = {
			ID: 'P3',                 // This external id is temporarily used
			FROM_LOCATION: 'L6',
			TO_LOCATION: 'L1',
			MTR: '0003',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L6',
        			TO_LOCATION: 'L4',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L1',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var deltaPath2 = {
			ID: 'P4',
			FROM_LOCATION: 'L5',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L5',
        			TO_LOCATION: 'L1',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L4',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 3,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L3',
        			DISTANCE: 3,
        			DURATION: 3,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		}
			]
		};
		
		var param = preparePath([deltaPath1, deltaPath2]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
        expect(result.ID_MAP.length).toBe(2);

        deltaPath1.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath1.ID;
		}).ID.toString();
		
		deltaPath2.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath2.ID;
		}).ID.toString();
		
		// Query with from location
		result = queryPathProc(localDatasetId, 'F', 'L4', '', '');
		expect(result.PATHS.length).toBe(3);
		var actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(deltaPath1);
		expect(actualPaths).toContain(deltaPath2);
    
        // Query with from location and MTR
		result = queryPathProc(localDatasetId, 'F', 'L4', '', '0002');
		expect(result.PATHS.length).toBe(2);
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(deltaPath2);
		
		// Query with to location
		result = queryPathProc(localDatasetId, 'F', '', 'L1', '');
		expect(result.PATHS.length).toBe(3);
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(deltaPath1);
		expect(actualPaths).toContain(deltaPath2);
		
		// Query with to location and MTR
		result = queryPathProc(localDatasetId, 'F', '', 'L1', '0002');
		expect(result.PATHS.length).toBe(2);
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(deltaPath2);
		
		// Query with from location and to location
		result = queryPathProc(localDatasetId, 'F', 'L4', 'L1', '');
		expect(result.PATHS.length).toBe(2);
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		expect(actualPaths).toContain(deltaPath1);
		
		// Query with from location, to location and MTR
		result = queryPathProc(localDatasetId, 'F', 'L4', 'L1', '0002');
		expect(result.PATHS.length).toBe(1);
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath2);
		
		
	});
	
	
	/**
	 * Test 
	 */
	it("edit of path should fail", function(){
		
		var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			NAME: '1000068',
			TYPE: 'S',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L4',
			MTR: '0003',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 1,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var globalPath2 = {
			ID: 'P2',
			NAME: '1000069',
			TYPE: 'S',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L1',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L5',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L5',
        			TO_LOCATION: 'L1',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
        		}
			]
		};
	
	    paths.push(globalPath1);
	    paths.push(globalPath2);
		
		testUtil.insertPath(paths);
		
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);

		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		var result = proc(
			fromDate,
			toDate,
			config,
			[],      // Basic connection
			[]       // Connection carrier
		);

		expect(result.RETURN_CODE).toBe(0);
		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		globalPath1.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		globalPath2.ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath2.ID;
		}).ID.toString();
	
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {
		        LOCATION_ID: 'L2'
		    }, 
		    {
		        LOCATION_ID: 'L4'
		    }
		];
        
		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			[],
			[]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		conn.commit();
		
		// Check duplicate path input of creation
		var deltaPath1 = {
			ID: 'P3',
			FROM_LOCATION: 'L6',
			TO_LOCATION: 'L1',
			MTR: '0003',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L6',
        			TO_LOCATION: 'L4',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L1',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		// Check duplicate path input of creation
		var deltaPath2 = {
			ID: 'P4',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L5',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L3',
        			TO_LOCATION: 'L4',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L5',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		var deltaPathDuplicated = testUtil.cloneObject(deltaPath1);
		deltaPathDuplicated.ID = 'P4';
		
		var param = preparePath([deltaPath1, deltaPathDuplicated]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[deltaPath1.MTR, deltaPath1.CONNECTION[0].FROM_LOCATION, 
				deltaPath1.CONNECTION[1].FROM_LOCATION,deltaPath1.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
		
		param = preparePath([deltaPath1, deltaPath2]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		deltaPath1.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath1.ID;
		}).ID.toString();
		deltaPath2.ID = result.ID_MAP.find(function(m){
		    return m.EXTERNAL_ID  === deltaPath2.ID;
		}).ID.toString();
		conn.commit();
		
		// Create the delta connection again should fail
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[deltaPath1.MTR, deltaPath1.CONNECTION[0].FROM_LOCATION, 
				deltaPath1.CONNECTION[1].FROM_LOCATION,deltaPath1.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
		
		// Update global path 1. 
		// New path with same hash cannot be created in top layer
		var globalPathUpdated = testUtil.cloneObject(globalPath1);
		globalPathUpdated.CONNECTION[0].DISTANCE += 5;		
		globalPathUpdated.CONNECTION[1].DISTANCE += 10;
		
		param = preparePath([globalPathUpdated]);
		
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		deltaPathDuplicated = testUtil.cloneObject(globalPath1);

		param = preparePath([deltaPathDuplicated]);
		
		result =createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[globalPath1.MTR, globalPath1.CONNECTION[0].FROM_LOCATION, 
				globalPath1.CONNECTION[1].FROM_LOCATION,globalPath1.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		
		conn.rollback();
		
		// No duplicate is allowed in update input
		deltaPathDuplicated = testUtil.cloneObject(deltaPath1);
		deltaPathDuplicated.ID = deltaPath2.ID;
		deltaPath1.CONNECTION[0].DISTANCE += 5;

		param = preparePath([deltaPath1, deltaPathDuplicated]);
		
		result =createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[deltaPath1.MTR, deltaPath1.CONNECTION[0].FROM_LOCATION, 
				deltaPath1.CONNECTION[1].FROM_LOCATION,deltaPath1.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
		
		// No duplicate manual entry is allowed after update
		deltaPathDuplicated = testUtil.cloneObject(deltaPath1);
		deltaPathDuplicated.ID = deltaPath2.ID;

		param = preparePath([deltaPathDuplicated]);
		
		result =createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[deltaPath1.MTR, deltaPath1.CONNECTION[0].FROM_LOCATION, 
				deltaPath1.CONNECTION[1].FROM_LOCATION,deltaPath1.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
		
		// Delete global path 2.
		// New path with same hash cannot be created in top layer
		result = deletePathProc(
		    localDatasetId,
		    [{ID: globalPath2.ID}]
		);
		expect(result.RETURN_CODE).toBe(0);	
		var globalPath2DeletionId = result.ID_MAP[0].ID.toString();
		conn.commit();
		
		deltaPathDuplicated = testUtil.cloneObject(globalPath2);
		
		param = preparePath([deltaPathDuplicated]);
		
		result =createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[globalPath2.MTR, globalPath2.CONNECTION[0].FROM_LOCATION, 
				globalPath2.CONNECTION[1].FROM_LOCATION,globalPath2.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		
		conn.rollback();
		
		// Update path which does not exist or not visible
		// Global path 1 already updated by a delta path
		// Global path 2 already deleted
		var pathUpdated1 = testUtil.cloneObject(globalPath1);
		var pathUpdated2 = testUtil.cloneObject(globalPath2);
		
		param = preparePath([pathUpdated1, pathUpdated2]);
		
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_ID_NOT_FOUND', 
				[pathUpdated1.ID])
		    }
		);
		
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_ID_NOT_FOUND', 
				[pathUpdated2.ID])
		    }
		);
		conn.rollback();
		
		// ID of path not existing cannot be found
		var pathUpdated3 = testUtil.cloneObject(globalPath2);
		pathUpdated3.ID = '-1';
		pathUpdated3.MTR = '0003';
		
		param = preparePath([pathUpdated3]);
		
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_PATH_ID_NOT_FOUND', 
				[pathUpdated3.ID])
		    }
		);
		conn.rollback();
		
		// Restore global path 2
		result = deletePathProc(
		    localDatasetId,
		    [{ID: globalPath2DeletionId}]
		);
		expect(result.RETURN_CODE).toBe(0);	
		conn.commit();
		
		// Change MTR of path from lower layer is not allowed
		pathUpdated1 = testUtil.cloneObject(globalPath2);
		pathUpdated1.MTR = '0004';
		
		param = preparePath([pathUpdated1]);
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_PATH_HASH_CHANGED', [pathUpdated1.ID])
    	    }
		); 
		conn.rollback();
		
		// Change location of path from lower layer which is not allowed
		pathUpdated1 = testUtil.cloneObject(globalPath2);
		pathUpdated1.CONNECTION[0].TO_LOCATION = 'L3';
		pathUpdated1.CONNECTION[1].FROM_LOCATION = 'L3';
		
		param = preparePath([pathUpdated1]);
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_PATH_HASH_CHANGED', [pathUpdated1.ID])
    	    }
		); 
		conn.rollback();
		
		// Create a void path
		// Then the path in lower layer cannot be updated or deleted
		// User should delete the void connection
		var voidDeltaPath  = testUtil.cloneObject(globalPath2);
		voidDeltaPath.ID = 'P8';
		param = preparePath([voidDeltaPath]);
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'W',
				MESSAGE: bundle.getText('MSG_PATH_VOID', 
				[[globalPath2.MTR, globalPath2.CONNECTION[0].FROM_LOCATION, 
				globalPath2.CONNECTION[1].FROM_LOCATION,globalPath2.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		voidDeltaPath.ID = result.ID_MAP[0].ID;
		conn.commit();
		
		pathUpdated1 = testUtil.cloneObject(globalPath2);

		param = preparePath([pathUpdated1]);
		result = updatePathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[globalPath2.MTR, globalPath2.CONNECTION[0].FROM_LOCATION, 
				globalPath2.CONNECTION[1].FROM_LOCATION,globalPath2.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
		
		// Deletion is also not allowed now
		result = deletePathProc(
		    localDatasetId,
		    [{ID: globalPath2.ID}]
		);
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_PATH_UNIQUENESS_VIOLATED', 
				[[globalPath2.MTR, globalPath2.CONNECTION[0].FROM_LOCATION, 
				globalPath2.CONNECTION[1].FROM_LOCATION,globalPath2.CONNECTION[1].TO_LOCATION].join(':')])
		    }
		);
		conn.rollback();
	});
	
	/**
	 * Test exceptional cases	
	 */
	it("check should fail", function(){
	    
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
        
		var result = proc(
			LOCAL_DATASET_CODE,
			[],
			[],
			[]
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		var localDatasetId = result.DATASET_ID;
		
		// Path ID undefined
		var param = preparePath([{}]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_ID_MISSING', [])
		});
		
		// Path id null
        param = preparePath([{ID: null}]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_ID_MISSING', [])
		});
		
		// Missing from location
		// Missing to location
		// Missing MTR
		param = preparePath([{ID:''}]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_FROM_LOCATION_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_TO_LOCATION_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_MTR_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_WITHOUT_CONNECTION', [''])
		});
		
		param = preparePath([{
		    ID: '',
		    FROM_LOCATION: '',
			TO_LOCATION: '',
			MTR: '',
			CARRIER: ''
		}]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(4);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_FROM_LOCATION_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_TO_LOCATION_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_MTR_MISSING', [''])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_WITHOUT_CONNECTION', [''])
		});
		
		var deltaPath1 = {
			ID: '',
			FROM_LOCATION: 'UNKNOWN_LOCATION_1',
			TO_LOCATION: 'UNKNOWN_LOCATION_2',
			MTR: 'UNKNOWNMTR',
			CARRIER: '',
			CONNECTION:[]
		};
		
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(4);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_LOCATION_NOT_FOUND', [deltaPath1.ID, deltaPath1.FROM_LOCATION])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_LOCATION_NOT_FOUND', [deltaPath1.ID, deltaPath1.TO_LOCATION])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_MTR_INVALID', [deltaPath1.MTR])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_WITHOUT_CONNECTION', [deltaPath1.ID])
		});
		
		// Connection has no path id
		deltaPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			]
		};
		
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    [{SEQUENCE: 1, FROM_LOCATION:'L1', TO_LOCATION:'L3', DISTANCE: 100, DURATION:3000, STAY_TIME:0}]
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(1);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_PATH_ID_MISSING', [])
		});
		
		// Connection has no sequence
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    [{PATH_ID: deltaPath1.ID, FROM_LOCATION:'L1', TO_LOCATION:'L3', DISTANCE: 100, DURATION:3000, STAY_TIME:0}]
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(1);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_SEQUENCE_MISSING', [])
		});
		
		// From location is missing
		// To location is missing
		// Distance is invalid
		// Duration is invalid
		// Stay time is invalid
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    [   {PATH_ID: deltaPath1.ID, SEQUENCE: 1},
    		    {PATH_ID: deltaPath1.ID, SEQUENCE: 2, FROM_LOCATION: null, TO_LOCATION:null, DISTANCE: null, DURATION:null},
    		    {PATH_ID: deltaPath1.ID, SEQUENCE: 3, FROM_LOCATION: '', TO_LOCATION:'', DISTANCE: -1, DURATION:-1, STAY_TIME: -1}
		    ]
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(13);

		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_FROM_LOCATION_MISSING', [deltaPath1.ID, 1])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_FROM_LOCATION_MISSING', [deltaPath1.ID, 2])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_FROM_LOCATION_MISSING', [deltaPath1.ID, 3])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_TO_LOCATION_MISSING', [deltaPath1.ID, 1])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_TO_LOCATION_MISSING', [deltaPath1.ID, 2])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_TO_LOCATION_MISSING', [deltaPath1.ID, 3])
		});
		
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DISTANCE_INVALID', [deltaPath1.ID, 1])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DISTANCE_INVALID', [deltaPath1.ID, 2])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DISTANCE_INVALID', [deltaPath1.ID, 3])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DURATION_INVALID', [deltaPath1.ID, 1])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DURATION_INVALID', [deltaPath1.ID, 2])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DURATION_INVALID', [deltaPath1.ID, 3])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_STAY_TIME_INVALID', [deltaPath1.ID, 3])
		});
		
		
		// Connection has unknown locations
		// 0 is allowed for distance, duration and stay time
		deltaPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'UNKNOWN_LOCATION1', 
			    TO_LOCATION: 'UNKNOWN_LOCATION2', DISTANCE: 0, DURATION:0, STAY_TIME: 0}
			]
		};
		
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(3);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_LOCATION_NOT_FOUND', 
	          [deltaPath1.ID, 1, deltaPath1.CONNECTION[0].FROM_LOCATION])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_LOCATION_NOT_FOUND', 
	          [deltaPath1.ID, 1, deltaPath1.CONNECTION[0].TO_LOCATION])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_FROM_TO_LOCATION_INCONSISTENT', 
	          [deltaPath1.ID])
		});
		
		// Duplicate sequence
		deltaPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'L1', 
			    TO_LOCATION: 'L2', DISTANCE: 10, DURATION:20, STAY_TIME: 0},
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'L2', 
			    TO_LOCATION: 'L3', DISTANCE: 30, DURATION:40, STAY_TIME: 0}
			]
		};
		
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(1);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_DUPLICATE_SEQUENCE', 
	          [deltaPath1.ID, 1])
		});
		
		
		// Connection not connected
		deltaPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'L1', 
			    TO_LOCATION: 'L4', DISTANCE: 10, DURATION:20, STAY_TIME: 0},
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 2, FROM_LOCATION: 'L2', 
			    TO_LOCATION: 'L3', DISTANCE: 30, DURATION:40, STAY_TIME: 0}
			]
		};
		
		param = preparePath([deltaPath1]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(1);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_CONNECTION_FROM_LOCATION_NOT_CONNECTED', 
	          [deltaPath1.ID, 1, 2])
		});
		
		// From location and to location are not consitent with those defined by connection
		deltaPath1 = {
			ID: 'P1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'L1', 
			    TO_LOCATION: 'L2', DISTANCE: 10, DURATION:20, STAY_TIME: 0},
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 2, FROM_LOCATION: 'L2', 
			    TO_LOCATION: 'L5', DISTANCE: 30, DURATION:40, STAY_TIME: 0}
			]
		};

		var deltaPath2 = {
			ID: 'P2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 1, FROM_LOCATION: 'L4', 
			    TO_LOCATION: 'L2', DISTANCE: 10, DURATION:20, STAY_TIME: 0},
			    {PATH_ID: deltaPath1.ID, SEQUENCE: 2, FROM_LOCATION: 'L2', 
			    TO_LOCATION: 'L3', DISTANCE: 30, DURATION:40, STAY_TIME: 0}
			]
		};
		
		param = preparePath([deltaPath1, deltaPath2]);
		
		result = createPathProc(
		    localDatasetId,
		    param.PATHS,
		    param.PATH_CONNECTION
		);
		
		expect(result.RETURN_CODE).not.toBe(0);
		// Carrier is not mandatory
		expect(result.MESSAGE.length).toBe(2);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_FROM_TO_LOCATION_INCONSISTENT', 
	          [deltaPath1.ID])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_FROM_TO_LOCATION_INCONSISTENT', 
	          [deltaPath2.ID])
		});
		
	});
	
	/**
	 * Test 
	 */
	it("edit of path should fail", function(){
		
		var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			NAME: '1000069',
			TYPE: 'S',
			FROM_LOCATION: 'UNKNOWN1',
			TO_LOCATION: 'UNKNOWN2',
			MTR: '0003',
			CARRIER: 'CARRIRER1',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L1',
        			TO_LOCATION: 'L2',
        			DISTANCE: 1,
        			DURATION: 1,
        			STAY_TIME: 1,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 2,
        			DURATION: 2,
        			STAY_TIME: 0,
            		CUTOFF_OFFSET: 0,
            		AVAILABILITY_OFFSET: 0
		        }
			]
		};
		
		paths.push(globalPath1);
		
		testUtil.insertPath(paths);
		
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);

		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		var result = proc(
			fromDate,
			toDate,
			config,
			[],      // Basic connection
			[]       // Connection carrier
		);

		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_LOCATION_NOT_FOUND', [globalPath1.TYPE + globalPath1.NAME, globalPath1.FROM_LOCATION])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_PATH_LOCATION_NOT_FOUND', [globalPath1.TYPE + globalPath1.NAME, globalPath1.TO_LOCATION])
		});
	});
});