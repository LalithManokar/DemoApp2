var lib = $.import("/sap/tm/trp/service/planningcockpit/activity.xsjslib");
var OffHireActivity = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib").OffHireActivity;
var logger = lib.logger;
var constants = lib.constants;
var utils = lib.utils;
var SCHEMA = lib.SCHEMA;
var PACKAGE = lib.PACKAGE;
var messages = lib.messages;
var handleConcurrentLockException = lib.handleConcurrentLockException;
var OffHireActivityService = lib.activity;
OffHireActivityService.setModel(new OffHireActivity());

var OFFHIRE_ACTIVITY_TYPE = constants.ACTIVITY_TYPE.OFFHIRE;

OffHireActivityService.create = function(params) {
    try {
        var obj = params.obj;
        var procName = PACKAGE + "::p_ext_activity_create";
        var createProc = new lib.Procedure(SCHEMA, procName);
        var startTime = obj.START_DATE && utils.parseTime(obj.START_DATE);
        var endTime = obj.END_DATE && utils.parseTime(obj.END_DATE);
        var createResult = createProc(OFFHIRE_ACTIVITY_TYPE, obj.scenarioId,
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

OffHireActivityService.estimateCost = function(params) {
    var procName = constants.SP_PKG_LEASECONTRACT + "::p_ext_get_hire_cost";
    var getOnhireCostProc = new lib.Procedure(SCHEMA, procName);
    try {
        var resultCost = getOnhireCostProc(params.obj.CONTRACT_NO, 2,
                params.obj.FROM_LOC_ID, params.obj.EQUIP_TYPE,
                params.obj.QUANTITY).COST;
        return {
            COST : resultCost
        };
    } catch (e) {
        throw new lib.InternalError(
                messages.MSG_ERROR_GET_ONHIRE_ACTIVITY_COST, e);
    }
};

OffHireActivityService.setFilters([ {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::CreateOffHireActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_CREATE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "create" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::UpdateOffHireActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_UPDATE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "update" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::DeleteOffHireActivity";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_DELETE_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "destroy" ]
}, {
    filter : function(params) {
        var privilege = "sap.tm.trp.service::EstimateOffHireActivityCost";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ACTIVITY_ESTIMATE_COST_AUTHORIZE_FAILED", privilege);
            throw new lib.NotAuthorizedError(privilege);
        }

        return true;
    },
    only : [ "estimateCost" ]
} ]);

OffHireActivityService.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "estimateCost"
} ]);

OffHireActivityService.handle();