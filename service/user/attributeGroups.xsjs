var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var entity = new lib.SimpleRest({ 
    name: "AttributeGroup",
    desc: "Attribute Group",
    model: new model.AttributeGroup()
});

function getUserInfoAuthCheck(groupId) {
    var conn=$.hdb.getConnection();
    var checkUserTypeProc = "sap.tm.trp.db.filter::p_get_user_info_for_auth_check_attribute_filter";
    var getUserType = conn.loadProcedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(groupId);
    conn.commit();
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            logger.error("ATTRIBUTE_GROUP_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    conn.close();
    return true;
}

entity.create = function(params) {
    try {
        var tab1 = [];
         for( var i = 0,j = 1; i < (params.obj.ITEMS).length; i++){  
           if(params.obj.ITEMS[i].ATTRIBUTE_ID != null)
               {
                   params.obj.ITEMS[i].LOGIC_OPERATOR=params.obj.ITEMS[i].LOGIC_OPERATOR===undefined?null:params.obj.ITEMS[i].LOGIC_OPERATOR;
               	 tab1.push({"ITEM_ID": params.obj.ITEMS[i].ITEM_ID,"SEQUENCE": j,"LOGIC_OPERATOR":params.obj.ITEMS[i].LOGIC_OPERATOR,"ATTRIBUTE_ID": params.obj.ITEMS[i].ATTRIBUTE_ID,"OPERATOR_CODE":params.obj.ITEMS[i].OPERATOR_CODE});
                 j++;
               }
         } 
        params.obj.RESOURCE_CATEGORY=params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.DESC=params.obj.DESC===undefined?null:params.obj.DESC;
        params.obj.CATEGORY=params.obj.CATEGORY===undefined?null:params.obj.CATEGORY;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        params.obj.VALUES=params.obj.VALUES===undefined?null:params.obj.VALUES;
        var conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.SERIALIZABLE});
        conn.setAutoCommit(false);
        var createAttributesGroup = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.filter::p_attribute_group_create");
        var output = createAttributesGroup(params.obj.NAME, params.obj.DESC,params.obj.CATEGORY, params.obj.VISIBILITY, tab1 , params.obj.VALUES, params.obj.RESOURCE_CATEGORY);
        logger.success(
                "ATTRIBUTE_GROUP_CREATE_SUCCESS",
                output.GROUP_ID
            );
            
        conn.commit();
        return {
            ID: output.GROUP_ID
        };
      
    } catch (e) {
        logger.error(
                "ATTRIBUTE_GROUP_CREATE_FAILED",
                e,
                params.obj.NAME,
                params.obj.DESC,
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS),
                JSON.stringify(params.obj.VALUES),
                JSON.stringify(params.obj.RESOURCE_CATEGORY)
            );

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_ATTIBUTE_GROUP, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

entity.update = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var tab1 = [];
         for( var i = 0,j = 1; i < (params.obj.ITEMS).length; i++){  
           if(params.obj.ITEMS[i].ATTRIBUTE_ID != null)
               {
               	 params.obj.ITEMS[i].LOGIC_OPERATOR=params.obj.ITEMS[i].LOGIC_OPERATOR===undefined?null:params.obj.ITEMS[i].LOGIC_OPERATOR;
               	 tab1.push({"ITEM_ID": params.obj.ITEMS[i].ITEM_ID,"SEQUENCE": j,"LOGIC_OPERATOR":params.obj.ITEMS[i].LOGIC_OPERATOR,"ATTRIBUTE_ID": params.obj.ITEMS[i].ATTRIBUTE_ID,"OPERATOR_CODE":params.obj.ITEMS[i].OPERATOR_CODE});
                 j++;
               }
         }
        var updateAttributesGroup = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.filter::p_attribute_group_update");
        params.id=params.id===undefined?null:params.id;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.DESC=params.obj.DESC===undefined?null:params.obj.DESC;
        params.obj.CATEGORY=params.obj.CATEGORY===undefined?null:params.obj.CATEGORY;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        params.obj.VALUES=params.obj.VALUES===undefined?null:params.obj.VALUES;
        updateAttributesGroup(params.id, params.obj.NAME, params.obj.DESC, params.obj.CATEGORY, params.obj.VISIBILITY, tab1, params.obj.VALUES);
        conn.commit();
        logger.success(
                "ATTRIBUTE_GROUP_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "ATTRIBUTE_GROUP_UPDATE_FAILED",
                params.id,
                e,
                params.obj.NAME,
                params.obj.DESC,
                params.obj.VISIBILITY,
                JSON.stringify(params.obj.ITEMS),
                JSON.stringify(params.obj.VALUES)
            );

        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_ATTIBUTE_GROUP, e);
    } 
    conn.close();
};

