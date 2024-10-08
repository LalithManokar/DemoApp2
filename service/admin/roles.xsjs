var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var PACKAGE = constants.SP_PKG_USER;
var SYS_PACKAGE = constants.SP_PKG_NAME;
var SCHEMA = constants.SCHEMA_NAME;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var role = new lib.SimpleRest({
    name: "role",
    desc: "role management",
    model: new model.Role()
});

role.update = function(params) {
    var conn, group, updateRole, updateRoleItemsProc, updateRoleItems, updateRoleProcName, updateRoleItemsProcName;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        group = params.obj.ROLE_GROUP_ID;

        // update a role
        updateRoleProcName = PACKAGE + "::p_role_update";
        updateRole = new proc.procedure(SCHEMA, updateRoleProcName, {
            connection: conn
        });
        updateRole(params.id, params.obj.ROLE_GROUP_ID, params.obj.NAME, params.obj.DESC);

        switch (group) {
            case constants.ROLE_TYPE.DEPOT_MGR:
                updateRoleItemsProc = "p_role_location_update";
                break;
            /*case constants.ROLE_TYPE.LOCAL_PLR:
                updateRoleItemsProc = "p_role_zone_update";
                break;
                */
            case constants.ROLE_TYPE.REGIONAL_PLR:
                updateRoleItemsProc = "p_role_region_update";
                break;
            case constants.ROLE_TYPE.RESOURCE:
            	updateRoleItemsProc = "p_role_resource_update";
                break;                
        }

        // update items of a role
        updateRoleItemsProcName = PACKAGE + "::" + updateRoleItemsProc;
        updateRoleItems = new proc.procedure(SCHEMA, updateRoleItemsProcName, {
            connection: conn
        });
        updateRoleItems(params.id, params.obj.POSITIONS);

        logger.success(
                "ROLE_UPDATED",params.id,params.obj.ROLE_GROUP_ID,params.obj.NAME,
                 params.obj.DESC,JSON.stringify(params.obj.POSITIONS));

        conn.commit();
    } catch (e) {
        conn.rollback();

        logger.error(
                "ROLE_UPDATED_FAILED",params.id,params.obj.ROLE_GROUP_ID,
                params.obj.NAME,params.obj.DESC,
                JSON.stringify(params.obj.POSITIONS),e);

        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_ROLE_INFO, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

role.create = function(params) {
    var conn, group, createRole, result, createRoleItemsProc, createRoleItems, createRoleProcName, createRoleItemsProcName;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        group = params.obj.ROLE_GROUP_ID;

        // create a role
        createRoleProcName = PACKAGE + "::p_role_create";
        createRole = new proc.procedure(SCHEMA, createRoleProcName, {
            connection: conn
        });
        result = createRole(params.obj.ROLE_GROUP_ID, params.obj.NAME, params.obj.DESC);

        switch (group) {
            case constants.ROLE_TYPE.DEPOT_MGR:
                createRoleItemsProc = "p_role_location_create";
                break;
            /*case constants.ROLE_TYPE.LOCAL_PLR:
                createRoleItemsProc = "p_role_zone_create";
                break;
                */
            case constants.ROLE_TYPE.REGIONAL_PLR:
                createRoleItemsProc = "p_role_region_create";
                break;
            case constants.ROLE_TYPE.RESOURCE:
                createRoleItemsProc = "p_role_resource_create";
                break;    
                
        }

        // create items of a role
        createRoleItemsProcName = PACKAGE + "::" + createRoleItemsProc;
        createRoleItems = new proc.procedure(SCHEMA, createRoleItemsProcName, {
            connection: conn
        });
        createRoleItems(result.ROLE_ID, params.obj.POSITIONS);

        logger.success(
                "ROLE_CREATED",result.ROLE_ID,params.obj.ROLE_GROUP_ID,
                params.obj.NAME,params.obj.DESC,JSON.stringify(params.obj.POSITIONS));

        conn.commit();

        return {
            ID: result.ROLE_ID
        };
    } catch (e) {
        conn.rollback();

        logger.error(
                "ROLE_CREATED_FAILED",params.obj.ROLE_GROUP_ID,
                params.obj.NAME,params.obj.DESC,
                JSON.stringify(params.obj.POSITIONS),e);

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_ROLE, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

role.destroy = function(params) {
    var conn, deleteRoleProcName;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);

        deleteRoleProcName = PACKAGE + "::p_role_delete";
        var deleteRole = new proc.procedure(SCHEMA, deleteRoleProcName, {
            connection: conn
        });
        deleteRole(params.id);

        logger.success(
                "ROLE_DELETED",
                logger.Parameter.Integer(0, params.id));

        conn.commit();
    } catch (e) {
        conn.rollback();

        logger.error(
                "ROLE_DELETE_FAILED",params.id,e);

        throw new lib.InternalError(messages.MSG_ERROR_DELETE_ROLE, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

//map services
//credit depot manager
role.listDepotsOnMap = function(params) {
    var procName, output;
    if (params.obj.field === constants.FIELD.POINT || params.obj.field === constants.FIELD.AGGR_POINT) {
        procName = "p_get_division_for_crtedit_depotmanager_gis_disable";
    } else {
        throw new lib.BadRequestError("Invalid field input");
    }
    var procFullName = SYS_PACKAGE + "::" + procName;
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.obj.mapLevel, params.id || 0, params.obj.locations);

        logger.success(
                "LIST_DEPOT",JSON.stringify(params.obj.mapArea),params.obj.mapLevel,
                params.id || 0,JSON.stringify(params.obj.locations));

        if (results.TOO_MUCH_LOCATION_FLAG === 1) {
            output = {
                TOO_MUCH_LOCATION_FLAG: results.TOO_MUCH_LOCATION_FLAG
            };
        } else {
            output = {
                FIELD: params.obj.field,
                DIVISIONS: results.OUT_DIVISION || [],
                INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
            };
        }
        return output;
    } catch (e) {
        logger.error(
                "LIST_DEPOT_FAILED",
                JSON.stringify(params.obj.mapArea),
                params.obj.mapLevel,
                params.id || 0,
                JSON.stringify(params.obj.locations),
                e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_LOCATIONS, e);
    }
};

/*
role.listZonesOnMap = function(params) {
    var procFullName = SYS_PACKAGE + "::p_get_division_for_local_planner_crtedit_hull";
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.obj.zones).DIVISION_ON_ZONE;

        logger.success(
                "LIST_ZONE",
                JSON.stringify(params.obj.mapArea),
                JSON.stringify(params.obj.zones));

        return {
            FIELD: constants.FIELD.POLYGON, //always polygon
            DIVISIONS: results || []
        };
    } catch (e) {
        logger.error(
                "LIST_ZONE_FAILED",
                JSON.stringify(params.obj.mapArea),
                JSON.stringify(params.obj.zones),
                e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_ZONES, e);
    }

};
*/

role.listHierarchyOnMap = function(params) {
    var procFullName = SYS_PACKAGE + "::p_get_division_for_crtedit_regional_planner_hull";
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.obj.zones);

        logger.success(
                "LIST_HIERARCHY",
                JSON.stringify(params.obj.mapArea),
                JSON.stringify(params.obj.zones));

        return {
            FIELD: constants.FIELD.POLYGON,
            DIVISIONS: results.DIVISION_ON_ZONE || [],
            INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error(
                 "LIST_HIERARCHY_FAILED",
                 JSON.stringify(params.obj.mapArea),
                 JSON.stringify(params.obj.zones),
                 e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_REGIONS, e);
    }
};

