var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var model = $.import("/sap/tm/trp/service/model/dashboard.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;

var tile = new lib.SimpleRest({
    name: "Dashboard Setting",
    desc: "Setting Service Gernerated by RailXS Scaffold Service",
    model: new model.Tile()
});

tile.create = function(params) {
    try {
        var createTile = new proc.procedure(SCHEMA, "sap.tm.trp.db.dashboard::p_ext_tile_create");
        var result = createTile(params.obj.TYPE, params.obj.itemList, params.obj.RESOURCE_CATEGORY);
        var tileId = result.TILE_ID;

        logger.success(
            "TILE_CREATED",
            tileId,
            params.obj.TYPE,
            JSON.stringify(params.obj.SETTINGS),
            params.obj.RESOURCE_CATEGORY);

        return {ID : tileId};
    } catch (e) {
        logger.error(
            "TILE_CREATE_FAILED",
            params.obj.TYPE,
            JSON.stringify(params.obj.SETTINGS),
            params.obj.RESOURCE_CATEGORY);

        throw new lib.InternalError(messages.MSG_TILE_ERROR_CREATE, e);
    }
};


tile.update = function(params) {
    try {
        var updateTile = new proc.procedure(SCHEMA, "sap.tm.trp.db.dashboard::p_ext_tile_update");
        updateTile(params.id, params.obj.TYPE, params.obj.itemList);

        logger.success(
            "TILE_UPDATED",
            params.id,
            params.obj.TYPE,
            JSON.stringify(params.obj.SETTINGS));

    } catch (e) {
        logger.error(
            "TILE_UPDATE_FAILED",
            params.obj.TYPE,
            JSON.stringify(params.obj.SETTINGS));

        throw new lib.InternalError(messages.MSG_TILE_ERROR_UPDATE, e);
    }
};

tile.destroy = function(params) {
    try {
        var deleteTile = new proc.procedure(SCHEMA, "sap.tm.trp.db.dashboard::p_ext_tile_delete");
        deleteTile(params.id);

        logger.success(
            "TILE_DELETED",
            params.id);

    } catch (e) {
        logger.error(
            "TILE_DELETE_FAILED",
            params.id);

        throw new lib.InternalError(messages.MSG_TILE_ERROR_DELETE, e);
    }
};

tile.index = function(params) {
    try {
        var showTile = new proc.procedure(SCHEMA, "sap.tm.trp.db.dashboard::p_ext_tile_get");
        var results = showTile(params.get("RESOURCE_CATEGORY")); 
        var tiles = results.TILES.map(function(item) {
            var settings = {};

            results.TILE_ITEMS.filter(function(i) {
                return i.TILE_ID === item.ID;
            }).forEach(function(i) {
                 settings[i.KEY] = JSON.parse(i.VALUE);
            });

            return {ID: item.ID, TYPE: item.TYPE, SEQUENCE: item.SEQ, SETTINGS: settings};
        });
        return {results: tiles};
    } catch (e) {
        logger.error("TILE_SEQ_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_TILE_ERROR_DISPLAY, e);
    }
};

tile.updateSequence = function(params) {
    try {
        var updateSequence = new proc.procedure(SCHEMA, "sap.tm.trp.db.dashboard::p_ext_tile_update_sequence");
        updateSequence(params.obj.sequencedTiles);

        logger.success("TILE_SEQ_UPDATED");
    } catch (e) {
        logger.error("TILE_SEQ_UPDATE_FAILED");

        throw new lib.InternalError(messages.MSG_TILE_ERROR_UPDATE_SEQUENCE, e);
    }
};

tile.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::CreateTile";
        if (!$.session.hasAppPrivilege(privilege)) {
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateTile";
        if (!$.session.hasAppPrivilege(privilege)) {
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteTile";
        if (!$.session.hasAppPrivilege(privilege)) {
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DisplayTile";
        if (!$.session.hasAppPrivilege(privilege)) {
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["index"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateTileSequence";
        if (!$.session.hasAppPrivilege(privilege)) {
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["updateSequence"]
}]);


tile.setRoutes({
    method: $.net.http.PUT,
    scope: "collection",
    action: "updateSequence",
    response: $.net.http.NO_CONTENT
});

try {
    tile.handle();
} finally {
    logger.close();
}