entity.destroy = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var deleteAttributesGroup = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.filter::p_attribute_group_delete");
        deleteAttributesGroup(params.id);
        conn.commit();
        logger.success(
                "ATTRIBUTE_GROUP_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {

        logger.error(
                "ATTRIBUTE_GROUP_DELETE_FAILED",
                params.id,
                e
            );

        throw new lib.InternalError(messages.MSG_ERROR_DELETE_ATTIBUTE_GROUP, e);
    }
    conn.close();
};

entity.queryFacetFilter = function(params) {
    var conn=$.hdb.getConnection();
    try {
        var query = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.systemmanagement.user::p_get_attribute_groups_facet_filter");
        var result = query(params.obj.search, params.obj.RESOURCE_CATEGORY, params.obj.VISIBILITY);
        conn.commit();
        logger.success(
                "QUERY_FACET_FILTER_SUCCESS",
                params.obj.search,
                params.obj.RESOURCE_CATEGORY,
                JSON.stringify(params.obj.VISIBILITY));
        return {
            VISIBILITY: Object.keys(result.VISIBILITY_LIST_OUTPUT).map(function(item) { return {key: result.VISIBILITY_LIST_OUTPUT[item].CODE, text: result.VISIBILITY_LIST_OUTPUT[item].DESC};})
        };
    } catch (e) {
        logger.error(
                "QUERY_FACET_FILTER_FAILED",
                params.obj.search,
                params.obj.RESOURCE_CATEGORY,
                JSON.stringify(params.obj.VISIBILITY),
                e);
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_ATTIBUTE_GROUP, e);
    }
    conn.close();
};

entity.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateAttributeGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ATTRIBUTE_GROUP_CREATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::UpdateAttributeGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ATTRIBUTE_GROUP_UPDATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::DeleteAttributeGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("ATTRIBUTE_GROUP_DELETE_AUTHORIZE_FAILED",
                    privilege);

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
        var conn, checkResult, checkProc;
          try {
              conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
              conn.setAutoCommit(false);
              checkProc = conn.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.filter::p_attribute_group_delete_check");
              checkResult = checkProc(params.id).WHEREUSED;
            conn.commit();
          } catch (e) {
              conn.rollback();
              logger.error("ATTRIBUTE_GROUP_CHECK_USED_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_ATTRIBUTE_GROUP_CHECK_USED_FAILED, e);
          }
        if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_ATTRIBUTE_GROUP_IS_USED);
        }
        return true;
  },
  only : [ "destroy" ]
},{
    filter : function(params) {
        var checkResult, checkProc, errorMessage;
        var conn=$.hdb.getConnection();
          try {
              var tab1=[{"ID": params.obj.ITEMS[0].ITEM_ID}];
              checkProc = conn.loadProcedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.filter::p_ext_attribute_filter_save_check');
              params.id=params.id===undefined?null:params.id;
              params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
              checkResult = checkProc(params.id, params.obj.VISIBILITY, tab1);
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
          conn.close();
        return true;
  },
  only : [ "create", "update" ]
}]);

entity.setRoutes({
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
});

try{
    entity.handle();
} finally {
    logger.close();
}