var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");
var bundleLib = $.import("sap.hana.xs.i18n", "text");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var calculation = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");

var bundle = bundleLib.loadBundle("sap.tm.trp.service.xslib", "messages");

var EXECUTE_STREETTURN_OPTIMIZATION_PREVILEGE = "sap.tm.trp.service::ExecuteStreetturnOptimization";
var UNRESTRICTED_READ_PREVILEGE = "sap.tm.trp.service::UnrestrictedRead";
var UNRESTRICTED_WRITE_PREVILEGE = "sap.tm.trp.service::UnrestrictedWrite";

var streetturnService = new lib.SimpleRest({
    name: "Streetturn",
    desc: "streetturn optimization service"
});

/**
 * Builds the text message based on message id and arguments
 */
function buildTextMessage(messages) {
    var messageResult = {};

    messageResult.success = true;
    messageResult.messages = [];
    messages.forEach(function(message) {
        var text = bundle.getText(
            message.MESSAGE_ID, {
                0: message.VAR0,
                1: message.VAR1,
                2: message.VAR2,
                3: message.VAR3,
                4: message.VAR4
            });

        if (message.SEVERITY === 'E') {
            messageResult.success = false;
        }

        messageResult.messages.push({
            SEVERITY: message.SEVERITY,
            MESSAGE: text
        });
    });

    return messageResult;
}

/**
 * Log messages
 * @messages - message list
 **/
function logMessages(messages) {
    messages.forEach(function(message) {
        switch (message.SEVERITY) {
            case 'E':
                logger.error(
                    "STREETTURN_MESSAGE",
                    message.MESSAGE
                );
                break;
            case 'W':
                logger.warn(
                    "STREETTURN_MESSAGE",
                    message.MESSAGE
                );
                break;
            case 'I':
                logger.info(
                    "STREETTURN_MESSAGE",
                    message.MESSAGE
                );
                break;
            default:
                logger.success(
                    "STREETTURN_MESSAGE",
                    message.MESSAGE
                );
                break;
        }
    });
}


/**
 * Execute streetturn optimization
 *
 */
function execute(pickupRuleId, returnRuleId) {

    var streetTurnResult = {
        SUCCESS: true
    };

    var conn, executeSP, spResult;
    var pickupCostModelId, returnCostModelId, equipTypes;
    var pickupLocationPairs, returnLocationPairs, customerLocationPairs;
    var messageResult;

    // Should we get SQLCC connection?
    conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
    conn.setAutoCommit(false);

    executeSP = new proc.procedure(
        constants.SCHEMA_NAME,
        'sap.tm.trp.db.streetturn::p_ext_get_location_equip_type', {
            connection: conn
    });

    spResult = executeSP(pickupRuleId, returnRuleId);

    logger.success("STREET_TURN_OPTIMIZE_GET_LOC_RES_SUCCESS",
            JSON.stringify(spResult.T_MESSAGE));
    /**
     * Result contains
     * 1. PICKUP_COST MODEL ID, RETURN_COST_MODEL_ID
     * 2. EQUIPMENT TYPE LIST
     * 3. PICKUP LOCATION PAIRS LIST
     * 4. RETURN LOCATION PAIRS LIST
     * 5. CUSTOMER LOCATION PAIRS LIST
     */

    if (spResult.T_MESSAGE && spResult.T_MESSAGE.length > 0) {
        messageResult = buildTextMessage(spResult.T_MESSAGE);
        streetTurnResult.SUCCESS = messageResult.success;
        streetTurnResult.MESSAGES = messageResult.messages;
        if (!streetTurnResult.success) {
            return streetTurnResult;
        }
    }

    // Cost model ID must not be empty
    // Assertion is preferred here
    pickupCostModelId = spResult.T_COST_MODEL_ID[0].ID;
    returnCostModelId = spResult.T_COST_MODEL_ID[0].ID;
    equipTypes = spResult.T_EQUIP_TYPE.map(function(equipType) {
        return {
            ID: equipType.EQUIP_TYPE
        };
    });

    pickupLocationPairs = spResult.T_PICKUP_LOCATION_PAIR.map(function(locationPair) {
        return {
            FROM_LOC: locationPair.LOCATION_ID_1,
            TO_LOC: locationPair.LOCATION_ID_2
        };
    });

    returnLocationPairs = spResult.T_RETURN_LOCATION_PAIR.map(function(locationPair) {
        return {
            FROM_LOC: locationPair.LOCATION_ID_1,
            TO_LOC: locationPair.LOCATION_ID_2
        };
    });
    customerLocationPairs = spResult.T_CUSTOMER_LOCATION_PAIR.map(function(locationPair) {
        return {
            FROM_LOC: locationPair.LOCATION_ID_1,
            TO_LOC: locationPair.LOCATION_ID_2
        };
    });

    // Location pairs are necessary
    if (!pickupLocationPairs || pickupLocationPairs.length === 0 || !returnLocationPairs || returnLocationPairs.length === 0) {
        logger.warn("STREET_TURN_OPTIMIZE_LOCATION_PAIRS_EMPTY",
                pickupLocationPairs,
                returnLocationPairs);

        return streetTurnResult;
    }

    var locationIds = [];

    // How can we get lane MTR?
    var options = {
        FROM_TIME: new Date(), // From now
        TO_TIME: null,         // Not used for lane
        SCHED_MTR: [],
        LANE_MTR: ['0001']
    };

    spResult.T_PICKUP_LOCATION_PAIR.forEach(function(locationPair) {
        locationIds.push(locationPair.LOCATION_ID_1);
        locationIds.push(locationPair.LOCATION_ID_2);
    });

    spResult.T_CUSTOMER_LOCATION_PAIR.forEach(function(locationPair) {
        locationIds.push(locationPair.LOCATION_ID_1);
        locationIds.push(locationPair.LOCATION_ID_2);
    });

    // conn, costModelId, networkResult, locationId, locationPairs, equipmentId, options
    // Calculate transportation cost between pickup locations
    calculation.calculateTransportationCosts(
        conn,
        pickupCostModelId,
        {},
        locationIds,
        pickupLocationPairs.concat(customerLocationPairs),
        equipTypes,
        options
    );

    logger.success("STREET_TURN_OPTIMIZE_CALCULATE_TRANSPORTATION_COST_SUCCESS",
            pickupCostModelId,
            JSON.stringify(locationIds),
            JSON.stringify(pickupLocationPairs.concat(customerLocationPairs)),
            JSON.stringify(equipTypes),
            JSON.stringify(options));

    locationIds = [];

    spResult.T_RETURN_LOCATION_PAIR.forEach(function(locationPair) {
        locationIds.push(locationPair.LOCATION_ID_1);
        locationIds.push(locationPair.LOCATION_ID_2);
    });

    // Calculate transportation cost between return locations
    calculation.calculateTransportationCosts(
        conn,
        returnCostModelId,
        {},
        locationIds,
        returnLocationPairs,
        equipTypes,
        options
    );

    logger.success("STREET_TURN_OPTIMIZE_CALCULATE_TRANSPORTATION_COST_SUCCESS",
            returnCostModelId,
            JSON.stringify(locationIds),
            JSON.stringify(returnLocationPairs),
            JSON.stringify(equipTypes),
            JSON.stringify(options));

    // Run optimization
    executeSP = new proc.procedure(
        constants.SCHEMA_NAME,
        "sap.tm.trp.db.streetturn::p_streetturn_controller", {
            connection: conn
        }
    );

    spResult = executeSP(pickupRuleId, returnRuleId);

    logger.success("STREET_TURN_OPTIMIZE_RUN_OPTIMIZER_SUCCESS",
            pickupRuleId,
            returnRuleId);

    conn.commit();

    streetTurnResult.TU_PAIRS = spResult.T_RESULT;

    if (spResult.T_MESSAGE) {
        messageResult = buildTextMessage(spResult.T_MESSAGE);
        streetTurnResult.SUCCESS = messageResult.success;
        streetTurnResult.MESSAGES = (streetTurnResult.MESSAGES || []).concat(messageResult.messages);
    }

    return streetTurnResult;
}


