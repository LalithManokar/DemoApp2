var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/user.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remote.xsjslib").RemoteClient;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var handler = $.import("/sap/tm/trp/service/leasecontract/materializedViewHandler.xsjslib");

var ZONE_TYPE = constants.ZONE_TYPE;
var FIELD = constants.FIELD;
var SYS_PACKAGE = constants.SP_PKG_NAME;
var SCHEMA = constants.SCHEMA_NAME;

var notifier = new handler.MaterializedViewNotifier(handler.SOURCE.LOCATION);
var zone = new lib.SimpleRest({
    name: "Zone",
    desc: "Zone Service",
    model: new model.Zone()
});

var pathPrefix = "/sap/bc/rest_trp/zones";
var remote = new RemoteClient();

function buildRequestBody(obj) {
    return JSON.stringify({
        ZONE: obj
    });
}

function buildResponseBody(response) {
    var data = response.ZONE;
    return data;
}

function isAlreadyExists(response) {
    if (response.body) {
        var err = JSON.parse(response.body.asString());
        if (err.hasOwnProperty("MESSAGES")) {
            for (var i = 0; i < err.MESSAGES.length; i++) {
                var item = err.MESSAGES[i];
                if (item.hasOwnProperty("MESSAGE") && item.MESSAGE.indexOf("already exists") !== -1) {
                    return  true;
                }
            }
        }
    }
    return false;
}

zone.show = function(params) {
    var zone;

    remote.request({
        url : pathPrefix + "/" + params.id,
        method : $.net.http.GET,
        success : function(response) {
            try {
                zone = JSON.parse(response.body.asString());
            } catch (e) {
                throw new lib.InternalError(messages.MSG_ERROR_UPDATE_HIERARCHY, e);
            }
        },
        error : function(response) {
            throw new lib.InternalError(messages.MSG_ERROR_GET_ZONE_INFO, utils.buildErrorResponse(response, "MSG_SERVER_ERROR"));
        }
    });

    return zone;
};

zone.create = function(params) {
    var zone;
    var primaryLocId = params.obj.PRIME_LOC_ID;

    delete params.obj.PRIME_LOC_ID;
    delete params.obj.PRIME_LOC_NAME;

    remote.request({
        url : pathPrefix,
        method : $.net.http.POST,
        data : buildRequestBody(params.obj),
        success : function(response) {
            var createZonePrimaryLocatioin = new proc.procedure(SCHEMA,"sap.tm.trp.db.systemmanagement.location::p_zone_primary_location_create");
            createZonePrimaryLocatioin(params.obj.NAME, primaryLocId, params.obj.LOCATIONS);

            logger.success("ZONE_CREATED", params.obj.NAME);

            zone = buildResponseBody(response);
        },
        error : function(response) {
            logger.error("ZONE_CREATE_FAILED", params.obj.NAME, response);

            if(isAlreadyExists(response)) {
                throw new lib.InternalError(messages.MSG_NAME_NON_UNIQUE, {args:[params.obj.NAME]});
            }

            throw new lib.InternalError(messages.MSG_ERROR_CREATE_ZONE, utils.buildErrorResponse(response, "MSG_SERVER_ERROR"));
        }
    });

    return zone;
};

zone.update = function(params) {
    var primaryLocId = params.obj.PRIME_LOC_ID;

    delete params.obj.PRIME_LOC_ID;
    delete params.obj.PRIME_LOC_NAME;

    remote.request({
        url : pathPrefix + "/" + params.id,
        method : $.net.http.PUT,
        data : buildRequestBody(params.obj),
        success : function() {
            var updateZonePrimaryLocatioin = new proc.procedure(SCHEMA,"sap.tm.trp.db.systemmanagement.location::p_zone_primary_location_update");

            updateZonePrimaryLocatioin(params.obj.NAME, primaryLocId, params.obj.LOCATIONS);

            notifier.notify(params.id,5,handler.ACTION.UPDATE);

            logger.success("ZONE_UPDATED", params.id);
        },
        error : function(response) {
            logger.error("ZONE_UPDATE_FAILED", params.id, response.body.asString());

            throw new lib.InternalError(messages.MSG_ERROR_UPDATE_ZONE, utils.buildErrorResponse(response, "MSG_SERVER_ERROR"));
        }
    });
};

