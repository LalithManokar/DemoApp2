var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog(
        "pickupreturn/transportationunits");
var tmCon = $.import("/sap/tm/trp/service/routing/connector.xsjslib");
var calculate = $
        .import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");

var TU = function() {
    this.connection = $.hdb.getConnection();
    this.connection.setAutoCommit(false);
};

TU.prototype.execute = function(locationRuleGroupId, conn_pass) {
    if(conn_pass){
    	var connection = conn_pass;
    }
    else{
    	var connection = this.connection;
    }
	

    function getLocationList(locationRuleGroupId) {
        // var locationList = new proc.procedure("SAP_TM_TRP",
        //         "sap.tm.trp.db.pickupreturn.rulesetgroup::p_ext_get_location_equip_type_rulegroup", {
        //             connection : connection
        //         });
        var locationList1 = connection.loadProcedure(constants.SCHEMA_NAME,
                 [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup',
                                   'p_ext_get_location_equip_type_rulegroup'].join('::'));
        var result = locationList1(locationRuleGroupId);
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
                        CARRIER_ID : carrier.TSP_ID
                    });
                });
            }
        });

        return result;
    }

    var transferToArray = function(list) {
        var array = [];
        Array.from(list).forEach(function(item) {
            var value = item.LOCATION;
            array.push(value);
        });
        return array;
    };

    try {
    	var executionId = [];
        //get location list
        var locationList = getLocationList(locationRuleGroupId);
        var fromLocationArray = transferToArray(locationList.FROM_LOCATION_LIST);
        var toLocationArray = transferToArray(locationList.TO_LOCATION_LIST);
        executionId = locationList.EXECUTION_LIST;
        
        var basicConnection = [];
        var connectionCarrier = [];
        
        
        //check if FROM and TO locations are NULL
        if (fromLocationArray.length!=0 && toLocationArray.length!=0)
        {
        //get basicConnection&connectionCarrier
        var tmResult = tmCon.getDirectedConns(fromLocationArray,
                toLocationArray);
        if (tmResult.success) {
            var tmConnection = transformTMConnection(tmResult.data);
            // Find good way to control transaction later
            basicConnection = tmConnection.basicConnection;
            connectionCarrier = tmConnection.connectionCarrier;
        } else {
            //throw get connection failed
            throw new lib.InternalError(messages.MSG_ERROR_GET_TM_CONNECTION,
                    tmResult.success);
        }

        }
        return {basicConnection:basicConnection,
        	connectionCarrier:connectionCarrier,
        	executionId:executionId};   
    } catch (e) {
        connection.rollback();
        logger.error("MSG_UPDATE_COST_DATA_SOURCE_FAILED", locationRuleGroupId, e);
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(
                messages.MSG_ERROR_GET_MISSING_COST_FROM_TM, e);
    } finally {
        // if (this.connection) {
        //     this.connection.commit(); // write down the log anyway
        //     this.connection.close();
        // }
    }
}; 

function execute(locationRuleGroupId, conn_pass) {
    try {
        var tu = new TU();
        var lane = tu.execute(locationRuleGroupId, conn_pass);
        return lane;
    } finally {
        logger.close();
    }
}
