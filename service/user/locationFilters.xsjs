var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var LocationFilter = new lib.SimpleRest({ 
    name: "location filter",
    desc: "location filter management",
    model: new model.LocationFilter()
});

function getUserInfoAuthCheck(filterId) {
    var conn=$.hdb.getConnection();
    var checkUserTypeProc = "sap.tm.trp.db.filter::p_get_user_info_for_auth_check_location_filter";
    var getUserType = conn.loadProcedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(filterId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    conn.commit();
    conn.close();
    return true;
}

LocationFilter.update = function(params) {
    var updateLocationFilterProc, checkLocationFilterProc, recordsAttribute;
    var conn=$.hdb.getConnection();
    try {
        conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.SERIALIZABLE});
        conn.setAutoCommit(false);
        checkLocationFilterProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_location_filter_visible_consistency_check");
        recordsAttribute = checkLocationFilterProc(params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE).ERR_NUM;
        //CHECK ITEMS' PERSONAL ATTRIBUTE
        conn.commit();
        if (recordsAttribute !== 0) {
            logger.error("ITEMS_PERSONAL_ATTRIBUTES",
                            params.obj.VISIBILITY,
                            JSON.stringify(params.obj.ITEMS),
                            params.obj.TYPE);

            throw new lib.InternalError(messages.MSG_ERROR_PERSONAL_LOCATION, recordsAttribute);
        }

        updateLocationFilterProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_ext_location_filter_update");

        var result = updateLocationFilterProc(params.id, params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE);

        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(result.MESSAGE);
        }

        logger.success("LOCATION_FILTER_UPDATE_SUCCESS", params.id);

        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error(
                "LOCATION_FILTER_UPDATE_FAILED",
                params.id,
                e.toString(),
                params.obj.NAME,
                params.obj.DESC || '',
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS),
                params.obj.TYPE
            );

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_LOCATION_FILTER, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};


LocationFilter.create = function(params) {
    var createLocationFilterProc, result = {}, checkLocationFilterProc, records;
    var conn=$.hdb.getConnection();
    try {
        conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.SERIALIZABLE});
        conn.setAutoCommit(false);
        checkLocationFilterProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_location_filter_visible_consistency_check");
         records = checkLocationFilterProc(params.obj.VISIBILITY, params.obj.ITEMS.map(function(item) { 
            delete item.NAME; 
            return item; 
        }), params.obj.TYPE).ERR_NUM;
        conn.commit();
        //CHECK ITEMS" PERSONAL ATTRIBUTE
        if (records !== 0) {
            logger.error(
                    "ITEMS_PERSONAL_ATTRIBUTES",
                    params.obj.VISIBILITY,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE
                );

            throw new lib.InternalError(messages.MSG_ERROR_PERSONAL_LOCATION, records);
        }
        conn.commit();
        createLocationFilterProc = conn.loadProcedure(SCHEMA,
                "sap.tm.trp.db.filter::p_ext_location_filter_create");

        result = createLocationFilterProc(params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE,
        		params.obj.RESOURCE_CATEGORY);

        if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(result.MESSAGE, result);
        }

        logger.success("LOCATION_FILTER_CREATE_SUCCESS", result.FILTER_ID);

        conn.commit();

        return {
            ID: result.FILTER_ID
        };
    } catch (e) {
        conn.rollback();

        logger.error(
                "LOCATION_FILTER_CREATE_FAILED",
                e.toString(),
                params.obj.NAME,
                params.obj.DESC || '',
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS),
                params.obj.TYPE
            );

        if (e instanceof lib.WebApplicationError) {
            throw e;
        }

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_LOCATION_FILTER, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

LocationFilter.destroy = function(params) {
    var conn=$.hdb.getConnection();
    var deleteLocationFilterProc;
    try {
        deleteLocationFilterProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_ext_location_filter_delete");
        deleteLocationFilterProc(params.id);
        logger.success(
                "LOCATION_FILTER_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "LOCATION_FILTER_DELETE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_LOCATION_FILTER, e);
    }
    conn.commit();
    conn.close();
};

LocationFilter.check = function(params) {
    var conn=$.hdb.getConnection();
    var checkLocationFilterProc;
    try {
        checkLocationFilterProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_location_filter_in_plan_check");
        return {
            "STATUS": checkLocationFilterProc(params.id).PLAN_FLAG
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_LOCATION_FILTER_CHECK, e);
    }
    conn.commit();
    conn.close();
};