//display role
role.showDepotManagerOnMap = function(params) {
    var procName = "p_get_division_for_display_depotmanager_gis_disable";
    var procFullName = SYS_PACKAGE + "::" + procName;
    var output;
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.obj.mapLevel, params.id);

        logger.success(
                "DISPLAY_DEPOT_MANAGER",
                JSON.stringify(params.id),
               JSON.stringify(params.obj.mapArea),
                JSON.stringify(params.obj.mapLevel));

        if (results.TOO_MUCH_LOCATION_FLAG === 1){
            output = {
                TOO_MUCH_LOCATION_FLAG:    results.TOO_MUCH_LOCATION_FLAG
            };
        } else {
            output = {
                FIELD: params.obj.field,
                DIVISIONS: results.OUT_DIVISION || [],
                INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
            };
        }
        return output;
    } catch (e) {
        logger.error(
                "DISPLAY_DEPOT_MANAGER_FAILED",
                JSON.stringify(params.id),
                JSON.stringify(params.obj.mapArea),
                JSON.stringify(params.obj.mapLevel),
                e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_LOCATIONS, e);
    }
};

/*
role.showLocalPlannerOnMap = function(params) {
    var procFullName = SYS_PACKAGE + "::p_get_division_for_local_planner_display_hull";
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.id).DIVISION_ON_ZONE;

        logger.success(
                "DISPLAY_LOCAL_PLANNER",
                JSON.stringify(params.id),
                JSON.stringify(params.obj.mapArea));

        return {
            FIELD: constants.FIELD.POLYGON,
            DIVISIONS: results || []
        };
    } catch (e) {
         logger.error(
                 "DISPLAY_LOCAL_PLANNER_FAILED",
                 JSON.stringify(params.id),
                 JSON.stringify(params.obj.mapArea),
                 e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_ZONES, e);
    }
};
*/

