var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");
var lib = registrationObjectLib.lib;
var locationDeterminationRuleService = registrationObjectLib.registrationObjectService;
var model = registrationObjectLib.model;
var logger = registrationObjectLib.logger;
var constants = registrationObjectLib.constants;

locationDeterminationRuleService.setModel(new model.RegistrationObject());

locationDeterminationRuleService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterLocationDeterminationRule";
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
        var privilege = "sap.tm.trp.service::EditLocationDeterminationRule";
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
        var privilege = "sap.tm.trp.service::UnregisterLocationDeterminationRule";
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
    locationDeterminationRuleService.handle();
} finally {
    logger.close();
}
