var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');

var AlertRuleGroupModel = function() {
};

AlertRuleGroupModel.prototype = {
    validates : [
            {
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.alert.alert_rule_group::t_alert_rule_group" WHERE LOWER(NAME) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "NAME",
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : 'NAME',
                on : [ 'create' ],
                presence : true,
                args : [ 'NAME' ],
                message : messages.MSG_FIELD_MISSING
            },
            // CATEGORY_ID is the value in /sap/tm/trp/service/odata.xsodata/AlertRuleGroups, and the OData service returns the CATEGORY_ID as string, like "1".
            {
                field : 'CATEGORY_ID',
                on : [ 'create', 'update' ],
                presence : true,
                args : [ 'CATEGORY_ID' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'VISIBILITY',
                on : [ 'create', 'update' ],
                presence : true,
                args : [ 'VISIBILITY' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'VISIBILITY',
                on : [ 'create', 'update' ],
                inclusion : {
                    scope : [ 'G', 'P' ]
                // G == global; P == personal
                },
                args : [ '{VISIBILITY}' ],
                message : messages.MSG_KEY_NOT_IN_ENUM
            },
            {
                field : 'ALERT_RULE_LIST',
                on : [ 'create', 'update' ],
                validateWith : function(obj) {
                    if (obj.hasOwnProperty("ALERT_RULE_LIST")) {
                        if (!(obj.ALERT_RULE_LIST instanceof Array)) {
                            return false;
                        }
                        for ( var i in obj.ALERT_RULE_LIST) {
                            if (!parseInt(obj.ALERT_RULE_LIST[i], 10)) {
                                return false;
                            }
                        }
                    }
                    return true;
                },
                args : [ '{ALERT_RULE_LIST}' ],
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : 'filters',
                on : [ 'facetFilter' ],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        if (!(filterObj instanceof Object)) {
                            return false;
                        }
                        if (filterObj.hasOwnProperty('CATEGORY_ID')
                                && !(filterObj.CATEGORY_ID instanceof Array)) {
                            return false;
                        }
                        if (filterObj.hasOwnProperty('VISIBILITY')
                                && !(filterObj.VISIBILITY instanceof Array)) {
                            return false;
                        }
                        return true;
                    }
                },
                message : messages.MSG_FIELD_INVALID,
                args : [ '{filters}' ],
            } ],
    afterInitialize : [
            {
                method : function(obj, getParams) {
                    obj.ALERT_RULE_LIST = obj.hasOwnProperty("ALERT_RULE_LIST") ? obj.ALERT_RULE_LIST
                            .map(function(x) {
                                return {
                                    RULE_ID : parseInt(x, 10)
                                };
                            })
                            : [];
                    obj.DESC = obj.DESC || "";
                },
                on : [ 'create', 'update' ]
            },
            {
                method : function(obj, getParams) {
                    var transferIdToRow = function(id) {
                        return {
                            ID : id
                        };
                    };
                    var transferStrToRow = function(str) {
                        return {
                            STR : str
                        };
                    };
                    obj.search = obj.search ? obj.search.toLowerCase() : "";
                    var filterObj = obj.filters || {};
                    obj.CATEGORY_ID_LIST = filterObj.CATEGORY_ID ? filterObj.CATEGORY_ID
                            .map(transferIdToRow)
                            : [];
                    obj.VISIBILITY_LIST = filterObj.VISIBILITY ? filterObj.VISIBILITY
                            .map(transferStrToRow)
                            : [];
                },
                on : [ 'facetFilter' ]
            },

    ]
};
