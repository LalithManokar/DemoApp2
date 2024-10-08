var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remote.xsjslib").RemoteClient;
var bundleLib = $.import("sap.hana.xs.i18n", "text");
// If application language is not specified, use default language
var bundle = bundleLib.loadBundle("sap.tm.trp.service.xslib", "messages", $.application.language || 'en');

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_COSTMODEL;
var DATASET_DISTANCE_BASED_COST = 'DISTANCE_BASED_COST';
var DATASET_LOCATION_BASED_COST = 'LOCATION_BASED_COST';
var UOM_TEU = 'TEU';
var CONNECT_TYPE_TCM = 'TCM';

// Cache the default equip type
var baseResourceType = '';
function getBaseResourceType(dbConnection, costDatasetId){
	var QUERY_BASE_RESOURCE_TYPE_SQL = 'SELECT BASE_RESOURCE_TYPE FROM "sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings" s ' +
	'INNER JOIN "sap.tm.trp.db.costmodel::t_cost_dataset" c ON s.code = c.resource_category WHERE c.id = ?';
	
    if (!baseResourceType) {
        var ps = dbConnection.prepareStatement(QUERY_BASE_RESOURCE_TYPE_SQL);
        try{
			ps.setBigInt(1, costDatasetId);
            var rs = ps.executeQuery();

            if (rs.next()){
                baseResourceType = rs.getString(1);
            }

            if (!baseResourceType){
                throw new lib.InternalError(messages.MSG_ERROR_COST_CALCULATION, bundle.getText(
                    'MSG_BASE_EQUIP_TYPE_NOT_CONFIGURED'));
            }
        } catch (e) {
            throw e;
        } finally {
            ps.close();
        }
    }

    return baseResourceType;
}

function getConnectionCostFromTM(costModelId, costSetting, basicConnection, dbConnection) {
    if (!costSetting || !basicConnection || basicConnection.length === 0){
        return [];
    }

    getBaseResourceType(dbConnection, costSetting.ID);

    var requestObject = {};
    var connectionMap ={};
    requestObject.TRP_DATASET_ID = costSetting.ID;
    requestObject.REQUEST_TYPE = costSetting.CONNECTION_TYPE_CODE;
    requestObject.FA_ID = costSetting.AGREEMENT_ID;
    requestObject.PURCHASE_ORG = costSetting.PURCHASE_ORG_ID;
    requestObject.COST_PROF_ID = costSetting.PROFILE_ID;
    requestObject.CURRENCY = costSetting.CURRENCY_CODE;
    // Check the meaning of UOM
    //requestObject.UOM = costSetting.DEFAULT_UOM_CODE;
    requestObject.CONNECTIONS = basicConnection.map(function(c, index){
        connectionMap[index.toString()] = c;
        // Use base equip type in following conditions:
        // 1. Connection has TEU as Uom
        // 2. Connection has no UoM assigned and default UoM is TEU
        return {
            CONN_ID: index.toString(),
            LOC_FROM: (c.LOCATION_FROM !== '*'?c.LOCATION_FROM:''),
            LOC_TO: (c.LOCATION_TO !== '*'?c.LOCATION_TO:''),
            MTR: (c.MTR!== '*'?c.MTR:''),
            CARRIER: (c.CARRIER !== '*'?c.CARRIER:''),
            EQUI_GROUP: (c.EQUIP_GROUP !== '*'?c.EQUIP_GROUP:''),
            EQUI_TYPE: c.UOM_CODE === UOM_TEU || (!c.UOM_CODE && costSetting.DEFAULT_UOM_CODE === UOM_TEU)? baseResourceType:c.RESOURCE_TYPE
        };
    });

    var responseObject = [];
	var settings = {
		url : '/sap/bc/rest_trp/network_cost',
        method : $.net.http.POST,
        data : {REQUEST: requestObject},
        success : function(data) {
            if (data && data.RESULT && data.RESULT.COSTS){
                data.RESULT.COSTS.forEach(function(c){
                    // Remove leading 0
                    var index = c.CONN_ID.replace(/^0+/, '');
                    var obj = connectionMap[index?index:'0'];
                    obj.COST = c.COSTS;
                    //obj.UOM_CODE = requestObject.UOM;
                    // Should we copy the object
                    responseObject.push(obj);
                });
            }
        },
        error : function(data) {
        	try{
				var message = data.body ? JSON.parse(data.body.asString()).MESSAGE : [{MESSAGE: data.status}];
				var text = (message || []).map(function(m){
				    return m.MESSAGE;
				}).join(' ');
				throw new lib.InternalError(messages.MSG_ERROR_COST_CALCULATION, text);
		    } catch (e) {
                throw new lib.InternalError(messages.MSG_ERROR_COST_CALCULATION, data.body ? data.body.asString() : '');
            }
        }
	};

	var remote = new RemoteClient();
	remote.request(settings);

	return responseObject;
}

