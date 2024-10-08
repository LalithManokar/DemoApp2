var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");
var bundleLib = $.import("sap.hana.xs.i18n", "text");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var bundle = bundleLib.loadBundle("sap.tm.trp.service.xslib", "messages");
var tmCon = $.import("/sap/tm/trp/service/routing/connector.xsjslib");
var calculate = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");

var UNRESTRICTED_READ_PREVILEGE = "sap.tm.trp.service::UnrestrictedRead";
var UNRESTRICTED_WRITE_PREVILEGE = "sap.tm.trp.service::UnrestrictedWrite";

var availabilityCheckService = new lib.SimpleRest({
    name: "AvailabilityCheck",
    desc: "availability check service"
});

/**
 * Builds the text message based on message id and arguments
 */
function buildTextMessage(messages) {
    var messageResult = {};

    messageResult.success = true;
    messageResult.messages = [];
    for(let i = 0; i < messages.length; i++) {
        var text = bundle.getText(
            messages[i].MESSAGE_ID, {
                0: messages[i].VAR0,
                1: messages[i].VAR1,
                2: messages[i].VAR2,
                3: messages[i].VAR3,
                4: messages[i].VAR4
            });

        if (messages[i].SEVERITY === 'E') {
            messageResult.success = false;
        }

        messageResult.messages.push({
            SEVERITY: messages[i].SEVERITY,
            MESSAGE: text
        });
    }

    return messageResult;
}


/**
 * Execute streeturn optimization
 *
 */
function executeStoredProcedure(request) {

	var conn, executeSP, messageResult, spResult;
    //var perf_check;
    
    //conn = $.db.getConnection();//$.db.isolation.READ_COMMITTED
    conn = $.hdb.getConnection();
    conn.setAutoCommit(false);
    
    //perf_check = conn.loadProcedure('TRPADM', 'ZTEST_PACKAGE::zperfom_statistics');      
    //perf_check('eac_xsjs_start');

    // Run optimization
    /*
    executeSP = new proc.procedure(
        constants.SCHEMA_NAME,
        "sap.tm.trp.db.availabilitycheck::p_check_availability", {
            connection: conn
        }
    );
    */
    executeSP = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.availabilitycheck::p_check_availability");
    //perf_check('eac_procedure_loaded');
    
    spResult = executeSP(
        request.locationNo,
        request.equipType,
        request.time,
        request.quantity,
        request.requestCheckType);
    //perf_check('eac_procedure_executed');
    
    spResult.RESULT = spResult.T_RESULT;

    if (spResult.T_MESSAGE && spResult.T_MESSAGE.length > 0) {
        messageResult = buildTextMessage(spResult.T_MESSAGE);
        spResult.SUCCESS = messageResult.success;
        spResult.MESSAGES = messageResult.messages;
        //delete (spResult.T_MESSAGE);
    } else {
        spResult.SUCCESS = true;
    }

    //delete (spResult.T_RESULT);
    var spResultNew = {};
    spResultNew.RESULT = spResult.RESULT;
    spResultNew.MESSAGES = spResult.MESSAGES;
    spResultNew.SUCCESS = spResult.SUCCESS;
    //perf_check('eac_xsjs_end');
    conn.commit();
    conn.close();
    return spResultNew;
}

function getTUCost(locationRuleId, selectedTU){
    var connection = $.db.getConnection();

    function getLocationList(locationRuleId, selectedTU) {
        var locationList = new proc.procedure("SAP_TM_TRP",
                "sap.tm.trp.db.eac::p_eac_get_location_equip_type", {
                    connection : connection
                });
        var result = locationList(locationRuleId, selectedTU);
        return result;
    }

    function getMissingCost(locationRuleId, selectedTU, laneList, carrierList) {
        var prepare = new proc.procedure("SAP_TM_TRP",
                "sap.tm.trp.db.eac::p_eac_prepare_info_for_cost", {
                    connection : connection
                });
        var result = prepare(locationRuleId, selectedTU, laneList, carrierList);
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
            throw new lib.InternalError(bundle.MSG_ERROR_GET_TM_CONNECTION,
                    tmResult.success);
        }
        //get the missing cost info
        var costInfo = getMissingCost(locationRuleId, selectedTU, basicConnection,
                connectionCarrier);
        var datasetConnectionInfo = costInfo.DATASET_CONNECTION_INFO;
        var costDatasetData = costInfo.MISSING_COST;
        var missingFilter = costInfo.MISSING_FILTER_MESSAGE;
        var lane = costInfo.LANE_OUTPUT;

        //add judgment about missing filter&missing cost
        if (missingFilter.length > 0) {
            throw new lib.InternalError(bundle.MSG_ERROR_FILTER_MISSING,
                    missingFilter);
        }

        if (costDatasetData.length > 0) {
            //call TM and update the data into the database
            calculate.replicateTransportCostFromTM(connection,
                    costModelId, datasetConnectionInfo, costDatasetData);
        }
        return lane;
    } catch (e) {
        connection.rollback();
        logger.error("MSG_UPDATE_COST_DATA_SOURCE_FAILED", locationRuleId, e);
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(
            bundle.MSG_ERROR_GET_MISSING_COST_FROM_TM, e);
    } finally {
        if (connection) {
            connection.commit(); // write down the log anyway
            connection.close();
        }
    }

}

