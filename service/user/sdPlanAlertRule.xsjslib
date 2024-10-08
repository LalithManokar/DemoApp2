var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var SDPlanAlertRuleService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var lib=registrationObjectLib.lib;
SDPlanAlertRuleService.setModel(new model.RegistrationObject());


SDPlanAlertRuleService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterSDPlanAlertRule";
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
        var privilege = "sap.tm.trp.service::EditSDPlanAlertRule";
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
        var privilege = "sap.tm.trp.service::UnregisterSDPlanAlertRule";
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
    SDPlanAlertRuleService.handle();
} finally {
    logger.close();
}