function upsertDistanceBasedCost(conn, datasetId, cost){
    var procName, procedure;
    var costInput = cost.map(function(c){
        c.WILD_STAR_COUNT = 0;
        if (c.CARRIER_ID === '*'){
            c.WILD_STAR_COUNT += 1;
        }

        if (c.TRANSPORTATION_MODE_CODE === '*'){
            c.WILD_STAR_COUNT += 1;
        }

        if (c.RESOURCE_TYPE=== '*'){
            c.WILD_STAR_COUNT += 1;
        }
        return c;
    });
	try {
		procName = PACKAGE + "::sp_distance_based_cost_connection_result_upsert";
		procedure = new proc.procedure(SCHEMA, procName, {
			connection : conn
		});
		procedure(datasetId, costInput);
	} catch(e) {
	    // To-do: fix the log
		logger.error(
            "COST_MODEL_GET_TRANSPORTATION_COST_FAILED",
            datasetId,
            e.toString()
        );
		throw new lib.InternalError("MSG_ERROR_GET_COST_MODEL", e);
	}
}

function getCostModel(conn, costModelId){
    var procName, procedure;
	try {
		procName = PACKAGE + "::sp_cost_model_get";
		procedure = new proc.procedure(SCHEMA, procName, {
			connection : conn
		});
		var result = procedure(costModelId);
		if (result.COST_MODEL.length > 0){
		    return result.COST_MODEL[0];
		} else {
		    return {};
		}
	} catch(e) {
	    // To-do: fix the log
		logger.error(
            "COST_MODEL_GET_META_DATA_FAILED",
            costModelId,
            e.toString()
        );
		throw new lib.InternalError("MSG_ERROR_GET_DATA_SOURCE_BY_COST_MODEL", e);
	}
}

function upsertLocationBasedCost(conn, datasetId, cost) {
    var procName, procedure;

    var costInput = cost.map(function(c){
        c.WILD_STAR_COUNT = 0;
        if (c.CARRIER_ID === '*'){
            c.WILD_STAR_COUNT += 1;
        }

        if (c.TRANSPORTATION_MODE_CODE === '*'){
            c.WILD_STAR_COUNT += 1;
        }

        if (c.RESOURCE_TYPE=== '*'){
            c.WILD_STAR_COUNT += 1;
        }
        return c;
    });

	try {
		procName = PACKAGE + "::sp_location_based_cost_connection_result_upsert";
		procedure = new proc.procedure(SCHEMA, procName, {
			connection : conn
		});
		procedure(datasetId, costInput);
	} catch(e) {
	    // To-do: fix the log
		logger.error(
            "COST_MODEL_UPDATE_LOCATION_BASED_COST_FAILED", datasetId, e);
		throw new lib.InternalError("MSG_ERROR_GET_DATA_SOURCE_BY_COST_MODEL", e);
	}
}