role.showRegionalPlannerOnMap = function(params) {
    var procFullName = SYS_PACKAGE + "::p_get_division_for_display_regional_planner_hull";
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var results = getDivision(params.obj.mapArea, params.id);

        logger.success(
                "DISPLAY_REGIONAL_PLANNER",
                JSON.stringify(params.id),
                JSON.stringify(params.obj.mapArea));

        return {
            FIELD: constants.FIELD.POLYGON,
            DIVISIONS: results.DIVISION_ON_ZONE || [],
            INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error(
                "DISPLAY_REGIONAL_PLANNER_FAILED",
                JSON.stringify(params.id),
               JSON.stringify(params.obj.mapArea),
                 e);

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_REGIONS, e);
    }
};

role.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_roles_facet_filter");
        var result = query(params.obj.search, params.obj.ROLE_GROUP_ID);

        return {
            ROLE_GROUP_ID: result.ROLE_GROUP_ID_LIST_OUTPUT.map(function(i) { return {key: i.ID, text: i.DESC};})
        };
    } catch (e) {
        logger.error("ROLE_FACET_FILTER_GET_FAILED", params.obj, e);
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_ROLES, e);
    }
};

role.setFilters({
    filter: function() {
        var privilege = "sap.tm.trp.service::CreateRole";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ROLE_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateRole";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ROLE_UPDATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteRole";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ROLE_DELETE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}, {
    filter : function(params) {
          var conn, entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
            try {
                conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
                conn.setAutoCommit(false);
                checkProc = new proc.procedure(SCHEMA, 'sap.tm.trp.db.systemmanagement.user::p_user_role_delete_check', {
                    connection: conn
                });
                checkResult = checkProc(params.id).WHEREUSED;
              conn.commit();
            } catch (e) {
                conn.rollback();
                logger.error("ROLE_DELETE_CHECK_FAILED", e, params.id);
                throw new lib.InternalError(messages.MSG_USER_ROLE_CHECK_USED_FAILED, e);
            }
          if (checkResult.length > 0) {
              throw new lib.InternalError(messages.MSG_USER_ROLE_IS_USED);
          }
          return result;
    },
    only : [ "destroy" ]
  }, {
    filter: function(params) {
        var getAssignedUsers = new proc.procedure(SCHEMA, "sap.tm.trp.db.systemmanagement.user::p_get_role_assigned_user");
        var assignedUsers = getAssignedUsers(params.id).ASSIGNED_USERS;

        if (assignedUsers && assignedUsers.length > 0) {
            logger.error(
                    "ROLE_DELETE_NOT_ALLOWED",
                    params.id,
                    JSON.stringify(assignedUsers));

            throw new lib.ValidationError(messages.MSG_ERROR_DELETE_ROLE_NOT_ALLOWED, assignedUsers);
        }
        return true;
    },
    only: ["destroy"]
});

role.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "listDepotsOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "listDepotsOnMap"
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "listZonesOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "listZonesOnMap"
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "listHierarchyOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "listHierarchyOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "showDepotManagerOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "showLocalPlannerOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "showRegionalPlannerOnMap"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}]);

try {
    role.handle();
} finally {
    logger.close();
}