/**
 *  Optimize streetturn
 */
streetturnService.optimize = function(params) {
    var result = {};
    result.SUCCESS = true;
    result.MESSAGES = [];
    try {

        var pickupRuleId = $.request.parameters.get("pickup_rule_id");
        if (!pickupRuleId) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_PICKUP_RULE_ID_MISSING")
            });
        }

        var returnRuleId = $.request.parameters.get("return_rule_id");
        if (!returnRuleId) {
            result.MESSAGES.push({
                SEVERITY: "E",
                MESSAGE: bundle.getText("MSG_PICKUP_RULE_ID_MISSING")
            });
        }

        if (!result.MESSAGES || result.MESSAGES.length === 0) {
            logger.info(
                "STREETTURN_PARAM",
                pickupRuleId,
                returnRuleId
            );
            result = execute(pickupRuleId, returnRuleId);
        } else {
            result.SUCCESS = false;
        }

        logMessages(result.MESSAGES);
    } catch (e) {
        logger.error("STREET_TURN_OPTIMIZE_FAILED",
                pickupRuleId,
                returnRuleId,
                e);
        // To be enhanced later
        throw new lib.InternalError(e);
    }

    return result;
};

// Check privilege
streetturnService.setFilters([{
    filter: function() {
        if (!$.session.hasAppPrivilege(UNRESTRICTED_READ_PREVILEGE) && !$.session.hasAppPrivilege(EXECUTE_STREETTURN_OPTIMIZATION_PREVILEGE)) {
            logger.error("STREET_TURN_OPTIMIZE_UNAUTHORIZED", EXECUTE_STREETTURN_OPTIMIZATION_PREVILEGE);

            throw new lib.NotAuthorizedError(EXECUTE_STREETTURN_OPTIMIZATION_PREVILEGE);
        }

        return true;
    },
    only: ["optimize"]
}]);

// Customized template to return the result with success flag set
streetturnService.template = function(obj) {
    var response = {};
    if (obj instanceof Error) {
        response.SUCCESS = false;
        response.MESSAGES = (obj.hasOwnProperty("cause") && Array.isArray(obj.cause) ? obj.cause : [obj.message || obj.cause]).map(function(i, d, a) {
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

streetturnService.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "optimize"
}]);

try {
    streetturnService.handle();
} finally {
    logger.close();
}
