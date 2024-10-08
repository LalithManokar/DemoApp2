var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var handler = $.import("/sap/tm/trp/service/leasecontract/materializedViewHandler.xsjslib");

var notifier = new handler.MaterializedViewNotifier(handler.SOURCE.RESOURCE);

var entity = new lib.SimpleRest({
    name: "entity",
    desc: "entity group management",
    model: new model.ResourceGroup()
});

function getUserInfoAuthCheck(groupId) {
    var conn=$.hdb.getConnection();
    var checkUserTypeProc = "sap.tm.trp.db.systemmanagement::p_get_user_info_for_auth_check_resource_group";
    var getUserType = conn.loadProcedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(groupId);
    conn.commit();
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    conn.close();
    return true;
}

entity.update = function(params) {
    var conn=$.hdb.getConnection();
    var updateEquiGroup;
    try {
        updateEquiGroup = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_equi_group_update');
        
        params.id=params.id===undefined?null:params.id;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.ITEMS=params.obj.ITEMS===undefined?null:params.obj.ITEMS;
        params.obj.RESOURCE_CATEGORY=params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        
        updateEquiGroup(params.id, params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.RESOURCE_CATEGORY);
        conn.commit();
        notifier.notify(params.id,2,handler.ACTION.UPDATE);
        logger.success(
                "RESOURCE_GROUP_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "RESOURCE_GROUP_UPDATE_FAILED",
                params.id,
                e.toString(),
                params.obj.NAME,
                params.obj.DESC || '',
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS)
            );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_EQUIPMENT_GROUP, e);
    }
    conn.close();
};

entity.create = function(params) {
    var createEquiGroup, result;
    var conn=$.hdb.getConnection();
    try {
        createEquiGroup = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_equi_group_create');
        params.id=params.id===undefined?null:params.id;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.ITEMS=params.obj.ITEMS===undefined?null:params.obj.ITEMS;
        params.obj.RESOURCE_CATEGORY=params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        result = createEquiGroup(params.obj.NAME, params.obj.DESC || '', params.obj.VISIBILITY, params.obj.ITEMS, params.obj.RESOURCE_CATEGORY);
        conn.commit();
        logger.success(
                "RESOURCE_GROUP_CREATE_SUCCESS",
                result.GROUP_ID
            );
        return {
            ID: result.GROUP_ID
        };
    } catch (e) {
        logger.error(
                "RESOURCE_GROUP_CREATE_FAILED",
                e.toString(),
                params.obj.NAME,
                params.obj.DESC || '',
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS,
                params.obj.RESOURCE_CATEGORY)
            );
        throw new lib.InternalError(messages.MSG_ERROR_CREATE_EQUIPMENT_GROUP, e);
    }
    conn.close();
};

entity.destroy = function(params) {
    var deleteEquiGroup;
    var conn=$.hdb.getConnection();
    try {
        deleteEquiGroup = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_equi_group_delete');
        deleteEquiGroup(params.id);
        conn.commit();
        notifier.notify(params.id,2,handler.ACTION.DELETE);
        logger.success(
                "RESOURCE_GROUP_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "RESOURCE_GROUP_DELETE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_EQUIPMENT_GROUP, e);
    }
    conn.close();
};

entity.updateCheck = function(params) {
    var entityCheckProc;
    var conn=$.hdb.getConnection();
    try {
        //check the equipment group in plan
        entityCheckProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_equipment_group_in_plan_check');
        conn.commit();
        return {
            'STATUS': entityCheckProc(params.id).PLAN_FLAG
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_EQUIPMENT_GROUP, e);
    }
    conn.close();
};

entity.deleteCheck = function(params) {
    var conn, entityLastCheckProc, entityCheckProc, result = {}, checkResult;
    try {
        conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
        conn.setAutoCommit(false);
        entityLastCheckProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_last_equi_group_item_in_filter_check');
        checkResult = entityLastCheckProc(params.id);
        conn.commit();
        //check the Equipment Group whether or not it is the last item of a Equipment Filter
        if (checkResult.ERR_NUM > 0) {
            //'A' means AlertDialog
            result = {
                'STATUS': 'A',
                'FILTER_NAME': checkResult.FILTER_NAME
            };
        } else {
            entityCheckProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_equipment_group_in_plan_check');
            result = {
                'STATUS': entityCheckProc(params.id).PLAN_FLAG
            };
        }
        conn.commit();
        return result;
    } catch (e) {
        conn.rollback();
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_EQUIPMENT_GROUP, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.visibleCheck = function(params) {
    var visibleCheckProc, result;
    var conn=$.hdb.getConnection();
    try {
        visibleCheckProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_equi_group_visible_in_filter_check');
        result = visibleCheckProc(params.id);
        conn.commit();
        return {
            'RECORDS': result.ERR_NUM,
            'FILTER_NAME': result.FILTER_NAME
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_VISIBILITY, e);
    }
    conn.close();
};

entity.queryFacetFilter = function(params) {
    var conn=$.hdb.getConnection();
    try {
        
        var query = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_resource_groups_facet_filter");
        var result = query(params.obj.search, params.obj.VISIBILITY, params.obj.RESOURCE_CATEGORY);
        conn.commit();
        return {
            VISIBILITY: Object.keys(result.VISIBILITY_LIST_OUTPUT).map(function(i) { return  {key : result.VISIBILITY_LIST_OUTPUT[i].CODE, text : result.VISIBILITY_LIST_OUTPUT[i].DESC};})
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_RESOURCE_GROUPS, e);
    }
    conn.close();
};

entity.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateResourceGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_GROUP_CREATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::UpdateResourceGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_GROUP_UPDATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::DeleteResourceGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("RESOURCE_GROUP_DELETE_AUTHORIZE_FAILED",
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
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "destroy" ]
},  {
    filter : function(params) {
          var conn, entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
            try {
                conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
                conn.setAutoCommit(false);
                checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_resource_group_delete_check');
                checkResult = checkProc(params.id).WHEREUSED;
                conn.commit();
            } catch (e) {
                conn.rollback();
                logger.error("RESOURCE_GROUP_DELETE_CHECK_FAILED", e, params.id);
                throw new lib.InternalError(messages.MSG_RESOURCE_GROUP_CHECK_USED_FAILED, e);
            }
            if(checkResult.length > 0) {
                throw new lib.InternalError(messages.MSG_RESOURCE_GROUP_IS_USED);
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
        var checkResult, checkProc;
        var conn=$.hdb.getConnection();
          try {
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_equi_group_save_check');
              params.id=params.id===undefined?null:params.id;
              checkResult = checkProc(params.id, params.obj.VISIBILITY, params.obj.ITEMS.map(function(item) { 
            delete item.NAME; 
            return item; 
            }));
            conn.commit();
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
          conn.close();
        return true;
  },
  only : [ "create", "update" ]
}]);

entity.setRoutes([{
    method: $.net.http.GET,
    scope: "member",
    action: "deleteCheck"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "updateCheck"
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
