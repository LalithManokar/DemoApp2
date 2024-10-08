var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = 'sap.tm.trp.db.systemmanagement';
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var handler = $.import("/sap/tm/trp/service/leasecontract/materializedViewHandler.xsjslib");
var notifier = new handler.MaterializedViewNotifier(handler.SOURCE.LOCATION);

var locationGroup = new lib.SimpleRest({
    name: "location group",
    desc: "location group management",
    model: new model.LocationGroup()
});

function getUserInfoAuthCheck(locationId, typeId) {
    var conn=$.hdb.getConnection();
    var userType;
    var checkLocationGroupProc = "sap.tm.trp.db.systemmanagement::p_get_user_info_for_auth_check_location_group";
    var checkRegionGroupProc = "sap.tm.trp.db.systemmanagement::p_get_user_info_for_auth_check_region_group";
    var locationCheck = conn.loadProcedure(constants.SCHEMA_NAME, checkLocationGroupProc);
    var regionCheck = conn.loadProcedure(constants.SCHEMA_NAME, checkRegionGroupProc);
    if (typeId === 1) {
        userType = locationCheck(locationId);
    } else if (typeId === 3) {
        userType = regionCheck(locationId);
    }
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

function convertLocationGroupTypeToLocationType(locationGroupType) {
    var locationType;

    switch (locationGroupType) {
        case constants.LOCATION_GROUP_TYPE.LOCATION:
            locationType = constants.LOCATION_TYPE.LOCATION;
            break;

        case constants.LOCATION_GROUP_TYPE.REGION:
            locationType = constants.LOCATION_TYPE.REGION;
            break;
        default:
            throw new lib.InternalError(messages.MSG_FIELD_INVALID,"locationGroupType");
    }
    return locationType;
}

locationGroup.update = function(params) {
    var updatelocationGroup, type;
    var conn=$.hdb.getConnection();
    try {
        type = params.obj.TYPE;
        updatelocationGroup = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_geo_group_update');
        
        params.id=params.id===undefined?null:params.id;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.ITEMS=params.obj.ITEMS===undefined?null:params.obj.ITEMS;
        params.obj.PRIME_LOC_ID=params.obj.PRIME_LOC_ID===undefined?null:params.obj.PRIME_LOC_ID;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        params.obj.TYPE=params.obj.TYPE===undefined?null:params.obj.TYPE;

        updatelocationGroup(params.id, params.obj.NAME, params.obj.DESC || '', params.obj.ITEMS, params.obj.PRIME_LOC_ID, params.obj.VISIBILITY, params.obj.TYPE);
        notifier.notify(params.id,type,handler.ACTION.UPDATE);
        logger.success(
                "LOCATION_GROUP_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
            logger.error(
                    "LOCATION_GROUP_UPDATE_FAILED",
                    params.id,
                    e.toString(),
                    params.obj.NAME,
                    params.obj.DESC || '',
                    params.obj.VISIBILITY,
                    params.obj.PRIME_LOC_ID,
                    JSON.stringify(params.obj.ITEMS),
                    params.obj.TYPE
                );
            throw new lib.InternalError(messages.MSG_ERROR_UPDATE_LOCATION_GROUP, e);
    }
    conn.commit();
    conn.close();
};

locationGroup.create = function(params) {
    var createLocationGroupProc, result, type;
    var conn=$.hdb.getConnection();
    try {
        type = params.obj.TYPE;

        switch (type) {
            case constants.ROLE_TYPE.DEPOT_MGR:
                createLocationGroupProc = "p_ext_location_group_create";
                break;
            /*case constants.ROLE_TYPE.LOCAL_PLR:
                createLocationGroupProc = "p_ext_zone_group_create";
                break;
                */
            case constants.ROLE_TYPE.REGIONAL_PLR:
                createLocationGroupProc = "p_ext_region_group_create";
                break;
        }
        params.id=params.id===undefined?null:params.id;
        params.obj.NAME=params.obj.NAME===undefined?null:params.obj.NAME;
        params.obj.ITEMS=params.obj.ITEMS===undefined?null:params.obj.ITEMS;
        params.obj.PRIME_LOC_ID=params.obj.PRIME_LOC_ID===undefined?null:params.obj.PRIME_LOC_ID;
        params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
        params.obj.TYPE=params.obj.TYPE===undefined?null:params.obj.TYPE;

        var createLocationGroup = conn.loadProcedure(SCHEMA, PACKAGE + '::' + createLocationGroupProc);
        result = createLocationGroup(params.obj.NAME, params.obj.DESC || '', params.obj.ITEMS.map(function(item) { 
            delete item.NAME; 
            return item; 
        }), params.obj.PRIME_LOC_ID, params.obj.VISIBILITY, params.obj.RESOURCE_CATEGORY);
                logger.success(
                "LOCATION_GROUP_CREATE_SUCCESS",
                result.GROUP_ID
            );
     conn.commit();
        return {
            ID: result.GROUP_ID
        };
    } catch (e) {
            logger.error(
                    "LOCATION_GROUP_CREATE_FAILED",
                    e.toString(),
                    params.obj.NAME,
                    params.obj.DESC || '',
                    params.obj.VISIBILITY,
                    params.obj.PRIME_LOC_ID || '',
                    JSON.stringify(params.obj.ITEMS)
                );
            throw new lib.InternalError(messages.MSG_ERROR_CREATE_LOCATION_GROUP, e);
    }
    conn.commit();
    conn.close();
};

locationGroup.destroy = function(params) {
    var deleteLocationGroup;
    var conn=$.hdb.getConnection();
    try {
        deleteLocationGroup = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_geo_group_delete');
        deleteLocationGroup(params.id, params.obj.TYPE);
        notifier.notify(params.id,params.obj.TYPE,handler.ACTION.DELETE);
        logger.success(
                "LOCATION_GROUP_DELETE_SUCCESS",
                params.id,
                params.obj.TYPE
            );
    conn.commit();
    } catch (e) {
        logger.error(
                "LOCATION_GROUP_DELETE_FAILED",
                e.toString(),
                params.id,
                params.obj.TYPE
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_LOCATION_GROUP, e);
    }
    conn.close();
};

locationGroup.visibleCheck = function(params) {
    var visibleCheckProc, result;
    var conn=$.hdb.getConnection();
    try {
        visibleCheckProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_geo_group_visible_in_filter_check');
        result = visibleCheckProc(params.id, params.obj.TYPE);
        return {
            'RECORDS': result.ERR_NUM,
            'FILTER_NAME': result.FILTER_NAME
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_VISIBILITY, e);
    }
    conn.commit();
    conn.close();
};

locationGroup.queryFacetFilter = function(params) {
    var conn = $.hdb.getConnection();
    try {
        var query = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_location_groups_facet_filter");
        var result = query(params.obj.search, params.obj.TYPES, params.obj.VISIBILITY, params.obj.RESOURCE_CATEGORY);

        return {
            TYPE: Object.keys(result.TYPE_LIST_OUTPUT).map(function(i) { return {key : result.TYPE_LIST_OUTPUT[i].ID, text : result.TYPE_LIST_OUTPUT[i].DESC};}),
            VISIBILITY: Object.keys(result.VISIBILITY_LIST_OUTPUT).map(function(i) { return  {key : result.VISIBILITY_LIST_OUTPUT[i].CODE, text : result.VISIBILITY_LIST_OUTPUT[i].DESC};})
        };
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_LOCATION_GROUPS, e);
    }
    conn.commit();
    conn.close();
};

locationGroup.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::CreateLocationGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_GROUP_CREATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::UpdateLocationGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_GROUP_UPDATE_AUTHORIZE_FAILED",
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
        var privilege = "sap.tm.trp.service::DeleteLocationGroup";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOCATION_GROUP_DELETE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}, {
    filter: function(params) {
        try{
            var locationType = convertLocationGroupTypeToLocationType(params.obj.TYPE);
            return geoCheck.authorizeWriteByLocationIdList(locationType, params.obj.ITEMS.map(function(item) { 
                delete item.NAME; 
                return item; 
            }));
        } catch(e) {
            logger.error("LOCATION_GROUP_AUTHORIZE_FAILED");
            throw e;
        }
    },
    only: ["create", "update"]
}, {
    filter : function(params) {
        try {
          return getUserInfoAuthCheck(params.id, params.obj.TYPE);
        } catch (e) {
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
},     {
    filter : function(params) {
        var conn, result = true, checkResult, checkProc;
          try {
              conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});
              conn.setAutoCommit(false);
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_location_group_delete_check');
              checkResult = checkProc(params.id).WHEREUSED;
            conn.commit();
          } catch (e) {
              conn.rollback();
              logger.error("LOCATION_GROUP_DELETE_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_LOCATION_GROUP_CHECK_USED_FAILED, e);
          }
        if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_LOCATION_GROUP_IS_USED);
        }
        return result;
  },
  only : [ "destroy" ]
}, {
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id, params.obj.TYPE);
        } catch (e) {
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "destroy" ]
},{
    filter : function(params) {
        var checkResult, checkProc, errorMessage;
        var conn=$.hdb.getConnection();
          try {
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_ext_geo_group_save_check');
              params.id=params.id===undefined?null:params.id;
                params.obj.PRIME_LOC_ID=params.obj.PRIME_LOC_ID===undefined?null:params.obj.PRIME_LOC_ID;
                params.obj.VISIBILITY=params.obj.VISIBILITY===undefined?null:params.obj.VISIBILITY;
                params.obj.ITEMS=params.obj.ITEMS===undefined?null:params.obj.ITEMS;
              checkResult = checkProc(params.id, params.obj.VISIBILITY, params.obj.PRIME_LOC_ID, params.obj.ITEMS);
              conn.commit();
              if(checkResult.CODE_LIST.length > 0) {
                  if (checkResult.MSG === 'VISIBILITY_CHECK_FAILED_USED_LIST'){
                      errorMessage = messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                  }else{
                      errorMessage = messages.MSG_PRIMARY_LOCATION_CHECK_USED_FAILED;
                  }
                  logger.error(errorMessage, checkResult.CODE_LIST, params.id);
                  throw new lib.InternalError(errorMessage, checkResult.CODE_LIST);
              }
          } catch (e) {
              if (e instanceof lib.WebApplicationError) {
                  throw e;
              }
              logger.error("MSG_LOCATION_GROUP_SAVE_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_LOCATION_GROUP_SAVE_CHECK_FAILED, e);
          }
        return true;
  },
  only : [ "create", "update" ]

}]);

locationGroup.setRoutes([{
    method: $.net.http.GET,
    scope: "member",
    action: "visibleCheck"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}]);

try {
    locationGroup.handle();
} finally {
    logger.close();
}
