var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var timeFilters = new lib.SimpleRest({
    name: "timeFilters",
    desc: "create/update/delete/execute/getresult time filters service",
    model: new model.TimeFilters()
});

function getUserInfoAuthCheck(filterId) {
    var checkUserTypeProc = "sap.tm.trp.db.filter::p_get_user_info_for_auth_check_time_filter";
    var getUserType = new proc.procedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(filterId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            logger.error("TIME_FILTER_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

timeFilters.create = function(params){
    var createTimeFiltersProc, result, procName;
    try {
        procName = "sap.tm.trp.db.filter::p_time_filter_create";
        createTimeFiltersProc = new proc.procedure(constants.SCHEMA_NAME, procName);

        result = createTimeFiltersProc(
            params.obj.DESC,
            params.obj.DIRECTION_FLAG,
            params.obj.CODE,
            params.obj.NAME,
            params.obj.ENABLE_OFFSET_MOMENT,
            params.obj.TIME_ZONE_ID,
            params.obj.OFFSET_START_TIME_HOUR,
            params.obj.OFFSET_START_TIME_MINUTE,
            params.obj.OFFSET_START_TIME_WEEK_DAY,
            params.obj.OFFSET_START_TIME_MONTH_DAY,
            params.obj.VISIBILITY,
            params.obj.ITEMS);
        logger.success(
                "TIME_FILTER_CREATE_SUCCESS",
                result.TIME_FILTER_ID
            );
        return {
            ID: result.TIME_FILTER_ID
        };
    } catch (e) {
        logger.error(
                "TIME_FILTER_CREATE_FAILED",
                e
            );
        throw new lib.InternalError(messages.MSG_ERROR_CREATE_TIME_FILTER, e);
    }
};

timeFilters.update = function(params) {
    var updateTimeFiltersProc, procName;
    try {
        procName = "sap.tm.trp.db.filter::p_time_filter_update";
        updateTimeFiltersProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        var msgCode = updateTimeFiltersProc(
            params.id,
            params.obj.DESC,
            params.obj.DIRECTION_FLAG,
            params.obj.CODE,
            params.obj.NAME,
            params.obj.ENABLE_OFFSET_MOMENT,
            params.obj.TIME_ZONE_ID,
            params.obj.OFFSET_START_TIME_HOUR,
            params.obj.OFFSET_START_TIME_MINUTE,
            params.obj.OFFSET_START_TIME_WEEK_DAY,
            params.obj.OFFSET_START_TIME_MONTH_DAY,
            params.obj.VISIBILITY,
            params.obj.ITEMS).MSG_CODE;
        if (msgCode === 'MSG_OFFSET_CHANGE_ERROR') {
            throw new lib.InternalError(messages.MSG_ERROR_TIME_FILTER_OFFSET_CHANGE);
        }
        logger.success(
                "TIME_FILTER_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "TIME_FILTER_UPDATE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_TIME_FILTER, e);
    }
};

timeFilters.destroy = function(params) {
    var destroyTimeFiltersProc, procName;
    try {
        procName = "sap.tm.trp.db.filter::p_time_filter_delete";
        destroyTimeFiltersProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        destroyTimeFiltersProc(params.id);
        logger.success(
                "TIME_FILTER_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "TIME_FILTER_DELETE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_PLAN_MODEL, e);
    }
};

timeFilters.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_time_filters_facet_filter");
        var result = query(params.obj.search, params.obj.DIRECTION_FLAG, params.obj.VISIBILITY);

        return {
            DIRECTION_FLAG: result.DIRECTION_LIST_OUTPUT.map(function(i) { return {key: i.ID, text: i.DESC};}),
            VISIBILITY: result.VISIBILITY_LIST_OUTPUT.map(function(i) { return  {key: i.CODE, text: i.DESC};})
        };
    } catch (e) {
        logger.error("TIME_FILTER_QUERY_FACET_FILTER_FAILED", e);

        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_TIME_FILTERS, e);
    }
};

timeFilters.getTimeIntervalPreview = function(params) {
    var getTimeIntervalProc, procName, result;
    try {
        procName = "sap.tm.trp.db.filter::p_ext_get_time_interval_display";
        getTimeIntervalProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        result = getTimeIntervalProc(params.obj.DIRECTION_FLAG,
                                    params.obj.ENABLE_OFFSET_MOMENT,
                                    params.obj.TIME_ZONE_ID,
                                    params.obj.OFFSET_START_TIME_HOUR,
                                    params.obj.OFFSET_START_TIME_MINUTE,
                                    params.obj.OFFSET_START_TIME_WEEK_DAY,
                                    params.obj.OFFSET_START_TIME_MONTH_DAY,
                                    params.obj.ITEMS).VAR_OUT;
        return result;
    } catch (e) {
        logger.error(
                "GET_TIME_INTERVAL_PREVIEW_FAILED", e
            );
        throw new lib.InternalError(messages.MSG_ERROR_GET_TIME_INTERVAL_PREVIEW, e);
    }
};


timeFilters.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateTimeFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("TIME_FILTER_CREATE_AUTHORIZE_FAILED",
                    privilege);

            throw new lib.NotAuthorizedError(privilege);
        }
        if (params.obj.VISIBILITY === "G" && !$.session.hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
            logger.error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");

            throw new lib.NotAuthorizedError("sap.tm.trp.service::MakeGlobalVisibility");
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::UpdateTimeFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("TIME_FILTER_UPDATE_AUTHORIZE_FAILED",
                    privilege);

            throw new lib.NotAuthorizedError(privilege);
        }
        if (params.obj.VISIBILITY === "G" && !$.session.hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
            logger.error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");

            throw new lib.NotAuthorizedError("sap.tm.trp.service::MakeGlobalVisibility");
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteTimeFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("TIME_FILTER_DELETE_AUTHORIZE_FAILED",
                    privilege);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
},{
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "update", "destroy" ]
},{
    filter : function(params) {
          var conn, entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
            try {
                conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
                conn.setAutoCommit(false);
                checkProc = new proc.procedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.filter::p_time_filter_delete_check', {
                    connection: conn
                });
                checkResult = checkProc(params.id).WHEREUSED;
              conn.commit();
            } catch (e) {
                conn.rollback();
                logger.error("TIME_FILTER_CHECK_FAILED", e, params.id);
                throw new lib.InternalError(messages.MSG_TIME_FILTER_CHECK_USED_FAILED, e);
            }
          if(checkResult.length > 0) {
              throw new lib.InternalError(messages.MSG_TIME_FILTER_IS_USED);
          }
          return result;
    },
    only : [ "destroy" ]
 },{
     filter : function(params) {
         var checkResult, checkProc;
         try {
             checkProc = new proc.procedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.filter::p_time_filter_save_check');
             checkResult = checkProc(params.id, params.obj.VISIBILITY);
             if(checkResult.CODE_LIST.length > 0) {
                  logger.error(messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST, checkResult.CODE_LIST, params.id);
                  throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST, checkResult.CODE_LIST);
              }
          } catch (e) {
              if (e instanceof lib.WebApplicationError) {
                  throw e;
              }
              logger.error("VISIBILITY_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED, e);
          }
        return true;
  },
  only : [ "create", "update" ]
}]);

timeFilters.setRoutes({
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
},{
    method: $.net.http.POST,
    scope: "collection",
    action: "getTimeIntervalPreview"
});

try {
    timeFilters.handle();
} finally {
    logger.close();
}