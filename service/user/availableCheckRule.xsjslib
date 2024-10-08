var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var availableCheckRuleService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var lib = registrationObjectLib.lib;
var constants = registrationObjectLib.constants;
var messages = registrationObjectLib.messages;
availableCheckRuleService.setModel(new model.RegistrationObject());

availableCheckRuleService.setFilters([{
    filter: function() {
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", constants.RULE_TYPE.AVAILABLE_CHECK_RULE);

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_THIS_TYPE_OF_RULE_NOT_ALLOWED);
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::EditAvailableCheckRule";
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
    filter: function() {
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", constants.RULE_TYPE.AVAILABLE_CHECK_RULE);

        throw new lib.InternalError(messages.MSG_ERROR_DELETE_THIS_TYPE_OF_RULE_NOT_ALLOWED);
    },
    only: ["destroy"]
}]);

try {
    availableCheckRuleService.handle();
} finally {
    logger.close();
}
