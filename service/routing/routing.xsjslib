var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").procedure;
var Connector = $.import("sap.tm.trp.service.routing", "connector");
var CostService = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");

var GLOBAL_CONSTANT_DATASET_CODE = 'TM_INTERMODAL';

function RoutingService(connection) {

    //this.connection = connection;

    this.readNetworkByCode = function(code, withDetails) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_read_network_by_code");
        return proc(
            code
        );
    };

    this.readDatasetByCode = function(code, withSummary) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.dataset::p_read_dataset_by_code");

        return proc(
            code, (withSummary ? 'X' : '')
        );
    };

    this.readGlobalDataset = function(withSummary) {
        return this.readDatasetByCode(GLOBAL_CONSTANT_DATASET_CODE, withSummary);
    };

    /**
     *
     */
    this.replicateLocation = function() {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.connector::p_replicate_location");

        proc();
    };

    this.readBasicPathIntermodal = function() {
        var result;
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.connector::p_get_basic_path_locations");

        result = proc(
            new Date(), // Should be supplied by input
            new Date('9999/01/01 00:00:00 +0000') // Should be supplied by input
        );

        return result.LOCATIONS;
    };

    function transformTMConnection(tmConnection){
        var result ={
            basicConnection: [],
            connectionCarrier: []
        };

        tmConnection.forEach(function(lane, index) {
            result.basicConnection.push({
                ID: index.toString(), // Be cautions, it cannot be empty
                FROM_LOCATION: lane.LOC_FROM,
                TO_LOCATION: lane.LOC_TO,
                MTR: lane.MTR,
                DISTANCE: lane.DISTANCE_KM,
                DURATION: lane.DURATION
            });

            if (lane.TSP){
                lane.TSP.forEach(function(carrier){
                    result.connectionCarrier.push({
                        CONNECTION_ID: index.toString(),
                        CARRIER: carrier.TSP_ID
                    });
                });
            }
        });

        return result;
    }

    /**
     * Create the global dataset
     *
     */
    this.createGlobalDataset = function() {
        var pathLocs = this.readBasicPathIntermodal();
        var pathGW = Connector.getGatewayConns(pathLocs);
        if (pathGW.success) {
            var param = transformTMConnection(pathGW.data);

            //this.replicateLocation();

            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_create_global_dataset");
            var config = [];
            return proc(
                new Date(), // Should be supplied by input
                new Date('9999/01/01 00:00:00 +0000'), // Should be supplied by input
                config,
                param.basicConnection,
                param.connectionCarrier
            );
        } else {
            return {
                RETURN_CODE: 1,
                MESSAGE: pathGW.message,
                LOG: []
            };
        }
    };


    /**
     * Create the global dataset
     *
     */
    this.updateGlobalDataset = function() {
        var pathLocs = this.readBasicPathIntermodal();
        var pathGW = Connector.getGatewayConns(pathLocs);
        //var pathGW = {success: true, data: []};
        if (pathGW.success) {
            var param = transformTMConnection(pathGW.data);

            //this.replicateLocation();

            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_global_dataset");
            var config = [];
            return proc(
                new Date(), // Should be supplied by input
                new Date('9999/01/01 00:00:00 +0000'), // Should be supplied by input
                config,
                param.basicConnection,
                param.connectionCarrier
            );
        } else {
            return {
                RETURN_CODE: 1,
                MESSAGE: pathGW.message,
                LOG: []
            };
        }
    };

    /**
     *  Check if global dataset exists and create global dataset if not
     *
     */
    this.checkAndCreateGlobalDataset = function() {
        var dataset = this.readDatasetByCode(GLOBAL_CONSTANT_DATASET_CODE, false);
        if (dataset.DATASET.length === 0) {
           return this.createGlobalDataset();
        }  else {
            return {
                RETURN_CODE: 0,
                DATASET_ID: dataset.DATASET[0].ID,
                MESSAGE: [],
                LOG: []
            };
        }
    };

    this.updateLocalDataset = function(datasetCode, locations) {
        var pathGW = Connector.getDirectedGWConns(locations, locations);
        //var pathGW = {success:true, data:[]};
        if (pathGW.success) {
            var param = transformTMConnection(pathGW.data);

            var proc = connection.loadProcedure("SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_local_dataset");

            var locationIds = locations.map(function(location) {
                return {
                    LOCATION_ID: location
                };
            });

            // Find good way to control transaction later
            return proc(
                datasetCode,
                locationIds,
                param.basicConnection,
                param.connectionCarrier
            );
        } else {
            return {
                RETURN_CODE: 1,
                MESSAGE: pathGW.message,
                LOG: []
            };
        }
    };

    this.createLocalDataset = function(datasetCode, locations) {
        var pathGW = Connector.getDirectedGWConns(locations, locations);
       //var pathGW = {success:true, data:[]};
        if (pathGW.success) {
            var param = transformTMConnection(pathGW.data);

            var createLocalDatasetProc = connection.loadProcedure("SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_create_local_dataset");

            var locationIds = locations.map(function(location) {
                return {
                    LOCATION_ID: location
                };
            });

            // Find good way to control transaction later
            return createLocalDatasetProc(
                datasetCode,
                locationIds,
                param.basicConnection,
                param.connectionCarrier
            );
        } else {
            return {
                RETURN_CODE: 1,
                MESSAGE: pathGW.message,
                LOG: []
            };
        }
    };

    this.checkAndCreateLocalDataset = function(datasetCode, locations) {
        var dataset = this.readDatasetByCode(datasetCode, false);
        if (dataset.DATASET.length === 0) {
            return this.createLocalDataset(datasetCode, locations);
        } else {
            return {
                RETURN_CODE: 0,
                DATASET_ID: dataset.DATASET[0].ID,
                MESSAGE: [],
                LOG: []
            };
        }
    };

    this.createDeltaNetwork = function(networkCode, baseNetworkCode, timeRangeList) {

        var log = [];
        var message = [];

        var proc = connection.loadProcedure("SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.dataset::p_create_delta_dataset");

        var result = proc(
            networkCode,
            baseNetworkCode
        );

        if (result.RETURN_CODE !== 0) {
            return result;
        }

        var deltaDatasetId = result.DATASET_ID;

        log.concat(result.LOG);
        message.concat(result.MESSAGE);

        proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_create_delta_network");

        result = proc(
            deltaDatasetId,
            networkCode,
            baseNetworkCode
        );
/*
        if (result.RETURN_CODE !== 0) {
            return result;
        }

        log.concat(result.LOG);
        message.concat(result.MESSAGE);

        result = this.generateRoute(networkCode, timeRangeList, []);
*/
        if (result.RETURN_CODE === 0) {
            Object.keys(result.LOG).concat(log);
            Object.keys(result.MESSAGE).concat(message);
        }

        return result;
    };

    this.createLocalNetwork = function(networkCode, settingGroup, locations) {

        var log = [];
        var message = [];

        var result = this.checkAndCreateLocalDataset(networkCode, locations);
        if (result.RETURN_CODE !== 0) {
            return result;
        }

        log.concat(result.LOG);
        message.concat(result.MESSAGE);

        var datasetId = result.DATASET_ID;

        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_query_path_missing_cost");

	    result = proc(datasetId, settingGroup);

	    if (result.RETURN_CODE !== 0) {
	        delete result.DATASET_CONNECTION_INFO;
            delete result.COST_INFO_OUT;
            return result;
        }

	    if (result.COST_INFO_OUT.length > 0){
            result = CostService.replicateDistanceBasedTransportCostFromTM(
            this.connection,
            result.COST_MODEL_ID,
            result.DATASET_CONNECTION_INFO,
            result.COST_INFO_OUT
            );

            if (result.RETURN_CODE !== 0) {
                return result;
            }
	    }

        proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_create_network");

        result = proc(
            datasetId,
            networkCode,
            settingGroup
        );

        if (result.RETURN_CODE === 0) {
            Object.keys(result.LOG).concat(log);
            Object.keys(result.MESSAGE).concat(message);
        }

        return result;
    };

    this.queryMissingCost = function(networkCode, compositePathIds) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_query_route_missing_cost");

        var result = proc(networkCode, 'X', compositePathIds);

        if (result.RETURN_CODE !== 0) {
            delete result.DATASET_CONNECTION_INFO;
            delete result.COST_INFO_OUT;
            return result;
        }

        if (result.COST_INFO_OUT.length > 0){
            result = CostService.replicateTransportCostFromTM(
            this.connection,
            result.COST_MODEL_ID,
            result.DATASET_CONNECTION_INFO,
            result.COST_INFO_OUT
            );

            if (result.RETURN_CODE !== 0) {
                return result;
            }
        }
    };

    this.generateRoute = function(networkCode, timeRangeList, compositePathIds) {
        var result = this.queryMissingCost(networkCode, compositePathIds);

        if (result) {
            return result;
        }

        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_generate_route");

        return proc(
            networkCode,
            timeRangeList,
            compositePathIds
        );
    };


    this.refreshNetwork = function(networkCode, simulationPlanId) {
        var log = [];
        var message = [];

        var network = this.readNetworkByCode(networkCode, false);
        // To-do: raise exception here
        if (network.NETWORK.length > 0) {

            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_query_path_missing_cost");

    	    var result = proc(network.NETWORK[0].DATASET_ID, network.NETWORK[0].SETTING_GROUP_ID);

    	    if (result.RETURN_CODE !== 0) {
    	        delete result.DATASET_CONNECTION_INFO;
                delete result.COST_INFO_OUT;
                return result;
            }

    	    if (result.COST_INFO_OUT.length > 0){
                result = CostService.replicateDistanceBasedTransportCostFromTM(
                this.connection,
                result.COST_MODEL_ID,
                result.DATASET_CONNECTION_INFO,
                result.COST_INFO_OUT
                );

                if (result.RETURN_CODE !== 0) {
                    return result;
                }
    	    }

            proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_refresh_network");

            result = proc(
                networkCode,
                ''
            );

            if (result.RETURN_CODE !== 0) {
                return result;
            }

            log.concat(result.LOG);
            message.concat(result.MESSAGE);

            proc = connection.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_ext_simulation_plan_get");

            result = proc(
                simulationPlanId
            );

            var timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
                return {
                    FROM_TIME: result.TIME_RANGE[t].START_TIME,
                    TO_TIME: result.TIME_RANGE[t].END_TIME
                };
            });

            result = this.generateRoute(networkCode, timeRangeList, []);

            if (result.RETURN_CODE === 0) {
                Object.keys(result.LOG).concat(log);
                Object.keys(result.MESSAGE).concat(message);
            }

            return result;
        } else {
            return {
                RETURN_CODE: 1,
                MESSAGE: [],
                LOG: []
            };
        }

    };
	
