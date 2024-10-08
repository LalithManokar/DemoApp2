var model = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var calculation = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var graphCalc = $.import("/sap/tm/trp/service/planningcockpit/transportNetwork.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var handleConcurrentLockException = ($.import("/sap/tm/trp/service/xslib/utils.xsjslib")).handleConcurrentLockException;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_COCKPIT;


var scenarioService = new lib.SimpleRest({
    name : "scenario service",
    desc : "operations about scenario",
    model : new model.Scenario()
});



/** *scenario****** */
var routing = $.import("sap.tm.trp.service.routing", "routing").Routing;

scenarioService.create = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        var createScenarioProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_scenario_create");
        
        params.obj.SCENARIO_NAME=params.obj.SCENARIO_NAME===undefined?null:params.obj.SCENARIO_NAME;
        params.obj.SCENARIO_DESC=params.obj.SCENARIO_DESC===undefined?null:params.obj.SCENARIO_DESC;
        params.obj.planId=params.obj.planId===undefined?null:params.obj.planId;

        var result = createScenarioProc(
                params.obj.SCENARIO_NAME,
                params.obj.SCENARIO_DESC,
                params.obj.planId,
                1); // pass in flag = 1 means not default scenario
        var r=result.SCENARIO_ID.toString();
        r=parseInt(r);
        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            logger.error("SCENARIO_CREATE_FAILED", logger.Parameter.String(0,
                    result.MESSAGE));
            throw new lib.InternalError(result.MESSAGE, { args : [ result.MODIFIED_BY ] });
        }

        logger.success("SCENARIO_CREATE_SUCCESS", r);

        var service = new routing(conn);
        var routingResult = service.buildDeltaNetworkModel(r);

        if (routingResult.RETURN_CODE !== 0) {
            throw new lib.InternalError(messages.MSG_SIMULATION_PLAN_BUILD_DELTA_NETWORK_FAILED, routingResult);
        }

        logger.info("SIMULATION_PLAN_BUILD_DELTA_NETWORK", r, routingResult.NETWORK_ID);

        conn.commit();

        return {
            ID : r
        };
    } catch (e) {
        conn.rollback();
        logger.error("SCENARIO_CREATE_FAILED", e);

        throw e;
    }
    conn.close();
};

scenarioService.destroy = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        var getNetworkCode = conn.loadProcedure("SAP_TM_TRP","sap.tm.trp.db.planningcockpit::p_get_networkcode_by_simulation_scenario_id");
        
        params.obj.planId=params.obj.planId===undefined?null:params.obj.planId;
        params.id=params.id===undefined?null:params.id;

        var networkCode = getNetworkCode(params.obj.planId, params.id).NETWORK_CODE;
        logger.info("PATH_QUERY_NETWORK_CODE_SUCCEED",
                params.obj.SIMULATION_PLAN_ID,
                params.obj.SCENARIO_ID,
                networkCode);

        var service = new routing(conn);

        var result = service.deleteNetwork(networkCode, true)

        if (result.RETURN_CODE !== 0) {
            throw new lib.InternalError(messages.MSG_ERROR_DELETE_SCENARIO, result);
        }

        var deleteScenarioProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_scenario_delete");
        result = deleteScenarioProc(params.id);

        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(result.MESSAGE, {args:[result.MODIFIED_BY]});
        }

        logger.success("SCENARIO_DELETE_SUCCESS", params.id);
        conn.commit();
    } catch(e) {
        conn.rollback();
        logger.error("SCENARIO_DELETE_FAILED", params.id, e);

        throw e;
    }
    conn.close();
};

scenarioService.update = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var updateScenarioProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_scenario_update");
        
        params.id=params.id===undefined?null:params.id;
         params.obj.SCENARIO_NAME= params.obj.SCENARIO_NAME===undefined?null: params.obj.SCENARIO_NAME;
        params.obj.SCENARIO_DESC=params.obj.SCENARIO_DESC===undefined?null:params.obj.SCENARIO_DESC;

        var result = updateScenarioProc(
                params.id,
                params.obj.SCENARIO_NAME,
                params.obj.SCENARIO_DESC);
        conn.commit();
        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(result.MESSAGE, {args:[result.MODIFIED_BY]});
        }

        logger.success("SCENARIO_UPDATE_SUCCESS", params.id);
    }catch (e) {
        logger.error("SCENARIO_UPDATE_FAILED", params.id, e);

        throw e;
    }
    conn.close();
};

/**
 * Get location equipment type pairs for preparation data
 *
 * @param conn
 * @param simulationPlanId
 * @param scenarioId
 */