LocationFilter.visibleCheck = function(params) {
    var conn=$.hdb.getConnection();
    var visibleCheckProc, result;
    try {
        visibleCheckProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_location_filter_visible_in_plan_and_group_check");
        result = visibleCheckProc(params.id);
        conn.commit();
        return {
            RECORDS: result.ERR_NUM,
            FLAG: result.ERR_FLAG,
            NAME: result.GROUP_NAME
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_VISIBILITY, e);
    }
    conn.commit();
    conn.close();
};

LocationFilter.queryFacetFilter = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var query = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_location_filters_facet_filter");
        var result = query(params.obj.search, params.obj.TYPES, params.obj.VISIBILITY, params.obj.RESOURCE_CATEGORY);
        conn.commit();
        return {
            TYPE: Object.keys(result.TYPE_LIST_OUTPUT).map(function(i) { return {key : result.TYPE_LIST_OUTPUT[i].ID, text : result.TYPE_LIST_OUTPUT[i].DESC};}),
            VISIBILITY: Object.keys(result.VISIBILITY_LIST_OUTPUT).map(function(i) { return  {key : result.VISIBILITY_LIST_OUTPUT[i].CODE, text : result.VISIBILITY_LIST_OUTPUT[i].DESC};})
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_LOCATION_FILTER, e);
    }
    conn.close();
};

LocationFilter.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateLocationFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_FILTER_CREATE_AUTHORIZE_FAILED",
                    privilege);
            logger.close();
            throw new lib.NotAuthorizedError(privilege);
        }
        if (params.obj.VISIBILITY === "G" && !$.session.hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
            logger.error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");
            logger.close();
            throw new lib.NotAuthorizedError("sap.tm.trp.service::MakeGlobalVisibility");
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::UpdateLocationFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_FILTER_UPDATE_AUTHORIZE_FAILED",
                    privilege);
            logger.close();
            throw new lib.NotAuthorizedError(privilege);
        }
        if (params.obj.VISIBILITY === "G" && !$.session.hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
            logger.error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");
            logger.close();
            throw new lib.NotAuthorizedError("sap.tm.trp.service::MakeGlobalVisibility");
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function(params) {
        try{
            return geoCheck.authorizeWriteByLocationIdList(params.obj.TYPE, params.obj.ITEMS.map(function(item) { 
            delete item.NAME; 
            return item; 
        }));
        } catch(e){
            logger.error("LOCATION_FILTER_AUTHORIZE_FAILED");
            logger.close();
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw e;
        }
    },
    only: ["create", "update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteLocationFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_FILTER_DELETE_AUTHORIZE_FAILED",
                    privilege);
            logger.close();
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}, {
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
    only : [ "destroy" ]
}, {
    filter : function(params) {
        var conn=$.hdb.getConnection();
        var entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
          try {
              conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
              conn.setAutoCommit(false);
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.filter::p_location_filter_delete_check');
              checkResult = checkProc(params.id).WHEREUSED;
            conn.commit();
          } catch (e) {
              conn.rollback();
              logger.error("LOCATION_FILTER_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_LOCATION_FILTER_CHECK_USED_FAILED, e);
          }
        if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_LOCATION_FILTER_IS_USED);
        }
        return result;
  },
  only : [ "destroy" ]
}, {
    filter : function(params) {
        try {
          return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
},{
    filter : function(params) {
          var checkResult, checkProc, errorMessage;
          
          var conn=$.hdb.getConnection();
            try {
                checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.filter::p_ext_location_filter_save_check');
                
                // to handle $.hdb exception errors
                params.id= params.id===undefined?null:params.id;
                params.obj.VISIBILITY = params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
                params.obj.ITEMS = params.obj.ITEMS===undefined?null:params.obj.ITEMS;
                params.obj.TYPE = params.obj.TYPE===undefined?null:params.obj.TYPE;
                
                checkResult = checkProc(params.id, params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE);
                conn.commit();
                if(checkResult.CODE_LIST.length > 0) {
                    if (checkResult.MSG === 'VISIBILITY_CHECK_FAILED_ITEM'){
                        errorMessage = messages.MSG_VISIBILITY_CHECK_FAILED_ITEM;
                    }else{
                        errorMessage = messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                    }
                    logger.error(errorMessage, checkResult.CODE_LIST, params.id);
                    throw new lib.InternalError(errorMessage, checkResult.CODE_LIST);
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

LocationFilter.setRoutes([{
    method: $.net.http.GET,
    scope: "member",
    action: "check"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "visibleCheck"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}]);

LocationFilter.handle();