this.checkUpdateNetworkSettinggroup = function(networkCode, settingGroup) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_update_network_model");

       var result = proc(networkCode,settingGroup);
	connection.commit();
        return result;
    };

    this.checkandCreateNetwork = function(networkCode, settingGroup, locations, timeRangeList) {
        var log = [];
        var message = [];

	this.checkUpdateNetworkSettinggroup(networkCode,settingGroup);
        var network = this.readNetworkByCode(networkCode, false);

        if (network.NETWORK.length === 0) {

            var result  = this.checkAndCreateGlobalDataset();

            if (result.RETURN_CODE !== 0){
                return result;
            }

            log.concat(result.LOG);
            message.concat(result.MESSAGE);

            result = this.createLocalNetwork(networkCode, settingGroup, locations);

            if (result.RETURN_CODE !== 0){
                return result;
            }

            log.concat(result.LOG);
            message.concat(result.MESSAGE);

            result = this.generateRoute(networkCode, timeRangeList, []);

            if (result.RETURN_CODE === 0) {
                Object.keys(result.LOG).concat(log);
                Object.keys(result.MESSAGE).concat(message);
            }

            return result;
        } else {

            // Rollforward trip
            // Time range list should not be empty
            result = this.rollForwardDatasetTrip(timeRangeList[0].FROM_TIME, timeRangeList[timeRangeList.length - 1].TO_TIME, networkCode);

            if (result.RETURN_CODE !== 0){
                return result;
            }

            log.concat(result.LOG);
            message.concat(result.MESSAGE);

            result = this.generateRoute(networkCode, timeRangeList, []);

            if (result.RETURN_CODE === 0) {
               Object.keys(result.LOG).concat(log);
                Object.keys(result.MESSAGE).concat(message);
            }

            return result;
        }
    };

    this.queryCompositePath = function(networkCode, fromLocation, toLocation) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_query_composite_path");

        var network = this.readNetworkByCode(networkCode, false);

        var result = proc(
            network.NETWORK[0].ID,
            'F',          // View type
            fromLocation,
            toLocation,
            ''           //MTR
        );

        var connectionMap = {};
        var refMap = {};
        Object.keys(result.PATH_CONNECTION).forEach(function(c) {
            var key = result.PATH_CONNECTION[c].BASIC_PATH_ID;
            var pathRef = {
                PATH: result.PATH_CONNECTION[c].PATH_ID
            };

            if (refMap[key]) {
                refMap[key].push(pathRef);
            } else {
                refMap[key] = [pathRef];
            }
        });

        Object.keys(result.PATH_CONNECTION).forEach(function(c) {
            var key = result.PATH_CONNECTION[c].PATH_ID;

            c.PATH_REF = refMap[c.BASIC_PATH_ID];

            if (connectionMap[key]) {
                connectionMap[key].push(c);
            } else {
                connectionMap[key] = [c];
            }
        });

        return Object.keys(result.PATHS).map(function(p) {
            var path = result.PATHS[p];
            path.CONNECTION = connectionMap[result.PATHS[p].PATH_ID]
            return path;
        });
    };

    this.queryBasicConnection = function(networkCode, fromLocation, toLocation, MTR, usedOnly) {
        var proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::query_basic_connection");

        var result = proc(
            networkCode,
            fromLocation,
            toLocation,
            MTR,
            usedOnly
        );

        return result;
    };

    /**
     * Update local dataset
     *
     * @param scenarioId - scenario Id
     *
     */
    this.updateLocalDatasetBySimulationPlanId = function(simulationPlanId) {
        var proc = connection.loadProcedure(
            "SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_ext_simulation_plan_get");

        var result = proc(
            simulationPlanId
        );

        var locations = Object.keys(result.LOCATIONS).map(function(l) {
            return result.LOCATIONS[l].LOCATION_NAME;
        });

        var sdPlanCode = result.SIMULATION_PLAN[0].SD_PLAN_CODE;


        return this.updateLocalDataset(
            sdPlanCode,
            locations
        );
    };

    /**
     * Check and create network model for the given scenario
     *
     * @param scenarioId - scenario Id
     *
     */
    this.buildNetworkModel = function(simulationPlanId) {
        var proc = connection.loadProcedure(
            "SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_ext_simulation_plan_get");

        var result = proc(
            simulationPlanId
        );

        var locations = Object.keys(result.LOCATIONS).map(function(l) {
            return result.LOCATIONS[l].LOCATION_NAME;
        });

        var networkModelCode = result.SIMULATION_PLAN[0].SD_PLAN_CODE;
        var settingGroup = result.SIMULATION_PLAN[0].NETWORK_SETTING_GROUP_ID;
        var timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };
        });

        return this.checkandCreateNetwork(
            networkModelCode,
            settingGroup,
            locations,
            timeRangeList
        );
    };

    /**
     * Check and create network model for the given scenario
     *
     * @param scenarioId - scenario Id
     *
     */
    this.buildDeltaNetworkModel = function(scenarioId) {
        var proc = connection.loadProcedure(
            "SAP_TM_TRP",
            "sap.tm.trp.db.planningcockpit::p_ext_scenario_get");

        var result = proc(
            scenarioId
        );

        var baseNetworkCode = result.PLAN_MODEL[0].CODE;
        var networkCode = result.SIMULATION_PLAN[0].CODE + '_' + result.SCENARIO[0].CODE;
        var timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };
        });

        return this.createDeltaNetwork(networkCode, baseNetworkCode, timeRangeList);

    };


    /**
     * Check and create network model for the given scenario
     *
     * @param scenarioId - scenario Id
     *
     */
    this.refreshRouteOnTripGenerated = function(simulationPlanId, scenarioId, basicPathId) {

        var proc;
        var result;
        var networkCode;
        var timeRangeList;
        var networkCodePrefix;

        if (scenarioId === 0){
            proc = connection.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_ext_simulation_plan_get");

            result = proc(
                simulationPlanId
            );

            networkCode = result.SIMULATION_PLAN[0].SD_PLAN_CODE;
            networkCodePrefix = result.SIMULATION_PLAN[0].CODE + '_';

            timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };
        });

        } else {
            proc = connection.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_ext_scenario_get");

            result = proc(
                scenarioId
            );

            networkCode = result.SIMULATION_PLAN[0].CODE + '_' + result.SCENARIO[0].CODE;
            networkCodePrefix = result.SIMULATION_PLAN[0].CODE + '_';
            timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };
        });
        }

        proc = connection.loadProcedure(
            "SAP_TM_ROUTING",
            "sap.tm.trp.routing.db.path::p_find_composite_path_by_usage");

        result = proc(networkCode, basicPathId);

        if (result.COMPOSITE_PATH_ID.length > 0){
            var compositePathMap = {};
            var networkCodeList = [];
            var log = [];
            var message = [];

            Object.keys(result.COMPOSITE_PATH_ID).forEach(function(c){
                if (result.COMPOSITE_PATH_ID[c].NETWORK_CODE === networkCode || result.COMPOSITE_PATH_ID[c].NETWORK_CODE.startsWith(networkCodePrefix)) {
                    if (!compositePathMap[result.COMPOSITE_PATH_ID[c].NETWORK_CODE]){
                       compositePathMap[result.COMPOSITE_PATH_ID[c].NETWORK_CODE] = [];
                       networkCodeList.push(result.COMPOSITE_PATH_ID[c].NETWORK_CODE);
                    }

                    compositePathMap[result.COMPOSITE_PATH_ID[c].NETWORK_CODE].push({ID: result.COMPOSITE_PATH_ID[c].PATH_ID});
                }
            });
            var that = this;
            for (var i = 0; i < networkCodeList.length; i++){
                result = that.generateRoute(networkCodeList[i], timeRangeList, compositePathMap[networkCodeList[i]]);

                if (result.RETURN_CODE !== 0){
                    return result;
                }

                log.concat(result.LOG);
                message.concat(result.MESSAGE);
            }

            result.LOG = log;
            result.MESSAGE = message;

            return result;

        } else {
            return {
                RETURN_CODE: 0,
                MESSAGE: [],
                LOG: []
            };
        }
    };


    /**
     *
     *
     * @param scenarioId - scenario Id
     *
     */
    this.generateRoute4CompositePath = function(simulationPlanId, scenarioId, compositePathId) {

        var proc;
        var result;
        var networkCode;
        var timeRangeList;

        if (scenarioId === 0){
            proc = connection.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_ext_simulation_plan_get");

            result = proc(
                simulationPlanId
            );

            networkCode = result.SIMULATION_PLAN[0].SD_PLAN_CODE;

            timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };});

        } else {
            proc = connection.loadProcedure(
                "SAP_TM_TRP",
                "sap.tm.trp.db.planningcockpit::p_ext_scenario_get");

            result = proc(
                scenarioId
            );

            networkCode = result.SIMULATION_PLAN[0].CODE + '_' + result.SCENARIO[0].CODE;
            timeRangeList = Object.keys(result.TIME_RANGE).map(function(t){
            return {
                FROM_TIME: result.TIME_RANGE[t].START_TIME,
                TO_TIME: result.TIME_RANGE[t].END_TIME
            };});
        }

        return this.generateRoute(networkCode, timeRangeList, [{ID: compositePathId}]);

    };

    /**
     * Create connection in the given dataset
     *
     * @param {BigInt} datasetId            - Dataset Id
     * @param {Object} basicConnection      - Basic connection Object with following fields:
     *                                             FROM_LOCATION {String},
     *                                            TO_LOCATION {String},
     *                                            MTR {String},
     *                                            DISTANCE {Number},
     *                                            DURATION {Number},
     *                                            CARRIER {String}
     * @return {Object}                      - Result with following fields:
     *                                            RETURN_CODE {number} - return code
     *                                            ID          {BigInt} - Id generated
     *                                            MESSAGE     {Array}  - List of message
     *                                            LOG         {Array}  - List of log
     */
    this.createConnection = function(datasetId, basicConnection) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_create_connection");

            var connectionList = [];
            var connectionCarrierList = [];

            var connectionTmp = {};
            connectionTmp.ID = ''; // Temporary ID
            connectionTmp.FROM_LOCATION = basicConnection.FROM_LOCATION;
            connectionTmp.TO_LOCATION = basicConnection.TO_LOCATION;
            connectionTmp.MTR = basicConnection.MTR;
            connectionTmp.DISTANCE = basicConnection.DISTANCE;
            connectionTmp.DURATION = basicConnection.DURATION;
            connectionList.push(connectionTmp);

            var connectionCarrierTmp = {};
            if (basicConnection.CARRIER && basicConnection.CARRIER !== '') {
                connectionCarrierTmp.CONNECTION_ID = connectionTmp.ID;
                connectionCarrierTmp.CARRIER = basicConnection.CARRIER;
                connectionCarrierList.push(connectionCarrierTmp);
            }

            var result = proc(
                datasetId,
                connectionList,
                connectionCarrierList
            );
            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            } else {
               r.ID = null;
               r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    /**
     * Update connection in the given dataset
     */
    this.updateConnection = function(datasetId, basicConnection) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_connection");

            var connectionList = [];
            var connectionCarrierList = [];

            var connectionTmp = {};
            connectionTmp.ID = basicConnection.ID.toString();
            connectionTmp.FROM_LOCATION = basicConnection.FROM_LOCATION;
            connectionTmp.TO_LOCATION = basicConnection.TO_LOCATION;
            connectionTmp.MTR = basicConnection.MTR;
            connectionTmp.DISTANCE = basicConnection.DISTANCE;
            connectionTmp.DURATION = basicConnection.DURATION;
            connectionList.push(connectionTmp);

            var connectionCarrierTmp = {};
            if (basicConnection.CARRIER && basicConnection.CARRIER !== '') {
                connectionCarrierTmp.CONNECTION_ID = connectionTmp.ID;
                connectionCarrierTmp.CARRIER = basicConnection.CARRIER;
                connectionCarrierList.push(connectionCarrierTmp);
            }
            var result = proc(
                datasetId,
                connectionList,
                connectionCarrierList
            );

            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            } else {
               r.ID = null;
               r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    /**
     * Delete connection in the given dataset
     */
    this.deleteConnection = function(datasetId, connectionId) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_delete_connection");

            var result = proc(
                datasetId,
                [{ID: connectionId}]
            );

            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            } else {
               r.ID = null;
               r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    /**
     * Calculate transport cost for connection
     *
     * @param {BigInt} datasetId            - Network Id
     * @param {Object} basicConnection      - Basic connection Object with following fields:
     *                                             FROM_LOCATION {String},
     *                                            TO_LOCATION {String},
     *                                            MTR {String},
     *                                            DISTANCE {Number},
     *                                            DURATION {Number},
     *                                            CARRIER {String}
     * @return {Object}                      - Result with following fields:
     *                                            RETURN_CODE      {Number} - Return code
     *                                            TRANSPORT_COST   {Number} - Transport cost
     *                                            CURRRENCY        {String} - Currency
     *                                            MESSAGE          {Array}  - List of message
     */
    this.calculateConnectionCost = function(networkCode, basicConnection) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_calculate_basic_connection_cost");

            var connectionList = [];
            var connectionCarrierList = [];

            var connectionTmp = {};
            connectionTmp.ID = 'C1'; // Temporary ID
            connectionTmp.FROM_LOCATION = basicConnection.FROM_LOCATION;
            connectionTmp.TO_LOCATION = basicConnection.TO_LOCATION;
            connectionTmp.MTR = basicConnection.MTR;
            connectionTmp.DISTANCE = basicConnection.DISTANCE;
            connectionTmp.DURATION = basicConnection.DURATION;
            connectionList.push(connectionTmp);

            var connectionCarrierTmp = {};
            if (basicConnection.CARRIER && basicConnection.CARRIER !== '') {
                connectionCarrierTmp.CONNECTION_ID = connectionTmp.ID;
                connectionCarrierTmp.CARRIER = basicConnection.CARRIER;
                connectionCarrierList.push(connectionCarrierTmp);
            }

            var result = proc(
                networkCode,
                connectionList,
                connectionCarrierList
            );
            connection.commit();
            return {
                RETURN_CODE: result.RETURN_CODE,
                TRANSPORT_COST: (result.COST.length > 0? result.COST[0].TRANSPORT_COST:null),
                CURRENCY: (result.COST.length > 0? result.COST[0].CURRENCY:null),
                MESSAGE: result.MESSAGE
            };

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };


    this.calculateConnectionCostById = function(networkCode, connectionIdList) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_calculate_basic_connection_cost_by_id");

            if (!connectionIdList){
                return {
                    COST: [],
                    RETURN_CODE: 0,
                    MESSAGE: []
                };
            }

            var connectionIdParam = connectionIdList.map(function(id){
                return {
                    ID: id
                };
            });

            return proc(
                networkCode,
                connectionIdParam
            );

        } catch (e) {
            // Handle exception later
            throw e;
        }


    };

    this.calculatePathCostById = function(networkCode, pathIdList) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_calculate_basic_path_cost_by_id");

            if (!pathIdList){
                return {
                    COST: [],
                    RETURN_CODE: 0,
                    MESSAGE: []
                };
            }

            var pathIdParam = pathIdList.map(function(id){
                return {
                    ID: id
                };
            });

            return proc(
                networkCode,
                pathIdParam
            );

        } catch (e) {
            // Handle exception later
            throw e;
        }


    };

    this.createPath = function(datasetId, basicPath) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_create_path");

            var pathList = [];
            var pathConnectionList = [];

            var pathTmp = {};
            pathTmp.ID = ''; // Temporary ID. Leave it empty so error message will not looks strange
            pathTmp.FROM_LOCATION = basicPath.FROM_LOCATION;
            pathTmp.TO_LOCATION = basicPath.TO_LOCATION;
            pathTmp.MTR = basicPath.MTR;
            pathTmp.CARRIER = basicPath.CARRIER;
            pathList.push(pathTmp);

            basicPath.CONNECTION.forEach(function(c){
                var pathConnectionTmp = {};
                pathConnectionTmp.PATH_ID = pathTmp.ID;
                pathConnectionTmp.SEQUENCE = c.SEQUENCE;
                pathConnectionTmp.FROM_LOCATION = c.FROM_LOCATION;
                pathConnectionTmp.TO_LOCATION = c.TO_LOCATION;
                pathConnectionTmp.DISTANCE = c.DISTANCE;
                pathConnectionTmp.DURATION = c.DURATION;
                pathConnectionTmp.STAY_TIME = c.STAY_TIME;
                pathConnectionTmp.CUTOFF_OFFSET=0;
                pathConnectionTmp.AVAILABILITY_OFFSET=0;
                pathConnectionList.push(pathConnectionTmp);
            });
            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            var result = proc(
                datasetId,
                pathList,
                pathConnectionList
            );
            connection.commit();
            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE; 
            } else {
               r.ID = null;
               r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.updatePath = function(datasetId, basicPath) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_path");

            var pathList = [];
            var pathConnectionList = [];

            var pathTmp = {};
            pathTmp.ID = basicPath.ID.toString();
            pathTmp.FROM_LOCATION = basicPath.FROM_LOCATION;
            pathTmp.TO_LOCATION = basicPath.TO_LOCATION;
            pathTmp.MTR = basicPath.MTR;
            pathTmp.CARRIER = basicPath.CARRIER;
            pathList.push(pathTmp);

            basicPath.CONNECTION.forEach(function(c){
                var pathConnectionTmp = {};
                pathConnectionTmp.PATH_ID = pathTmp.ID;
                pathConnectionTmp.SEQUENCE = c.SEQUENCE;
                pathConnectionTmp.FROM_LOCATION = c.FROM_LOCATION;
                pathConnectionTmp.TO_LOCATION = c.TO_LOCATION;
                pathConnectionTmp.DISTANCE = c.DISTANCE;
                pathConnectionTmp.DURATION = c.DURATION;
                pathConnectionTmp.STAY_TIME = c.STAY_TIME;
                pathConnectionTmp.CUTOFF_OFFSET=0;
                pathConnectionTmp.AVAILABILITY_OFFSET=0;
                pathConnectionList.push(pathConnectionTmp);
            });

            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            var result = proc(
                datasetId,
                pathList,
                pathConnectionList
            );

            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE; 
            } else {
               r.ID = null;
               r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };


    /**
     * Delete connection in the given dataset
     */
    this.deletePath = function(datasetId, pathId) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_delete_path");

            var result = proc(
                datasetId,
                [{ID: pathId}]
            );
            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };

            if (result.ID_MAP.length > 0){
                r.ID = result.ID_MAP[0].ID;
                r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE; 
            } else {
               r.ID = null;
               r.LOG = result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.calculatePathCost = function(networkCode, basicPath) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_calculate_basic_path_cost");

            var pathList = [];
            var pathConnectionList = [];

            var pathTmp = {};
            pathTmp.ID = 'P1'; // Temporary ID
            pathTmp.FROM_LOCATION = basicPath.FROM_LOCATION;
            pathTmp.TO_LOCATION = basicPath.TO_LOCATION;
            pathTmp.MTR = basicPath.MTR;
            pathTmp.CARRIER = basicPath.CARRIER;
            pathList.push(pathTmp);
            basicPath.CONNECTION   = basicPath.CONNECTION===undefined?null:basicPath.CONNECTION;
            basicPath.CONNECTION.forEach(function(c){
                var pathConnectionTmp = {};
                pathConnectionTmp.PATH_ID = pathTmp.ID;
                pathConnectionTmp.SEQUENCE = c.SEQUENCE;
                pathConnectionTmp.FROM_LOCATION = c.FROM_LOCATION;
                pathConnectionTmp.TO_LOCATION = c.TO_LOCATION;
                pathConnectionTmp.DISTANCE = c.DISTANCE;
                pathConnectionTmp.DURATION = c.DURATION;
                pathConnectionTmp.STAY_TIME = c.STAY_TIME;

                pathConnectionList.push(pathConnectionTmp);
            });

            var result = proc(
                networkCode,
                pathList,
                pathConnectionList
            );

            return {
                RETURN_CODE: result.RETURN_CODE,
                TRANSPORT_COST: (result.COST.length > 0? result.COST[0].TRANSPORT_COST:null),
                CURRENCY: (result.COST.length > 0? result.COST[0].CURRENCY:null),
                MESSAGE: result.MESSAGE
            };

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.createDepartureRule = function(pathId, cycleType, pattern, departureTime, timeZone) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_create_departure_rule");

            var result = proc(
                pathId,
                cycleType,
                pattern,
                departureTime,
                timeZone
            );

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.deleteDataset = function(datasetCode) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_delete_dataset");

            return proc(
                datasetCode,
                ''
            );

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.deleteNetwork = function(networkCode, withDataset) {

        var log = [];
        var message = [];

        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_delete_network");

            var result = proc(
                networkCode
            );

            if (!withDataset || result.RETURN_CODE !== 0){
                return result;
            }

            log.concat(result.LOG);
            message.concat(result.MESSAGE);

            result = this.deleteDataset(networkCode);

            if (result.RETURN_CODE === 0) {
                Object.keys(result.LOG).concat(log);
                Object.keys(result.MESSAGE).concat(message);
            }

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.deleteScenarioNetwork4Plan = function(simulationPlanId){

        var QUERY_SQL = 'SELECT p.code AS plan_code, s.code AS scenario_code ' +
        'FROM "sap.tm.trp.db.planningcockpit::t_scenario" AS s ' +
        'INNER JOIN "sap.tm.trp.db.planningcockpit::t_simulation_plan" AS p ' +
        'ON s.REL_SM_PLAN_ID = p.id WHERE p.id = ?';

        //var ps = this.connection.prepareStatement(QUERY_SQL);
        var scenarios = [];

        try {
            //ps.setBigInt(1, simulationPlanId);
            var rs = connection.executeQuery(QUERY_SQL,simulationPlanId);
            rs=rs.getIterator();
            while (rs.next()){
                var temp=rs.value();
                scenarios.push({
                    planCode: temp.PLAN_CODE,
                    scenarioCode: temp.SCENARIO_CODE
                });
            }

        } catch (e){
            throw e;
        } finally {
           // ps.close();
        }

        var log = [];
        var message = []; 
        var result;

        for (var i = 0; i < scenarios.length; i++){
            result = this.deleteNetwork(scenarios[i].planCode + '_' + scenarios[i].scenarioCode, true);

            if (result.RETURN_CODE === 0){
                log.concat(result.LOG);
                message.concat(result.MESSAGE);
            } else {
                return result;
            }

        }

        return {
            RETURN_CODE: 0,
            MESSAGE: message,
            LOG: log
        };
    };


    this.deleteDepartureRule = function(pathId, ruleNumber) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_delete_departure_rule");

            var result = proc(
                pathId,
                [{RULE_NUMBER: ruleNumber}]
            );

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.deleteDepartureRules = function(pathId, ruleNumbers) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_delete_departure_rule");

            var result = proc(
                pathId,
                ruleNumbers.map(function(number) {
                    return {
                        RULE_NUMBER: number
                    };
                })
            );

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };


    this.generateTrips = function(fromTime, toTime, pathId, ruleNumbers) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_generate_trip");

            var ruleNumberArray = ruleNumbers.map(function(a){
                return {
                    RULE_NUMBER: a
                };
            });

            var result = proc(
                fromTime,
                toTime,
                pathId,
                ruleNumberArray
            );

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.rollForwardDatasetTrip = function(fromTime, toTime, datasetCode) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_roll_forward_dataset_trip");

            return proc(
                fromTime,
                toTime,
                datasetCode
            );

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.updateTripCapacity = function(datasetCode, capacityList) {

        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_trip_capacity");

            return proc(
                datasetCode,
                capacityList
            );


        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    this.updatePathGlobalCapacity = function(datasetCode, pathId, capacity, capacityUoM) {

        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.dataset::p_update_path_global_capacity");

            return proc(
                datasetCode,
                pathId,
                capacity,
                capacityUoM
            );


        } catch (e) {
            // Handle exception later
            throw e;
        }
    };


    /**
     * Create composite path in the given dataset
     */
    this.createCompositePath = function(networkId, compositePath) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_create_composite_path");


            var pathList = [];
            var pathConnectionList = [];

            var tmpPathId = 1;
            pathList.push({
                EXTERNAL_ID : tmpPathId,  // Temporary ID
                FROM_LOCATION : compositePath.FROM_LOCATION,
                TO_LOCATION : compositePath.TO_LOCATION
            });

            compositePath.CONNECTION.forEach(function(c){
                var pathConnectionTmp = {};
                pathConnectionTmp.EXTERNAL_ID = tmpPathId;
                pathConnectionTmp.SEQUENCE = c.SEQUENCE;
                pathConnectionTmp.FROM_LOCATION = c.FROM_LOCATION;
                pathConnectionTmp.TO_LOCATION = c.TO_LOCATION;
                pathConnectionTmp.BASIC_PATH_ID = c.BASIC_PATH_ID;
                pathConnectionTmp.PATH_TYPE = c.PATH_TYPE;
                pathConnectionList.push(pathConnectionTmp);
            });

            var result = proc(
                networkId,
                pathList,
                pathConnectionList
            );
            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            
            if (result.ID_MAP.length > 0){
                //result.ID = result.ID_MAP[0].ID;
                r.ID=result.ID_MAP[0].ID;
                r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            } else {
               r.ID = null;
               r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }
            
            //delete result.ID_MAP;
            
            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };


    /**
     * Compute total distance, duration and cost for the given composite path
     */
    this.calculateCompositePathMeasure = function(networkCode, compositePath) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_calculate_composite_path_measure");


            var pathList = [];
            var pathConnectionList = [];

            var tmpPathId = -1;
            pathList.push({
                EXTERNAL_ID : tmpPathId,  // Temporary ID
                FROM_LOCATION : compositePath.FROM_LOCATION,
                TO_LOCATION : compositePath.TO_LOCATION
            });

            compositePath.CONNECTION.forEach(function(c){
                var pathConnectionTmp = {};
                pathConnectionTmp.EXTERNAL_ID = tmpPathId;
                pathConnectionTmp.SEQUENCE = c.SEQUENCE;
                pathConnectionTmp.FROM_LOCATION = c.FROM_LOCATION;
                pathConnectionTmp.TO_LOCATION = c.TO_LOCATION;
                pathConnectionTmp.BASIC_PATH_ID = c.BASIC_PATH_ID;
                pathConnectionTmp.PATH_TYPE = c.PATH_TYPE;
                pathConnectionList.push(pathConnectionTmp);
            });

            var tmp = proc(
                networkCode,
                pathList,
                pathConnectionList
            );

            var result = {
                RETURN_CODE: tmp.RETURN_CODE,
                MESSAGE: tmp.MESSAGE
            };

            if (tmp.RETURN_CODE === 0){
                result.TOTAL_DURATION = tmp.PATH_MEASURES[0].TOTAL_DURATION;
                result.TOTAL_DISTANCE = tmp.PATH_MEASURES[0].TOTAL_DISTANCE;
                result.TOTAL_COST = tmp.PATH_MEASURES[0].TOTAL_COST;
                result.COST_CURRENCY = tmp.PATH_MEASURES[0].COST_CURRENCY;
            } else {
                result.TOTAL_DURATION = null;
                result.TOTAL_DISTANCE = null;
                result.TOTAL_COST = null;
                result.COST_CURRENCY = null;
            }

            return result;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

    /**
     * Delete composite path in the given network model
     */
    this.deleteCompositePath = function(networkId, pathId) {
        try {
            var proc = connection.loadProcedure(
                "SAP_TM_ROUTING",
                "sap.tm.trp.routing.db.path::p_delete_composite_path");

            var result = proc(
                networkId,
                [{ID: pathId}]
            );
            var r={ID:[],
                LOG:[],
                MESSAGE:[],
                RETURN_CODE:''
            };
            if (result.ID_MAP.length > 0){
                r.ID = r.ID_MAP[0].ID;
                r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            } else {
               r.ID = pathId;
               r.LOG=result.LOG;
                r.MESSAGE=result.MESSAGE;
                r.RETURN_CODE=result.RETURN_CODE;
            }

            //delete result.ID_MAP;

            return r;

        } catch (e) {
            // Handle exception later
            throw e;
        }
    };

}

var Routing = (function() {
    return function(conn) {
        return new RoutingService(conn);
    };
}());
