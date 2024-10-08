var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var NotAuthorizedException = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib").NotAuthorizedError;
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

var UNRESTRICTED_WRITE_MODE = "sap.tm.trp.service::UnrestrictedWrite";
var UNRESTRICTED_READ_MODE = "sap.tm.trp.service::UnrestrictedRead";
var RESTRICTED_WRITE_MODE = "sap.tm.trp.service::RestrictedWrite";
var RESTRICTED_READ_MODE = "sap.tm.trp.service::RestrictedRead";

var authorizeReadByPlanIdList = function (planIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_READ_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_READ_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_plan_model_authorization";
            var planLocationCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = planLocationCheck(planIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};

var authorizeReadByExecutionIdList = function (executeIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_READ_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_READ_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_execution_ids_authorization";
            var executionIdCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = executionIdCheck(executeIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};

var authorizeReadByLocationFilterIdList = function (filterIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_READ_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_READ_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_location_filter_authorization";
            var locationFilterCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = locationFilterCheck(filterIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};

var authorizeReadByLocationIdList = function (locationType, locationIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_READ_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_READ_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
       } else {
           var procName = "sap.tm.trp.db.systemmanagement::p_check_location_authorization";
           var locationCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
           var checkResult = locationCheck(locationType, locationIdList).HAVE_AUTHORIZATION_FLAG;
           if (checkResult === 0) {
               throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
           }
       }
    }
    return true;
};

var authorizeWriteByPlanIdList = function (planIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_WRITE_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_WRITE_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_plan_model_authorization";
            var planLocationCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = planLocationCheck(planIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};

var authorizeWriteByLocationFilterIdList = function (filterIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_WRITE_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_WRITE_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
        } else {
            var procName = "sap.tm.trp.db.systemmanagement::p_check_location_filter_authorization";
            var locationFilterCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
            var checkResult = locationFilterCheck(filterIdList).HAVE_AUTHORIZATION_FLAG;
            if (checkResult === 0) {
                throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
            }
        }
    }
    return true;
};

var authorizeWriteByLocationIdList = function (locationType, locationIdList) {
    if(!$.session.hasAppPrivilege(UNRESTRICTED_WRITE_MODE)) {
        if (!$.session.hasAppPrivilege(RESTRICTED_WRITE_MODE)) {
            throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
       } else {
           var procName = "sap.tm.trp.db.systemmanagement::p_check_location_authorization";
           var locationCheck = new proc.procedure(constants.SCHEMA_NAME, procName);
           var checkResult = locationCheck(locationType, locationIdList).HAVE_AUTHORIZATION_FLAG;
           if (checkResult === 0) {
               throw new NotAuthorizedException(messages.MSG_LOCATION_FILTER_NOT_AUTHORIZED);
           }
       }
    }
    return true;
};