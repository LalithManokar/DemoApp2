/*
This is unit test for network related operation, which includes:
1. create network
2. delete network
3. read network
4. update network
5. retrieve route info
*/
jasmine.tags.networkut = 'networkut';

describe('Network Unit Test', function()
{
    var TableUtils = $.import("sap.hana.testtools.unit.util", "tableUtils").TableUtils; //util to manipulate test table
    var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor; //util for convenient sql executor method
    var mockstarEnvironment = $.import("sap.hana.testtools.mockstar", "mockstarEnvironment"); //mockstar environment
    var i18nLib = $.import('sap.hana.xs.i18n', 'text');
    var tableDataSetLib = $.import("sap.hana.testtools.unit.util", "tableDataSet");
    var DateUtils = $.import("sap.hana.testtools.unit.util", "dateUtils").DateUtils;
    
    var originSchema = 'SAP_TM_ROUTING'; //original schema
    var userSchema = $.session.getUsername().toUpperCase(); //current user schema serve as test schema
    var testSchema = 'SAP_TM_ROUTING_TEST'; // schema for artifacts of test
    var bundle = i18nLib.loadBundle('sap.tm.trp.routing.db.common', 'message', $.request.language);
    
    var csvDataPkg = "sap.tm.trp.routing.tests.data.path"; //The package where unit test related csv file locate
    var csvProp = {separator : ';', headers : true, decSeparator : '.'}; //The universal csv properties used in all csv files located in csvDataPkg package
    
    //dataset related full test table name
    var datasetModelTblName, datasetLocTblName, datasetConnTblName, datasetConnCarrierTblName, datasetPathTblName, datasetPathSeqTblName;
    //var datasetGeolocTblName;
    //cost related full test table name
    var costHandlingDurationTblName, costHandlingTblName, costStorageTblName, costTransportTblName;
    //cost related full test procedure stub
    var costHandlingProcName, costStorageProcName, costTransportProcName;
    //route related full test table name
    var routeTblName, routeSeqTblName, routeSeqCapacityTblName, tripMapTblName, tripCapacityTblName, tripTimeTblName, tripTimeSeqTblName;
    //route related full test procedure stub
    var tripMapProcName, tripCapacityProcName, tripTimeProcName;
    //network related full test table name
    var networkModelTblName, networkPathTblName, networkPathSeqTblName, networkPathTargetTblName;
    //network related full test procedure
    var settinggroupConfProcName;
    //currency info test procedure
    var currencyInfoProcName;
    //var networkModelConfTblName;
    
    //Table Dependencies
    var tableDependencies;
    
    // Procedure Dependencies
    var procedureDependencies;
    
    //Read Util
    var readNetworkCaller, readCompositepathCaller, readRouteCaller, queryRouteSequenceCapacity;
    
    // Don't know why the property is undefined
    //jasmine.hdbConnection = $.hdb.Connection;
    
    // to be called in beforeOnce
    function createTestTable(tableName, targetName)
    {   
        var tableUtils = new TableUtils(jasmine.hdbConnection);
        var testTable = tableUtils.copyIntoUserSchema(originSchema, tableName, targetName);
        return testTable;
    }
    
    //to be called in beforeEach
    function clearTestTables(tableName) {
      var tableUtils = new TableUtils(jasmine.hdbConnection);
      tableUtils.clearTableInUserSchema(tableName);
    }
    
    function clearTestTablesWithSchema(fullTableName) {
        var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
        var sqlString = 'TRUNCATE TABLE ' + fullTableName;
        sqlExecutor.execSingle(sqlString);
    }
    
    function stubTableInput(tblAlias, structName, csvPkg, csvFile, csvProp)
    {
        var tableUtils = new TableUtils(jasmine.hdbConnection);
        var tmpTblName = tableUtils.createTemporaryTable(tblAlias, originSchema, structName);
        tableUtils.fillFromCsvFile(tmpTblName, csvPkg, csvFile, csvProp);
        return tmpTblName;
    }
    
    function queryUtil(tblName, cond)
    {
        var queryString = 'SELECT * FROM ' + tblName + ' WHERE ' + cond;
        Array.prototype.splice.call(arguments, 0, 2, queryString);
        var result_model = jasmine.hdbConnection.executeQuery.apply(jasmine.hdbConnection, arguments);
        return tableDataSetLib.createFromResultSet(result_model);
    }
    
    //Setup the test fixture for the whole test suite
    beforeOnce(function() {
        //Setup the dataset test table for network
        
        //Create Geolocation data
        //datasetGeolocTblName = createTestTable("sap.tm.trp.routing.db.common::t_location", 't_dataset_geoloc_test');
        
        //Create t_dataset_test table to stub "sap.tm.trp.routing.db.dataset::t_dataset" table
        datasetModelTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_dataset", 't_dataset_test');
        //Create t_dataset_location_test table to stub "sap.tm.trp.routing.db.dataset::t_dataset_location" table
        datasetLocTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_dataset_location", 't_dataset_location_test');
        //Create t_connection_test table to stub "sap.tm.trp.routing.db.dataset::t_connection" table
        datasetConnTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_connection", 't_connection_test');
        //Create t_connection_carrier_test table to stub "sap.tm.trp.routing.db.dataset::t_connection_carrier" table
        datasetConnCarrierTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_connection_carrier", 't_connection_carrier_test');
        //Create t_basicpath_test table to stub "sap.tm.trp.routing.db.dataset::t_path" table
        datasetPathTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_path", 't_basicpath_test');
        //Create t_path_connection_test table to stub "sap.tm.trp.routing.db.dataset::t_path_connectiontest" table
        datasetPathSeqTblName = createTestTable("sap.tm.trp.routing.db.dataset::t_path_connection", 't_path_connection_test');
        
        //Setup the cost test table for network

        //Create handling duration data
        //costHandlingDurationTblName = createTestTable("sap.tm.trp.routing.db.common::t_handling_time", 't_handling_time_test');
        
        //Create t_cost_model_test table to stub "sap.tm.trp.routing.db.cost::t_cost_model" table
        //costModelTblName = createTestTable("sap.tm.trp.routing.db.cost::t_cost_model", 't_cost_model_test');
        //Create t_handling_cost_test table to stub "sap.tm.trp.routing.db.cost::t_handling_cost" table
        //costHandlingTblName = createTestTable("sap.tm.trp.routing.db.cost::t_handling_cost", 't_handling_cost_test');
        //Create t_storage_cost_test table to stub "sap.tm.trp.routing.db.cost::t_storage_cost" table
        //costStorageTblName = createTestTable("sap.tm.trp.routing.db.cost::t_storage_cost", 't_storage_cost_test');
        //Create t_transport_cost_test table to stub "sap.tm.trp.routing.db.cost::t_transport_cost" table
        //costTransportTblName = createTestTable("sap.tm.trp.routing.db.cost::t_transport_cost", 't_transport_cost_test');
        
        //Setup network test table
        
        //Create t_network_model_test table to stub "sap.tm.trp.routing.db.path::t_network_model" table
        networkModelTblName = createTestTable("sap.tm.trp.routing.db.path::t_network_model", 't_network_model_test');
        //Create t_network_model_conf_test table to stub "sap.tm.trp.routing.db.path::t_network_model_conf" table
        //networkModelConfTblName = createTestTable("sap.tm.trp.routing.db.path::t_network_model_conf", 't_network_model_conf_test');
        //Create t_compositepath_test table to stub "sap.tm.trp.routing.db.path::t_path" table
        networkPathTblName = createTestTable("sap.tm.trp.routing.db.path::t_path", 't_compositepath_test');
        //Create t_path_sequence_test table to stub "sap.tm.trp.routing.db.path::t_path_sequence" table
        networkPathSeqTblName = createTestTable("sap.tm.trp.routing.db.path::t_path_sequence", 't_path_sequence_test');
        //Create t_path_target_test table to stub "sap.tm.trp.routing.db.path::t_path_target" table
        networkPathTargetTblName = createTestTable("sap.tm.trp.routing.db.path::t_path_target", 't_path_target_test');
        
        //Setup route test table
        routeTblName = createTestTable("sap.tm.trp.routing.db.path::t_route", 't_route_test');
        routeSeqTblName = createTestTable("sap.tm.trp.routing.db.path::t_route_sequence", 't_route_sequence_test');
        routeSeqCapacityTblName = createTestTable("sap.tm.trp.routing.db.path::t_route_sequence_capacity", 't_route_sequence_capacity_test');

        //Fill in test data from csv file
        var tableUtils = new TableUtils(jasmine.hdbConnection);
        //Fill in dataset related data
        //tableUtils.fillFromCsvFile(datasetGeolocTblName, csvDataPkg, 'datasetgeolocation.csv', csvProp); //dataset geolocation data preparation

        tableUtils.fillFromCsvFile(datasetModelTblName, csvDataPkg, 'datasetmodel.csv', csvProp); //dataset model data preparation
        tableUtils.fillFromCsvFile(datasetLocTblName, csvDataPkg, 'datasetlocation.csv', csvProp); //dataset location data preparation
        tableUtils.fillFromCsvFile(datasetConnTblName, csvDataPkg, 'basicconnection.csv', csvProp); //dataset basic connection data preparation
        tableUtils.fillFromCsvFile(datasetConnCarrierTblName, csvDataPkg, 'basicconncarrier.csv', csvProp); //dataset basic connection carrier data preparation
        tableUtils.fillFromCsvFile(datasetPathTblName, csvDataPkg, 'basicpath.csv', csvProp); //dataset basic path data preparation
        tableUtils.fillFromCsvFile(datasetPathSeqTblName, csvDataPkg, 'basicpathseq.csv', csvProp); //dataset basic path sequence data preparation

        //Fill in currency info related data
        var currencyInfoTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_currency_info_test"';
        clearTestTablesWithSchema(currencyInfoTblName);
        tableUtils.fillFromCsvFile(currencyInfoTblName, csvDataPkg, 'currencyinfo.csv', csvProp); //currency info data preparation

        //Fill in cost related data
        //tableUtils.fillFromCsvFile(costModelTblName, csvDataPkg, 'costmodel.csv', csvProp); //cost model data preparation
        //tableUtils.fillFromCsvFile(costHandlingDurationTblName, csvDataPkg, 'handlingduration.csv', csvProp);
        costHandlingTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_handling_cost_test"';
        clearTestTablesWithSchema(costHandlingTblName);
        tableUtils.fillFromCsvFile(costHandlingTblName, csvDataPkg, 'handlingcost.csv', csvProp); //handling cost data preparation
        
        costStorageTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_storage_cost_test"';
        clearTestTablesWithSchema(costStorageTblName);
        tableUtils.fillFromCsvFile(costStorageTblName, csvDataPkg, 'storagecost.csv', csvProp); //storage cost data preparation
        
        costTransportTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_transport_cost_test"';
        clearTestTablesWithSchema(costTransportTblName);
        tableUtils.fillFromCsvFile(costTransportTblName, csvDataPkg, 'transportcost.csv', csvProp); //transport cost data preparation
        
        //Fill in route related data
        tripMapTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_trip_map_test"';
        clearTestTablesWithSchema(tripMapTblName);
        tableUtils.fillFromCsvFile(tripMapTblName, csvDataPkg, 'tripmap.csv', csvProp);
        
        tripCapacityTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_trip_capacity_test"';
        clearTestTablesWithSchema(tripCapacityTblName);
        tableUtils.fillFromCsvFile(tripCapacityTblName, csvDataPkg, 'tripcapacity.csv', csvProp);

        tripTimeTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_trip_time_test"';
        clearTestTablesWithSchema(tripTimeTblName);
        tableUtils.fillFromCsvFile(tripTimeTblName, csvDataPkg, 'triptime.csv', csvProp);

        tripTimeSeqTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_trip_time_seq_test"';
        clearTestTablesWithSchema(tripTimeSeqTblName);
        tableUtils.fillFromCsvFile(tripTimeSeqTblName, csvDataPkg, 'triptimeseq.csv', csvProp);

        jasmine.hdbConnection.commit();
        
        //Setup universal table dependencies
        tableDependencies = {
                'datasetmodel' : {
                    name : "sap.tm.trp.routing.db.dataset::t_dataset",
                    testTable : datasetModelTblName
                },
                'datasetlocation' : {
                    name : "sap.tm.trp.routing.db.dataset::t_dataset_location",
                    testTable : datasetLocTblName
                },
                'basicconnection' : {
                    name : "sap.tm.trp.routing.db.dataset::t_connection",
                    testTable : datasetConnTblName
                },
                'basicconncarrier' : {
                    name : "sap.tm.trp.routing.db.dataset::t_connection_carrier",
                    testTable : datasetConnCarrierTblName
                },
                'basicpath' : {
                    name : "sap.tm.trp.routing.db.dataset::t_path",
                    testTable : datasetPathTblName
                },
                'basicpathseq' : {
                    name : "sap.tm.trp.routing.db.dataset::t_path_connection",
                    testTable : datasetPathSeqTblName
                },
                
                //cost related substitution
                /*
                'handlingduration' : {
                    name : "sap.tm.trp.routing.db.common::t_handling_time",
                    testTable : costHandlingDurationTblName
                },
                'costmodel' : {
                    name : "sap.tm.trp.routing.db.cost::t_cost_model",
                    testTable : costModelTblName
                },
                'handlingcost' : {
                    name : "sap.tm.trp.routing.db.cost::t_handling_cost",
                    testTable : costHandlingTblName
                },
                'storagecost' : {
                    name : "sap.tm.trp.routing.db.cost::t_storage_cost",
                    testTable : costStorageTblName
                },
                'transportcost' : {
                    name : "sap.tm.trp.routing.db.cost::t_transport_cost",
                    testTable : costTransportTblName
                },
                */
                
                //network related substitution
                'networkmodel' : {
                    name : "sap.tm.trp.routing.db.path::t_network_model",
                    testTable : networkModelTblName
                },
                /*
                'networkconf' : {
                    name : "sap.tm.trp.routing.db.path::t_network_model_conf",
                    testTable : networkModelConfTblName
                },
                */
                'networkpath' : {
                    name : "sap.tm.trp.routing.db.path::t_path",
                    testTable : networkPathTblName
                },
                'networkpathseq' : {
                    name : "sap.tm.trp.routing.db.path::t_path_sequence",
                    testTable : networkPathSeqTblName
                },
                'networkpathtarget' : {
                    name : "sap.tm.trp.routing.db.path::t_path_target",
                    testTable : networkPathTargetTblName
                },
                
                //route related substitution
                'route' : {
                    name : "sap.tm.trp.routing.db.path::t_route",
                    testTable : routeTblName
                },
                'routeseq' : {
                    name : "sap.tm.trp.routing.db.path::t_route_sequence",
                    testTable : routeSeqTblName
                },
                'routecapacityseq' : {
                    name : "sap.tm.trp.routing.db.path::t_route_sequence_capacity",
                    testTable : routeSeqCapacityTblName
                }
            };
            
        // Setup universal procedure dependencies
        costHandlingProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_get_handling_based_cost_info_stub"';
        costStorageProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_get_storage_cost_info_stub"';
        costTransportProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_get_transport_cost_info_stub"';
        settinggroupConfProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_get_settinggroup_conf_stub"';
        currencyInfoProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_get_currency_info_stub"';
        tripMapProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_query_trip_name_stub"';
        tripCapacityProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_query_capacity_by_trip_segment_stub"';
        tripTimeProcName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::p_list_trip_stub"';

        procedureDependencies = {
            // cost related subsitution
            'handlingcost' : {
                schema : 'SAP_TM_TRP',
                name : 'sap.tm.trp.db.costmodel::sp_get_handling_based_cost_info',
                testProcedure : costHandlingProcName
            },
            
            'storagecost' : {
                schema : 'SAP_TM_ROUTING',
                name : "sap.tm.trp.routing.db.cost::p_get_storage_based_cost_info",
                testProcedure : costStorageProcName
            },
            
            'transportcost' : {
                schema : 'SAP_TM_TRP',
                name : 'sap.tm.trp.db.costmodel::sp_get_transportation_based_cost_info',
                testProcedure : costTransportProcName
            },
            
            // settinggroup configuration substitution
            'settinggroupconf' : {
                schema : 'SAP_TM_TRP',
                name : 'sap.tm.trp.db.planningcockpit::p_get_setting_group_parameter_value_for_usage',
                testProcedure : settinggroupConfProcName
            },
            
            // currency info configuration substitution
            'currencyinfo' : {
                schema : 'SAP_TM_TRP',
                name : 'sap.tm.trp.db.costmodel::sp_cost_model_get',
                testProcedure : currencyInfoProcName
            },
            
            // route info related substitution
            'tripmapconf' : {
                schema : 'SAP_TM_ROUTING',
                name : 'sap.tm.trp.routing.db.dataset::p_query_trip_name',
                testProcedure : tripMapProcName
            },
            
            'tripcapacityconf' : {
                schema : 'SAP_TM_ROUTING',
                name : 'sap.tm.trp.routing.db.dataset::p_query_capacity_by_trip_segment',
                testProcedure : tripCapacityProcName
            },
            
            'triptimeconf' : {
                schema : 'SAP_TM_ROUTING',
                name : 'sap.tm.trp.routing.db.dataset::p_list_trip',
                testProcedure : tripTimeProcName
            }
        };

        var readNetworkModel = mockstarEnvironment.defineAndCreate({
            schema : originSchema,
            model : "sap.tm.trp.routing.db.path::p_read_network",
            mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
            csvPackage : csvDataPkg,
            csvProperties : csvProp,
            substituteTables : tableDependencies
        });

        readNetworkCaller = function (networkid)
        {
            var modelName = readNetworkModel.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var readNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            var result = readNetwork(networkid);
            
            return {
                network : tableDataSetLib.createFromResultSet(result.NETWORK)
            };
        }
        
        var readCompositepathModel = mockstarEnvironment.defineAndCreate({
            schema : originSchema,
            model : "sap.tm.trp.routing.db.path::p_query_composite_path",
            mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
            csvPackage : csvDataPkg,
            csvProperties : csvProp,
            substituteTables : tableDependencies
        });
        
        readCompositepathCaller = function(networkid, viewtype)
        {
            var modelName = readCompositepathModel.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var readCompositepath = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            var result = readCompositepath(networkid, viewtype, '', '', '');
            
            return {
                paths : tableDataSetLib.createFromResultSet(result.PATHS),
                path_connection : tableDataSetLib.createFromResultSet(result.PATH_CONNECTION)
            };
        }
        
        var readRouteModel = mockstarEnvironment.defineAndCreate({
            schema : originSchema,
            model : "sap.tm.trp.routing.db.path::p_query_route",
            mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
            csvPackage : csvDataPkg,
            csvProperties : csvProp,
            substituteTables : tableDependencies
        });
        
        readRouteCaller = function(networkid)
        {
            var modelName = readRouteModel.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var readRoute = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            var result = readRoute(networkid, 'X');
            
            return {
                route : tableDataSetLib.createFromResultSet(result.ROUTE),
                route_sequence : tableDataSetLib.createFromResultSet(result.ROUTE_SEQUENCE)
            };
        };
        
        queryRouteSequenceCapacity = function(routeIds){
            var queryString = 'SELECT * FROM ' + routeSeqCapacityTblName + ' WHERE route_id IN (' + routeIds.join(',') + ')';
            var result_model = jasmine.hdbConnection.executeQuery(queryString);
            return tableDataSetLib.createFromResultSet(result_model);
            
        }
    });
    
    //Clear test fixture environment
    /*
    afterOnce(function() {
        //Clear dataset test table for network
        
        //Clear t_path_connection_test table
        clearTestTables('t_path_connection_test');
        //Clear t_basicpath_test table
        clearTestTables('t_basicpath_test');
        //Clear t_connection_test table
        clearTestTables('t_connection_test');
        // Clear t_dataset_location_test table
        clearTestTables('t_dataset_location_test');
        //Clear t_dataset_test table
        clearTestTables('t_dataset_test');
    });
    */
    
    describe('Network Creation Scenario', function()
    {
        var testEnvironment, invalidDeltaEnvironment, baseDeltaEnvironment, extendedDeltaEnvironment;
        beforeOnce(function() {
            testEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_create_network",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
            
            invalidDeltaEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_invalidate_network",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
            
            baseDeltaEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_refresh_network",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });

            extendedDeltaEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_create_delta_network",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
        });
        
        beforeEach(function(){
            //Clear path test table for network
            
            //Clear t_path_target_test table
            clearTestTables('t_path_target_test');
            //Clear t_path_sequence_test table
            clearTestTables('t_path_sequence_test');
            //Clear t_compositepath_test table
            clearTestTables('t_compositepath_test');
            //Clear t_network_model_conf_test table
            //clearTestTables('t_network_model_conf_test');
            //Clear t_network_model_test table
            clearTestTables('t_network_model_test');

            //Fill in setting group related data
            var settinggroupTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_setting_group_conf_test"';
            clearTestTablesWithSchema(settinggroupTblName);
            var tableUtils = new TableUtils(jasmine.hdbConnection);
            tableUtils.fillFromCsvFile(settinggroupTblName, csvDataPkg, 'settinggroup.csv', csvProp); //setting group data preparation
        });
        
        it('normal creation case', function() {
            var modelName = testEnvironment.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var createNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            //input parameters
            var datasetid = 1;
            var networkcode = 'CREATE1';
            var settinggroupid = 1;
            //var optcfgTbl = [{NAME : 'MAX_PATH_NUM', VALUE : '3'}, {NAME : 'TARGET', VALUE : 'COST'}];
            
            var result = createNetwork(datasetid, networkcode, settinggroupid);
            
            jasmine.hdbConnection.commit();
            
            var succMessage = bundle.getText('MSG_NETWORK_CODE_CREATE_SUCCESS', [networkcode]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //Check created network data
            var networkid = result.NETWORK_ID;
            var actualModel = readNetworkCaller(networkid);
            //var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
            //var queryString = 'SELECT ID, CODE, DATASET_ID, COST_MODEL_ID FROM ' + networkModelTblName + " WHERE CODE = '" + networkcode + "'";
            //var network_model = queryUtil(networkModelTblName, 'CODE = ?', networkcode);
            expect(actualModel.network).toMatchData([{'ID' : networkid.toString(), 'CODE' : networkcode, 'DATASET_ID' : 1, 'INVALIDATED' : '', 
            'INVALIDATION_REASON_CODE' : '', 'SETTING_GROUP_ID' : settinggroupid}], ['ID']);
            
            //var queryString = 'SELECT ID, CODE, DATASET_ID, COST_MODEL_ID FROM ' + networkModelTblName + ' WHERE CODE = ?';
            //var network_model = jasmine.hdbConnection.executeQuery(queryString, networkcode);
            //expect(tableDataSetLib.createFromResultSet(network_model)).toMatchData([{'ID' : networkid.toString(), 'CODE' : networkcode, 'DATASET_ID' : 1, 'COST_MODEL_ID' : 0}], ['ID']);
            
            //var network_conf = queryUtil(networkModelConfTblName, 'NETWORK_MODEL_ID = ?', networkid);
            //var queryString = 'SELECT * FROM ' + networkModelConfTblName + ' WHERE NETWORK_MODEL_ID = ?';
            //var network_conf = jasmine.hdbConnection.executeQuery(queryString, networkid);
            /*
            expect(actual.network_conf).toMatchData(
                [
                    {'NAME' : 'MAX_PATH_NUM', 'VALUE' : '3'},
                    {'NAME' : 'TARGET', 'VALUE' : 'COST'}
                ], []);
            */
                
            //var network_compositepath = queryUtil(networkPathTblName, 'NETWORK_MODEL_ID = ?', networkid);
            var actualCompositepath = readCompositepathCaller(networkid, 'M');
            expect(actualCompositepath.paths.getRowCount()).toBe(1);
            //var pathid = network_compositepath.getRow(0).ID;
            expect(actualCompositepath.paths).toMatchData(
                [
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 395, 'TOTAL_DURATION' : 49800,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'ACTION' : null, 'SOURCE' : 'S', 'CONFLICT_FLAG' : ''}
                ], ['TARGET', 'FROM_LOCATION', 'TO_LOCATION', 'ACTION', 'SOURCE', 'CONFLICT_FLAG']);
                
            //var network_compositepathseq = queryUtil(networkPathSeqTblName, 'PATH_ID = ?', pathid);
            expect(actualCompositepath.path_connection.getRowCount()).toBe(4);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 30},
                    {'SEQUENCE' : 4, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0}
                ], ['SEQUENCE', 'MTR', 'PATH_TYPE', 'BASIC_PATH_ID', 'FROM_LOCATION', 'TO_LOCATION', 'FROM_BP_SEQUENCE', 'TO_BP_SEQUENCE']);

            // build base delta network test
            modelName = invalidDeltaEnvironment.getTestModelName();
            idx = modelName.indexOf('.');
            schemaName = modelName.substring(1, idx - 1);
            procName = modelName.substring(idx + 2, modelName.length - 1);
            var invalidateDeltaNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            result = invalidateDeltaNetwork(networkid, 'D');
            jasmine.hdbConnection.commit();

            modelName = baseDeltaEnvironment.getTestModelName();
            idx = modelName.indexOf('.');
            schemaName = modelName.substring(1, idx - 1);
            procName = modelName.substring(idx + 2, modelName.length - 1);
            var createBaseDeltaNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            //input parameters
            networkcode = 'CREATE1';
            //var optcfgTbl = [{NAME : 'MAX_PATH_NUM', VALUE : '3'}, {NAME : 'TARGET', VALUE : 'COST'}];
            
            result = createBaseDeltaNetwork(networkcode, '');
            
            jasmine.hdbConnection.commit();
            
            succMessage = bundle.getText('MSG_NETWORK_CODE_UPDATE_SUCCESS', [networkcode]);
            //expect(result.RETURN_CODE).toBe(0);
            var abc = tableDataSetLib.createFromResultSet(result.MESSAGE);
            expect(abc).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            actualCompositepath = readCompositepathCaller(networkid, 'M');
            expect(actualCompositepath.paths.getRowCount()).toBe(4);
            //var pathid = network_compositepath.getRow(0).ID;
            expect(actualCompositepath.paths).toMatchData(
                [
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 395, 'TOTAL_DURATION' : 49800,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'ACTION' : null, 'SOURCE' : 'S', 'CONFLICT_FLAG' : ''},
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 354, 'TOTAL_DURATION' : 34800,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'ACTION' : null, 'SOURCE' : 'S', 'CONFLICT_FLAG' : ''},
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 395, 'TOTAL_DURATION' : 37200,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'ACTION' : null, 'SOURCE' : 'S', 'CONFLICT_FLAG' : ''},
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 354, 'TOTAL_DURATION' : 47400,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'ACTION' : null, 'SOURCE' : 'S', 'CONFLICT_FLAG' : ''}
                ], ['TARGET', 'FROM_LOCATION', 'TO_LOCATION', 'TOTAL_DISTANCE', 'TOTAL_COST', 'TOTAL_DURATION', 'LOADING_COST', 'UNLOADING_COST', 'LOADING_DURATION', 'UNLOADING_DURATION', 'ACTION', 'SOURCE', 'CONFLICT_FLAG']);
                
            //var network_compositepathseq = queryUtil(networkPathSeqTblName, 'PATH_ID = ?', pathid);
            expect(actualCompositepath.path_connection.getRowCount()).toBe(14);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 30},
                    {'SEQUENCE' : 4, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0},

                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 200, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 1100, 
                     'TRANSPORT_DURATION' : 29200, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 220, 'TRANSSHIP_COST' : 25},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 100, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 1200, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 4, 'TRANSSHIP_COST' : 0},

                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 200, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 1100, 
                     'TRANSPORT_DURATION' : 29200, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 220, 'TRANSSHIP_COST' : 30},
                    {'SEQUENCE' : 3, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0},

                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 25},
                    {'SEQUENCE' : 4, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 100, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 1200, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 4, 'TRANSSHIP_COST' : 0}

                ], ['SEQUENCE', 'MTR', 'PATH_TYPE', 'BASIC_PATH_ID', 'FROM_LOCATION', 'TO_LOCATION', 'FROM_BP_SEQUENCE', 'TO_BP_SEQUENCE', 'DISTANCE', 'TRANSPORT_DURATION', 'TRANSSHIP_DURATION', 'TRANSPORT_COST', 'TRANSSHIP_COST']);
                
                //Create extended delta network
            modelName = extendedDeltaEnvironment.getTestModelName();
            idx = modelName.indexOf('.');
            schemaName = modelName.substring(1, idx - 1);
            procName = modelName.substring(idx + 2, modelName.length - 1);
            var createExtendedDeltaNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            //input parameters
            var basenetworkcode = 'CREATE1';
            var extendednetworkcode = 'EXTENDEDCREATED1'
            var extendeddatasetid = 2;
            //var optcfgTbl = [{NAME : 'MAX_PATH_NUM', VALUE : '3'}, {NAME : 'TARGET', VALUE : 'COST'}];
            
            result = createExtendedDeltaNetwork(extendeddatasetid, extendednetworkcode, basenetworkcode);
            
            jasmine.hdbConnection.commit();

            succMessage = bundle.getText('MSG_NETWORK_CODE_CREATE_SUCCESS', [extendednetworkcode]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //Check created network data
            networkid = result.NETWORK_ID;
            actualModel = readNetworkCaller(networkid);

            expect(actualModel.network).toMatchData([{'ID' : networkid.toString(), 'CODE' : extendednetworkcode, 'DATASET_ID' : extendeddatasetid, 'INVALIDATED' : '', 
            'INVALIDATION_REASON_CODE' : '', 'SETTING_GROUP_ID' : settinggroupid}], ['ID']);
            
            //var network_compositepath = queryUtil(networkPathTblName, 'NETWORK_MODEL_ID = ?', networkid);
            actualCompositepath = readCompositepathCaller(networkid, 'M');
            expect(actualCompositepath.paths.getRowCount()).toBe(1);
            //var pathid = network_compositepath.getRow(0).ID;
            expect(actualCompositepath.paths).toMatchData(
                [
                    {'TARGET' : 'COST,DISTANCE', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN',
                     'TOTAL_DISTANCE' : 1130, 'TOTAL_COST' : 395, 'TOTAL_DURATION' : 49800,
                     'LOADING_COST' : 10, 'UNLOADING_COST' : 5, 'LOADING_DURATION' : 0, 'UNLOADING_DURATION' : 0,
                     'SOURCE' : 'S', 'CONFLICT_FLAG' : ''}
                ], []);
                
            //var network_compositepathseq = queryUtil(networkPathSeqTblName, 'PATH_ID = ?', pathid);
            expect(actualCompositepath.path_connection.getRowCount()).toBe(4);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 30},
                    {'SEQUENCE' : 4, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0}
                ], ['SEQUENCE']);
        });
    });
    
    
    describe('Network Deletion Scenario', function()
    {
        var testEnvironment;
        beforeOnce(function() {
            testEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_delete_network",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies
            });
        });
        
        beforeEach(function(){
            //Clear path test table for network
            
            //Clear t_path_target_test table
            clearTestTables('t_path_target_test');
            //Clear t_path_sequence_test table
            clearTestTables('t_path_sequence_test');
            //Clear t_compositepath_test table
            clearTestTables('t_compositepath_test');
            //Clear t_network_model_conf_test table
            //clearTestTables('t_network_model_conf_test');
            //Clear t_network_model_test table
            clearTestTables('t_network_model_test');
            
            //Fill in setting group related data
            var settinggroupTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_setting_group_conf_test"';
            clearTestTablesWithSchema(settinggroupTblName);
            var tableUtils = new TableUtils(jasmine.hdbConnection);
            tableUtils.fillFromCsvFile(settinggroupTblName, csvDataPkg, 'settinggroup.csv', csvProp); //setting group data preparation

            //fill network test data from corresponding csv file
            testEnvironment.fillTestTableFromCsv('networkmodel', 'networkmodel.csv');
            //update the base network id to NULL value
            var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
            var updString = 'UPDATE ' + networkModelTblName + ' SET base_network_id = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);
            
            //testEnvironment.fillTestTableFromCsv('networkconf', 'networkconf.csv');
            testEnvironment.fillTestTableFromCsv('networkpath', 'networkpath.csv');
            testEnvironment.fillTestTableFromCsv('networkpathseq', 'networkpathseq.csv');
            testEnvironment.fillTestTableFromCsv('networkpathtarget', 'networkpathtarget.csv');

            updString = 'UPDATE ' + networkPathTblName + ' SET action = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);

            jasmine.hdbConnection.commit();
        });

        it('normal deletion case', function() {
            var modelName = testEnvironment.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var deleteNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            //input parameters
            var networkid = 1;
            var networkcode = 'NETWORK';

            var result = deleteNetwork(networkcode);
            
            var errMessage = bundle.getText('MSG_NETWORK_ID_DELTA_EXIST', [networkid]);
            expect(result.RETURN_CODE).toBe(2);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'E', 'MESSAGE' : errMessage}], ['SEVERITY', 'MESSAGE']);
            
            var networkid2 = 2;
            var networkcode2 = 'NETWORK2';
            
            result = deleteNetwork(networkcode2);
            
            var succMessage = bundle.getText('MSG_NETWORK_ID_DELETE_SUCCESS', [networkid2]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //Check whether network data is deleted
            //var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
            //var queryString = 'SELECT ID, CODE, DATASET_ID, COST_MODEL_ID FROM ' + networkModelTblName + " WHERE CODE = '" + networkcode + "'";
            //var network_model = queryUtil(networkModelTblName, 'ID = ?', networkid);
            var actual = readNetworkCaller(networkid2);
            expect(actual.network.getRowCount()).toBe(0);
            
            result = deleteNetwork(networkcode);
            
            succMessage = bundle.getText('MSG_NETWORK_ID_DELETE_SUCCESS', [networkid]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //var network_conf = queryUtil(networkModelConfTblName, 'NETWORK_MODEL_ID = ?', networkid);
            //expect(actual.network_conf.getRowCount()).toBe(0);

            //var network_compositepath = queryUtil(networkPathTblName, 'NETWORK_MODEL_ID = ?', networkid);
            var actualCompositepath = readCompositepathCaller(networkid, 'M');
            expect(actualCompositepath.paths.getRowCount()).toBe(0);
            //expect(actual.paths.getRowCount()).toBe(0);
            
            expect(actualCompositepath.path_connection.getRowCount()).toBe(0);
            //expect(actual.path_connection.getRowCount()).toBe(0);
        });
        
    });


    describe('Network Composite Path Manual Creation and Deletion Scenario', function()
    {
        var manualCreateEnvironment, manualDeleteEnvironment;
        beforeOnce(function() {
            manualCreateEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_create_composite_path",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
            
            manualDeleteEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_delete_composite_path",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
        });
        
        beforeEach(function(){
            //Clear path test table for network
            
            //Clear t_path_target_test table
            clearTestTables('t_path_target_test');
            //Clear t_path_sequence_test table
            clearTestTables('t_path_sequence_test');
            //Clear t_compositepath_test table
            clearTestTables('t_compositepath_test');
            //Clear t_network_model_test table
            clearTestTables('t_network_model_test');
            
            //Fill in setting group related data
            var settinggroupTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_setting_group_conf_test"';
            clearTestTablesWithSchema(settinggroupTblName);
            var tableUtils = new TableUtils(jasmine.hdbConnection);
            tableUtils.fillFromCsvFile(settinggroupTblName, csvDataPkg, 'settinggroup.csv', csvProp); //setting group data preparation

            //fill network test data from corresponding csv file
            manualCreateEnvironment.fillTestTableFromCsv('networkmodel', 'networkmodel.csv');
            //update the base network id to NULL value
            //update the network composite path table to set action to null
            var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
            var updString = 'UPDATE ' + networkModelTblName + ' SET base_network_id = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);
            //testEnvironment.fillTestTableFromCsv('networkconf', 'networkconf.csv');
            manualCreateEnvironment.fillTestTableFromCsv('networkpath', 'networkpath.csv');
            manualCreateEnvironment.fillTestTableFromCsv('networkpathseq', 'networkpathseq.csv');
            manualCreateEnvironment.fillTestTableFromCsv('networkpathtarget', 'networkpathtarget.csv');

            updString = 'UPDATE ' + networkPathTblName + ' SET action = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);
            
            jasmine.hdbConnection.commit();
        });

        it('normal create and delete composite path case', function() {
            var modelName = manualCreateEnvironment.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var createCompositepathNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            modelName = manualDeleteEnvironment.getTestModelName();
            idx = modelName.indexOf('.');
            schemaName = modelName.substring(1, idx - 1);
            procName = modelName.substring(idx + 2, modelName.length - 1);
            var deleteCompositepathNetwork = jasmine.hdbConnection.loadProcedure(schemaName, procName);

            var tableUtils = new TableUtils(jasmine.hdbConnection);

            //input parameters
            var networkid = 1;
            var networkcode = 'NETWORK';
            var Path1Create_data = [
                    {EXTERNAL_ID : 1, FROM_LOCATION : 'PUDONG', TO_LOCATION : 'HAIDIAN'},
                    {EXTERNAL_ID : 2, FROM_LOCATION : 'PUDONG', TO_LOCATION : 'HAIDIAN'}
                ];
                
            var Pathseq1Create_data = [
                    {EXTERNAL_ID : 1, SEQUENCE : 1, BASIC_PATH_ID : 1, PATH_TYPE : 'C', FROM_LOCATION : 'PUDONG', TO_LOCATION : 'SHANGHAI'},
                    {EXTERNAL_ID : 1, SEQUENCE : 2, BASIC_PATH_ID : 0, PATH_TYPE : 'C', FROM_LOCATION : 'SHANGHAI', TO_LOCATION : 'SHANDONG'},
                    {EXTERNAL_ID : 1, SEQUENCE : 3, BASIC_PATH_ID : 10, PATH_TYPE : 'P', FROM_LOCATION : 'SHANDONG', TO_LOCATION : 'BEIJING'},
                    {EXTERNAL_ID : 1, SEQUENCE : 4, BASIC_PATH_ID : 100, PATH_TYPE : 'C', FROM_LOCATION : 'BEIJING', TO_LOCATION : 'HAIDIAN'},
    
                    {EXTERNAL_ID : 2, SEQUENCE : 1, BASIC_PATH_ID : 1, PATH_TYPE : 'C', FROM_LOCATION : 'PUDONG', TO_LOCATION : 'SHANGHAI'},
                    {EXTERNAL_ID : 2, SEQUENCE : 2, BASIC_PATH_ID : 200, PATH_TYPE : 'P', FROM_LOCATION : 'SHANGHAI', TO_LOCATION : 'BEIJING'},
                    {EXTERNAL_ID : 2, SEQUENCE : 3, BASIC_PATH_ID : 100, PATH_TYPE : 'C', FROM_LOCATION : 'BEIJING', TO_LOCATION : 'HAIDIAN'}
                ];

            var result = createCompositepathNetwork(networkid, Path1Create_data, Pathseq1Create_data);
            jasmine.hdbConnection.commit();
            
            var succMessage = bundle.getText('MSG_MANUAL_COMPOSITE_PATH_CREATE_SUCCESS', [networkid]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //var network_compositepath = queryUtil(networkPathTblName, 'NETWORK_MODEL_ID = ?', networkid);
            var actualCompositepath = readCompositepathCaller(networkid, 'D');
            expect(actualCompositepath.paths.getRowCount()).toBe(2);

            expect(actualCompositepath.path_connection.getRowCount()).toBe(7);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 25},
                    {'SEQUENCE' : 4, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 100, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 1200, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 4, 'TRANSSHIP_COST' : 0},

                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 200, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 1100, 
                     'TRANSPORT_DURATION' : 29200, 'TRANSSHIP_DURATION' : 400, 'TRANSPORT_COST' : 220, 'TRANSSHIP_COST' : 25},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 100, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 1200, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 4, 'TRANSSHIP_COST' : 0}
                ], ['SEQUENCE', 'MTR', 'PATH_TYPE', 'BASIC_PATH_ID', 'FROM_LOCATION', 'TO_LOCATION', 'FROM_BP_SEQUENCE', 'TO_BP_SEQUENCE']);
                
            //Test complict with same layer
            var Path2Create_data = [
                    {EXTERNAL_ID : 1, FROM_LOCATION : 'PUDONG', TO_LOCATION : 'HAIDIAN'}
                ];
                
            var Pathseq2Create_data = [
                    {EXTERNAL_ID : 1, SEQUENCE : 1, BASIC_PATH_ID : 1, PATH_TYPE : 'C', FROM_LOCATION : 'PUDONG', TO_LOCATION : 'SHANGHAI'},
                    {EXTERNAL_ID : 1, SEQUENCE : 2, BASIC_PATH_ID : 0, PATH_TYPE : 'C', FROM_LOCATION : 'SHANGHAI', TO_LOCATION : 'SHANDONG'},
                    {EXTERNAL_ID : 1, SEQUENCE : 3, BASIC_PATH_ID : 10, PATH_TYPE : 'P', FROM_LOCATION : 'SHANDONG', TO_LOCATION : 'BEIJING'},
                    {EXTERNAL_ID : 1, SEQUENCE : 4, BASIC_PATH_ID : 2, PATH_TYPE : 'C', FROM_LOCATION : 'BEIJING', TO_LOCATION : 'HAIDIAN'}
                ];

            result = createCompositepathNetwork(networkid, Path1Create_data, Pathseq1Create_data);
            jasmine.hdbConnection.commit();
            
            var errorMessage = bundle.getText('MSG_PATH_CONFLICT_WITHIN_SAME_LAYER', ['PUDONG', 'HAIDIAN']);
            expect(result.RETURN_CODE).toBe(4);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'E', 'MESSAGE' : errorMessage}], ['SEVERITY', 'MESSAGE']);

            //Test delete same layer system generated composite path
            var Path1Delete_data = [
                    {ID : 1}
                ];
                
            result = deleteCompositepathNetwork(networkid, Path1Delete_data);
            jasmine.hdbConnection.commit();
            
            succMessage = bundle.getText('MSG_MANUAL_COMPOSITE_PATH_DELETE_SUCCESS', [1]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            //Test delete same layer manual generated composite path
            var Path2Delete_data = [
                    {ID : actualCompositepath.paths.getColumn('PATH_ID').getRow(0)},
                    {ID : actualCompositepath.paths.getColumn('PATH_ID').getRow(1)}
                ];

            result = deleteCompositepathNetwork(networkid, Path2Delete_data);
            jasmine.hdbConnection.commit();
            
            succMessage = bundle.getText('MSG_MANUAL_COMPOSITE_PATH_DELETE_SUCCESS', [1]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            actualCompositepath = readCompositepathCaller(networkid, 'D');
            expect(actualCompositepath.paths.getRowCount()).toBe(1);
            expect(actualCompositepath.paths).toMatchData(
                [{'ACTION' : 'D', 'SOURCE' : 'M', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN', 'CONFLICT_FLAG' : ''}],
                []
            );

            expect(actualCompositepath.path_connection.getRowCount()).toBe(4);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 0},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 0},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 0},
                    {'SEQUENCE' : 4, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0}
                ], ['SEQUENCE', 'MTR', 'PATH_TYPE', 'BASIC_PATH_ID', 'FROM_LOCATION', 'TO_LOCATION', 'FROM_BP_SEQUENCE', 'TO_BP_SEQUENCE']);

            //Create manual composite path in extended network layer, which has been deleted in lower network layer
            var networkid2 = 2;
            var Path3Create_data = [
                    {EXTERNAL_ID : 1, FROM_LOCATION : 'PUDONG', TO_LOCATION : 'HAIDIAN'}
                ];
                
            var Pathseq3Create_data = [
                    {EXTERNAL_ID : 1, SEQUENCE : 1, BASIC_PATH_ID : 1, PATH_TYPE : 'C', FROM_LOCATION : 'PUDONG', TO_LOCATION : 'SHANGHAI'},
                    {EXTERNAL_ID : 1, SEQUENCE : 2, BASIC_PATH_ID : 0, PATH_TYPE : 'C', FROM_LOCATION : 'SHANGHAI', TO_LOCATION : 'SHANDONG'},
                    {EXTERNAL_ID : 1, SEQUENCE : 3, BASIC_PATH_ID : 10, PATH_TYPE : 'P', FROM_LOCATION : 'SHANDONG', TO_LOCATION : 'BEIJING'},
                    {EXTERNAL_ID : 1, SEQUENCE : 4, BASIC_PATH_ID : 2, PATH_TYPE : 'C', FROM_LOCATION : 'BEIJING', TO_LOCATION : 'HAIDIAN'}
                ];

            result = createCompositepathNetwork(networkid2, Path3Create_data, Pathseq3Create_data);
            jasmine.hdbConnection.commit();
            
            succMessage = bundle.getText('MSG_MANUAL_COMPOSITE_PATH_CREATE_SUCCESS', [networkid2]);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

            actualCompositepath = readCompositepathCaller(networkid2, 'D');
            expect(actualCompositepath.paths.getRowCount()).toBe(1);

            expect(actualCompositepath.path_connection.getRowCount()).toBe(4);
            expect(actualCompositepath.path_connection).toMatchData(
                [
                    {'SEQUENCE' : 1, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 1, 
                     'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'SHANGHAI', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 10, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 50, 'TRANSSHIP_COST' : 40},
                    {'SEQUENCE' : 2, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 0, 
                     'FROM_LOCATION' : 'SHANGHAI', 'TO_LOCATION' : 'SHANDONG', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 200, 
                     'TRANSPORT_DURATION' : 10800, 'TRANSSHIP_DURATION' : 500, 'TRANSPORT_COST' : 20, 'TRANSSHIP_COST' : 20},
                    {'SEQUENCE' : 3, 'MTR' : 'TRAIN', 'PATH_TYPE' : 'P', 'BASIC_PATH_ID' : 10, 
                     'FROM_LOCATION' : 'SHANDONG', 'TO_LOCATION' : 'BEIJING', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 2, 'DISTANCE' : 900, 
                     'TRANSPORT_DURATION' : 30600, 'TRANSSHIP_DURATION' : 700, 'TRANSPORT_COST' : 180, 'TRANSSHIP_COST' : 30},
                    {'SEQUENCE' : 4, 'MTR' : 'TRUCK', 'PATH_TYPE' : 'C', 'BASIC_PATH_ID' : 2, 
                     'FROM_LOCATION' : 'BEIJING', 'TO_LOCATION' : 'HAIDIAN', 'FROM_BP_SEQUENCE' : 1, 'TO_BP_SEQUENCE' : 1, 'DISTANCE' : 20, 
                     'TRANSPORT_DURATION' : 3600, 'TRANSSHIP_DURATION' : 0, 'TRANSPORT_COST' : 40, 'TRANSSHIP_COST' : 0}
                ], ['SEQUENCE', 'MTR', 'PATH_TYPE', 'BASIC_PATH_ID', 'FROM_LOCATION', 'TO_LOCATION', 'FROM_BP_SEQUENCE', 'TO_BP_SEQUENCE']);
            
            //Create manual composite path in extended network layer which conflict in the same layer    
            result = createCompositepathNetwork(networkid2, Path3Create_data, Pathseq3Create_data);
            jasmine.hdbConnection.commit();
            
            errorMessage = bundle.getText('MSG_PATH_CONFLICT_WITHIN_SAME_LAYER', ['PUDONG', 'HAIDIAN']);
            expect(result.RETURN_CODE).toBe(4);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'E', 'MESSAGE' : errorMessage}], ['SEVERITY', 'MESSAGE']);
            
            //Create manual composite path in extended network layer which conflict with the lower layer
            //first create data in lower layer
            var Path4Create_data = [
                    {EXTERNAL_ID : 1, FROM_LOCATION : 'PUDONG', TO_LOCATION : 'HAIDIAN'}
                ];
            
            var Pathseq4Create_data = [
                    {EXTERNAL_ID : 1, SEQUENCE : 1, BASIC_PATH_ID : 1, PATH_TYPE : 'C', FROM_LOCATION : 'PUDONG', TO_LOCATION : 'SHANGHAI'},
                    {EXTERNAL_ID : 1, SEQUENCE : 2, BASIC_PATH_ID : 200, PATH_TYPE : 'P', FROM_LOCATION : 'SHANGHAI', TO_LOCATION : 'BEIJING'},
                    {EXTERNAL_ID : 1, SEQUENCE : 3, BASIC_PATH_ID : 100, PATH_TYPE : 'C', FROM_LOCATION : 'BEIJING', TO_LOCATION : 'HAIDIAN'}
                ];

            result = createCompositepathNetwork(networkid, Path4Create_data, Pathseq4Create_data);
            jasmine.hdbConnection.commit();

            result = createCompositepathNetwork(networkid2, Path4Create_data, Pathseq4Create_data);
            jasmine.hdbConnection.commit();

            errorMessage = bundle.getText('MSG_PATH_CONFLICT_WITHIN_LOWER_LAYER', ['PUDONG', 'HAIDIAN']);
            expect(result.RETURN_CODE).toBe(0);
            expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'W', 'MESSAGE' : errorMessage}], ['SEVERITY', 'MESSAGE']);
        });
        
    });
    
    
    describe('Route Generation Scenario', function()
    {
        var testEnvironment;
        beforeOnce(function() {
            testEnvironment = mockstarEnvironment.defineAndCreate({
                schema : originSchema,
                model : "sap.tm.trp.routing.db.path::p_generate_route",
                mockstarProperties : {truncOption : mockstarEnvironment.TruncOptions.NONE, useHdbConnection : true },
                csvPackage : csvDataPkg,
                csvProperties : csvProp,
                substituteTables : tableDependencies,
                substituteProcedures : procedureDependencies
            });
        });
        
        beforeEach(function(){
            //Clear path test table for network
            
            //Clear t_route_sequence_test table
            clearTestTables('t_route_sequence_test');
            //Clear t_route_test table
            clearTestTables('t_route_test');
            //Clear t_path_target_test table
            clearTestTables('t_path_target_test');
            //Clear t_path_sequence_test table
            clearTestTables('t_path_sequence_test');
            //Clear t_compositepath_test table
            clearTestTables('t_compositepath_test');
            //Clear t_network_model_conf_test table
            //clearTestTables('t_network_model_conf_test');
            //Clear t_network_model_test table
            clearTestTables('t_network_model_test');

            //Fill in setting group related data
            var settinggroupTblName = '"SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_setting_group_conf_test"';
            clearTestTablesWithSchema(settinggroupTblName);
            var tableUtils = new TableUtils(jasmine.hdbConnection);
            tableUtils.fillFromCsvFile(settinggroupTblName, csvDataPkg, 'settinggroup.csv', csvProp); //setting group data preparation

            //fill network test data from corresponding csv file
            testEnvironment.fillTestTableFromCsv('networkmodel', 'networkmodel.csv');
            //update the base network id to NULL value
            var sqlExecutor = new SqlExecutor(jasmine.hdbConnection);
            var updString = 'UPDATE ' + networkModelTblName + ' SET base_network_id = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);
            
            //testEnvironment.fillTestTableFromCsv('networkconf', 'networkconf.csv');
            testEnvironment.fillTestTableFromCsv('networkpath', 'networkpath.csv');
            testEnvironment.fillTestTableFromCsv('networkpathseq', 'networkpathseq.csv');
            testEnvironment.fillTestTableFromCsv('networkpathtarget', 'networkpathtarget.csv');

            updString = 'UPDATE ' + networkPathTblName + ' SET action = NULL WHERE id = 1';
            sqlExecutor.execSingle(updString);

            jasmine.hdbConnection.commit();
        });

        it('normal build route case', function() {
            var modelName = testEnvironment.getTestModelName();
            var idx = modelName.indexOf('.');
            var schemaName = modelName.substring(1, idx - 1);
            var procName = modelName.substring(idx + 2, modelName.length - 1);
            var generateRoute = jasmine.hdbConnection.loadProcedure(schemaName, procName);
            
            //input parameters
            var networkid = 1;
            var networkcode = 'NETWORK';
            //var options = [{NAME : 'MAX_ROUTE_NUM', VALUE : '3'}, {NAME : 'TARGET', VALUE : 'COST'}];
            var time_range = [
                {FROM_TIME : new Date(2055, 9, 1, 14, 30, 0, 0),
                TO_TIME : new Date(2055, 9, 31, 14, 30, 0, 0)}
            ];
            
            var composite_path_id = [
                {ID: 1}
            ];
            //var from_time = new Date(2015, 9, 1, 12, 0, 0, 0);
            //var to_time = new Date(2015, 9, 5, 12, 0, 0, 0);
            //var loc_pairs = [{FROM_LOCATION : 'PUDONG', DPT_TIME : from_time, TO_LOCATION : 'HAIDIAN', ARV_TIME : to_time}];

            var result = generateRoute(networkcode, time_range, composite_path_id);
            jasmine.hdbConnection.commit();

            expect(result.RETURN_CODE).toBe(0);

            var actualroute = readRouteCaller(networkid);
            
            //var route_sequence = tableDataSetLib.createFromResultSet(actualroute.route_sequence);
            expect(actualroute.route).toMatchData([
                {'NETWORK_MODEL_ID' : '1', 'COMPOSITE_PATH_ID' : '1', 'FROM_LOCATION' : 'PUDONG', 'TO_LOCATION' : 'HAIDIAN', 
                'DEPARTURE_TIME' : new Date(2055, 9, 10, 12, 51, 40, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 12, 11, 11, 40, 0)}
            ], []);
            
            expect(actualroute.route_sequence).toMatchData([
                {'SEQUENCE' : 0, 'LOCATION' : 'PUDONG', 'PRE_TRIP_SEQUENCE': null, 'NEXT_TRIP_SEQUENCE': 0, 'BASIC_PATH_ID' : null, 'PATH_TYPE' : '', 'MTR' : '', 'TRIP_ID' : null, 'TRIP_NAME' : null,
                 'DEPARTURE_TIME' : new Date(2055, 9, 10, 12, 51, 40, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 1, 14, 30, 0, 0),
                 'DISTANCE' : 0, 'STORAGE_COST' : 107.18, 'HANDLING_COST' : 10, 'TRANSPORT_COST' : 0, 'COST_CURRENCY' : 'CNY', 'HANDLING_TYPE' : 'LOD'},
                {'SEQUENCE' : 1, 'LOCATION' : 'SHANGHAI', 'PRE_TRIP_SEQUENCE': 1,'NEXT_TRIP_SEQUENCE': 0, 'BASIC_PATH_ID' : 1, 'PATH_TYPE' : 'C', 'MTR' : 'TRUCK', 'TRIP_ID' : '1', 'TRIP_NAME' : null,
                 'DEPARTURE_TIME' : new Date(2055, 9, 10, 13, 51, 40, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 10, 13, 51, 40, 0),
                 'DISTANCE' : 10, 'STORAGE_COST' : 0, 'HANDLING_COST' : 40, 'TRANSPORT_COST' : 50, 'COST_CURRENCY' : 'CNY', 'HANDLING_TYPE' : 'TRN'},
                {'SEQUENCE' : 2, 'LOCATION' : 'SHANDONG', 'PRE_TRIP_SEQUENCE': 1,'NEXT_TRIP_SEQUENCE': 0, 'BASIC_PATH_ID' : 0, 'PATH_TYPE' : 'C', 'MTR' : 'TRAIN', 'TRIP_ID' : '0', 'TRIP_NAME' : null,
                 'DEPARTURE_TIME' : new Date(2055, 9, 10, 17, 0, 0, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 10, 16, 51, 40, 0),
                 'DISTANCE' : 200, 'STORAGE_COST' : 0, 'HANDLING_COST' : 20, 'TRANSPORT_COST' : 20, 'COST_CURRENCY' : 'CNY', 'HANDLING_TYPE' : 'TRN'},
                {'SEQUENCE' : 3, 'LOCATION' : 'BEIJING', 'PRE_TRIP_SEQUENCE': 2,'NEXT_TRIP_SEQUENCE': 0, 'BASIC_PATH_ID' : 10, 'PATH_TYPE' : 'P', 'MTR' : 'TRAIN', 'TRIP_ID' : '10', 'TRIP_NAME' : 'AAA',
                 'DEPARTURE_TIME' : new Date(2055, 9, 12, 10, 11, 40, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 12, 10, 0, 0, 0),
                 'DISTANCE' : 900, 'STORAGE_COST' : 0, 'HANDLING_COST' : 30, 'TRANSPORT_COST' : 180, 'COST_CURRENCY' : 'CNY', 'HANDLING_TYPE' : 'TRN'},
                {'SEQUENCE' : 4, 'LOCATION' : 'HAIDIAN', 'PRE_TRIP_SEQUENCE': 1,'NEXT_TRIP_SEQUENCE': null, 'BASIC_PATH_ID' : 2, 'PATH_TYPE' : 'C', 'MTR' : 'TRUCK', 'TRIP_ID' : '2', 'TRIP_NAME' : null,
                 'DEPARTURE_TIME' : new Date(2055, 9, 31, 14, 30, 0, 0), 'ARRIVAL_TIME' : new Date(2055, 9, 12, 11, 11, 40, 0),
                 'DISTANCE' : 20, 'STORAGE_COST' : 229.65, 'HANDLING_COST' : 5, 'TRANSPORT_COST' : 40, 'COST_CURRENCY' : 'CNY', 'HANDLING_TYPE' : 'ULD'}
                ], ['SEQUENCE']);
    
            var routeIds = actualroute.route.columns.ID.rows.map(function(r){
                return r;
            });
            
            var routeSequenceCapacity = queryRouteSequenceCapacity(routeIds);
            
            /*
            expect(routeSequenceCapacity).toMatchData([
                {'SEQUENCE' : 0, 'CAPACITY' : null, 'CAPACITY_UOM' : null},
                {'SEQUENCE' : 1, 'CAPACITY' : null, 'CAPACITY_UOM' : 'TEU'},
                {'SEQUENCE' : 2, 'CAPACITY' : null, 'CAPACITY_UOM' : 'TEU'},
                {'SEQUENCE' : 3, 'CAPACITY' : null, 'CAPACITY_UOM' : 'TEU'},
                {'SEQUENCE' : 4, , 'CAPACITY' : null, 'CAPACITY_UOM' : 'TEU'}
                ], ['SEQUENCE']);
            */
            //var succMessage = bundle.getText('MSG_NETWORK_CODE_UPDATE_SUCCESS', [networkcode]);
            //expect(tableDataSetLib.createFromResultSet(result.MESSAGE)).toMatchData([{'SEVERITY' : 'I', 'MESSAGE' : succMessage}], ['SEVERITY', 'MESSAGE']);

        });
    });
    
    
    describe('Trip check scenario', function()
    {
        var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
      
        it('nagtive trip check cases', function() {
            var proc = new Procedure(
        		originSchema,
    			'sap.tm.trp.routing.db.dataset::p_check_trip', 
    			{
    				connection: $.db.getConnection(),
    				tempSchema: mockstarEnvironment.userSchema
    			}
            );
    		
    		// Trip id missing
    		var trip = [
    		    {ID: '', EXTERNAL_ID: '1',FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		var tripLocation = [];
    		
    		var result = proc(
    			trip,
    			tripLocation
    		);

    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_ID_MISSING')
    		});
    		
    		trip = [
    		    {EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_ID_MISSING')
    		});
    		
    		// Trip external id missing
    		trip = [
    		    {ID: 'D', EXTERNAL_ID: '', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') },
    		    {ID: 'E', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_EXTERNAL_ID_MISSING', [trip[0].ID])
    		});
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_EXTERNAL_ID_MISSING', [trip[1].ID])
    		});
    		
    		// Trip from location missing
    		/*
    		trip = [
    		    {ID: 'D', EXTERNAL_ID: 'TRIP_1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') },
    		    {ID: 'E', EXTERNAL_ID: 'TRIP_2', FROM_LOCATION: '', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_FROM_LOCATION_MISSING', [trip[0].EXTERNAL_ID])
    		});
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_FROM_LOCATION_MISSING', [trip[1].EXTERNAL_ID])
    		});
    		
    		// Trip to location missing
    		trip = [
    		    {ID: 'D', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') },
    		    {ID: 'E', EXTERNAL_ID: 'TRIP_2', FROM_LOCATION: 'L1', TO_LOCATION: '',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_TO_LOCATION_MISSING', [trip[0].EXTERNAL_ID])
    		});
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_TO_LOCATION_MISSING', [trip[1].EXTERNAL_ID])
    		});
    		*/
    		
    		// Trip departure time missing
    		trip = [
    		    {ID: 'D', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_DEPARTURE_TIME_MISSING', [trip[0].EXTERNAL_ID])
    		});
    		
    		// Trip arrival time missing
    		trip = [
    		    {ID: 'D', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/11/01 00:00:00 +0000') }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_ARRIVAL_TIME_MISSING', [trip[0].EXTERNAL_ID])
    		});
    		
    		// Trip arrival time is earlier than departure time
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/11/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/10/01 00:00:00 +0000')}
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_ARRIVAL_TIME_INVALID', [trip[0].EXTERNAL_ID])
    		});
    		
    		// Trip id in trip location table missing
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {SEQUENCE: 1, LOCATION: 'L1', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		    
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_ID_MISSING')
    		});
    		
    		// Trip id in location table not found in trip table
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'E', SEQUENCE: 1, LOCATION: 'L1', DISTANCE: 1000, 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_ID_NOT_FOUND')
    		});
    		
    		// Trip location sequence is missing
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', LOCATION: 'L1', DISTANCE: 1000, 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_SEQUENCE_MISSING', [trip[0].EXTERNAL_ID])
    		});
    		
    		
    		// Trip location location is missing
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')},
    		    {ID: 'G', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,DISTANCE: 1000, 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'G', SEQUENCE: 1, LOCATION: '', DISTANCE: 1000, 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_LOCATION_MISSING', [trip[0].EXTERNAL_ID, 1])
    		});
    		
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_LOCATION_MISSING', [trip[0].EXTERNAL_ID, 1])
    		});
    		
    		// Trip location count is not correct
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')},
    		    {ID: 'G', EXTERNAL_ID: 'TRIP_2', FROM_LOCATION: 'L3', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L1', DISTANCE: 1000, 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_COUNT_INVALID', [trip[0].EXTERNAL_ID])
    		});
    		
    		// Trip location distance invalid. Location not the first one should have positive or 0 distance
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')},
    		    {ID: 'G', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L3',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/10/10 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2,LOCATION: 'L2', 
    		    DEPART_TIME: new Date('2016/10/11 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'G', SEQUENCE: 3, LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/10/02 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/10/11 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'G', SEQUENCE: 3, LOCATION: 'L3', DISTANCE: -1000, 
    		    DEPART_TIME: new Date('2016/10/12 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE.length).toBe(2);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_DISTANCE_INVALID', [trip[0].EXTERNAL_ID, 2])
    		});
    		
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_DISTANCE_INVALID', [trip[1].EXTERNAL_ID, 3])
    		});
    		
    		// Trip location departure time missing
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1',
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2, LOCATION: 'L1', DISTANCE: 1000, 
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE.length).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_DEPARTURE_TIME_MISSING', [trip[0].EXTERNAL_ID, 1])
    		});
    		
    		// Trip location arrival time missing
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2, LOCATION: 'L1', DISTANCE: 1000,
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE.length).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_ARRIVAL_TIME_MISSING', [trip[0].EXTERNAL_ID, 2])
    		});
    		
    		// Trip location arrival time is later than departure time
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L3',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2, LOCATION: 'L2', DISTANCE: 1000,
    		    DEPART_TIME: new Date('2016/11/02 00:00:00 +0000'),
    		    ARRIVAL_TIME: new Date('2016/11/03 07:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 3, LOCATION: 'L3', DISTANCE: 1000,
    		    ARRIVAL_TIME: new Date('2016/11/07 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE.length).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_LOCATION_ARRIVAL_TIME_INVALID', [trip[0].EXTERNAL_ID, 2])
    		});
    		
    		
    		// Trip location arrival time is earlier than departure time of previous location
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L3',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/11/04 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2, LOCATION: 'L2', DISTANCE: 1000,
    		    DEPART_TIME: new Date('2016/11/05 00:00:00 +0000'),
    		    ARRIVAL_TIME: new Date('2016/11/03 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 3, LOCATION: 'L3', DISTANCE: 1000,
    		    ARRIVAL_TIME: new Date('2016/11/07 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE.length).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_SEQUENCE_ARRIVAL_TIME_INVALID', [trip[0].EXTERNAL_ID, 2])
    		});
    		
    		// Trip from location is inconsistent
    		/*
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L3', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L2', DISTANCE: 1000, 
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_FROM_LOCATION_INCONSISTENT', [trip[0].EXTERNAL_ID])
    		});
    		
    	    // Trip to location is inconsistent
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L1', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L4', DISTANCE: 1000, 
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_TO_LOCATION_INCONSISTENT', [trip[0].EXTERNAL_ID])
    		});
    		*/
    		
    		// Trip departure time is inconsistent
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:70:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L1', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L2', DISTANCE: 1000, 
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_DEPARTURE_TIME_INCONSISTENT', [trip[0].EXTERNAL_ID])
    		});
    		
    		// Trip arrival time is inconsistent
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L2',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/01 08:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L1', 
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 1, LOCATION: 'L2', DISTANCE: 1000, 
    		    ARRIVAL_TIME: new Date('2016/11/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(1);
    		expect(result.MESSAGE).toContain({
                SEVERITY: 'E', 
                MESSAGE: bundle.getText('MSG_TRIP_ARRIVAL_TIME_INCONSISTENT', [trip[0].EXTERNAL_ID])
    		});
    		
    		
    		// No error should occur
    		trip = [
    		    {ID: 'F', EXTERNAL_ID: 'TRIP_1', FROM_LOCATION: 'L1', TO_LOCATION: 'L3',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'), ARRIVAL_TIME: new Date('2016/11/07 00:00:00 +0000')}
    		];
    		
    		tripLocation = [
    		    {TRIP_ID: 'F', SEQUENCE: 1,LOCATION: 'L1',
    		    DEPART_TIME: new Date('2016/10/01 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 2, LOCATION: 'L2', DISTANCE: 1000,
    		    DEPART_TIME: new Date('2016/11/05 00:00:00 +0000'),
    		    ARRIVAL_TIME: new Date('2016/11/03 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    },
    		    {TRIP_ID: 'F', SEQUENCE: 3, LOCATION: 'L3', DISTANCE: 1000,
    		    ARRIVAL_TIME: new Date('2016/11/07 00:00:00 +0000'),
    		    CUTOFF_OFFSET: 0, AVAILABILITY_OFFSET: 0
    		    }
    		];
    		
    		result = proc(
    			trip,
    			tripLocation
    		);
    		
    		expect(result.RETURN_CODE).toBe(0);
        });
    });
    
}).addTags([jasmine.tags.networkut]);