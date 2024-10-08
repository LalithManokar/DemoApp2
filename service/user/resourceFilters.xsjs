var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var entity = new lib.SimpleRest({
    name: "resource filter",
    desc: "resource filter management",
    model: new model.ResourceFilter()
});

function getUserInfoAuthCheck(filterId) {
    var conn=$.hdb.getConnection();
    var checkUserTypeProc = "sap.tm.trp.db.filter::p_get_user_info_for_auth_check_resource_filter";
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

entity.update = function(params) {
    var conn, updateentityProc, checkentityProc, records;
    try {
        conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.SERIALIZABLE});
        conn.setAutoCommit(false);
        checkentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_equip_filter_visible_consistency_check");
        records = checkentityProc(params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE).ERR_NUM;
        //CHECK ITEMS" PERSONAL ATTRIBUTE
        conn.commit();
        if (records === 0) {
            updateentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_ext_equipment_filter_update");
            updateentityProc(params.id, params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE,params.obj.RESOURCE_CATEGORY);
        } else {
            throw new lib.InternalError("ATTRIBUTE", records);
        }
        logger.success(
                "RESOURCE_FILTERS_UPDATE_SUCCESS",
                params.id
            );
        conn.commit();
    } catch (e) {
        conn.rollback();
        if (e.message === "ATTRIBUTE") {
            logger.error(
                    "ITEMS_PERSONAL_ATTRIBUTES",
                    params.obj.VISIBILITY,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE,
                    params.obj.RESOURCE_CATEGORY
                );

            throw new lib.InternalError(messages.MSG_ERROR_PERSONAL_EQUIPMENT, e);
        } else {
            logger.error(
                    "RESOURCE_FILTERS_UPDATE_FAILED",
                    params.id,
                    e.toString(),
                    params.obj.NAME,
                    params.obj.DESC || '',
                    params.obj.VISIBILITY,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE,
                    params.obj.RESOURCE_CATEGORY
                );

            throw new lib.InternalError(messages.MSG_ERROR_UPDATE_EQUIPMENT_FILTER, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.create = function(params) {
    var conn, createentityProc, result = {}, checkentityProc, records;
    try {
        conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.SERIALIZABLE});
        conn.setAutoCommit(false);

        checkentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_equip_filter_visible_consistency_check");
        records = checkentityProc(params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE).ERR_NUM;
        conn.commit();
        //CHECK ITEMS" PERSONAL ATTRIBUTE
        if (records === 0) {
            createentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_ext_equipment_filter_create");
            result = createentityProc(params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.TYPE,params.obj.RESOURCE_CATEGORY);
        } else {
            throw new lib.InternalError("ATTRIBUTE", records);
        }
        conn.commit();
        logger.success(
                "RESOURCE_FILTER_CREATE_SUCCESS",
                result.FILTER_ID
            );
        return {
            ID: result.FILTER_ID
        };
    } catch (e) {
        conn.rollback();
        if (e.message === "ATTRIBUTE") {
            logger.error(
                    "ITEMS_PERSONAL_ATTRIBUTES",
                    params.obj.VISIBILITY,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE,
                    params.obj.RESOURCE_CATEGORY
                );
            throw new lib.InternalError(messages.MSG_ERROR_PERSONAL_EQUIPMENT, e);
        } else {
            logger.error(
                    "RESOURCE_FILTER_CREATE_FAILED",
                    e.toString(),
                    params.obj.NAME,
                    params.obj.DESC || '',
                    params.obj.VISIBILITY,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE,
                    params.obj.RESOURCE_CATEGORY
                );
            throw new lib.InternalError(messages.MSG_ERROR_CREATE_EQUIPMENT_FILTER, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.destroy = function(params) {
    var deleteentityProc;
    var conn=$.hdb.getConnection();
    try {
        deleteentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_ext_equipment_filter_delete");
        params.id=params.id===undefined?null:params.id;
        
        deleteentityProc(params.id);
        conn.commit();
        logger.success(
                "RESOURCE_FILTER_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "RESOURCE_FILTER_DELETE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError("MSG_ERROR_DELETE_EQUIPMENT_FILTER ", e);
    }
    conn.close();
};

entity.check = function(params) {
    var checkentityProc;
    var conn=$.hdb.getConnection();
    try {
        checkentityProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_equipment_filter_in_plan_check");
        conn.commit();
        return {
            "STATUS": checkentityProc(params.id).PLAN_FLAG
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_EQUIPMENT_FILTER_CHECK, e);
    }
    conn.close()
};

entity.visibleCheck = function(params) {
    var visibleCheckProc, result;
    var conn=$.hdb.getConnection();
    try {
        visibleCheckProc = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.filter::p_equi_filter_visible_in_plan_and_group_check");
        params.id=params.id===undefined?null:params.id;
        result = visibleCheckProc(params.id);
        conn.commit();
        return {
            "RECORDS": result.ERR_NUM,
            "FLAG": result.ERR_FLAG,
            "NAME": result.GROUP_NAME
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_VISIBILITY, e);
    }
    conn.close();
};

entity.queryFacetFilter = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var query = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_resource_filters_facet_filter");
        var result = query(params.obj.search, params.obj.TYPES, params.obj.VISIBILITY,params.obj.RESOURCE_CATEGORY);
        conn.commit();
        return {
            TYPE: Object.keys(result.TYPE_LIST_OUTPUT).map(function(i) { return {key : result.TYPE_LIST_OUTPUT[i].ID, text : result.TYPE_LIST_OUTPUT[i].DESC};}),
            VISIBILITY: Object.keys(result.VISIBILITY_LIST_OUTPUT).map(function(i) { return  {key : result.VISIBILITY_LIST_OUTPUT[i].CODE, text : result.VISIBILITY_LIST_OUTPUT[i].DESC};})
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_RESOURCE_FILTERS, e);
    }
    conn.close();
};

entity.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateResourceFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_FILTER_CREATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::UpdateResourceFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_FILTER_UPDATE_AUTHORIZE_FAILED",
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
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteResourceFilter";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_FILTER_DELETE_AUTHORIZE_FAILED",
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
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
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
},{
    filter : function(params) {
        var conn, entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
          try {
              conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
              conn.setAutoCommit(false);
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.filter::p_resource_filter_delete_check');
              checkResult = checkProc(params.id).WHEREUSED;
              conn.commit();
          } catch (e) {
              conn.rollback();
              logger.error("RESOURCE_FILTER_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_RESOURCE_FILTER_CHECK_USED_FAILED, e);
          }
        if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_RESOURCE_FILTER_IS_USED);
        }
        conn.close();
        return result;
  },
  only : [ "destroy" ]
},{
    filter : function(params) {
        var checkResult, checkProc, errorMessage;
        var conn=$.hdb.getConnection();
          try {
              
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.filter::p_ext_equipment_filter_save_check');
              params.id=params.id===undefined?null:params.id;
               checkResult = checkProc(params.id, params.obj.VISIBILITY, params.obj.ITEMS.map(function(item) { 
                            delete item.NAME; 
                            return item; }), params.obj.TYPE);
                conn.commit();
              if(checkResult.CODE_LIST.length > 0) {
                  if (checkResult.MSG === 'VISIBILITY_CHECK_FAILED_ITEM'){
                        errorMessage = messages.MSG_VISIBILITY_CHECK_FAILED_ITEM;
                    }else{
                        errorMessage = messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                    }
                  logger.error(errorMessage, checkResult.CODE_LIST);
                  throw new lib.InternalError(errorMessage, checkResult.CODE_LIST);
              }
          } catch (e) {
              if (e instanceof lib.WebApplicationError) {
                  throw e;
              }
              logger.error("VISIBILITY_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED, e);
          }
          conn.close();
        return true;
  },
  only : [ "create", "update" ]
}]);

entity.setRoutes([{
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

entity.handle();
