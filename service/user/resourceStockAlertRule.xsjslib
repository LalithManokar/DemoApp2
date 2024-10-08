var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");
var lib = registrationObjectLib.lib;
var resourceStockAlertRuleService = registrationObjectLib.registrationObjectService;
var model = registrationObjectLib.model;
var logger = registrationObjectLib.logger;
var constants = registrationObjectLib.constants;
var messages = registrationObjectLib.messages;
resourceStockAlertRuleService.setModel(new model.RegistrationObject());


// override the update method
resourceStockAlertRuleService.update = function (params) {

    // which was called 'subType' before.
    // we used to call procedure 'p_get_registration_object_type' to get registration object type
    // however, since we have splitted all the registration objects up, there is no need to call procedure to get the type
    // Furthermore,  the value of 'subType' is the value of CATEGORY, which can get directly from the frontend now
    var category = params.obj.CATEGORY;
    // if the rule is RES_STOCK_ALERT
    if (category === constants.RULE_CATEGORY_TYPE.RES_STOCK_ALERT) {
        registrationObjectLib.updateResStockAlert(params);
    } else {
        // other rule
        // there is only two categories for RES_STOCK_ALERT Currently, another one is RES_STOCK_BUBBLE
        registrationObjectLib.updateRule(params);
    }
};

resourceStockAlertRuleService.setFilters([{
    filter: function() {
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", constants.RULE_TYPE.RESOURCE_STOCK_ALERT_RULE);

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
        logger.error("OBJECT_REGISTRATION_INVALID_OBJECT_TYPE", constants.RULE_TYPE.RESOURCE_STOCK_ALERT_RULE);

        throw new lib.InternalError(messages.MSG_ERROR_DELETE_THIS_TYPE_OF_RULE_NOT_ALLOWED);
    },
    only: ["destroy"]
}]);

try {
    resourceStockAlertRuleService.handle();
} finally {
    logger.close();
}