// Find a place to put it
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)){
            return false;
        }
    }

    return true;
}

function replicateDistanceBasedTransportCostFromTM(conn, costModelId, costDatasetList, missingCost){

    if (!costDatasetList || !missingCost || missingCost.length === 0){
        return {
           RETURN_CODE: 0,
           MESSAGE: []
        };
    }

    costDatasetList.sort(function(a, b){
        return a.PRIORITY - b.PRIORITY;
    });

    // Build the map by key
    var map = {};
    var zeroCostMap = {};
    
    missingCost.forEach(function(c){
        var key = c.TRANSPORTATION_MODE_CODE + '_' + c.RESOURCE_TYPE + '_' + c.CARRIER_ID;
        c.COST_DATASET_ID = c.COST_DATASET_ID.split(',');
        map[key] = c;
    });

    // Loop through the dataset and fill the missing cost
    var index = 0;

    while (!isEmpty(map) && index < costDatasetList.length){

        // Calculate cost for remaning items
        var costRequest = [];
        for (var k in map){
            if (map.hasOwnProperty(k)){
                var c = map[k];
                if (c.COST_DATASET_ID.indexOf(costDatasetList[index].ID.toString()) !== -1 ){
                    costRequest.push({
                        LOCATION_FROM: '*',
                        LOCATION_TO: '*',
                        MTR: c.TRANSPORTATION_MODE_CODE,
                        CARRIER:c.CARRIER_ID,
                        EQUIP_GROUP: c.RESOURCE_CATEGORY,
                        RESOURCE_TYPE: c.RESOURCE_TYPE
                    });
                }
            }
        }

        var cost = getConnectionCostFromTM(costModelId, costDatasetList[index], costRequest, conn);

        var costToSave = [];

        if (cost && cost.length > 0){
            // Remove the cost from missing list
            cost.forEach(function(c){
                var key = c.MTR + '_' + c.RESOURCE_TYPE + '_' + c.CARRIER;
                var obj = map[key];
                obj.UOM_CODE = costDatasetList[index].DEFAULT_UOM_CODE;
                obj.COST = c.COST;
                if (costDatasetList[index].DEFAULT_UOM_CODE === UOM_TEU){
                    obj.RESOURCE_TYPE = '*';
                }
                if (obj.COST === 0 && costDatasetList[index].CONNECTION_TYPE_CODE === CONNECT_TYPE_TCM) {
                    zeroCostMap[key] = obj;
                }
                else {
                    costToSave.push(obj);
                    delete map[key];
                }
            });

            // Save the cost. Check if this can be postponed
            upsertDistanceBasedCost(conn, costDatasetList[index].ID, costToSave);
        }

        index += 1;
    }

    if (!isEmpty(map)){
        var message = [];
        for(var prop in map) {
            if(map.hasOwnProperty(prop)){
                if (zeroCostMap[prop] !== undefined) {
                    message.push({
                        SEVERITY: 'E',
                        MESSAGE: bundle.getText(
                            'MSG_ZERO_COST_RETURN_FROM_TM_DISTANCE_BASED_COST',
                            {
                                0: map[prop].RESOURCE_TYPE,
                                1: map[prop].TRANSPORTATION_MODE_CODE,
                                2: map[prop].CARRIER_ID
                            }
                        )
                    });
                }

                else {
                    message.push({
                        SEVERITY: 'E',
                        MESSAGE: bundle.getText(
                            'MSG_FAILED_TO_CALCULATE_DISTANCE_BASED_COST',
                            {
                                0: map[prop].RESOURCE_TYPE,
                                1: map[prop].TRANSPORTATION_MODE_CODE,
                                2: map[prop].CARRIER_ID
                            }
                        )
                    });
                }
            }
        }
        
        // Cost model should exist or dirty data otherwise
        var costModel = getCostModel(conn, costModelId);
        message.push({
            SEVERITY: 'E',
            MESSAGE: bundle.getText(
                'MSG_COST_MISSING_IN_COST_MODEL',
                {
                    0: (costModel.NAME ? costModel.NAME: '')
                }
            )
        });
        
        return {
            RETURN_CODE: 1,
            MESSAGE: message
        };
    } else {
        return {
           RETURN_CODE: 0,
           MESSAGE: []
        };
    }
}