function executeEquipmentAvailablityProc(ruleSetID, item) {
    var conn, executeEACproc, outputEAC = { MESSAGE: [] }, lane = [], errorMessage = {};
 
   try {
       lane = getTUCost(ruleSetID, item);
       conn = $.db.getConnection();
       conn.setAutoCommit(false);
   
       executeEACproc = new proc.procedure(
           constants.SCHEMA_NAME,
           "sap.tm.trp.db.eac::p_eac_main_check", {
               connection: conn
           });
   
       outputEAC = executeEACproc(ruleSetID, item, lane); 
   
   } catch (e) {
       //errorMessage.message = e.message;
       //errorMessage.cause = e.cause;
       
       var error = {SEVERITY: "E", MESSAGE:e.cause.message };
       outputEAC.MESSAGE.push(error);
   }
   
   return outputEAC;
}

availabilityCheckService.checkEquipmentAvailability = function (params) {

    var ruleSetName = params.obj.HEADER.RULESET_ID, ruleSetID, errorItem = {}, itemOut = [], message = [] ;
    var checkValidRuleSetID, isValidRuleSet, result = { MESSAGE:[ ] }, conn, sql, rs, connection;

    try{
        // Check if the ruleset exists or not?
        if (!ruleSetName) {
            var error = {SEVERITY: "E", MESSAGE: bundle.getText("MSG_RULESET_ID_MISSING") };
            result.MESSAGE.push(error);
            return result;
        }
        
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        sql = "SELECT ID FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE RULE_NAME=?";
        
        rs = conn.executeQuery(sql, ruleSetName);
        if (rs.length === 0) {
            error = {SEVERITY: "E", MESSAGE: bundle.getText("MSG_RULESET_ID_INVALID") };
            result.MESSAGE.push(error);
            return result;
        }

        ruleSetID = rs[0].ID;

        connection = $.db.getConnection();
        
        checkValidRuleSetID = new proc.procedure(
            constants.SCHEMA_NAME,
            "sap.tm.trp.db.pickupreturn::p_location_ruleset_info", {
                connection: connection
            }
        );

        isValidRuleSet = checkValidRuleSetID(ruleSetID);

        if (isValidRuleSet.RULE_TYPE !== 1){
            // Raise error
            error = {SEVERITY: "E", MESSAGE: bundle.getText("MSG_RULESET_ID_NOT_PICKUP") };
            result.MESSAGE.push(error);
            return result;
        }

        if(isValidRuleSet.OPTIMIZATION_SETTING_TYPE === 4){
            error = {SEVERITY: "E", MESSAGE: bundle.getText("MSG_OP_TYPE_IS_NONE") };
            result.MESSAGE.push(error);
            return result;
        }
        
        //if (!result.MESSAGE.length && !result.MESSAGE[0].MESSAGE) {
        var item = params.obj.ITEM.filter( function(row){
            if(row.EP_SRC_LOC_ID && row.EP_DEST_LOC_ID && row.RESOURCE_TYPE){
                return true;
            }
            else{
                errorItem.TU_ID = row.TU_ID;
                errorItem.TU_KEY = row.TU_KEY;
                errorItem.EP_SRC_LOC_ID = row.EP_SRC_LOC_ID;
                errorItem.EP_DEST_LOC_ID = row.EP_DEST_LOC_ID;
                errorItem.RESOURCE_TYPE = row.RESOURCE_TYPE;
                errorItem.AVAILABLE_QUAN = row.QUANTITY;
                errorItem.CALC_PICKUP_DATE = row.PICKUP_DATE;
                errorItem.SEVERITY = 'E';
                
                if(!row.EP_SRC_LOC_ID){
                    errorItem.MESSAGE = bundle.getText("MSG_SRC_LOC_MISSING");
                }
                
                if(!row.EP_DEST_LOC_ID){
                    errorItem.MESSAGE = bundle.getText("MSG_DEST_LOC_MISSING");
                }
                
                if(!row.RESOURCE_TYPE){
                    errorItem.MESSAGE = bundle.getText("MSG_RES_TYP_MISSING");
                }
                
                itemOut.push(errorItem);
            }
        } );
        result = executeEquipmentAvailablityProc(ruleSetID, item);
        //}
    } catch(e){
        logger.error("AVAILABILITY_CHECK_FAILED",
            params,
            e
        );
        throw new lib.InternalError(e);
    }
    
    if(itemOut.length !== 0){
        if (result.hasOwnProperty('ITEMREQ_RESULT')){
                error = {SEVERITY: "E", MESSAGE: bundle.getText("MSG_ITEM_INFO_MISSING") };
            message.push(error);
            result.MESSAGE = message;
            result.ITEMREQ_RESULT = result.ITEMREQ_RESULT.concat(itemOut);
        }
    }
    return result;
}

