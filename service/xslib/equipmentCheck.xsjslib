var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var NotAuthorizedException = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib").NotAuthorizedError;
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

var UNRESTRICTED_READ_MODE = "sap.tm.trp.service::UnrestrictedRead";
var RESTRICTED_READ_MODE = "sap.tm.trp.service::RestrictedRead";

var authorizeReadByEquipmentFilterIdList = function (filterIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_READ_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_READ_MODE)) {
            throw new NotAuthorizedException(messages.MSG_EQUIPMENT_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_equipment_filter_authorization";
            var equipmentFilterCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = equipmentFilterCheck(filterIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_EQUIPMENT_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};