function replicateTransportCostFromTM(conn, costModelId, costDatasetList, missingCost){

    if (!costDatasetList || !missingCost || missingCost.length === 0){
        return {
           RETURN_CODE: 0,
           MESSAGE: []
        };
    }

    costDatasetList.sort(function(a, b){
        return a.PRIORITY - b.PRIORITY;
    });

    // Build the map by key
    var map = {};
    var zeroCostMap = {};

    missingCost.forEach(function(c){
        var key = c.FROM_LOCATION_NAME + '_' + c.TO_LOCATION_NAME + '_'
        + c.TRANSPORTATION_MODE_CODE + '_' + c.RESOURCE_TYPE + '_' + c.CARRIER_ID;
        c.COST_DATASET_ID = c.COST_DATASET_ID.split(',');
        map[key] = c;
    });

    // Loop through the dataset and fill the missing cost
    var index = 0;

    while (!isEmpty(map) && index < costDatasetList.length){

        // Calculate cost for remaning items
        var costRequest = [];
        for (var k in map){
            if (map.hasOwnProperty(k)){
                var c = map[k];
                if (c.COST_DATASET_ID.indexOf(costDatasetList[index].ID.toString()) !== -1 ){
                    costRequest.push({
                        LOCATION_FROM: c.FROM_LOCATION_NAME,
                        LOCATION_TO: c.TO_LOCATION_NAME,
                        MTR: c.TRANSPORTATION_MODE_CODE,
                        CARRIER:c.CARRIER_ID,
                        EQUIP_GROUP: c.RESOURCE_CATEGORY,
                        RESOURCE_TYPE: c.RESOURCE_TYPE
                    });
                }
            }
        }

        if (costRequest.length > 0) {
            var cost = getConnectionCostFromTM(costModelId, costDatasetList[index], costRequest, conn);

            var costToSave = [];
            if (cost){
                // Remove the cost from missing list
                cost.forEach(function(c){
                    var obj = {
                        TRANSPORTATION_MODE_CODE: c.MTR,
                        RESOURCE_TYPE: costDatasetList[index].DEFAULT_UOM_CODE === UOM_TEU ? '*' : c.RESOURCE_TYPE,
                        CARRIER_ID:c.CARRIER,
                        UOM_CODE: costDatasetList[index].DEFAULT_UOM_CODE,
                        COST: c.COST,
                        WILD_STAR_COUNT:0,
                        FROM_LOCATION_NAME: c.LOCATION_FROM,
                        TO_LOCATION_NAME: c.LOCATION_TO
                    };

                    if (costDatasetList[index].DEFAULT_UOM_CODE === UOM_TEU){
                        obj.RESOURCE_TYPE = '*';
                    }

                    var key = c.LOCATION_FROM + '_' + c.LOCATION_TO + '_'
                    + c.MTR + '_' + c.RESOURCE_TYPE + '_' + c.CARRIER;

                    if (obj.COST === 0 && costDatasetList[index].CONNECTION_TYPE_CODE === CONNECT_TYPE_TCM) {
                        zeroCostMap[key] = obj;
                    }
                    else {
                        delete map[key];
                        costToSave.push(obj);
                    }
                });
                // Save the cost. Check if this can be postponed
                if (costDatasetList[index].COST_TYPE_CODE === DATASET_DISTANCE_BASED_COST){
                    upsertDistanceBasedCost(conn, costDatasetList[index].ID, costToSave);
                } else if (costDatasetList[index].COST_TYPE_CODE === DATASET_LOCATION_BASED_COST){
                    upsertLocationBasedCost(conn, costDatasetList[index].ID, costToSave);
                }

            }
        }
        index += 1;
    }

    if (!isEmpty(map)){
        var message = [];
        for(var prop in map) {
            if(map.hasOwnProperty(prop)){
                if (zeroCostMap[prop] !== undefined) {
                    message.push({
                        SEVERITY: 'E',
                        MESSAGE: bundle.getText(
                            'MSG_ZERO_COST_RETURN_FROM_TM_LOCATION_BASED_COST',
                            {
                                0: map[prop].RESOURCE_TYPE,
                                1: map[prop].FROM_LOCATION_NAME,
                                2: map[prop].TO_LOCATION_NAME,
                                3: map[prop].TRANSPORTATION_MODE_CODE,
                                4: map[prop].CARRIER_ID
                            }
                        )
                    });
                }
                else {
                    message.push({
                        SEVERITY: 'E',
                        MESSAGE: bundle.getText(
                            'MSG_FAILED_TO_CALCULATE_LOCATION_BASED_COST',
                            {
                                0: map[prop].RESOURCE_TYPE,
                                1: map[prop].FROM_LOCATION_NAME,
                                2: map[prop].TO_LOCATION_NAME,
                                3: map[prop].TRANSPORTATION_MODE_CODE,
                                4: map[prop].CARRIER_ID
                            }
                        )
                    });
                }
            }
        }
        
        // Cost model should exist or dirty data otherwise
        var costModel = getCostModel(conn, costModelId);
        message.push({
            SEVERITY: 'E',
            MESSAGE: bundle.getText(
                'MSG_COST_MISSING_IN_COST_MODEL',
                {
                    0: (costModel.NAME ? costModel.NAME: '')
                }
            )
        });
        
        return {
            RETURN_CODE: 1,
            MESSAGE: message
        };
    } else {
        return {
           RETURN_CODE: 0,
           MESSAGE: []
        };
    }
}

