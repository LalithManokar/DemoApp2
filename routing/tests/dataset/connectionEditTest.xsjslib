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

var SCHEMA = 'SAP_TM_ROUTING';
var TRP_SCHEMA = 'SAP_TM_TRP';
var TEST_SCHEMA = 'SAP_TM_ROUTING_TEST';
var GLOBAL_DATASET_ID = 0;
var GLOBAL_DATASET_CODE = 'TM_INTERMODAL';
var LOCAL_DATASET_CODE = 'MY_LOCAL_DATASET';
var PROCEDURE_PACKAGE = 'sap.tm.trp.routing.db.dataset';
var TEST_DATA_PACKAGE = 'sap.tm.trp.routing.tests.data.dataset';
var ACTION_DELETE = 'D';
var ACTION_CREATE = 'C';
var ACTION_UPDATE = 'U';
var SOURCE_SYSTEM = 'S';
var SOURCE_MANUAL = 'M';

describe('test basic connection function', function() {
	var testEnvironmentCreateGlobalDataset;
	var testEnvironmentCreateLocalDataset;
	var testEnvironmentReadDataset;
	var conn;
	var bundle;
	var repository;
	var csvProperties;
	var testUtil;
	var config;
	var sqlExecutor;
	var tableUtils;
	
	var readDatasetProc;
	var createConnectionProc;
	var updateConnectionProc;
	var deleteConnectionProc;
	var queryConnectionProc;

	beforeOnce(function() {
		conn = $.db.getConnection();
		//conn = jasmine.dbConnection;
		testUtil = new testUtilLib.testUtil(conn);
		tableUtils = new TableUtils(conn);
		
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
		    },
		    "mtr_map":{
		        schema : semanticSchema,
		        name: 'sap.tm.trp.db.semantic.common::v_mtr_map'
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
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_create_connection";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_update_connection";
		mockstarEnvironment.defineAndCreate(definition, conn);
		
		definition.model.name = "sap.tm.trp.routing.db.dataset/p_delete_connection";
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
		
		createConnectionProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_connection', {
				connection: conn
			}
		);
		
		updateConnectionProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_update_connection', {
				connection: conn
			}
		);
		
		deleteConnectionProc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_delete_connection', {
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

	});

	beforeEach(function() {
	    // test environment uses jasmine connection, which will cause some lock problem
		//testEnvironmentCreateGlobalDataset.clearAllTestTables();

		testEnvironmentCreateGlobalDataset.getTestTableNames()
		.forEach(tableUtils.clearTableInUserSchema.bind(tableUtils));
		
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path"');
		sqlExecutor.execSingle('delete from "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path_connection"');

		// Fill location data which is used to check locations in connection
		//var tableUtils = new TableUtils(conn);
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
		
		tableUtils.fillFromCsvFile(
			mockstarEnvironment.userSchema +
			'."sap.tm.trp.db.semantic.common::v_mtr_map"',
			TEST_DATA_PACKAGE,
			'mtr_map.csv',
			csvProperties
		);
        conn.commit();
	});

	afterOnce(function() {
		
		var storedProcedures = [
		    'p_create_global_dataset',
		    'p_create_local_dataset',
		    'p_create_delta_dataset',
		    'p_create_dataset',
		    'p_create_connection',
		    'p_update_connection',
		    'p_delete_connection',
		    'p_save_dataset',
		    'p_get_connection_by_hash',
		    'p_invalidate_dataset',
		    'p_validate_connection',
		    'p_validate_location_list',
		    'p_validate_path',
		    'p_read_dataset',
		    'p_query_basic_connection',
		    'p_get_basic_conn_merged_view',
		    'p_get_dataset_chain'
		];
		
		/*
		storedProcedures.forEach(function(sp){
		    // Clear procedures generated
		    var repositoryPath = RepositoryPath.fromPackageFilenameAndSuffix(
			testEnvironmentReadDataset.targetPackage, sp, 'hdbprocedure');
			
		    try{
		        repository.deleteFile(repositoryPath);
		    } catch (e) {
		        // Ignore error
		    }
		});
		*/
	});
	
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
	            ID: c.ID.toString(),
	            FROM_LOCATION: c.FROM_LOCATION,
				TO_LOCATION: c.TO_LOCATION,
				MTR: c.MTR,
				DISTANCE: c.DISTANCE,
				DURATION: c.DURATION,
				CARRIER: map[c.ID.toString()] || []
	        };
	    });
	}
	
	function prepareConnection(connectionList){
	    var result = {
	        connection: [],
	        connectionCarrier: []
	    };
	    connectionList.forEach(function(c){
	        var obj = testUtil.cloneObject(c);
	        delete obj.CARRIER;
	        
	        result.connection.push(obj);
	        
	        if (c.CARRIER){
    	        c.CARRIER.forEach(function(carrier){
    	            result.connectionCarrier.push({
    	                CONNECTION_ID: c.ID,
    	                CARRIER: carrier
    	            });
    	        });
	        }
	    });
	    
	    return result;
	    
	}

	/**
	 * Test edit
	 */
	it("edit of connection should run successfully", function(){
		
		var globalConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 150,
			DURATION: 1000,
			CARRIER: ['CARRIER1']
		};
		
		var globalConnection2 = {
			ID: 'C11',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 251,
			DURATION: 2001,
			CARRIER: ['CARRIER1']
		};

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
		var param = prepareConnection([globalConnection1, globalConnection2]);
		var result = proc(
			fromDate,
			toDate,
			config,
			param.connection,
			param.connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		
		result = queryConnectionProc(GLOBAL_DATASET_ID, 'M', '', '', '');
		expect(result.CONNECTION.length).toBe(2);
		
		globalConnection1.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === globalConnection1.FROM_LOCATION
		    && c.TO_LOCATION === globalConnection1.TO_LOCATION
		    && c.MTR === globalConnection1.MTR;
		}).ID.toString();
		
		globalConnection2.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === globalConnection2.FROM_LOCATION
		    && c.TO_LOCATION === globalConnection2.TO_LOCATION
		    && c.MTR === globalConnection2.MTR;
		}).ID.toString();
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {LOCATION_ID: 'L2'},  
		    {LOCATION_ID: 'L3'}, 
		    {LOCATION_ID: 'L4'}
		];
	    
		var localConnection1 = {
			ID: 'C2',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 250,
			DURATION: 2000, 
			CARRIER: ['CARRIER2', 'CARRIER3']
		};
		
		var localConnection2 = {
			ID: 'C3',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L4',
			MTR: '0001',
			DISTANCE: 350,
			DURATION: 3000,
			CARRIER: []
		};
		
		param = prepareConnection([localConnection1, localConnection2]);

		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			param.connection,
			param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		result = queryConnectionProc(localDatasetId, 'M', '', '', '');
		
		// System connection in upper layer wins. 
		
		expect(result.CONNECTION.length).toBe(3);
		
		var actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID === globalConnection1.ID
		})).not.toBeNull();
		
		// The one with the same hash in global dataset will be shadowed
		expect(result.CONNECTION.find(function(c){
		    return c.ID === globalConnection2.ID;
		})).toBeUndefined();
		
		localConnection1.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection1.FROM_LOCATION
		    && c.TO_LOCATION === localConnection1.TO_LOCATION
		    && c.MTR === localConnection1.MTR;
		}).ID.toString();
		
		localConnection2.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection2.FROM_LOCATION
		    && c.TO_LOCATION === localConnection2.TO_LOCATION
		    && c.MTR === localConnection2.MTR;
		}).ID.toString();
	    
		expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
	   
	    var deltaConnection1 = {
			ID: 'C4',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L2',
			MTR: '0001',
			DISTANCE: 300,
			DURATION: 600,
			CARRIER: ['CARRIER1']
		};
		
		var deltaConnection2 = {
			ID: 'C5',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L2',
			MTR: '0001',
			DISTANCE: 300,
			DURATION: 600,
			CARRIER: []
		};
		
		param = prepareConnection([deltaConnection1, deltaConnection2]);
		
		result = createConnectionProc(
		    localDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.ID_MAP.length).toBe(2);
		conn.commit();
		
		deltaConnection1.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection1.ID;
		}).ID.toString();
		
		deltaConnection2.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection2.ID;
		}).ID.toString();
		
        // Check delta view
        result = queryConnectionProc(localDatasetId, 'D', '', '', '');
        expect(result.CONNECTION.length).toBe(2);
        
        // Check merged view
        result = queryConnectionProc(localDatasetId, 'M', '', '', '');
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
		expect(actualConnection).toContain(
		    deltaConnection1
		);
		expect(actualConnection).toContain(
		    deltaConnection2
		);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === globalConnection1.ID;
		}).ACTION).toBeNull();
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === globalConnection1.ID;
		}).SOURCE).toBe(SOURCE_SYSTEM);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnection1.ID;
		}).ACTION).toBeNull();
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnection1.ID;
		}).SOURCE).toBe(SOURCE_SYSTEM);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnection1.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnection1.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		// Check full view
        result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(5);
        
        var localConnectionUpdated = testUtil.cloneObject(localConnection1);
        localConnectionUpdated.DISTANCE += 25.5;
        localConnectionUpdated.DURATION -= 30;
        localConnectionUpdated.CARRIER.push('CARRIER5');

        var deltaConnectionUpdated = testUtil.cloneObject(deltaConnection1);
        deltaConnectionUpdated.DISTANCE += 15;
        deltaConnectionUpdated.DURATION += 20;
        deltaConnectionUpdated.MTR = '0006';
		
		param = prepareConnection([localConnectionUpdated, deltaConnectionUpdated]);
		
		result = updateConnectionProc(
		    localDatasetId,
		    param.connection, 
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.ID_MAP.length).toBe(1);
		conn.commit();
		localConnectionUpdated.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === localConnection1.ID;
		}).ID.toString();
		
		conn.commit(); // To check the table content. Remove  later
		
		// Check delta view
        result = queryConnectionProc(localDatasetId, 'D', '', '', '');
        expect(result.CONNECTION.length).toBe(3);
        
        // Check full view
        result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(5);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
		expect(actualConnection).toContain(
		    deltaConnection2
		);
		expect(actualConnection).toContain(
		    localConnectionUpdated
		);
		expect(actualConnection).toContain(
		    deltaConnectionUpdated
		);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnectionUpdated.ID;
		}).ACTION).toBe(ACTION_UPDATE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnectionUpdated.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnection1.ID;
		}).ACTION).toBe(ACTION_CREATE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnection1.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
        
        result = queryConnectionProc(localDatasetId, 'M', '', '', '');
		expect(result.CONNECTION.length).toBe(5);
		
		// Update UPDATE should not change the action type
		localConnectionUpdated.DISTANCE += 25.5;
        localConnectionUpdated.DURATION -= 30;
        localConnectionUpdated.CARRIER.push('CARRIER6');
		
		param = prepareConnection([localConnectionUpdated]);
		
		result = updateConnectionProc(
		    localDatasetId,
		    param.connection, 
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit(); // To check the table content. Remove  later
        
        // Check full view
        result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(5);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
		expect(actualConnection).toContain(
		    deltaConnection2
		);
		expect(actualConnection).toContain(
		    localConnectionUpdated
		);
		expect(actualConnection).toContain(
		    deltaConnectionUpdated
		);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnectionUpdated.ID;
		}).ACTION).toBe(ACTION_UPDATE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === localConnectionUpdated.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		// Test deletion
        var connectionDeleted = [];
        connectionDeleted.push({ID: globalConnection1.ID});
        connectionDeleted.push({ID: localConnection2.ID});
        connectionDeleted.push({ID: deltaConnection2.ID});
		
		result = deleteConnectionProc(
		    localDatasetId,
		    connectionDeleted
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		expect(result.ID_MAP.length).toBe(2);
        var deletedGlobalConnection1 = testUtil.cloneObject(globalConnection1);
		deletedGlobalConnection1.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === globalConnection1.ID;
		}).ID.toString();
		
		var deletedLocalConnection2 = testUtil.cloneObject(localConnection2);
		deletedLocalConnection2.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === localConnection2.ID;
		}).ID.toString();
		
        // Check delta view
        result = queryConnectionProc(localDatasetId, 'D', '', '', '');
        expect(result.CONNECTION.length).toBe(4);
        
        // Check full view
        result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(4);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
		
		expect(actualConnection).toContain(
		    deletedGlobalConnection1
		);
		
	    expect(actualConnection).toContain(
		    deletedLocalConnection2
		);
		
		expect(actualConnection).toContain(
		    localConnectionUpdated
		);
		expect(actualConnection).toContain(
		    deltaConnectionUpdated
		);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deletedGlobalConnection1.ID;
		}).ACTION).toBe(ACTION_DELETE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deletedGlobalConnection1.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deletedLocalConnection2.ID;
		}).ACTION).toBe(ACTION_DELETE);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deletedLocalConnection2.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		result = queryConnectionProc(localDatasetId, 'M', '', '', '');
        expect(result.CONNECTION.length).toBe(2);
        
        // Delete DELETION and UPDATE
        connectionDeleted = [];
        connectionDeleted.push({ID: deletedGlobalConnection1.ID});
        connectionDeleted.push({ID: deletedLocalConnection2.ID});
        connectionDeleted.push({ID: localConnectionUpdated.ID});
        
		result = deleteConnectionProc(
		    localDatasetId,
		    connectionDeleted
		);
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		result = queryConnectionProc(localDatasetId, 'M', '', '', '');
        expect(result.CONNECTION.length).toBe(4);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    globalConnection1
		);
		
		expect(actualConnection).toContain(
		    localConnection2
		);
		
		expect(actualConnection).toContain(
		    localConnection1
		);
		
		// Delete local connection that has global connection with the same hash
        connectionDeleted.push({ID: localConnection1.ID});
        
		result = deleteConnectionProc(
		    localDatasetId,
		    connectionDeleted
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		expect(result.ID_MAP.length).toBe(1);
        var deletedLocalConnection1ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === localConnection1.ID;
		}).ID.toString();
		
		// Delete the deletion
		connectionDeleted = [];
		connectionDeleted.push({ID: deletedLocalConnection1ID});
        
		result = deleteConnectionProc(
		    localDatasetId,
		    connectionDeleted
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
		var voidDeltaConnection = testUtil.cloneObject(globalConnection1);
		voidDeltaConnection.ID = 'C1';
		voidDeltaConnection.DISTANCE += 5.0;
		delete voidDeltaConnection.ACTION;
		
		param = prepareConnection([voidDeltaConnection]);
		
		result = createConnectionProc(
		    localDatasetId,
		    param.connection, 
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.ID_MAP.length).toBe(1);
		
		voidDeltaConnection.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === voidDeltaConnection.ID;
		}).ID.toString();
		
		expect(result.MESSAGE).toContain(
			{
				SEVERITY: 'W',
				MESSAGE: bundle.getText('MSG_CONNECTION_VOID', 
				[voidDeltaConnection.FROM_LOCATION, voidDeltaConnection.TO_LOCATION, 
				voidDeltaConnection.MTR])
		    }
		);
		
		result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(5);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    voidDeltaConnection
		);
		
		result = queryConnectionProc(localDatasetId, 'M', '', '', '');
        expect(result.CONNECTION.length).toBe(4);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).not.toContain(
		    voidDeltaConnection
		);
		
		// Update void connection should success
		voidDeltaConnection.DISTANCE += 5;
        voidDeltaConnection.CARRIER.push('CARRIER8');
		
		param = prepareConnection([voidDeltaConnection]);
		
		result = updateConnectionProc(
		    localDatasetId,
		    param.connection, 
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit(); // To check the table content. Remove  later
        
        // Check full view
        result = queryConnectionProc(localDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(5);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
		expect(actualConnection).toContain(
		    deltaConnectionUpdated
		);
		expect(actualConnection).toContain(
		    voidDeltaConnection
		);
		
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
		expect(result.DATASET_ID.toString()).toBeDefined();
		expect(result.MESSAGE).toContain(
			{
				SEVERITY: 'I',
				MESSAGE: bundle.getText('MSG_DATASET_CREATED_SUCCESS', [deltaDatasetCode])
		    }
		);
		
		var deltaDatasetId = result.DATASET_ID;
		
		result = readDatasetProc(deltaDatasetId, '');	
		expect(result.DATASET.length).toBe(1);
		expect(result.DATASET[0].CODE).toBe(deltaDatasetCode);
		// Date has been converted by XS engine
		expect(result.DATASET[0].BASE_DATASET_ID).toEqualObject(localDatasetId);
		expect(result.DATASET[0].VALID_FROM.getDate()).toBeDefined();
		expect(result.DATASET[0].VALID_TO.getDate()).toBeDefined();
		expect(result.DATASET[0].CREATED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CHANGED_BY).toBe($.session.getUsername());
		expect(result.DATASET[0].CREATED_ON).toBeDefined();
		expect(result.DATASET[0].CHANGED_ON).toBeDefined();
		
		result = queryConnectionProc(deltaDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(4);
        
        actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    localConnection2
		);
		expect(actualConnection).toContain(
		    deltaConnectionUpdated
		);
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnectionUpdated.ID;
		}).ACTION).toBeNull();
		
		expect(result.CONNECTION.find(function(c){
		    return c.ID.toString() === deltaConnectionUpdated.ID;
		}).SOURCE).toBe(SOURCE_MANUAL);
		
		// Now test creation in delta dataset
		var deltaConnection3 = {
			ID: 'C6',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L2',
			MTR: '0005',
			DISTANCE: 301,
			DURATION: 601,
			CARRIER: ['CARRIER1']
		};
		
		var deltaConnection4 = {
			ID: 'C7',
			FROM_LOCATION: 'L4',
			TO_LOCATION: 'L2',
			MTR: '0005',
			DISTANCE: 302,
			DURATION: 602,
			CARRIER: []
		};
		
		param = prepareConnection([deltaConnection3, deltaConnection4]);
		
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		deltaConnection3.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection3.ID;
		}).ID.toString();
		
		deltaConnection4.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection4.ID;
		}).ID.toString();
		
		result = queryConnectionProc(deltaDatasetId, 'F', '', '', '');
        expect(result.CONNECTION.length).toBe(6);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
        
        expect(actualConnection).toContain(
		    deltaConnection3
		);
		expect(actualConnection).toContain(
		    deltaConnection4
		);
	});
	
	/**
	 * Test success creation, update, deletion and read
	 */
	it("connection query should run successfully", function(){
		
		var globalConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L2',
			MTR: '0001',
			DISTANCE: 150,
			DURATION: 1000,
			CARRIER: ['CARRIER1']
		};

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
		var param = prepareConnection([globalConnection1]);
		var result = proc(
			fromDate,
			toDate,
			config,
			param.connection,
			param.connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {LOCATION_ID: 'L2'},  
		    {LOCATION_ID: 'L3'}, 
		    {LOCATION_ID: 'L4'}
		];
	    
		var localConnection1 = {
			ID: 'C2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 250,
			DURATION: 2000, 
			CARRIER: ['CARRIER2', 'CARRIER3']
		};
		
		param = prepareConnection([localConnection1]);

		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			param.connection,
			param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		
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
		
		var deltaDatasetId = result.DATASET_ID;
		
		var deltaConnection1 = {
			ID: 'C4',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L2',
			MTR: '0002',
			DISTANCE: 300,
			DURATION: 600,
			CARRIER: ['CARRIER1']
		};
		
		var deltaConnection2 = {
			ID: 'C5',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 300,
			DURATION: 700,
			CARRIER: []
		};
		
		param = prepareConnection([deltaConnection1, deltaConnection2]);
		
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		deltaConnection1.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection1.ID;
		}).ID.toString();
		
		deltaConnection2.ID = result.ID_MAP.find(function(c){
		    return c.EXTERNAL_ID === deltaConnection2.ID;
		}).ID.toString();
		
		// Query connection with from location filter
		result = queryConnectionProc(deltaDatasetId, 'M', 'L1', '', '');
		expect(result.CONNECTION.length).toBe(3);
		
		var actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
		
		globalConnection1.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === globalConnection1.FROM_LOCATION
		    && c.TO_LOCATION === globalConnection1.TO_LOCATION
		    && c.MTR === globalConnection1.MTR;
		}).ID.toString();
		
		localConnection1.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection1.FROM_LOCATION
		    && c.TO_LOCATION === localConnection1.TO_LOCATION
		    && c.MTR === localConnection1.MTR;
		}).ID.toString();
	    
		expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    deltaConnection1
		);

	   
	    // Query connection with from location and MTR
		result = queryConnectionProc(deltaDatasetId, 'M', 'L1', '', '0001');
		expect(result.CONNECTION.length).toBe(2);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
		
		expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		
		// Query connection with from location, to location and MTR
		result = queryConnectionProc(deltaDatasetId, 'M', 'L1', 'L2', '0001');
		expect(result.CONNECTION.length).toBe(1);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
		
		expect(actualConnection).toContain(
		    globalConnection1
		);
		
		// Query connection with to location filter
		result = queryConnectionProc(deltaDatasetId, 'M', '', 'L3', '');
		expect(result.CONNECTION.length).toBe(2);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
	
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    deltaConnection2
		);
		
		// Query connection with to location and MTR
		result = queryConnectionProc(deltaDatasetId, 'M', '', 'L2', '0001');
		expect(result.CONNECTION.length).toBe(1);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
	
		expect(actualConnection).toContain(
		    globalConnection1
		);
		
		// Query connection with MTR
		result = queryConnectionProc(deltaDatasetId, 'M', '', '', '0001');
		expect(result.CONNECTION.length).toBe(3);
		
		actualConnection = transformConnection(result.CONNECTION, result.CONNECTION_CARRIER);
	
		expect(actualConnection).toContain(
		    globalConnection1
		);
		expect(actualConnection).toContain(
		    localConnection1
		);
		expect(actualConnection).toContain(
		    deltaConnection2
		);
		
	});
	
	/**
	 * Test 
	 */
	it("edit of connection should fail", function(){
		
		var globalConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 700.8,
			DURATION: 1005,
			CARRIER: ['CARRIER1']
		};

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
		var param = prepareConnection([globalConnection1]);
		var result = proc(
			fromDate,
			toDate,
			config,
			param.connection,
			param.connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		
		proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);
		
		var locations = [
		    {LOCATION_ID: 'L2'},  
		    {LOCATION_ID: 'L3'}, 
		    {LOCATION_ID: 'L4'}
		];
	    
		var localConnection1 = {
			ID: 'C2',
			FROM_LOCATION: 'L2',
			TO_LOCATION: 'L3',
			MTR: '0002',
			DISTANCE: 251,
			DURATION: 2001, 
			CARRIER: ['CARRIER2', 'CARRIER3']
		};
		
		var localConnection2 = {
			ID: 'C3',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L4',
			MTR: '0002',
			DISTANCE: 351,
			DURATION: 3001,
			CARRIER: []
		};
		
		param = prepareConnection([localConnection1, localConnection2]);

		result = proc(
			LOCAL_DATASET_CODE,
			locations,
			param.connection,
			param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		result = queryConnectionProc(localDatasetId, 'M', '', '', '');
		
		localConnection1.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection1.FROM_LOCATION
		    && c.TO_LOCATION === localConnection1.TO_LOCATION
		    && c.MTR === localConnection1.MTR;
		}).ID.toString();
		
		localConnection2.ID = result.CONNECTION.find(function(c){
		    return c.FROM_LOCATION === localConnection2.FROM_LOCATION
		    && c.TO_LOCATION === localConnection2.TO_LOCATION
		    && c.MTR === localConnection2.MTR;
		}).ID.toString();
		
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
		var deltaDatasetId = result.DATASET_ID;
		conn.commit();
		
		// Check duplicate connection input of creation
		var deltaConnection1 = {
			ID: 'C1',
			FROM_LOCATION: 'L3',
			TO_LOCATION: 'L2',
			MTR: '0001',
			DISTANCE: 300,
			DURATION: 600,
			CARRIER: []
		};
		
		param = prepareConnection([deltaConnection1, deltaConnection1]);
		
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[deltaConnection1.FROM_LOCATION, deltaConnection1.TO_LOCATION, 
				deltaConnection1.MTR])
		    }
		);
		conn.rollback();
		
		// Create delta connection
		param = prepareConnection([deltaConnection1]);
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		deltaConnection1.ID = result.ID_MAP[0].ID.toString();
		conn.commit();
		
		// Create the delta connection again should fail
		param = prepareConnection([deltaConnection1]);
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[deltaConnection1.FROM_LOCATION, deltaConnection1.TO_LOCATION, 
				deltaConnection1.MTR])
		    }
		);
		conn.rollback();
		
		// Update local connection 1. 
		// New connection with same hash cannot be created in top layer
		var localConnectionUpdated = testUtil.cloneObject(localConnection1);
        localConnectionUpdated.DISTANCE += 15;
        localConnectionUpdated.DURATION += 20;
		
		param = prepareConnection([localConnectionUpdated]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		var deltaConnectionDuplicated = testUtil.cloneObject(localConnection1);

		param = prepareConnection([deltaConnectionDuplicated]);
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[deltaConnectionDuplicated.FROM_LOCATION, deltaConnectionDuplicated.TO_LOCATION, 
				deltaConnectionDuplicated.MTR])
		    }
		);
		
		conn.rollback();
		
		// Delete local connection 2.
		// New connection with same hash cannot be created in top layer
	    var connectionDeleted = [];
        connectionDeleted.push({ID: localConnection2.ID});
		
		result = deleteConnectionProc(
		    deltaDatasetId,
		    connectionDeleted
		);
		expect(result.RETURN_CODE).toBe(0);	
		var localConnection2DeletionId = result.ID_MAP[0].ID.toString();
		conn.commit();
		
		deltaConnectionDuplicated = testUtil.cloneObject(localConnection2);
		
		param = prepareConnection([deltaConnectionDuplicated]);
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[deltaConnectionDuplicated.FROM_LOCATION, deltaConnectionDuplicated.TO_LOCATION, 
				deltaConnectionDuplicated.MTR])
		    }
		);
		
		conn.rollback();
		
		// Update connection which does not exist or not visible
		// Connection 1 already updated
		// Connection 2 already deleted
		
		var connectionUpdated1 = testUtil.cloneObject(localConnection1);
		var connectionUpdated2 = testUtil.cloneObject(localConnection2);
		
		param = prepareConnection([connectionUpdated1, connectionUpdated2]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_ID_NOT_FOUND', 
				[connectionUpdated1.ID])
		    }
		);
		
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_ID_NOT_FOUND', 
				[connectionUpdated2.ID])
		    }
		);
		conn.rollback();
		
		// ID of connection3 cannot be found
		var connectionUpdated3 = testUtil.cloneObject(localConnection2);
		connectionUpdated3.ID = '-1';
		connectionUpdated3.MTR = '0003';
		
		param = prepareConnection([connectionUpdated1, connectionUpdated2, connectionUpdated3]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_ID_NOT_FOUND', 
				[connectionUpdated3.ID])
		    }
		);
		conn.rollback();
		
		// Restore local connection 2
		connectionDeleted = [];
        connectionDeleted.push({ID: localConnection2DeletionId});
		
		result = deleteConnectionProc(
		    deltaDatasetId,
		    connectionDeleted
		);
		expect(result.RETURN_CODE).toBe(0);	
		conn.commit();
		
		// Update connection which contains duplicate
		connectionUpdated1 = testUtil.cloneObject(localConnection2);
		connectionUpdated2 = testUtil.cloneObject(deltaConnection1);
		connectionUpdated2.FROM_LOCATION = connectionUpdated1.FROM_LOCATION;
		connectionUpdated2.TO_LOCATION = connectionUpdated1.TO_LOCATION;
		connectionUpdated2.MTR = connectionUpdated1.MTR;
		
		param = prepareConnection([connectionUpdated1, connectionUpdated2]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
				SEVERITY: 'E',
				MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[connectionUpdated2.FROM_LOCATION, connectionUpdated2.TO_LOCATION, 
				connectionUpdated2.MTR])
		    }
		); 
		
		conn.rollback();
		
		
		// Change MTR of connection in lower layer which is not allowed
		connectionUpdated1 = testUtil.cloneObject(localConnection2);
		connectionUpdated1.MTR = '0003';
		
		param = prepareConnection([connectionUpdated1]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_CONNECTION_HASH_CHANGED', [connectionUpdated1.ID])
    	    }
		); 
		conn.rollback();
		
		// Create a void connection
		// Then the connection in lower layer cannot be updated or deleted
		// User should delete the void connection
		var voidDeltaConnection  = testUtil.cloneObject(localConnection2);
		voidDeltaConnection.ID = 'C1';
		param = prepareConnection([voidDeltaConnection]);
		result = createConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		expect(result.MESSAGE).toContain({
				SEVERITY: 'W',
				MESSAGE: bundle.getText('MSG_CONNECTION_VOID', 
				[voidDeltaConnection.FROM_LOCATION, voidDeltaConnection.TO_LOCATION, 
				voidDeltaConnection.MTR])
		    }
		);
		voidDeltaConnection.ID = result.ID_MAP[0].ID;
		conn.commit();
		
		connectionUpdated1 = testUtil.cloneObject(localConnection2);

		param = prepareConnection([connectionUpdated1]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[connectionUpdated1.FROM_LOCATION, connectionUpdated1.TO_LOCATION, 
				connectionUpdated1.MTR])
    	    }
		); 
		conn.rollback();
		
		// Deletion is also not allowed now
		connectionDeleted = [];
        connectionDeleted.push({ID: localConnection2.ID});
		
		result = deleteConnectionProc(
		    deltaDatasetId,
		    connectionDeleted
		);
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain(			{
    			SEVERITY: 'E',
    			MESSAGE: bundle.getText('MSG_CONNECTION_UNIQUENESS_VIOLATED', 
				[connectionUpdated1.FROM_LOCATION, connectionUpdated1.TO_LOCATION, 
				connectionUpdated1.MTR])
    	    }
		); 
		conn.rollback();
		
		// Restore local connection 2
		connectionDeleted = [];
        connectionDeleted.push({ID: voidDeltaConnection.ID.toString()});
		
		result = deleteConnectionProc(
		    deltaDatasetId,
		    connectionDeleted
		);
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
		connectionUpdated1 = testUtil.cloneObject(localConnection2);
		connectionUpdated1.DISTANCE += 5;

		param = prepareConnection([connectionUpdated1]);
		result = updateConnectionProc(
		    deltaDatasetId,
		    param.connection,
		    param.connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(0);
		conn.commit();
		
	});
	
	/**
     * Test negative cases
     */
	it("connection check should fail", function(){

		var basicConnections = [];
		var locations = [];
		var connectionCarrier = [];

		var proc = TMCXSProc.procedure(
			mockstarEnvironment.userSchema,
			testEnvironmentReadDataset.targetPackage,
			'p_create_local_dataset', {
				connection: conn
			}
		);

		// Create a local dataset
		var result = proc(
			LOCAL_DATASET_CODE,
			locations,
			basicConnections,
			connectionCarrier
		);

		expect(result.RETURN_CODE).toBe(0);
		var localDatasetId = result.DATASET_ID;
		
		// ID of connection is mandatory
		result = createConnectionProc(
		    localDatasetId,
		    [{
		        FROM_LOCATION: 'L1',
		        TO_LOCATION: 'L2',
		        MTR: '0001',
		        DISTANCE: 100,
		        DURATION: 3600
		    }],
		    []
		);
		
		expect(result.RETURN_CODE).toBe(1);
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_EXTERNAL_ID_MISSING')
		});
		
		var negativeDistance = -905.8;
		var negativeDuration = -10;
		basicConnections = [];
		connectionCarrier = [];

		// From location is missing
		// To location is missing
		// MTR is missing
		// Distance negative
		// Duration negative
		basicConnections.push({
			ID: 'C1',
			FROM_LOCATION: '',
			TO_LOCATION: '',
			MTR: '',
			DISTANCE: negativeDistance,
			DURATION: negativeDuration
		});
		
		basicConnections.push({
			ID: 'C2'
		});
		
		result = createConnectionProc(
		    localDatasetId,
		    basicConnections,
		    []
		);
		
		expect(result.RETURN_CODE).toBe(1);
		// No more exception should be raised
		expect(result.MESSAGE.length).toBe(10);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_FROM_LOCATION_MISSING', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_FROM_LOCATION_MISSING', ['C2'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_TO_LOCATION_MISSING', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_TO_LOCATION_MISSING', ['C2'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_MTR_MISSING', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_MTR_MISSING', ['C2'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_DISTANCE_INVALID', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_DISTANCE_INVALID', ['C2'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_DURATION_INVALID', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_DURATION_INVALID', ['C2'])
		});
		
		// Unknown from location
		// Unknow to location
		// Unknown MTR
		var unknownLocation1 = 'UNKNOWN_LOCATION1';
		var unknownLocation2 = 'UNKNOWN_LOCATION2';
		var invalidMTR = '8000';
		basicConnections = [];
		basicConnections.push({
			ID: 'C1',
			FROM_LOCATION: unknownLocation1,
			TO_LOCATION: 'L2',
			MTR: invalidMTR,
			DISTANCE: 0,
			DURATION: 0
		});
		
		basicConnections.push({
			ID: 'C2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: unknownLocation2,
			MTR: '0001',
			DISTANCE: 0,
			DURATION: 0
		});
		
		basicConnections.push({
			ID: 'C3',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L1',
			MTR: '0001',
			DISTANCE: 10,
			DURATION: 10
		});
		
		result = createConnectionProc(
		    localDatasetId,
		    basicConnections,
		    []
		);
		
		expect(result.RETURN_CODE).toBe(1);
		// No more exception should be raised
		expect(result.MESSAGE.length).toBe(4);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_LOCATION_NOT_FOUND', [unknownLocation1])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_LOCATION_NOT_FOUND', [unknownLocation2])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_MTR_INVALID', [invalidMTR])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_IDENTICAL_SOURCE_DESTINATION', ['C3'])
		});
		
		// 
		basicConnections = [];
		basicConnections.push({
			ID: 'C1',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L2',
			MTR: '0001',
			DISTANCE: 10,
			DURATION: 10
		});
		
		// Connection ID missing
		connectionCarrier.push({
		    CARRIER: 'C1'
		});
		
		result = createConnectionProc(
		    localDatasetId,
		    basicConnections,
		    connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_CARRIER_CONNECTION_ID_MISSING')
		});
		
		// Connection ID missing
		connectionCarrier = [];
		basicConnections.push({
			ID: 'C2',
			FROM_LOCATION: 'L1',
			TO_LOCATION: 'L3',
			MTR: '0001',
			DISTANCE: 10,
			DURATION: 10
		});
		
		connectionCarrier.push({
		    CONNECTION_ID: 'C1'
		});
		
		connectionCarrier.push({
		    CONNECTION_ID: 'C2',
		    CARRIER: ''
		});
		
		result = createConnectionProc(
		    localDatasetId,
		    basicConnections,
		    connectionCarrier
		);
		
		expect(result.RETURN_CODE).toBe(1);
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_CARRIER_CARRIER_MISSING', ['C1'])
		});
		
		expect(result.MESSAGE).toContain({
	          SEVERITY: 'E', 
	          MESSAGE: bundle.getText('MSG_CONNECTION_CARRIER_CARRIER_MISSING', ['C2'])
		});
		
	});

});