var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var SDKPIBubbleRuleService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var lib=registrationObjectLib.lib;
SDKPIBubbleRuleService.setModel(new model.RegistrationObject());

SDKPIBubbleRuleService.setFilters([{
    filter: function() {
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", 6);

        throw new lib.InternalError(messages.MSG_ERROR_CREATE_THIS_TYPE_OF_RULE_NOT_ALLOWED);
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::EditSDKPIBubbleRule";
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
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", 6);

        throw new lib.InternalError(messages.MSG_ERROR_DELETE_THIS_TYPE_OF_RULE_NOT_ALLOWED);
    },
    only: ["destroy"]
}]);

try {
    SDKPIBubbleRuleService.handle();
} finally {
    logger.close();
}