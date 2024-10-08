var lib = $.import("/sap/tm/trp/service/planningcockpit/activity.xsjslib");
var MRActivity = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").MRActivity;
var logger = lib.logger;
var SCHEMA = lib.SCHEMA;
var PACKAGE = lib.PACKAGE;
var utils = lib.utils;
var messages = lib.messages;
var handleConcurrentLockException = lib.handleConcurrentLockException;
var MRActivityService = lib.activity;
var MR_ACTIVITY_TYPE = lib.constants.ACTIVITY_TYPE.MR;

MRActivityService.setModel(new MRActivity());

MRActivityService.create = function(params) {
    try {
        var obj = params.obj;
        var procName = PACKAGE + "::p_ext_activity_create";
        var createProc = new lib.Procedure(SCHEMA, procName);
        var startTime = obj.START_DATE && utils.parseTime(obj.START_DATE);
        var endTime = obj.END_DATE && utils.parseTime(obj.END_DATE);
        var createResult = createProc(MR_ACTIVITY_TYPE, obj.scenarioId,
                obj.FROM_LOC_ID, obj.TO_LOC_ID, startTime, endTime,
                obj.EQUIP_TYPE, obj.QUANTITY, obj.COST, obj.CONTRACT_NO,
                obj.ROUTE_ID, obj.ACTIVITY_DESC, obj.LOAD_DISCHARGE_DETAIL);

        if (createResult.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(createResult.MESSAGE, {
                args : [ createResult.MODIFIED_BY ]
            });
        }

        logger.success("ACTIVITY_CREATE_SUCCESS", createResult.ACTIVITY_ID);
        return {
            ID : createResult.ACTIVITY_ID
        };
    } catch (e) {
        logger.error("ACTIVITY_CREATE_FAILED", e);

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_ACTIVITY,
                handleConcurrentLockException(e));
    }
};

MRActivityService.estimateCost = function() {
    return {
        COST : 0
    };
};

MRActivityService.setFilters([ {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::CreateMRActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_CREATE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "create" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::UpdateMRActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_UPDATE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "update" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::DeleteMRActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_DELETE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "destroy" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::EstimateMRActivityCost";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_ESTIMATE_COST_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "estimateCost" ]
} ]);

MRActivityService.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "estimateCost"
} ]);

MRActivityService.handle();