/**
 *  Request handling starts here.
 *  Existing framework not used due to some mismatch.
 *  Check to see whether it can be enhanced to support message handling.
 */
availabilityCheckService.check = function (params) {
    var result = {};
    result.SUCCESS = true;
    result.MESSAGES = [];
    try {

        var locationNo = $.request.parameters.get("location_no");
        if (!locationNo) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_LOCATION_NO_MISSING")
            });
        }

        var equipType = $.request.parameters.get("equip_type");
        if (!equipType) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_EQUIP_TYPE_MISSING")
            });
        }

        var quantityText = $.request.parameters.get("quantity");
        if (!quantityText) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_QUANTITY_MISSING")
            });
        }

        var quantity;

        try {
            quantity = parseInt(quantityText, 10);
        } catch (e) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_QUANTITY_INVALID", {
                    0: quantityText
                })
            });
        }

        if (quantity <= 0) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_QUANTITY_INVALID", {
                    0: quantity
                })
            });
        }

        var timestampText = $.request.parameters.get("time");
        if (!timestampText) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_TIME_MISSING")
            });
        }

        var time;

        time = new Date(timestampText);
        if (time.toString() === 'Invalid Date') {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_TIME_INVALID", {
                    0: timestampText
                })
            });
        }

        var requestCheckType = $.request.parameters.get("request_check_type");
        if (!requestCheckType) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_REQUEST_CHECK_TYPE_MISSING")
            });
        }

        if (!result.MESSAGES || result.MESSAGES.length === 0) {
            result = executeStoredProcedure(
                {
                    locationNo: locationNo,
                    equipType: equipType,
                    time: time,
                    quantity: quantity,
                    requestCheckType: requestCheckType
                }
            );
        } else {
            result.SUCCESS = false;
        }
        logger.success("AVAILABILITY_CHECK", params);
    } catch (e) {
        logger.error("AVAILABILITY_CHECK_FAILED",
            params,
            e
        );
        throw new lib.InternalError(e);
    }

    return result;
};

// Customized template to reutrn the result with success flag set
availabilityCheckService.template = function (obj) {
    var response = {};
    if (obj instanceof Error) {
        response.SUCCESS = false;
        response.MESSAGES = (obj.hasOwnProperty("cause") && Array.isArray(obj.cause) ? obj.cause : [obj.message || obj.cause]).map(function (i, d, a) {
            return {
                type: "ERROR",
                message: typeof i === "string" ? i : i.message,
                args: i.args
            };
        });
    } else {
        response = obj;
    }

    return response;
};

availabilityCheckService.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "check"
}]);

availabilityCheckService.setRoutes([{
    method: $.net.http.POST,
    scope: "member",
    action: "checkEquipmentAvailability"
}]);

try {
    availabilityCheckService.handle();
} finally {
    logger.close();
}
