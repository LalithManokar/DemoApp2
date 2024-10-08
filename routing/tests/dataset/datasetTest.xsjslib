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
var TEST_SCHEMA = 'SAP_TM_ROUTING_TEST';
var TRP_SCHEMA = 'SAP_TM_TRP';
var TMP_PACKAGE = 'sap.tm.trp.routing.tests.integration';
var GLOBAL_DATASET_ID = 0;
var GLOBAL_DATASET_CODE = 'TM_INTERMODAL';
var LOCAL_DATASET_CODE = 'MY_LOCAL_DATASET';
var DELTA_DATASET_CODE = 'MY_DELTA_DATASET';
var PROCEDURE_PACKAGE = 'sap.tm.trp.routing.db.dataset';
var TEST_DATA_PACKAGE = 'sap.tm.trp.routing.tests.data.dataset';
var SOURCE_SYSTEM = 'S';
var SOURCE_MANUAL = 'M';
var MERGED_VIEW = 'M';

describe('test dataset function', function() {
	var testEnvironmentCreateGlobalDataset;
	var testEnvironmentUpdateGlobalDataset;
	var testEnvironmentDeleteDataset;
	var testEnvironmentReadDataset;
	var testEnvironmentReadPathById;

	var conn;
	var bundle;
	var repository;
	var csvProperties;
	var testUtil;
	var config;
	var sqlExecutor;
	
	var readDatasetProc;
	var queryPathProc;
	var queryConnectionProc;
	var createGlobalDatasetProc;
	var updateGlobalDatasetProc;
	var createLocalDatasetProc;
	var updateLocalDatasetProc;
	var createDeltaDatasetProc;
	var deleteDatasetProc;
	var sqlExecutor;

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

		definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_global_dataset";
		testEnvironmentUpdateGlobalDataset = mockstarEnvironment.define(definition, conn);
		testEnvironmentUpdateGlobalDataset.addProcedureSubstitution("BuildBasicPath", {
			schema: SCHEMA,
			name: "sap.tm.trp.routing.db.connector::p_build_basic_path",
			testProcedure: '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_build_basic_path"'
		});
		testEnvironmentUpdateGlobalDataset.create();
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_local_dataset";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_local_dataset";
		mockstarEnvironment.defineAndCreate(definition, conn);
        
        definition.model.name = "sap.tm.trp.routing.db.dataset/p_delete_dataset";
		testEnvironmentDeleteDataset = mockstarEnvironment.defineAndCreate(definition, conn);
        
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_delta_dataset";
		testEnvironmentDeleteDataset = mockstarEnvironment.defineAndCreate(definition, conn);

		definition.model.name = "sap.tm.trp.routing.db.dataset/p_query_basic_path";
		mockstarEnvironment.defineAndCreate(definition, conn);

        definition.model.name = "sap.tm.trp.routing.db.dataset/p_query_basic_connection";
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
		
		queryConnectionProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_query_basic_connection', {
				connection: conn
			}
		);
		
		updateGlobalDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_update_global_dataset', {
				connection: conn
			}
		);
		
		createGlobalDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_global_dataset', {
				connection: conn
			}
		);
		
		updateLocalDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_update_local_dataset', {
				connection: conn
			}
		);
		
		createLocalDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		createDeltaDatasetProc = new Procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage + '::p_create_delta_dataset', 
			{
				connection: conn,
				tempSchema: mockstarEnvironment.userSchema
			}
		);
		
		deleteDatasetProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_delete_dataset', {
				connection: conn
			}
		);

	});
	
	function cleanSystemPaths(){
	    sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path"');
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path_connection"');
    }

	beforeEach(function() {
		//testEnvironmentReadDataset.clearAllTestTables();

		var tableUtils = new TableUtils(conn);
		testEnvironmentCreateGlobalDataset.getTestTableNames()
		.forEach(tableUtils.clearTableInUserSchema.bind(tableUtils));
		
		cleanSystemPaths();

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
		var storedProcedures = [
		    'p_create_global_dataset',
		    'p_create_local_dataset',
		    'p_create_delta_dataset',
		    'p_update_global_dataset',
		    'p_update_local_dataset',
		    'p_delete_dataset',
		    'p_create_dataset',
		    'p_update_dataset',
		    'p_validate_connection',
		    'p_validate_location_list',
		    'p_validate_path',
		    'p_read_dataset',
		    'p_query_basic_path',
		    'p_query_basic_connection',
		    'p_get_dataset_chain',
		    'p_get_basic_path_merged_view',
		    'p_get_basic_conn_merged_view',
		    'p_filter_path_by_from_to_loc_mtr'
		];
		
		/*
		storedProcedures.forEach(function(sp){
		    var repositoryPath = RepositoryPath.fromPackageFilenameAndSuffix(
			testEnvironmentCreateGlobalDataset.targetPackage, sp, 'hdbprocedure');
		    try{
		        //repository.deleteFile(repositoryPath);
		    } catch (e) {
		        // Ignore the error
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
		    tmp.ID = p.EXTERNAL_ID.toString();
		    tmp.NAME = p.NAME;
		    tmp.TYPE = p.EXTERNAL_TYPE;
		    tmp.FROM_LOCATION = p.FROM_LOCATION;
		    tmp.TO_LOCATION = p.TO_LOCATION;
		    tmp.MTR = p.MTR;
			tmp.CARRIER = p.CARRIER;
			tmp.CONNECTION = map[p.ID.toString()].CONNECTION;
			return tmp;
		});
	}
	
	function transformConnection(connection, connectionCarrier){
	    var map = {};
	    
	    connectionCarrier.sort(function(c1, c2){
	        return c1.CARRIER < c2.CARRIER?-1:1;
	    });
	    
	    connectionCarrier.forEach(function(c){
	        if (!map[c.CONNECTION_ID]){
	            map[c.CONNECTION_ID] = [];
	        }
	        map[c.CONNECTION_ID].push(c.CARRIER);
	    });
	    
	    return connection.map(function(c){
	        return {
	            FROM_LOCATION: c.FROM_LOCATION,
				TO_LOCATION: c.TO_LOCATION,
				MTR: c.MTR,
				DISTANCE: c.DISTANCE,
				DURATION: c.DURATION,
				CARRIER: map[c.ID.toString()] || []
	        };
	    });
	};

	/**
	 * Test success creation, update, deletion and read	
	 * 
	 */
	it("CRUD of global dataset should run successfully", function(){

		var paths = [];
	    
	    var globalPath1 = {
			ID: 'P1',
			NAME: '10000061',
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
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
    		    },
    		    {
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L4',
        			DISTANCE: 200,
        			DURATION: 2000,
        			STAY_TIME: 250,
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
		        }
			]
		};
		
		var globalPath2 = {
			ID: 'P2',
			NAME: '10000062',
			TYPE: 'S',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L4',
			MTR: '0002',
			CARRIER: 'CARRIRER2',
			CONNECTION:[
			    {
        			SEQUENCE: 1,
        			FROM_LOCATION: 'L2',
        			TO_LOCATION: 'L3',
        			DISTANCE: 300,
        			DURATION: 3000,
        			STAY_TIME: 350,
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L3',
        			TO_LOCATION: 'L4',
        			DISTANCE: 400,
        			DURATION: 4000,
        			STAY_TIME: 450,
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
        		}
			]
		};
		
		var globalPath3 = {
			ID: 'P3',
			NAME: '60000061',
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
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
        		},
        		{
        			SEQUENCE: 2,
        			FROM_LOCATION: 'L4',
        			TO_LOCATION: 'L5',
        			DISTANCE: 600,
        			DURATION: 6000,
        			STAY_TIME: 650,
        			CUTOFF_OFFSET : 0, 
        			AVAILABILITY_OFFSET : 0
        		}
			]
		};
	    
	    paths.push(globalPath1);
	    paths.push(globalPath2);
	    paths.push(globalPath3);
		testUtil.insertPath(paths);
		
		var globalConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1']
		};
		
		var globalConnection2 = {
			ID: 'C2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 200,
			DURATION: 2000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var globalConnection3 = {
			ID: 'C3',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var globalConnection4 = {
			ID: 'C4',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var param = testUtil.prepareConnection(
		    [globalConnection1, globalConnection2, globalConnection3]);

		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
		var result = createGlobalDatasetProc(
			fromDate,
			toDate,
			config,
			param.connection,
			param.connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		expect(result.DATASET_ID.toString()).toBe(GLOBAL_DATASET_ID.toString());

		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE[0].SEVERITY).toBe('I');
		expect(result.MESSAGE[0].MESSAGE).toContain(
			bundle.getText('MSG_DATASET_CREATED_SUCCESS', [GLOBAL_DATASET_CODE])
		);
		
		// Read global dataset
		result = readDatasetProc(GLOBAL_DATASET_ID, 'X');

		expect(result.DATASET.length).toBe(1);
		expect(result.DATASET[0].CODE).toBe(GLOBAL_DATASET_CODE);
		// Date has been converted by XS engine
		expect(result.DATASET[0].VALID_FROM.getDate()).toBe(fromDate.getDate());
		expect(result.DATASET[0].VALID_TO.getDate()).toBe(toDate.getDate());
		expect(result.DATASET[0].CREATED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CHANGED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CREATED_ON).toBeDefined();
		expect(result.DATASET[0].CHANGED_ON).toBeDefined();
		
		expect(result.SUMMARY[0].SYSTEM_PATH_COUNT).toBe(3);
		expect(result.SUMMARY[0].SYSTEM_CONNECTION_COUNT).toBe(2);

		// Read global dataset with details
		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		var actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath2);
		
		var globalPath1ID = result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString();
		
		// Connection is aggregated by from location, to location and MTR
		var globalConnection1Aggregated = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 150,
			DURATION: 1500,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		// Read global dataset with details
		result = queryConnectionProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');

		// Pay attention to sequence, sort if needed
		var actual = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        var expected = [globalConnection1Aggregated, testUtil.cloneObject(globalConnection3)]
        .map(function(c){
            delete c.ID;
            return c;
        });
        
		expect(actual).toMatchData(expected, ['FROM_LOCATION', 'TO_LOCATION', 'MTR']);
		
		//Update, remove and add some system paths
		cleanSystemPaths();
		globalPath1.CONNECTION[0].DURATION += 5;
		globalPath1.CONNECTION[0].TO_LOCATION ='L3';
		globalPath1.CONNECTION[1].FROM_LOCATION ='L3';
		globalPath1.CONNECTION[1].DURATION += 10;
		
		paths = [];
		paths.push(globalPath1);
	    paths.push(globalPath3);
	    
	    testUtil.insertPath(paths);
	    
	    globalConnection1.DISTANCE += 100;
	    globalConnection1.DURATION += 1000;
	    globalConnection1.CARRIER = ['CARRIER1', 'CARRIER3'];
	    
	    param = testUtil.prepareConnection(
		    [globalConnection1, globalConnection2, globalConnection4]);
	    
	    result = updateGlobalDatasetProc(
			fromDate,
			toDate,
			config,
			param.connection,
			param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);

		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE[0].SEVERITY).toBe('I');
		expect(result.MESSAGE[0].MESSAGE).toContain(
			bundle.getText('MSG_DATASET_UPDATED_SUCCESS', [GLOBAL_DATASET_CODE])
		);
		
		result = queryPathProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');
		
		actualPaths = transformPath(result.PATHS, result.PATH_CONNECTION);
		expect(actualPaths).toContain(globalPath1);
		expect(actualPaths).toContain(globalPath3);
		expect(actualPaths.length).toBe(2);
		
		// Id of basic path should be kept
		expect(result.PATHS.find(function(p){
		    return p.EXTERNAL_ID  === globalPath1.ID;
		}).ID.toString()).toBe(globalPath1ID);
		
		
		// Connection is aggregated by from location, to location and MTR
		globalConnection1Aggregated = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 200,
			DURATION: 2000,
			CARRIER: ['CARRIER1', 'CARRIER2', 'CARRIER3']
		};
		
		// Query connections
		result = queryConnectionProc(GLOBAL_DATASET_ID, MERGED_VIEW, '', '', '');

		actual = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        expected = [globalConnection1Aggregated, testUtil.cloneObject(globalConnection4)]
        .map(function(c){
            delete c.ID;
            return c;
        });
        
		expect(actual).toMatchData(expected, ['FROM_LOCATION', 'TO_LOCATION', 'MTR']);
		
		// Delete dataset and read dataset
		// No exception but empty result is returned
		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_delete_dataset', {
				connection: conn
		});

		result = proc(GLOBAL_DATASET_CODE, '');
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MESSAGE).toEqualObject(
		[
		      {
		          SEVERITY: 'I', 
		          MESSAGE: bundle.getText('MSG_DATASET_DELETED_SUCCESS', [GLOBAL_DATASET_CODE])
		      }
		]);

		// Check read dataset with details
		result = readDatasetProc(GLOBAL_DATASET_ID, '');
		expect(result.DATASET.length).toBe(0);
	});
	
	/**
	 * Test creation, update and delete and read local dataset without error
	 */
	it("CRUD of local dataset should run successfully", function(){
	    
	    // Create empty global dataset
	    var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2016/01/01 00:00:00 +0000');
	    
	    var result = createGlobalDatasetProc(
			fromDate,
			toDate,
			config,
			[],
			[]
		);

		expect(result.RETURN_CODE).toBe(0);
	    
	    var localConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1']
		};
		
		var localConnection2 = {
			ID: 'C2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 200,
			DURATION: 2000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var localConnection3 = {
			ID: 'C3',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var localConnection4 = {
			ID: 'C4',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 100,
			DURATION: 1000,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		var locations = [{LOCATION_ID: 'L1'}, {LOCATION_ID: 'L2'}, {LOCATION_ID: 'L3'}];
		
		var param = testUtil.prepareConnection(
		    [localConnection1, localConnection2, localConnection3]);

		result = createLocalDatasetProc(
			LOCAL_DATASET_CODE,
			locations,
			param.connection,
			param.connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		expect(result.DATASET_ID).not.toBeNull();

		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE[0].SEVERITY).toBe('I');
		expect(result.MESSAGE[0].MESSAGE).toContain(
			bundle.getText('MSG_DATASET_CREATED_SUCCESS', [LOCAL_DATASET_CODE])
		);
		
		var localDatasetId = result.DATASET_ID;
		
		// Read local dataset
		result = readDatasetProc(localDatasetId, 'X');

		expect(result.DATASET.length).toBe(1);
		expect(result.DATASET[0].CODE).toBe(LOCAL_DATASET_CODE);
		// Date has been converted by XS engine
		expect(result.DATASET[0].CREATED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CHANGED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CREATED_ON).toBeDefined();
		expect(result.DATASET[0].CHANGED_ON).toBeDefined();
		
		expect(result.SUMMARY[0].SYSTEM_PATH_COUNT).toBe(0);
		expect(result.SUMMARY[0].SYSTEM_CONNECTION_COUNT).toBe(2);
		
		// Connection is aggregated by from location, to location and MTR
		var localConnection1Aggregated = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 150,
			DURATION: 1500,
			CARRIER: ['CARRIER1', 'CARRIER2']
		};
		
		// Read global dataset with details
		result = queryConnectionProc(localDatasetId, MERGED_VIEW, '', '', '');

		// Pay attention to sequence, sort if needed
		var actual = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        var expected = [localConnection1Aggregated, testUtil.cloneObject(localConnection3)]
        .map(function(c){
            delete c.ID;
            return c;
        });
        
		expect(actual).toMatchData(expected, ['FROM_LOCATION', 'TO_LOCATION', 'MTR']);
		
		var localConnectionId1 = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection1Aggregated.FROM_LOCATION &&
		    c.TO_LOCATION === localConnection1Aggregated.TO_LOCATION &&
		    c.MTR === localConnection1Aggregated.MTR;
		}).ID.toString();
		
		//Update, remove and add connections
	    localConnection1.DISTANCE += 100;
	    localConnection1.DURATION += 1000;
	    localConnection1.CARRIER = ['CARRIER1', 'CARRIER3'];
	    
	    param = testUtil.prepareConnection(
		    [localConnection1, localConnection2, localConnection4]);
	    
	    result = updateLocalDatasetProc(
			LOCAL_DATASET_CODE,
			locations,
			param.connection,
			param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);

		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE[0].SEVERITY).toBe('I');
		expect(result.MESSAGE[0].MESSAGE).toContain(
			bundle.getText('MSG_DATASET_UPDATED_SUCCESS', [LOCAL_DATASET_CODE])
		);
		
		// Connection is aggregated by from location, to location and MTR
		localConnection1Aggregated = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 200,
			DURATION: 2000,
			CARRIER: ['CARRIER1', 'CARRIER2', 'CARRIER3']
		};
		
		// Query connections
		result = queryConnectionProc(localDatasetId, MERGED_VIEW, '', '', '');

		actual = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        expected = [localConnection1Aggregated, testUtil.cloneObject(localConnection4)]
        .map(function(c){
            delete c.ID;
            return c;
        });
        
		expect(actual).toMatchData(expected, ['FROM_LOCATION', 'TO_LOCATION', 'MTR']);
		
		// Id of basic path should be kept
		expect(result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection1Aggregated.FROM_LOCATION &&
		    c.TO_LOCATION === localConnection1Aggregated.TO_LOCATION &&
		    c.MTR === localConnection1Aggregated.MTR;
		}).ID.toString()).toBe(localConnectionId1);
		
		// Create delta dataset
		result = createDeltaDatasetProc(
		    DELTA_DATASET_CODE,
			LOCAL_DATASET_CODE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.DATASET_ID).not.toBeNull();
		
		var deltaDatasetId = result.DATASET_ID;

		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE[0].SEVERITY).toBe('I');
		expect(result.MESSAGE[0].MESSAGE).toContain(
			bundle.getText('MSG_DATASET_CREATED_SUCCESS', [DELTA_DATASET_CODE])
		);
		
		// Read delta dataset
		result = readDatasetProc(deltaDatasetId, '');

		expect(result.DATASET.length).toBe(1);
		expect(result.DATASET[0].CODE).toBe(DELTA_DATASET_CODE);
		// Date has been converted by XS engine
		expect(result.DATASET[0].CREATED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CHANGED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CREATED_ON).toBeDefined();
		expect(result.DATASET[0].CHANGED_ON).toBeDefined();
		
		// Delete delta dataset
		result = deleteDatasetProc(DELTA_DATASET_CODE, '');
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MESSAGE).toEqualObject(
		[
		      {
		          SEVERITY: 'I', 
		          MESSAGE: bundle.getText('MSG_DATASET_DELETED_SUCCESS', [DELTA_DATASET_CODE])
		      }
		]);
		
		result = readDatasetProc(deltaDatasetId, '');
		expect(result.DATASET.length).toBe(0);
		
		
		// Delete dataset and read dataset
		// No exception but empty result is returned
		result = deleteDatasetProc(LOCAL_DATASET_CODE, '');
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MESSAGE).toEqualObject(
		[
		      {
		          SEVERITY: 'I', 
		          MESSAGE: bundle.getText('MSG_DATASET_DELETED_SUCCESS', [LOCAL_DATASET_CODE])
		      }
		]);

		// Check read dataset with details
		result = readDatasetProc(localDatasetId, '');
		expect(result.DATASET.length).toBe(0);

	});

	/**
	 * Test exceptional cases	
	 */
	it("should fail", function(){
	    var basicConnections = [];
		var connectionCarrier = [];
		
		var fromDate = new Date('2015/01/01 00:00:00 +0000');
		var toDate = new Date('2014/01/01 00:00:00 +0000');
		
		var result = createGlobalDatasetProc(
			fromDate,
			toDate,
			config,
			basicConnections,
			connectionCarrier
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_DATE_RANGE_INVALID', [])
		});
		
		result = updateGlobalDatasetProc(
			new Date('2015/01/01 00:00:00 +0000'),
			new Date('2016/01/01 00:00:00 +0000'),
			config,
			basicConnections,
			connectionCarrier
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_GLOBAL_DATASET_NOT_EXIST', [])
		});
		
		var locations = [];
		
		// Code is mandatory
		result = createLocalDatasetProc(
			'',
			locations,
			basicConnections,
			connectionCarrier
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(1);
		
		expect(result.MESSAGE).toContain({
          SEVERITY: 'E', 
          MESSAGE: bundle.getText('MSG_DATASET_CODE_MANDATORY')
		});

		// Code is illegal
		var illegalCode = '^Illegal_code';
		result = createLocalDatasetProc(
			illegalCode,
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_CODE_INVALID', [illegalCode])
		});
		
		// Code is illegal
		illegalCode = '12code_';
		result = createLocalDatasetProc(
			illegalCode,
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE.length).toBe(1);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_CODE_INVALID', [illegalCode])
		});
		
		// Duplicate code
		result = createLocalDatasetProc(
			LOCAL_DATASET_CODE,
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).toBe(0);
		
	    result = createLocalDatasetProc(
			LOCAL_DATASET_CODE,
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_DATASET_CODE_ALREADY_EXIST', [LOCAL_DATASET_CODE])
		});
		
		// Missing location and unkown location
		locations = [
		  {LOCATION_ID: ''}
		];
		
		result = createLocalDatasetProc(
			'TEST_DATASET',
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_LOCATION_LIST_LOCATION_MISSING', [])
		});
		
		// Missing location and unkown location
		locations = [
		  {}
		];
		
		result = createLocalDatasetProc(
			'TEST_DATASET',
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_LOCATION_LIST_LOCATION_MISSING', [])
		});
		
		// Missing location and unkown location
		locations = [
		  {LOCATION_ID: 'UNKOWN_LOCATION'}
		];
		
		result = createLocalDatasetProc(
			'TEST_DATASET',
			locations,
			basicConnections
		);

		expect(result.RETURN_CODE).not.toBe(0);
		expect(result.MESSAGE).toContain({
            SEVERITY: 'E', 
            MESSAGE: bundle.getText('MSG_LOCATION_LIST_LOCATION_NOT_FOUND', [locations[0].LOCATION_ID])
		});
		
		// Create delta dataset
		var NONEXISTENT_DATASET_CODE = 'NONEXISTENT_DATASET_CODE';
		result = createDeltaDatasetProc(
		    DELTA_DATASET_CODE,
			NONEXISTENT_DATASET_CODE
		);
		
		conn.commit();
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toEqualObject(
		[
		      {
		          SEVERITY: 'E', 
		          MESSAGE: bundle.getText('MSG_DATASET_CODE_NOT_EXIST', [NONEXISTENT_DATASET_CODE])
		      }
		]);
		
		// Create delta dataset
		// Delete local dataset
		result = createDeltaDatasetProc(
		    DELTA_DATASET_CODE,
			LOCAL_DATASET_CODE
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		result = deleteDatasetProc(LOCAL_DATASET_CODE, '');
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toEqualObject(
		[
		      {
		          SEVERITY: 'E', 
		          MESSAGE: bundle.getText('MSG_DATASET_STILL_USED_BY_DELTA', [LOCAL_DATASET_CODE, DELTA_DATASET_CODE])
		      }
		]);
	    
	});

});