function getLocationEquipPairs(conn, simulationPlanId, scenarioId) {
    try {
        var getLocationEquip = conn.loadProcedure(SCHEMA, PACKAGE + "::get_location_and_equip");
        var leItems = getLocationEquip(simulationPlanId, scenarioId);

        /**
         * leItems COST_MODEL_ID - COST MODEL ID LOCATION_LIST - LOCATION LIST
         * EQUIPMENT_LIST - EQUIPMENT TYPE LIST LOCATION_PAIRS - LOCATION PAIRS
         * LIST FROM_TIME - FROM TIME TO_TIME - TO TIME SCHED_MTR - SCHED MTR
         * LANE_MTR - LANE MTR
         */


        logger.success("FETCH_LOCATION_EQUIP_TYPE_ON_SM_PLAN", simulationPlanId);
        conn.commit();
        return {
            costModelId : leItems.COST_MODEL_ID,
            locationId : leItems.LOCATION_LIST,
            equipId : leItems.EQUIPMENT_LIST,
            locationPairs : leItems.LOCATION_PAIRS,
            options : {
                FROM_TIME : leItems.FROM_TIME,
                TO_TIME : leItems.TO_TIME,
                LANE_MTR : [ leItems.LANE_MTR ]
            },
            locations : leItems.LOCATION_LIST.map(function(item) {
                return item.ID;
            })
        };
    } catch (e) {
        logger.error("FETCH_LOCATION_EQUIP_TYPE_ON_SM_PLAN_FAILED", simulationPlanId, e);

        throw new lib.InternalError(messages.MSG_ERROR_BALANCE_COST, e);
    }
}

scenarioService.proposeActivities = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var proposeActivityProc = conn.loadProcedure(
                SCHEMA,
                PACKAGE + "::p_ext_propose_activity");
        params.obj.planId=params.obj.planId===undefined?null:params.obj.planId;
        params.id=params.id===undefined?null:params.id;

        var result = proposeActivityProc(parseInt(params.obj.planId), params.id);
        conn.commit();
        if ("MSG_SUCCESS_STATUS" === result.MESSAGE) {
            logger.success("SCENARIO_PROPOSE_ACTIVITY_SUCCESS", params.id);

            return {
                RECORDS : result.CNT
            };
        } else if (["MSG_BALANCE_INFEASIBLE", "MSG_ALREADY_OPTIMAL"].indexOf(result.MESSAGE) !== -1) {
            throw new lib.Warning(undefined, [{message: result.MESSAGE}]);
        } else {
            throw new lib.InternalError(result.MESSAGE, {args: [result.MODIFIED_BY]});
        }
    } catch (e) {
        logger.error("SCENARIO_PROPOSE_ACTIVITY_FAILED", params.id, e);

        throw e;
    }
    conn.close();
};

scenarioService.computeBalancingCost = function(params) {
    var conn;
    try {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        var balancingCostProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_balancing_cost");
        
        params.obj.ID=params.obj.ID===undefined?null:params.obj.ID;
         params.obj.SCENARIO_ID= params.obj.SCENARIO_ID===undefined?null: params.obj.SCENARIO_ID;

        var result = balancingCostProc(params.obj.ID, params.obj.SCENARIO_ID);
        conn.commit();
        if (result.MESSAGE === "MSG_ERROR_SOLVER_FAILED") {
            throw new lib.InternalError(result.MESSAGE, { args: [result.MODIFIED_BY]});
        }

        logger.success("COMPUTING_BALANCING_COST_ON_SM_PLAN_SUCCESS", params.id);

        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("COMPUTING_BALANCING_COST_ON_SM_PLAN_FAILED", params.id, e);

        throw e;
    }
    conn.close();
};

scenarioService.generateAlert = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var procName = PACKAGE + "::p_alert_calculation_with_activities";
        var alertControllerProc = conn.loadProcedure(SCHEMA, procName);
        params.obj.planId=params.obj.planId===undefined?null:params.obj.planId;
        params.id=params.id===undefined?null:params.id;

        var result = alertControllerProc(params.obj.planId, params.id);

        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(result.MESSAGE, { args: [result.MODIFIED_BY]});
        }
        conn.commit();
        return result;
    } catch (e) {
        logger.error("GENERATE_ALERT_FAILED", e);

        throw e;
    }
    conn.close();
};

scenarioService.setFilters([
{
    filter : function(params) {
        var privilege = "sap.tm.trp.service::CreateScenario";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SCENARIO_CREATE_AUTHORIZE_FAILED",
                    logger.Parameter.String(0, privilege),
                    logger.Parameter
                            .String(0, params.obj.SCENARIO_NAME));
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "create" ]
},
{
    filter : function(params) {
        var privilege = "sap.tm.trp.service::UpdateScenario";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SCENARIO_UPDATE_AUTHORIZE_FAILED",
                    logger.Parameter.String(0, privilege),
                    logger.Parameter.Integer(0, params.id));
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "update" ]
},
{
    filter : function(params) {
        var privilege = "sap.tm.trp.service::DeleteScenario";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SCENARIO_DELETE_AUTHORIZE_FAILED",
                    logger.Parameter.String(0, privilege),
                    logger.Parameter.Integer(0, params.id));
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "destroy" ]
},
{
    filter : function() {
        var privilege = "sap.tm.trp.service::ProposeActivities";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_PROPOSE_AUTHORIZE_FAILED",
                    logger.Parameter.String(0, privilege));
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "proposeActivities" ]
},{
    filter : function() {
        var privilege = "sap.tm.trp.service::GenerateScenarioAlert";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("GENERATE_ALERT_AUTHORIZE_FAILED", privilege);

            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "generateAlert" ]
} ]);

scenarioService.setRoutes([ {
    method : $.net.http.POST,
    scope : "member",
    action : "proposeActivities"
}, {
    method : $.net.http.POST,
    scope : "member",
    action : "generateAlert",
    response : $.net.http.NO_CONTENT
}, {
    method : $.net.http.POST,
    scope : "member",
    action : "computeBalancingCost",
    response : $.net.http.NO_CONTENT
} ]);

try {
    scenarioService.handle();
} finally {
    logger.close();
}
