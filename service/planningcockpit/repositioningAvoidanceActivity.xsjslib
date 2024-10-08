var lib = $.import('/sap/tm/trp/service/planningcockpit/activity.xsjslib');
var RepositioningAvoidanceActivity = lib.model.RepositioningAvoidanceActivity;
var utils = lib.utils;
var activity = lib.activity;
var logger = lib.logger;
var messages = lib.messages;
var handleConcurrentLockException = lib.handleConcurrentLockException;
var REPOSITIONING_AVOIDANCE_ACTIVITY_TYPE = lib.constants.ACTIVITY_TYPE.REPOSITIONING_AVOIDANCE;
var SCHEMA = lib.SCHEMA;
var PACKAGE = lib.PACKAGE;

activity.setModel(new RepositioningAvoidanceActivity());

activity.create = function(params) {
    try {
        var obj = params.obj;
        var procName = PACKAGE + '::p_ext_activity_create';
        var createProc = new lib.Procedure(SCHEMA, procName);
        var startTime = obj.START_DATE && utils.parseTime(obj.START_DATE);
        var endTime = obj.END_DATE && utils.parseTime(obj.END_DATE);
        var createResult = createProc(REPOSITIONING_AVOIDANCE_ACTIVITY_TYPE,
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
                        var privilege = "sap.tm.trp.service::CreateRepositioningAvoidanceActivity";
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
                        var privilege = "sap.tm.trp.service::UpdateRepositioningAvoidanceActivity";
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
                        var privilege = "sap.tm.trp.service::DeleteRepositioningAvoidanceActivity";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("ACTIVITY_DELETE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "destroy" ]
                } ]);

activity.setRoutes([
{
	method: $.net.http.GET,
	scope: "member",
	action: "routeCheck"
}]);

activity.handle();
