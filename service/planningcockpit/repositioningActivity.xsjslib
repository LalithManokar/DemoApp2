var lib = $.import('/sap/tm/trp/service/planningcockpit/activity.xsjslib');
var RepositioningActivity = lib.model.RepositioningActivity;
var utils = lib.utils;
var activity = lib.activity;
var logger = lib.logger;
var messages = lib.messages;
var handleConcurrentLockException = lib.handleConcurrentLockException;
var REPOSITIONING_ACTIVITY_TYPE = lib.constants.ACTIVITY_TYPE.REPOSITIONING;
var SCHEMA = lib.SCHEMA;
var PACKAGE = lib.PACKAGE;

activity.setModel(new RepositioningActivity());

activity.create = function(params) {
    try {
        var obj = params.obj;
        var procName = PACKAGE + '::p_ext_activity_create';
        var createProc = new lib.Procedure(SCHEMA, procName);
        var startTime = obj.START_DATE && utils.parseTime(obj.START_DATE);
        var endTime = obj.END_DATE && utils.parseTime(obj.END_DATE);
        var createResult = createProc(REPOSITIONING_ACTIVITY_TYPE,
                obj.scenarioId, obj.FROM_LOC_ID, obj.TO_LOC_ID, startTime,
                endTime, obj.EQUIP_TYPE, obj.QUANTITY, obj.COST,
                obj.CONTRACT_NO, obj.ROUTE_ID, obj.ACTIVITY_DESC,
                obj.LOAD_DISCHARGE_DETAIL);

        if (createResult.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(createResult.MESSAGE, {
                args : [ createResult.MODIFIED_BY ]
            });
        }

        logger.success('ACTIVITY_CREATE_SUCCESS', createResult.ACTIVITY_ID);
        return {
            ID : createResult.ACTIVITY_ID
        };
    } catch (e) {
        logger.error('ACTIVITY_CREATE_FAILED', e);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_ACTIVITY,
                handleConcurrentLockException(e));
    }
};

activity.estimateCost = function(params) {
    var procName, costProc, estimateCostResult = {};
    try {
        procName = PACKAGE + '::p_get_reposition_cost';
        costProc = new lib.Procedure(SCHEMA, procName);
        estimateCostResult = costProc(params.obj.SIM_PLAN_ID,
                params.obj.RESOURCE_TYPE, params.obj.BASE_COST,
                params.obj.QUANTITY);

    } catch (e) {
        logger.error("ACTIVITY_ESTIMATE_COST_FAILED", params.obj.planId, e);
        throw new lib.InternalError(
                messages.MSG_ERROR_GET_REPOSITIONNING_ACTIVITY_COST, e);
    }
    return {
        COST : estimateCostResult.COST
    };
};

activity.route = function(params) {
    try {
        var procName = PACKAGE + '::p_query_route_for_repo_activity';
        var query = new lib.Procedure(SCHEMA, procName);
        var results = query(params.id);
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_GET_ROUTES, e);
    }
    if (results.MESSAGE !== 'MSG_SUCCESS_STATUS') {

        throw new lib.InternalError(results.MESSAGE);
    }
    return {
        CONNECTIONS : results.ROUTE_CONN_LIST
    };
};

activity.prepareData = function(params) {
    var procName, optionProc, result, options = {};
    var locationPairs = [];
    locationPairs.push({
        "FROM_LOC" : params.obj.FROM_LOC_ID,
        "TO_LOC" : params.obj.TO_LOC_ID
    });
    var locations = [];
    locations.push({
        "ID" : params.obj.FROM_LOC_ID
    });
    locations.push({
        "ID" : params.obj.TO_LOC_ID
    });

    var equipId = [];
    equipId.push({
        "ID" : params.obj.EQUIP_TYPE
    });

    try {
        procName = PACKAGE + '::p_ext_get_options_for_network';
        optionProc = new lib.Procedure(SCHEMA, procName);
        result = optionProc(params.obj.planId);

        options.FROM_TIME = result.FROM_TIME;
        options.TO_TIME = result.TO_TIME;
        options.LANE_MTR = [];
        options.LANE_MTR.push(result.LANE_MTR);
    } catch (e) {
        logger.error("ACTIVITY_ESTIMATE_COST_PREPARATION_DATA_FAILED",
                params.obj.planId, e.message);
        throw new lib.InternalError(
                messages.MSG_ERROR_GET_REPOSITIONNING_ACTIVITY_COST, e);
    }
    return {
        locationPairs : locationPairs,
        locations : locations,
        equipId : equipId,
        options : options
    };
};

activity.routeCheck = function(params){

	try{
		var result = lib.routeCheck(params.obj.scenarioId,params.id);
		 return result;
	}catch (e) {
        logger.error("ACTIVITY_CHECK_ROUTE_FAILED",
                params.obj.planId, e.message);
        throw new lib.InternalError(
                messages.MSG_ERROR_CHECK_ACTIVITY_ROUTE, e);
    }

};

activity
        .setFilters([
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::CreateRepositioningActivity";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("ACTIVITY_CREATE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "create" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::UpdateRepositioningActivity";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("ACTIVITY_UPDATE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "update" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::DeleteRepositioningActivity";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("ACTIVITY_DELETE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::EstimateRepositioningActivityCost";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error(
                                    "ACTIVITY_ESTIMATE_COST_AUTHORIZE_FAILED",
                                    privilege);
                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "estimateCost" ]
                } ]);

activity.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "estimateCost"
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "route"
},
{
	method: $.net.http.GET,
	scope: "member",
	action: "routeCheck"
}]);

activity.handle();
