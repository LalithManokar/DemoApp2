var lib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var exclusiveRuleService = lib.registrationObjectService;
var logger = lib.logger;
var model = lib.model;
exclusiveRuleService.setModel(new model.RegistrationObject());



exclusiveRuleService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterExclusiveRule";
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
        var privilege = "sap.tm.trp.service::EditExclusiveRule";
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
        var privilege = "sap.tm.trp.service::UnregisterExclusiveRule";
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
    exclusiveRuleService.handle();
} finally {
    logger.close();
}
