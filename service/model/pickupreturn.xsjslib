var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;

var transferIdToRow = function(id) {
    return {
        ID : id
    };
}
var transferStrToRow = function(str) {
    return {
        STR : str
    };
}

function RulesetGroup() {
    // init default value for optional value when creating and update
    this.init = function(obj) {
        obj.NAME = obj.NAME || null;
        obj.DESCRIPTION = obj.DESCRIPTION || null;
        obj.RULESET_TYPE = obj.RULESET_TYPE || null;
        obj.JOB_PROCESS_ID = obj.JOB_PROCESS_ID || null;
        obj.CODE = obj.CODE || null;
        obj.RESOURCE_CATEGORY = obj.RESOURCE_CATEGORY || null;
        obj.RULESET_LIST = obj.RULESET_LIST || [];
    };
}
RulesetGroup.prototype = {
    validates : [
        {
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.pickupreturn.rulesetgroup::t_ruleset_schedule_group" WHERE LOWER(NAME) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "NAME",
                format : {
                    expr : /^[A-Z][A-Z0-9_]{4,19}$/
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : 'NAME',
                presence : true,
                on : [ 'create'],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            }
    ],
    afterInitialize : [{
            method : function(obj, getParams) {
                obj.search = obj.search ? obj.search.toLowerCase() : "";
                var filterObj = obj.filters || {};
                obj.RULESET_TYPE_LIST = filterObj.RULESET_TYPE ? filterObj.RULESET_TYPE
                        .map(transferIdToRow)
                        : [];
                obj.JOB_PROCESS_ID_LIST = filterObj.JOB_PROCESS_ID ? filterObj.JOB_PROCESS_ID
                        .map(transferIdToRow)
                        : [];
            },
            on : [ 'facetFilter' ]
        }]
}

function LocationRule() {
    // init default value for optional value when creating and update
    this.init = function(obj) {
        var isScheduled = (obj.SCHEDULE_TIME_TYPE === 1);
        var isOptimizationRequired = (obj.OP_SETTING_TYPE === 2 || obj.OP_SETTING_TYPE === 3);
        var isLDRRequired = (obj.OP_SETTING_TYPE === 1 || obj.OP_SETTING_TYPE === 3);

        obj.TIME_RANGE_INTERVAL = obj.TIME_RANGE_INTERVAL || 0;
        obj.TIME_RANGE_UNIT = obj.TIME_RANGE_UNIT || 1;
        obj.EQUIPMENT_FILTER_ID = obj.EQUIPMENT_FILTER_ID || null;

        obj.RECURRENCE_TYPE = isScheduled ? obj.RECURRENCE_TYPE : "MINUTE";
        obj.RECURRENCE_INTERVAL = isScheduled ? obj.RECURRENCE_INTERVAL : null;
        obj.RECURRENCE_DAY = isScheduled ? obj.RECURRENCE_DAY : null;

        obj.START_DATETIME = isScheduled ? obj.START_DATETIME
                : '1900-01-01T00:00:00.000Z';
        obj.END_DATETIME = isScheduled ? obj.END_DATETIME
                : '1900-01-01T00:00:00.000Z';

        obj.LOCATION_DETERMIN_ID = isLDRRequired ? obj.LOCATION_DETERMIN_ID : null;
        obj.OPTIMIZATION = isOptimizationRequired ? obj.OPTIMIZATION : null;

        obj.ALLOWED_USAGE = obj.ALLOWED_USAGE || 'G';
        
        obj.TIME_WINDOW = obj.TIME_WINDOW || -1;
        obj.RANK_NUMBER = obj.RANK_NUMBER || -1;
    };
}

LocationRule.prototype = {
    validates : [
            {
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.pickupreturn::t_location_assignment_rule" WHERE LOWER(RULE_NAME) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "NAME",
                format : {
                    expr : /^[A-Z][A-Z0-9_]{4,19}$/
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : 'NAME',
                presence : true,
                on : [ 'create'],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : 'TYPE',
                presence : true,
                on : [ 'create' ],
                args : [ 'TYPE' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'LOCATION_FILTER_ID',
                presence : true,
                on : [ 'create', 'update', 'sdPlan', 'costModel' ],
                args : [ 'LOCATION_FILTER_ID' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'SD_PLAN_ID',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'SD_PLAN_ID' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'SCHEDULE_TIME_TYPE',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'SCHEDULE_TIME_TYPE' ],
                message : messages.MSG_FIELD_MISSING
            },
//            {
//                field : 'RECURRENCE_INTERVAL',
//                presence : true,
//                on : [ 'create', 'update' ],
//                condition : function(obj) {
//                    return obj.hasOwnProperty('SCHEDULE_TIME_TYPE')
//                            && obj.SCHEDULE_TIME_TYPE === 1;
//                },
//                args : [ 'RECURRENCE_INTERVAL' ],
//                message : messages.MSG_FIELD_MISSING
//            },
//            {
//                field: 'RECURRENCE_INTERVAL',
//                presence: true,
//                on: ['create', 'update'],
//                range: {
//                    bw: [1, 999]
//                },
//                condition : function(obj) {
//                    return obj.hasOwnProperty('SCHEDULE_TIME_TYPE')
//                            && obj.SCHEDULE_TIME_TYPE === 1;
//                },
//                args: ['RECURRENCE_INTERVAL'],
//                message: messages.MSG_FIELD_INVALID
//            },
//            {
//                field : 'RECURRENCE_TYPE',
//                presence : true,
//                on : [ 'create', 'update' ],
//                condition : function(obj) {
//                    return obj.hasOwnProperty('SCHEDULE_TIME_TYPE')
//                            && obj.SCHEDULE_TIME_TYPE === 1;
//                },
//                args : [ 'RECURRENCE_TYPE' ],
//                message : messages.MSG_FIELD_MISSING
//            },
//            {
//                field : 'START_DATETIME',
//                presence : true,
//                on : [ 'create', 'update' ],
//                condition : function(obj) {
//                    return obj.hasOwnProperty('SCHEDULE_TIME_TYPE')
//                            && obj.SCHEDULE_TIME_TYPE === 1;
//                },
//                args : [ 'START_DATETIME' ],
//                message : messages.MSG_FIELD_MISSING
//            },
//            {
//                field : 'END_DATETIME',
//                presence : true,
//                condition : function(obj) {
//                    return obj.hasOwnProperty('SCHEDULE_TIME_TYPE')
//                            && obj.SCHEDULE_TIME_TYPE === 1;
//                },
//                on : [ 'create', 'update' ],
//                args : [ 'END_DATETIME' ],
//                message : messages.MSG_FIELD_MISSING
//            },
            {
                field : 'OP_SETTING_TYPE',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'OP_SETTING_TYPE' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'LOCATION_DETERMIN_ID',
                presence : true,
                condition : function(obj) {
                    return obj.hasOwnProperty('OP_SETTING_TYPE')
                            && (obj.OP_SETTING_TYPE === 1 || obj.OP_SETTING_TYPE === 3);
                },
                on : [ 'create', 'update' ],
                args : [ 'LOCATION_DETERMIN_ID' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field: 'TIME_RANGE_INTERVAL',
                presence : true,
                on: ['create', 'update'],
                args: ['TIME_RANGE_INTERVAL'],
                message: messages.MSG_FIELD_MISSING
            },
            {
                field: 'TIME_RANGE_INTERVAL',
                presence : true,
                numericality: true,
                range: {
                    bw: [1,999]
                },
                on: ['create', 'update'],
                args: ['TIME_RANGE_INTERVAL'],
                message: messages.MSG_FIELD_INVALID
            },
            {
                field : 'OPTIMIZATION',
                presence : true,
                condition : function(obj) {
                    return obj.hasOwnProperty('OP_SETTING_TYPE')
                            && (obj.OP_SETTING_TYPE === 2 || obj.OP_SETTING_TYPE === 3);
                },
                on : [ 'create', 'update' ],
                args : [ 'OPTIMIZATION' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'filters',
                on : [ 'facetFilter' ],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        return facetFilterUtils.checkFilterObj(filterObj, [
                                'RULE_TYPE', 'SD_PLAN_ID', 'TIME_RANGE_UNION',
                                'RESOURCE_FILTER_ID','LOCATION_FILTER_ID',
                                'NETWORK_SETTING_GROUP_ID', 'LOCATION_DETERMIN_ID',
                                'SCHEDULE_TIME_TYPE', 'OPTIMIZATION', ]);
                    }
                },
            },
            {
                field : 'filters',
                on : [ 'sdPlanFacetFilter' ],
                validateWith : function(obj) {
                    var checkResult = true;
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        return facetFilterUtils.checkFilterObj(filterObj,
                                [ "PLAN_TYPE_ID", "TIME_FILTER_ID",
                                        "VISIBILITY" ]);
                    }
                },
                message : messages.MSG_FIELD_INVALID,
                args : [ '{filters}' ]
            }, {
                field : 'EQUIP_FILTER_ID',
                on : [ 'facetFilter' ],
                condition : function(obj) {
                    return obj.hasOwnProperty('EQUIP_FILTER_ID');
                },
                numericality : true,
                message : messages.MSG_KEY_NOT_A_NUMBER,
                args : [ '{EQUIP_FILTER_ID}' ]
            }, {
                field : 'LOCATION_FILTER_ID',
                on : [ 'facetFilter' ],
                condition : function(obj) {
                    return obj.hasOwnProperty('LOCATION_FILTER_ID');
                },
                numericality : true,
                message : messages.MSG_KEY_NOT_A_NUMBER,
                args : [ '{LOCATION_FILTER_ID}' ]
            } ],
    afterInitialize : [
            {
                method : function(obj, getParams) {
                    obj.search = obj.search ? obj.search.toLowerCase() : "";
                    var filterObj = obj.filters || {};
                    obj.RULE_TYPE_LIST = filterObj.RULE_TYPE ? filterObj.RULE_TYPE
                            .map(transferIdToRow)
                            : [];
                    obj.SD_PLAN_ID_LIST = filterObj.SD_PLAN_ID ? filterObj.SD_PLAN_ID
                            .map(transferIdToRow)
                            : [];
                    obj.TIME_RANGE_UNIT_LIST = filterObj.TIME_RANGE_UNION ? filterObj.TIME_RANGE_UNION
                            .map(transferIdToRow)
                            : [];
                    obj.NETWORK_SETTING_GROUP_ID_LIST = filterObj.NETWORK_SETTING_GROUP_ID ? filterObj.NETWORK_SETTING_GROUP_ID
                            .map(transferIdToRow)
                            : [];
                    obj.LOC_DET_ID_LIST = filterObj.LOCATION_DETERMIN_ID ? filterObj.LOCATION_DETERMIN_ID
                            .map(transferIdToRow)
                            : [];
                    obj.OPT_LIST = filterObj.OPTIMIZATION ? filterObj.OPTIMIZATION
                            .map(transferIdToRow)
                            : [];
                    obj.SCHEDULE_TIME_TYPE_LIST = filterObj.SCHEDULE_TIME_TYPE ? filterObj.SCHEDULE_TIME_TYPE
                            .map(transferIdToRow)
                            : [];
                    obj.EQUIP_FILTER_ID = obj.EQUIP_FILTER_ID || -999;
                    obj.LOCATION_FILTER_ID = obj.LOCATION_FILTER_ID || -999;
                    obj.RESOURCE_FILTER_ID_LIST = filterObj.RESOURCE_FILTER_ID_LIST ? filterObj.RESOURCE_FILTER_ID_LIST
                            .map(transferIdToRow)
                            : [];
                    obj.LOCATION_FILTER_ID_LIST = filterObj.LOCATION_FILTER_ID_LIST ? filterObj.LOCATION_FILTER_ID_LIST
                            .map(transferIdToRow)
                            : [];

                },
                on : [ 'facetFilter' ]
            },
            {
                method : function(obj, getParams) {
                    obj.search = obj.search ? obj.search.toLowerCase() : "";
                    var filterObj = obj.filters || {};
                    obj.PLAN_TYPE_LIST = filterObj.PLAN_TYPE_ID ? filterObj.PLAN_TYPE_ID
                            .map(transferIdToRow)
                            : [];
                    obj.TIME_FILTER_LIST = filterObj.TIME_FILTER_ID ? filterObj.TIME_FILTER_ID
                            .map(transferIdToRow)
                            : [];
                    obj.VISIBILITY_LIST = filterObj.VISIBILITY ? filterObj.VISIBILITY
                            .map(transferStrToRow)
                            : [];
                    obj.LOCATION_FILTER_ID = obj.LOCATION_FILTER_ID || 0;
                    obj.EQUIPMENT_FILTER_ID = obj.EQUIPMENT_FILTER_ID || 0;
                },
                on : [ 'sdPlanFacetFilter' ]
            }, {
                method : 'init',
                on : [ 'create', 'update' ]
            }]
};

var TransportationUnit = function() {
    this.initTuId = function(obj, getParams) {
        obj.transportaionId = getParams('TRANSPORTATION_ID');
    };

    this.initTU = function(obj) {
        obj.TU_IDS = obj.TU_IDS.map(function(item) {
            return {
                TU_ID: item
            };
        });
    };
};

TransportationUnit.prototype = {
    validates : [
            {
                field : 'filters',
                on : [ 'facetFilter' , 'executeDetermination', 'finalize', "copyToAll"],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        return facetFilterUtils.checkFilterObj(filterObj, [
                                'EXECUTION_STATUS', 'EQUIPMENT_ID',
                                'SHIPPER_NAME', 'CONSIGNEE_NAME',
                                'SHIPPER_LOCATION',
                                'CONSIGNEE_LOCATION', 'POL_NAME',
                                'POD_NAME', 'CUR_LOCATION_NAME' ]);
                    }
                },
            },
            {
                field : 'LOCATION_NAME',
                presence : true,
                on : ["copyToAll", "assign"],
                args : [ 'LOCATION_NAME' ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : 'LOCATION_NAME',
                format: {
                    expr: /\w+/
                },
                on : ["copyToAll", "assign"],
                args : [ 'LOCATION_NAME' ],
                message : messages.MSG_KEY_FORMAT_INVALID
            },
            {
                field : 'TU_IDS',
                type: Array,
                on : ["editLoc","executeDetermination","finalize","copyToAll","assignStreetTurn"],
                args : [ 'TU_IDS' ],
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : 'TU_ID',
                presence : true,
                on : ["unassignStreetTurn"],
                args : [ 'TU_ID' ],
                message : messages.MSG_KEY_MISSING
            },
            {
                field : 'STREETTURN_TU_ID',
                presence : true,
                on : ["assignStreetTurn"],
                args : [ 'STREETTURN_TU_ID' ],
                message : messages.MSG_KEY_MISSING
            }
            ],
    afterInitialize : [
            {
                method : function(obj, getParams) {
                    obj.search = obj.search ? obj.search.toLowerCase() : "";
                    var filterObj = obj.filters || {};
                    obj.EXEC_STATUS_LIST = filterObj.EXECUTION_STATUS ? filterObj.EXECUTION_STATUS
                            .map(transferStrToRow)
                            : [];
                    obj.EQUIP_TYPE_LIST = filterObj.EQUIPMENT_ID ? filterObj.EQUIPMENT_ID
                            .map(transferStrToRow)
                            : [];
                    obj.SHIPPER_LIST = filterObj.SHIPPER_NAME ? filterObj.SHIPPER_NAME
                            .map(transferStrToRow)
                            : [];
                    obj.CONSIGNEE_LIST = filterObj.CONSIGNEE_NAME ? filterObj.CONSIGNEE_NAME
                            .map(transferStrToRow)
                            : [];
                    obj.SHIPPER_LOC_LIST = filterObj.SHIPPER_LOCATION ? filterObj.SHIPPER_LOCATION
                            .map(transferStrToRow)
                            : [];
                    obj.CONSIGNEE_LOC_LIST = filterObj.CONSIGNEE_LOCATION ? filterObj.CONSIGNEE_LOCATION
                            .map(transferStrToRow)
                            : [];
                    obj.POL_LIST = filterObj.POL_NAME ? filterObj.POL_NAME
                            .map(transferStrToRow) : [];
                    obj.POD_LIST = filterObj.POD_NAME ? filterObj.POD_NAME
                            .map(transferStrToRow) : [];
                    obj.CURRENT_LOC_LIST = filterObj.CUR_LOCATION_NAME ? filterObj.CUR_LOCATION_NAME
                            .map(transferStrToRow)
                            : [];
                },
                on : [ 'getTu', 'executeDetermination', "copyToAll", "facetFilter"]
            }, {
                method : function(obj, getParams) {
                    obj.LOCATION_NAME = obj.LOCATION_NAME || "";
                },
                on : [ 'validateLoc', 'assign' ]
            }, {
                method: 'initTuId',
                on: ['getAssignedContainers']
            } ]
};

var SchedulingTrace = function() {
};

SchedulingTrace.prototype = {
    validates : [
            {
                field : 'LOCATION_FILTER_ID',
                numericality : true,
                allowBlank: true,
                on : [ 'facetFilter' ],
                message : messages.MSG_KEY_NOT_A_NUMBER,
                args : [ '{LOCATION_FILTER_ID}' ],
            },
            {
                field : 'PICKUP_OR_RETURN',
                presence : true,
                on : [ 'facetFilter' ],
                message : messages.MSG_FIELD_MISSING,
                args : [ 'PICKUP_OR_RETURN' ],
            },
            {
                field : 'PICKUP_OR_RETURN',
                numericality : true,
                on : [ 'facetFilter' ],
                message : messages.MSG_KEY_NOT_A_NUMBER,
                args : [ '{PICKUP_OR_RETURN}' ],
            },
            {
                field : 'filters',
                on : [ 'facetFilter' ],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        return facetFilterUtils.checkFilterObj(filterObj, [
                                'STATUS', 'SCHEDULING', 'PRE_LOCATION_ID',
                                'CUR_LOCATION_ID', 'USER_ID', ]);
                    }
                },
            } ],
    afterInitialize : [ {
        method : function(obj, getParams) {
            obj.search = obj.search ? obj.search.toLowerCase() : "";
            obj.LOCATION_FILTER_ID = obj.hasOwnProperty('LOCATION_FILTER_ID') ? obj.LOCATION_FILTER_ID
                    : -1;
            var filterObj = obj.filters || {};
            obj.STATUS_LIST = filterObj.STATUS ? filterObj.STATUS
                    .map(transferIdToRow) : [];
            obj.SCHEDULING_TYPE_LIST = filterObj.SCHEDULING ? filterObj.SCHEDULING
                    .map(function(valStr) {
                        var pair = valStr.split(",");
                        return {
                            SCHEDULE_TIME_TYPE : pair[0],
                            OP_SETTING_TYPE : pair[1]
                        };
                    }) : [];
            obj.OPTIMIZATION_SETTING_LIST = filterObj.OPTIMIZATION_SETTING ? filterObj.OPTIMIZATION_SETTING
                    .map(transferIdToRow)
                    : [];
            obj.PRE_LOCATION_ID_LIST = filterObj.PRE_LOCATION_ID ? filterObj.PRE_LOCATION_ID
                    .map(transferStrToRow)
                    : [];
            obj.CUR_LOCATION_ID_LIST = filterObj.CUR_LOCATION_ID ? filterObj.CUR_LOCATION_ID
                    .map(transferStrToRow)
                    : [];
            obj.USER_ID_LIST = filterObj.USER_ID ? filterObj.USER_ID
                    .map(transferIdToRow) : [];
        },
        on : [ 'facetFilter', "copyToAll" ]
    } ]
};
