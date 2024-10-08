var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog(
        "pickupreturn/transportationunits");
var tmCon = $.import("/sap/tm/trp/service/routing/connector.xsjslib");
var calculate = $
        .import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');

var TU = function() {
    this.connection = $.db.getConnection();
    this.connection.setAutoCommit(false);
};

TU.prototype.execute = function(locationRuleId, selectedTU, conn_pass) {
    if(conn_pass){
    	var connection = conn_pass;
    }
    else{
    	var connection = this.connection;
    }
	

    function getLocationList(locationRuleId, selectedTU) {
        var locationList = new proc.procedure("SAP_TM_TRP",
                "sap.tm.trp.db.pickupreturn::p_ext_get_location_equip_type", {
                    connection : connection
                });
        var result = locationList(locationRuleId, selectedTU);
        return result;
    }

    function getMissingCost(locationRuleId, laneList, carrierList) {
        var prepare = new proc.procedure("SAP_TM_TRP",
                "sap.tm.trp.db.pickupreturn::p_ext_prepare_info_for_cost", {
                    connection : connection
                });
        var result = prepare(locationRuleId, laneList, carrierList);
        return result;
    }

    function transformTMConnection(tmConnection) {
        var result = {
            basicConnection : [],
            connectionCarrier : []
        };

        tmConnection.forEach(function(lane, index) {
            result.basicConnection.push({
                ID : index.toString(), // Be cautions, it cannot be empty
                FROM_LOCATION : lane.LOC_FROM,
                TO_LOCATION : lane.LOC_TO,
                MTR : lane.MTR,
                DISTANCE : lane.DISTANCE_KM,
                DURATION : lane.DURATION
            });

            if (lane.TSP) {
                lane.TSP.forEach(function(carrier) {
                    result.connectionCarrier.push({
                        CONNECTION_ID : index.toString(),
                        CARRIER : carrier.TSP_ID
                    });
                });
            }
        });

        return result;
    }

    var transferToArray = function(list) {
        var array = [];
        list.forEach(function(item) {
            var value = item.LOCATION;
            array.push(value);
        });
        return array;
    };

    try {
        //get location list
        var locationList = getLocationList(locationRuleId, selectedTU);
        var fromLocationArray = transferToArray(locationList.FROM_LOCATION_LIST);
        var toLocationArray = transferToArray(locationList.TO_LOCATION_LIST);
        var costModelId = locationList.COST_MODEL;
        var lane = [];
        
        //check if FROM and TO locations are NULL
        if (fromLocationArray.length!=0 && toLocationArray.length!=0)
        {
        //get basicConnection&connectionCarrier
        var tmResult = tmCon.getDirectedConns(fromLocationArray,
                toLocationArray);
        if (tmResult.success) {
            var tmConnection = transformTMConnection(tmResult.data);
            // Find good way to control transaction later
            var basicConnection = tmConnection.basicConnection;
            var connectionCarrier = tmConnection.connectionCarrier;
        } else {
            //throw get connection failed
            throw new lib.InternalError(messages.MSG_ERROR_GET_TM_CONNECTION,
                    tmResult.success);
        }
        //get the missing cost info
        var costInfo = getMissingCost(locationRuleId, basicConnection,
                connectionCarrier);
        var datasetConnectionInfo = costInfo.DATASET_CONNECTION_INFO;
        var costDatasetData = costInfo.MISSING_COST;
        var missingFilter = costInfo.MISSING_FILTER_MESSAGE;
        lane = costInfo.LANE_OUTPUT;

        //add judgment about missing filter&missing cost
        if (missingFilter.length > 0) {
            throw new lib.InternalError(messages.MSG_ERROR_FILTER_MISSING,
                    missingFilter);
        }

        if (costDatasetData.length > 0) {
            //call TM and update the data into the database
            calculate.replicateTransportCostFromTM(connection,
                    costModelId, datasetConnectionInfo, costDatasetData);
        }
        }
        return lane;   
    } catch (e) {
        this.connection.rollback();
        logger.error("MSG_UPDATE_COST_DATA_SOURCE_FAILED", locationRuleId, e);
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(
                messages.MSG_ERROR_GET_MISSING_COST_FROM_TM, e);
    } finally {
        if (this.connection) {
            this.connection.commit(); // write down the log anyway
            this.connection.close();
        }
    }
};

TU.prototype.getLaneOnly = function(locationRuleId){
	
		var connection = this.connection;
		var result = {};
	
	    var getLocationList = function(locationRuleId) {
	        var locationList = new proc.procedure("SAP_TM_TRP",
	        		"sap.tm.trp.db.streetturn::p_streetturn_get_locations", {
	                    connection : connection
	                });
	        var result = locationList(locationRuleId);
	        return result;
	    };
		
	 	var transferToArray = function(list) {
	        var array = [];
	        list.forEach(function(item) {
	            var value = item.LOCATION;
	            array.push(value);
	        });
	        return array;
	    };
	    
	    var transformTMConnection = function(tmConnection) {
	        var result = {
	            basicConnection : [],
	            connectionCarrier : []
	        };

	        tmConnection.forEach(function(lane, index) {
	            result.basicConnection.push({
	                ID : index.toString(), // Be cautions, it cannot be empty
	                FROM_LOCATION : lane.LOC_FROM,
	                TO_LOCATION : lane.LOC_TO,
	                MTR : lane.MTR,
	                DISTANCE : lane.DISTANCE_KM,
	                DURATION : lane.DURATION
	            });

	            if (lane.TSP) {
	                lane.TSP.forEach(function(carrier) {
	                    result.connectionCarrier.push({
	                        CONNECTION_ID : index.toString(),
	                        CARRIER : carrier.TSP_ID
	                    });
	                });
	            }
	        });

	        return result;
	    };
	    
	    try {
	    
    	   //get location list
            var locationList = getLocationList(locationRuleId);
    	    var fromLocationArray = transferToArray(locationList.FROM_LOCATION_LIST);
    	    var toLocationArray = transferToArray(locationList.TO_LOCATION_LIST);
        
            //check if FROM and TO locations are NULL
    	    if (fromLocationArray.length!=0 && toLocationArray.length!=0)
            {
    	    //get basicConnection&connectionCarrier
            var tmResult = tmCon.getDirectedConns(fromLocationArray,
                    toLocationArray);
            if (tmResult.success) {
                var tmConnection = transformTMConnection(tmResult.data);
                // Find good way to control transaction later
                result.basicConnection = tmConnection.basicConnection;
                result.connectionCarrier = tmConnection.connectionCarrier;
            } else {
                //throw get connection failed
                throw new lib.InternalError(messages.MSG_ERROR_GET_TM_CONNECTION,
                        tmResult.success);
            }
	        }
            return result;
        
        } catch (e) {

            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_GET_MISSING_COST_FROM_TM, e);
                
    } finally {
        if (this.connection) {
            this.connection.close();
        }
    }
}; 

function execute(locationRuleId, selectedTU, conn_pass) {
    try {
        var tu = new TU();
        var lane = tu.execute(locationRuleId, selectedTU, conn_pass);
        return lane;
    } finally {
        logger.close();
    }
}

function getLaneOnly(locationRuleId){
	
    var tu = new TU();
    return tu.getLaneOnly(locationRuleId);
    
}