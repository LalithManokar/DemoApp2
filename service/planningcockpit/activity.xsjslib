var model = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib");
var xslib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var reviseSDArraylib = $
        .import("/sap/tm/trp/service/xslib/reviseSDArray.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var calculation = $
        .import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var handleConcurrentLockException = ($
        .import("/sap/tm/trp/service/xslib/utils.xsjslib")).handleConcurrentLockException;

var InternalError = xslib.InternalError;
var NotAuthorizedError = xslib.NotAuthorizedError;
var WebApplicationError = xslib.WebApplicationError;
var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_COCKPIT;

var activity = new xslib.SimpleRest({
    name : "activity service",
    desc : "a virtual class of all activity services"
});

activity.update = function(params) {
    try {
        var procName = PACKAGE + "::p_ext_activity_update";
        var obj = params.obj;
        var updateActivityProc = new Procedure(SCHEMA, procName);
        var startTime = obj.START_DATE && utils.parseTime(obj.START_DATE);
        var endTime = obj.END_DATE && utils.parseTime(params.obj.END_DATE);
        var updateResult = updateActivityProc(params.id, obj.FROM_LOC_ID,
                obj.TO_LOC_ID, startTime, endTime, obj.EQUIP_TYPE,
                obj.QUANTITY, obj.COST, obj.CONTRACT_NO, obj.ROUTE_ID,
                obj.ACTIVITY_DESC, obj.LOAD_DISCHARGE_DETAIL);

        if (updateResult.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new xslib.InternalError(updateResult.MESSAGE, {
                args : [ updateResult.MODIFIED_BY ]
            });
        }

        logger.success("ACTIVITY_UPDATE_SUCCESS", params.id);
    } catch (e) {
        logger.error("ACTIVITY_UPDATE_FAILED", params.id, e);

        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }

        throw new xslib.InternalError(messages.MSG_ERROR_UPDATE_ACTIVITY,
                handleConcurrentLockException(e));
    }
};

activity.destroy = function(params) {
    try {
        var procName = PACKAGE + "::p_ext_activity_delete";
        var deleteActivityProc = new Procedure(SCHEMA, procName);
        var deleteResult = deleteActivityProc(params.id);

        if (deleteResult.MESSAGE !== "MSG_SUCCESS_STATUS" && deleteResult.MESSAGE !== "MSG_ACTIVITY_IS_NOT_FOUND") {
            throw new xslib.InternalError(deleteResult.MESSAGE, {
                args : [ deleteResult.MODIFIED_BY ]
            });
        }

        logger.success("ACTIVITY_DELETE_SUCCESS", params.id);
    } catch (e) {
        logger.error("ACTIVITY_DELETE_FAILED", params.id, e);

        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }

        throw new xslib.InternalError(messages.MSG_ERROR_DELETE_ACTIVITY,
                handleConcurrentLockException(e));
    }
};

function routeCheck (scenarioId,activityId){

     var procName = PACKAGE + "::p_check_route_for_activity";
     var routeCheckProc, checkResult;

          routeCheckProc = new Procedure(SCHEMA,procName);
          checkResult = routeCheckProc(scenarioId,activityId);
          return {
               INVALID: checkResult.INVALID_FLAG
          };
}

activity
        .setFilters([
                {
                    filter : function(params) {
                        var locations = [ params.obj.FROM_LOC_ID || null,
                                params.obj.TO_LOC_ID || null ].filter(
                                function(l) {
                                    return l !== null;
                                }).map(function(l) {
                            return {
                                ID : l
                            };
                        });

                        var locationType = constants.LOCATION_TYPE.LOCATION;

                        try {
                            var result = geoCheck.authorizeReadByLocationIdList(
                                    locationType, locations);
                            logger.success("LOCATION_FILTER_AUTHORIZED");
                            return result;
                        } catch (e) {
                            logger.error("LOCATION_FILTER_AUTHORIZE_FAILED", e);
                            throw new xslib.InternalError(
                                    messages.MSG_ERROR_LOCATION_FILTER_AUTHORIZE_FAILED,
                                    e);
                        }
                    },
                    only : [ "create", "update" ]
                },
                {
                    filter : function(params) {
                        try {
                            var statusCheck = new Procedure(SCHEMA, PACKAGE
                                    + "::p_status_check_simulation_plan");
                            var result = statusCheck(params.obj.planId);

                            if ([ "MSG_CALC_PLAN_NOT_VALID",
                                    "MSG_CALC_PLAN_BEEN_CHANGED" ]
                                    .indexOf(result.MESSAGE) !== -1) {
                                throw new xslib.InternalError(result.MESSAGE);
                            }
                            return true;

                        } catch (e) {
                            logger.error("STATUS_CHECK_FAILED", e);

                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }

                            throw new xslib.InternalError(
                                    messages.MSG_ERROR_CHECK_UPDATE_EXPIRED_STATUS,
                                    e);
                        }
                    },
                    only : [ "create", "update", "destroy" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::GetRoute";
                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("ROUTE_GET_AUTHORIZE_FAILED",
                                    privilege);
                            throw new xslib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "route" ]
                } ]);