zone.destroy = function(params) {
    remote.request({
        url : pathPrefix + "/" + params.id,
        method : $.net.http.DEL,
        success : function() {
            var deleteZonePrimaryLocatioin = new proc.procedure(SCHEMA,"sap.tm.trp.db.systemmanagement.location::p_zone_primary_location_delete");
            var deleteZoneStockSetting = new proc.procedure(SCHEMA,"sap.tm.trp.db.stock::p_location_stock_delete");
            deleteZonePrimaryLocatioin(params.id);
            deleteZoneStockSetting(params.id);

            notifier.notify(params.id,5,handler.ACTION.DELETE);

            logger.success("ZONE_DELETED", params.id);
        },
        error : function(response) {
            logger.error("ZONE_DELETE_FAILED", params.id, response.body.asString());

            throw new lib.InternalError(messages.MSG_ERROR_DELETE_ZONE, utils.buildErrorResponse(response, "MSG_SERVER_ERROR"));
        }
    });
};

//map services
zone.showConvexHullOnMap = function(params) {
    var procName;
    var selectedType = params.obj.SELECTED_TYPE;
    var output = [];

    switch (selectedType) {
        case ZONE_TYPE.LOCATION:
            procName = "p_get_division_for_crtedit_location_zone_hull";
            break;
        case ZONE_TYPE.ADMIN_DIVISION:
            procName = "p_get_division_for_crtedit_admingis_zone_hull";
            break;
        case ZONE_TYPE.POSTAL_CODE:
            procName = "p_get_division_for_crtedit_postalcode_zone_hull";
            break;
        default:
            throw new lib.BadRequestError("Invalid zone type");
    }
    var procFullName = SYS_PACKAGE + "::" + procName;
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var divisionResult = getDivision(params.obj.MAP_AREA, params.obj.SELECTED_ITEMS_MAP);
        var results = divisionResult.DIVISION_POINT;
        if (results.length > 0 && !Object.keys(results[0]).every(function(i) { return results[0][i] === null; })) {
            output = results
                .map(function(item) {
                    return {
                      BOUNDARY: item.BOUNDARY,
                      LOCATION_NO: item.LOCATION_NO
                    };
                });
        }

        return {
            FIELD: FIELD.POLYGON,
            DIVISIONS: output || [],
            INVALID_LOCATIONS: divisionResult.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error("SHOW_CREATE_CONVEXHULL_FAILED",
            JSON.stringify(params.obj.MAP_AREA),
            JSON.stringify(params.obj.SELECTED_ITEMS_MAP),
            e
        );

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_ZONES, e);
    }
};

zone.showOnMap = function(params) {
    var procName;
    var selectedType = params.obj.selectedType;
    var output = [];

    switch (selectedType) {
        case ZONE_TYPE.LOCATION:
            procName = "p_get_division_for_display_location_zone_hull";
            break;
        case ZONE_TYPE.ADMIN_DIVISION:
            procName = "p_get_division_for_display_admingis_zone_hull";
            break;
        case ZONE_TYPE.POSTAL_CODE:
            procName = "p_get_division_for_display_postalcode_zone_hull";
            break;
        default:
            throw new lib.BadRequestError("Invalid zone type");
    }
    var procFullName = SYS_PACKAGE + "::" + procName;
    try {
        var getDivision = new proc.procedure(SCHEMA, procFullName);
        var divisonResult = getDivision(params.obj.mapArea, params.id);
        var results = divisonResult.DIVISION_POINT;
        if (results.length !==0 && !Object
                .keys(results[0])
                .every(
                    function(i) {
                        return results[0][i] === null;
                    })) {
                output = results
                    .map(function(item) {
                        return {
                          BOUNDARY: item.BOUNDARY,
                          LOCATION_NO: item.LOCATION_NO
                        };
                    });
            }
        logger.success("SHOW_CONVEXHULL",
            params.id,
            JSON.stringify(params.obj.mapArea)
        );

        return {
            FIELD: FIELD.POLYGON,
            DIVISIONS: output || [],
            INVALID_LOCATIONS: divisonResult.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    } catch (e) {
        logger.error("SHOW_CONVEXHULL_FAILED",
            params.id,
            JSON.stringify(params.obj.mapArea),
            e
        );

        throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ASSIGNED_ZONES, e);
    }

};

