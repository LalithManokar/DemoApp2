var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var alertRuleGrpModelLib = $.import("/sap/tm/trp/service/model/alertRuleGroup.xsjslib");
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SERVICE_PKG = "sap.tm.trp.service";

var alertRuleGrpService = new lib.SimpleRest({
    name: "alert group service",
    description: "alert group service",
    model: new alertRuleGrpModelLib.AlertRuleGroupModel(),
});

function getUserInfoAuthCheck(id) {
    var checkUserTypeProc = "sap.tm.trp.db.alert.alert_rule_group::p_get_user_info_for_auth_check_alert_rule_group";
    var getUserType = new procLib.procedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(id);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session.getUsername()) {
            logger.error("ALERT_RULE_GROUP_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

var saveAlertRuleList = function(conn, groupId, alertRuleList){
    if (alertRuleList.length === 0){
        throw new lib.InternalError(messages.MSG_ERROR_ALERT_RULE_LIST_SHOULD_NOT_BE_EMPTY);
    }
    
    var modifyAlertRuleProc = new procLib.procedure(
        constants.SCHEMA_NAME,
        [constants.SP_PKG_HRF_RULE_MGMT_RULE_GROUP, "p_adjust_rule_group_items"].join("::"),
        {
            connection: conn
        }
    );

    var result = modifyAlertRuleProc(
        groupId,
        alertRuleList
    ).SUCCESS_FLAG;

    if (result === -1){
        logger.error(
            "ALERT_RULE_GROUP_SAVE_ITEM_FAILED",
            groupId,
            "The alert rule list provided is invalid for the alert rule group"
        );
        throw new lib.InternalError(messages.MSG_ERROR_ALERT_RULE_GROUP_SAVE_ALERT_RULE);
    }
}

alertRuleGrpService.create = function(params){
    var conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
    conn.setAutoCommit(false);
    var createAlertGrpMetadataProc = new procLib.procedure(
        constants.SCHEMA_NAME,
        [constants.SP_PKG_ALERT_RULE_GROUP, "p_create_ruleGroup"].join("::"),
        {
            connection: conn
        }
    );
    try {
        var groupId = createAlertGrpMetadataProc(
            params.obj.NAME,
            params.obj.DESC,
            params.obj.CATEGORY_ID,
            params.obj.VISIBILITY,
            params.obj.RESOURCE_CATEGORY
        ).OUT_ALERT_RULE_GROUP_ID;
        saveAlertRuleList(conn, groupId, params.obj.ALERT_RULE_LIST);
        logger.success(
            "ALERT_RULE_GROUP_CREATE_SUCCESS",
            groupId
        );
    }
    catch (e){
        conn.rollback();
        logger.error(
            "ALERT_RULE_GROUP_CREATE_FAILED",
            e
        );
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(
                messages.MSG_ERROR_ALERT_RULE_GROUP_CREATE, e);
    }
    conn.commit();
    return {
        ALERT_RULE_GROUP_ID: groupId
    }
};

alertRuleGrpService.update = function(params){
    var conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
    conn.setAutoCommit(false);
    var updateAlertGrpMetadataProc = new procLib.procedure(
        constants.SCHEMA_NAME,
        [constants.SP_PKG_ALERT_RULE_GROUP, "p_update_ruleGroup"].join("::"),
        {
            connection: conn
        }
    );
    try {
        updateAlertGrpMetadataProc(
            params.id,
            params.obj.NAME,
            params.obj.DESC,
            params.obj.CATEGORY_ID,
            params.obj.VISIBILITY
        );
        saveAlertRuleList(conn, params.id, params.obj.ALERT_RULE_LIST);
        logger.success(
            "ALERT_RULE_GROUP_UPDATE_SUCCESS",
            params.id
        );
    }
    catch(e){
        conn.rollback();
        logger.error(
            "ALERT_RULE_GROUP_UPDATE_FAILED",
            params.id,
            e
        );
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(
                messages.MSG_ERROR_ALERT_RULE_GROUP_UPDATE, e);
    }
    conn.commit();
};

alertRuleGrpService.destroy = function(params){
    try {
        var deleteAlertRuleGroupProc = new procLib.procedure(
            constants.SCHEMA_NAME,
            [constants.SP_PKG_ALERT_RULE_GROUP, "p_delete_ruleGroup"].join("::")
        );
        deleteAlertRuleGroupProc(params.id);
        logger.success(
            "ALERT_RULE_GROUP_DELETE_SUCCESS",
            params.id
        );
    }
    catch(e){
        logger.error(
            "ALERT_RULE_GROUP_DELETE_FAILED",
            params.id,
            e
        );
        throw e;
    }
};

alertRuleGrpService.facetFilter = function(params){
    var facetFilterProc = new procLib.procedure(
        constants.SCHEMA_NAME,
        [constants.SP_PKG_ALERT_RULE_GROUP, "p_alert_rule_group_facet_filter"].join("::")
    );
    var filteredResult = facetFilterProc(
        params.obj.search,
        params.obj.CATEGORY_ID_LIST,
        params.obj.VISIBILITY_LIST,
        params.obj.RESOURCE_CATEGORY
    );
    var resultData = {
        CATEGORY_ID: filteredResult.CATEGORY_ID_LIST_OUTPUT.map(function(i) { return {key : i.ID, text : i.DESC};}),
        VISIBILITY: filteredResult.VISIBILITY_LIST_OUTPUT.map(function(i) { return  {key : i.CODE, text : i.DESC};})
    };
    return resultData;
};

var filterObjectList = [
    {service: ["create"], privilege: "CreateAlertRuleGroup"},
    {service: ["update"], privilege: "UpdateAlertRuleGroup"},
    {service: ["destroy"], privilege: "DeleteAlertRuleGroup"},
    {service: ["facetFilter"], privilege: "ReadAlertRuleGroup"},
].map(function(checkPrivInfo){
    return {
        filter: function(params){
            var privilege = [SERVICE_PKG, checkPrivInfo.privilege].join("::");

            if (!$.session.hasAppPrivilege(privilege)) {
                logger.error(
                    "ALERT_RULE_GROUP_UNAUTHORIZED",
                    privilege
                );
                throw new lib.NotAuthorizedError(privilege);
            }
            return true;
        },
        only: checkPrivInfo.service
    }
});

alertRuleGrpService.setFilters.apply(
    alertRuleGrpService,
    filterObjectList
);

alertRuleGrpService.setFilters([
    {
        filter : function(params) {
            try {
                return getUserInfoAuthCheck(params.id);
            } catch (e) {
                if (e instanceof lib.WebApplicationError) {
                    throw e;
                }
                throw new lib.InternalError(
                        messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
            }
        },
        only : [ "update" ]
    },
    {
        filter : function(params) {
            try {
                return getUserInfoAuthCheck(params.id);
            } catch (e) {
                if (e instanceof lib.WebApplicationError) {
                    throw e;
                }
                throw new lib.InternalError(
                        messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
            }
        },
        only : [ "destroy" ]
    }, {
        filter : function(params) {
              var conn, result = true, checkResult, checkProc;
                try {
                    conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
                    conn.setAutoCommit(false);
                    checkProc = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.alert.alert_rule_group::p_delete_ruleGroup_check", {
                        connection: conn
                    });
                    checkResult = checkProc(params.id).WHEREUSED;
                  conn.commit();
                } catch (e) {
                    conn.rollback();
                    logger.error("ALERT_RULE_GROUP_CHECK_USED_FAILED", e, params.id);
                    throw new lib.InternalError(messages.MSG_ALERT_RULE_GROUP_CHECK_USED_FAILED, e);
                }
              if(checkResult.length > 0) {
                  throw new lib.InternalError(messages.MSG_ALERT_RULE_GROUP_FILTER_IS_USED);
              }
              return result;
        },
        only : [ "destroy" ]
      },{
          filter : function(params) {
              var checkResult, checkProc;
                try {
                    checkProc = new proc.procedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.alert.alert_rule_group::p_alert_ruleGroup_save_check');
                    checkResult = checkProc(params.id, params.obj.VISIBILITY);
                    if(checkResult.CODE_LIST.length > 0) {
                        logger.error(messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST, checkResult.CODE_LIST, params.id);
                        throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST, checkResult.CODE_LIST);
                    }
                } catch (e) {
                    if (e instanceof lib.WebApplicationError) {
                        throw e;
                    }
                    logger.error("VISIBILITY_CHECK_FAILED", e, params.id);
                    throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED, e);
                }
              return true;
        },
        only : [ "update" ]
      }]);

alertRuleGrpService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    },
]);

try {
    alertRuleGrpService.handle();
} finally {
    logger.close();
}