function calculateCostFromTM(costModelId, costDataset, outdatedCost, conn){

    if (!outdatedCost || outdatedCost.length === 0){
        return;
    }

    var costRequest = [];

    outdatedCost.forEach(function(c){
		// ALL MTR will not be refreshed since it cannot be mapped to any TM MTR
		if (c.TRANSPORTATION_MODE_CODE !== '*') {
			costRequest.push({
				LOCATION_FROM: c.FROM_LOCATION_NAME?c.FROM_LOCATION_NAME:'*',
				LOCATION_TO: c.TO_LOCATION_NAME?c.TO_LOCATION_NAME:'*',
				MTR: c.TRANSPORTATION_MODE_CODE,
				CARRIER:c.CARRIER_ID,
				EQUIP_GROUP: c.RESOURCE_CATEGORY,
				RESOURCE_TYPE: c.RESOURCE_TYPE,
				UOM_CODE: c.UOM_CODE, // Keep the existing UoM Code
				WILD_STAR_COUNT: c.WILD_STAR_COUNT
			});
		}
    });


    var cost = getConnectionCostFromTM("", costDataset, costRequest, conn);

    var costToSave = [];

    if (cost){
        cost.forEach(function(c){
            var obj = {
                TRANSPORTATION_MODE_CODE: c.MTR,
                RESOURCE_TYPE: c.UOM_CODE === UOM_TEU ? '*' : c.RESOURCE_TYPE,
                CARRIER_ID:c.CARRIER,
                UOM_CODE: c.UOM_CODE,
                COST: c.COST,
                WILD_STAR_COUNT:c.WILD_STAR_COUNT
            };

            if (c.LOCATION_FROM){
                obj.FROM_LOCATION_NAME = c.LOCATION_FROM;
                obj.TO_LOCATION_NAME = c.LOCATION_TO
            }

            costToSave.push(obj);
        });
        
    }

    return costToSave;
}