zone.getRegionLocations = function(params){
    var procName = "sap.tm.trp.db.systemmanagement.location::p_region_location_ui";
    try {
        var getLocationListProc = new proc.procedure(SCHEMA, procName);
        var results = getLocationListProc(params.obj.REGIONS).OUT_LOCATION_LIST;
        return results;
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_GET_REGION_LOCATION, e);
    }
};

zone.getLocationZones = function(params){
    var procName = "sap.tm.trp.db.systemmanagement.location::p_getlocations_of_zone";
    try {
        var getLocationListProc = new proc.procedure(SCHEMA, procName);
        var results = getLocationListProc(params.obj.LOCATION_IDS, params.obj.STATE_CODES, params.obj.POSTAL_CODES).OUT_LOCATION_LIST;
        return results;
    } catch (e) {
        throw new lib.InternalError(messages.MSG_ERROR_GET_LOCATION_ZONE, e);
    }
};

zone.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::CreateZone";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ZONE_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateZone";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ZONE_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteZone";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error(
                    "ZONE_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
},{
    filter: function(params) {
         var checkResult, checkProc;
         try {
             checkProc = new proc.procedure(SCHEMA, 'sap.tm.trp.db.systemmanagement.location::p_zone_save_check');
             checkResult = checkProc(params.obj.NAME, params.obj.PRIME_LOC_ID);
             if(checkResult.CODE_LIST.length > 0) {
                 logger.error('ZONE_UPDATE_FAILED', checkResult.CODE_LIST, params.id);
                 throw new lib.InternalError(messages.MSG_PRIMARY_LOCATION_CHECK_USED_FAILED, checkResult.CODE_LIST);
             }
         } catch (e) {
             if (e instanceof lib.WebApplicationError) {
                 throw e;
             }
             logger.error("MSG_ZONE_SAVE_CHECK_FAILED", e, params.id);
             throw new lib.InternalError(messages.MSG_ZONE_SAVE_CHECK_FAILED, e);
         }
       return true;
    },
    only: ["update"]
},{
    filter : function(params) {
        var conn, checkResult, checkProc;
          try {
              conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
              conn.setAutoCommit(false);
              checkProc = new proc.procedure(SCHEMA, 'sap.tm.trp.db.systemmanagement::p_region_delete_check', {
                  connection: conn
              });
              checkResult = checkProc(params.id).WHEREUSED;
            conn.commit();
          } catch (e) {
              conn.rollback();
              logger.error("ZONE_DELETE_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_ZONE_DELETE_CHECK_FAILED, e);
          }
        if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_ZONE_IS_USED);
        }
        return true;
  },
  only : [ "destroy" ]
}

]);

zone.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "showConvexHullOnMap"
}, {
    method: $.net.http.POST,
    scope: "member",
    action: "showConvexHullOnMap"
}, {
    method: $.net.http.GET,
    scope: "member",
    action: "showOnMap"
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "getADCentroid"
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "getPCCentroid"
}, {
    method: $.net.http.GET,
    scope: "collection",
    action: "getADCentroid2"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "testCreate"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "getRegionLocations"
}, {
    method: $.net.http.POST,
    scope: "collection",
    action: "getLocationZones"
}]);

try {
    zone.handle();
} finally {
    logger.close();
}
