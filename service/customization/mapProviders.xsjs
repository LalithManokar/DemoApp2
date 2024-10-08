var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/customization.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = "sap.tm.trp.db.systemmanagement.customization";
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var mapProviders = new lib.SimpleRest({
    name: "map providers",
    desc: "map providers service",
    model: new model.mapProviders()
});

mapProviders.create = function(params) {
    var createMapProvider, procName, result;
    try {
        procName = "p_ext_map_provider_create";
        createMapProvider = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        result = createMapProvider(params.obj.NAME, params.obj.DESC || '',params.obj.COPYRIGHT, params.obj.ENABLE_FLAG, params.obj.URL_LIST);

        if (result.MESSAGE.length > 0){
        	logger.error(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
            throw new lib.InternalError(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
        }
        logger.success(
                "MAP_PROVIDER_CREATE_SUCCESS",
                result.PROVIDER_ID
            );

        return {
            ID: result.PROVIDER_ID
        };
    } catch (e) {
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        logger.error(
                "MAP_PROVIDER_CREATE_FAILED",
                e.toString(),
                params.obj.NAME,
                params.obj.DESC || '',
                params.obj.COPYRIGHT,
                params.obj.ENABLE_FLAG,
                params.obj.URL_LIST
            );
        throw new lib.InternalError(messages.MSG_ERROR_CREATE_MAP_PROVIDER, e);
    }
};

mapProviders.update = function(params) {
    var updateMapProvider, procName, result;
    try {
        procName = "p_ext_map_provider_update";
        updateMapProvider = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        result = updateMapProvider(params.id, params.obj.NAME, params.obj.DESC || '',params.obj.COPYRIGHT, params.obj.ENABLE_FLAG, params.obj.URL_LIST);

        if (result.MESSAGE.length > 0){
        	logger.error(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
            throw new lib.InternalError(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
        }
        logger.success(
                "MAP_PROVIDER_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        
        logger.error(
                "MAP_PROVIDER_UPDATE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_MAP_PROVIDER, e);
    }
};

mapProviders.destroy = function(params) {
    var destroyMapProvider, procName, result;
    try {
        procName = "p_ext_map_provider_delete";
        destroyMapProvider = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        result = destroyMapProvider(params.id);

        if (result.MESSAGE.length > 0){
        	logger.error(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
            throw new lib.InternalError(messages.MSG_ONE_PROVIDER_SHOULD_BE_ENABLE, result.MESSAGE);
        }
        logger.success(
                "MAP_PROVIDER_DELETE_SUCCESS",
                params.id
            );
    } catch (e) {
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        logger.error(
                "MAP_PROVIDER_DELETE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_MAP_PROVIDER, e);
    }
};

mapProviders.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::CreateMapProvider";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("MAP_PROVIDER_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateMapProvider";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("MAP_PROVIDER_UPDATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteMapProvider";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("MAP_PROVIDER_DELETE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}]);

mapProviders.setRoutes([]);

try {
    mapProviders.handle();
} finally {
    logger.close();
}
