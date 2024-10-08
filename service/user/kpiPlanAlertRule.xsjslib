var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var KPIPlanAlertRuleService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var lib=registrationObjectLib.lib;
KPIPlanAlertRuleService.setModel(new model.RegistrationObject());



KPIPlanAlertRuleService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterKPIPlanAlertRule";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_CREATE_AUTHORIZE_FAILED",
                privilege,
                params.obj.NAME);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::EditKPIPlanAlertRule";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_UPDATE_AUTHORIZE_FAILED",
                privilege,
                params.id,
                params.obj.NAME);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::UnregisterKPIPlanAlertRule";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_DELETE_AUTHORIZE_FAILED",
                privilege,
                params.id);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}]);

try {
    KPIPlanAlertRuleService.handle();
} finally {
    logger.close();
}