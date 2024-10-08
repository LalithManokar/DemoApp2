var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var model = $.import("/sap/tm/trp/service/model/customization.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = "sap.tm.trp.db.systemmanagement.customization";
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var logisticsSystemSettings = new lib.SimpleRest({
    name: "logistics system settings",
    desc: "logistics system settings service",
    model: new model.logisticsSystemSettings()
});

logisticsSystemSettings.update = function(params) {
    var updateLogisticsSystemSetting, procName;
    try {
        procName = "p_ext_config_update";
        updateLogisticsSystemSetting = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        updateLogisticsSystemSetting(params.obj.DESC || '', params.obj.CLIENT_CODE_ID, params.obj.ZONE_HIERARCHY_ID);
        logger.success(
                "LOGISTICS_SYSTEM_SETTING_UPDATE_SUCCESS",
                params.id
            );
    } catch (e) {
        logger.error(
                "LOGISTICS_SYSTEM_SETTING_UPDATE_FAILED",
                params.id,
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_LOGISTICS_SYSTEM_SETTING, e);
    }

};

logisticsSystemSettings.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::UpdateLogisticsSystemSetting";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("LOGISTICS_SYSTEM_SETTING_UPDATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}]);

logisticsSystemSettings.setRoutes([
    {
        method: $.net.http.PUT,
        scope: "collection",
        action: "update"
    }
]);

try {
    logisticsSystemSettings.handle();
} finally {
    logger.close();
}
