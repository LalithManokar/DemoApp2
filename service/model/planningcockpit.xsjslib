var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

function transformPolygon(minPoint, maxPoint) {
    var min = minPoint.split(";");
    var max = maxPoint.split(";");
    return "Polygon((%(min0)s %(min1)s, %(max0)s %(min1)s, %(max0)s %(max1)s, %(min0)s %(max1)s, %(min0)s %(min1)s))"
            .replace(/%\(min0\)s/g, min[0]).replace(/%\(min1\)s/g, min[1])
            .replace(/%\(max0\)s/g, max[0]).replace(/%\(max1\)s/g, max[1]);
}

function Simulations() {
    this.supplyDemandInit = function(obj, getParams) {
        obj.GEO_ID = getParams("GEO_ID");
        obj.SCENARIO_ID = getParams("SCENARIO_ID");
        obj.RESOURCE_TYPE_CODE = getParams("RESOURCE_TYPE_CODE");
    };

    this.lockInit = function(obj) {
        obj.ACQUIRE = String(obj.ACQUIRE) === "true";
        obj.LOCK_STATUS = String(obj.LOCK_STATUS) === "true";
    };

    this.lastUsedInit = function(obj, getParams) {
        obj.pageName = getParams("PAGE_NAME");
    };

    this.mapInit = function(obj, getParams) {
        obj.min = getParams("MIN_COORDINATE").split(";");
        obj.max = getParams("MAX_COORDINATE").split(";");
        obj.executionId = Number(getParams("EXECUTION_ID"));
        obj.supplyDemandId = Number(getParams("SUPPLY_DEMAND_PLAN_ID"));
        obj.scenarioId = Number(getParams("SCENARIO_ID"));
    };

    this.alertInit = function(obj, getParams) {
        obj.scenarioId = Number(getParams("SCENARIO_ID") || -1);
        obj.locationId = getParams("LOCATION_ID");
    };

    this.alertPageInit = function(obj, getParams) {
        obj.time = getParams("TIME");
        obj.sortById = Number(getParams("SORT_BY_ID") || -1);
        obj.orderId = Number(getParams("ORDER_ID") || -1);
        obj.skip = Number(getParams("SKIP") || -1);
        obj.top = Number(getParams("TOP") || -1);
        obj.rank = getParams("RANK");
    };

    this.simulationPlanFacetFilterInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.NETWORK_SETTING_GROUP_ID_LIST = filterObj
                .hasOwnProperty("NETWORK_SETTING_GROUP_ID") ? filterObj.NETWORK_SETTING_GROUP_ID
                .map(function(id) {
                    return {
                        ID : id
                    };
                })
                : [];
        obj.STATUS_ID_LIST = filterObj.hasOwnProperty("STATUS_ID") ? filterObj.STATUS_ID
                .map(function(id) {
                    return {
                        ID : id
                    };
                })
                : [];
    };
}

Simulations.prototype = {
    validates : [
            {
                field : "LOCATION_ID",
                presence : true,
                on : [ "getAlerts", "alertsNumber" ],
                args : [ "LOCATION_ID" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "SIMULATION_PLAN_NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.planningcockpit::t_simulation_plan" WHERE LOWER(NAME) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{SIMULATION_PLAN_NAME}" ],
                on : [ "create" ]
            },
            {
                field : "SIMULATION_PLAN_NAME",
                presence : true,
                on : [ "create" ],
                args : [ "SIMULATION_PLAN_NAME" ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : "SIMULATION_PLAN_NAME",
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{SIMULATION_PLAN_NAME}" ],
                on : [ "create" ]
            },
            {
                field : "SIMULATION_PLAN_DESC",
                length : {
                    within : [ 1, 40 ]
                },
                allowBlank : true,
                on : [ "create" ],
                args : [ "SIMULATION_PLAN_DESC", "[1,40]" ],
                message : messages.MSG_KEY_LENGTH_INVALID
            },
            {
                field : "SUPPLY_DEMAND_PLAN_ID",
                presence : true,
                on : [ "create" ],
                args : [ "SUPPLY_DEMAND_PLAN_ID" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "SUPPLY_DEMAND_PLAN_ID",
                on : [ "create" ],
                numericality : true,
                args : [ "SUPPLY_DEMAND_PLAN_ID" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : "NETWORK_SETTING_GROUP_ID",
                presence : true,
                on : [ "create" ],
                args : [ "NETWORK_SETTING_GROUP_ID" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "NETWORK_SETTING_GROUP_ID",
                numericality : true,
                on : [ "create" ],
                args : [ "NETWORK_SETTING_GROUP_ID" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : "LOCK_STATUS",
                on : [ "lock" ],
                inclusion : {
                    scope : [ true, false ]
                },
                allowBlank : true,
                args : [ "LOCK_STATUS", [ true, false ].join(",") ],
                message : messages.MSG_KEY_NOT_IN_ENUM
            },
            {
                field : "ACQUIRE",
                on : [ "lock" ],
                inclusion : {
                    scope : [ true, false ]
                },
                allowBlank : true,
                args : [ "ACQUIRE", [ true, false ].join(",") ],
                message : messages.MSG_KEY_NOT_IN_ENUM
            },
            {
                field : "filters",
                on : [ "facetFilter" ],
                presence : true,
                message : messages.MSG_FIELD_MISSING,
                args : [ "filters" ],
            },
            {
                field : "filters",
                on : [ "facetFilter" ],
                validateWith : function(obj) {
                    var filterObj = obj.filters;
                    if (!filterObj) {
                        return true;
                    } else {
                        if (!(filterObj instanceof Object)) {
                            return false;
                        }
                        if (filterObj.hasOwnProperty("STATUS_ID")
                                && !(filterObj.STATUS_CODE instanceof Array)) {
                            return false;
                        }
                        if (filterObj
                                .hasOwnProperty("NETWORK_SETTING_GROUP_ID")
                                && !(filterObj.NETWORK_SETTING_GROUP_ID instanceof Array)) {
                            return false;
                        }
                        return true;
                    }
                },
                message : messages.MSG_FIELD_INVALID,
                args : [ "filters" ],
            } ],
    afterInitialize : [ {
        method : "lockInit",
        on : [ "lock" ]
    }, {
        method : "supplyDemandInit",
        on : [ "resultsLocationToResource", "resultsResourceToLocation" ]
    }, {
        method : "mapInit",
        on : "depotAlertOnMap"
    }, {
        method : "lastUsedInit",
        on : [ "lastUsed" ]
    }, {
        method : "alertInit",
        on : [ "getAlerts", "alertsNumber" ]
    }, {
        method : "alertPageInit",
        on : [ "getAlerts" ]
    }, {
        method : "simulationPlanFacetFilterInit",
        on : [ "facetFilter" ]
    } ]
};

function Scenario() {
    this.init = function(obj, getParams) {
        obj.planId = getParams("planId");
    };
}

Scenario.prototype = {
    validates : [
            {
                field : "planId",
                on : [ "create" ],
                numericality : true,
                args : [ "planId" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : "SCENARIO_NAME",
                presence : true,
                on : [ "create", "update" ],
                args : [ "SCENARIO_NAME" ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : "SCENARIO_NAME",
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{SCENARIO_NAME}" ],
                on : [ "create", "update" ]
            },
            {
                field : "SCENARIO_NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.planningcockpit::t_scenario" WHERE LOWER(NAME) = LOWER(?) AND REL_SM_PLAN_ID =?',
                    scope : "{planId}"
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{SCENARIO_NAME}" ],
                on : [ "create" ]
            }, ],
    afterInitialize : [ {
        method : "init",
        on : [ "create", "proposeActivities", "destroy", "update",
                "generateAlert" ]
    } ]
};

function Activity() { return; }

Activity.prototype = {
    validates : [ {
        field : "planId",
        on : [ "proposeActivity", "estimateCost" ],
        numericality : true,
        args : [ "planId" ],
        message : messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field : "scenarioId",
        on : [ "create" ],
        numericality : true,
        args : [ "scenarioId" ],
        message : messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field : "BASE_COST",
        on : [ "estimateCost" ],
        numericality : true,
        condition : function(obj) {
            return !!(obj.BASE_COST); // if the base cost is not empty, then the type must be a number
        },
        message : messages.MSG_KEY_NOT_A_NUMBER,
        args : [ "BASE_COST" ]
    }, {
        field : "QUANTITY",
        numericality : true,
        on : [ "estimateCost" ],
        message : messages.MSG_KEY_NOT_A_NUMBER,
        args : [ "QUANTITY" ]
    }, {
        field : "ACTIVITY_DESC",
        length : {
            within : [ 1, 40 ]
        },
        allowBlank : true,
        on : [ "create", "update" ],
        args : [ "ACTIVITY_DESC", "[1,40]" ],
        message : messages.MSG_KEY_LENGTH_INVALID
    }, {
        field : "ROUTE_ID",
        allowBlank : true,
        on : [ "create", "update" ],
        numericality : true,
        args : [ "ROUTE_ID" ],
        message : messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field : "EQUIP_TYPE",
        presence : true,
        on : [ "create", "update" ],
        args : [ "EQUIP_TYPE" ],
        message : messages.MSG_FIELD_MISSING
    }],
    afterInitialize : [ {
        method : "scenarioInit",
        on : [ "create", "update", "destroy" ]
    }, {
        method : "estimateCostInit",
        on : [ "estimateCost" ]
    }, {
        method : "loadDischargeDetailInit",
        on : [ "create", "update" ]
    } ],
    scenarioInit: function(obj, getParams) {
        obj.scenarioId = Number(getParams("scenarioId"));
        obj.planId = Number(getParams("planId"));
    },
    estimateCostInit: function(obj, getParams) {
        obj.SIM_PLAN_ID = Number(getParams("planId"));
        obj.BASE_COST = parseFloat(obj.BASE_COST);
        obj.QUANTITY = Math.max(obj.QUANTITY || 0, 0);
    },
    loadDischargeDetailInit: function(obj) {
        obj.LOAD_DISCHARGE_DETAIL = obj.LOAD_DISCHARGE_DETAIL || [];
    }
};

var baseCostValidation = {
    field : "BASE_COST",
    on : [ "estimateCost" ],
    presence : true,
    message : messages.MSG_RB_BASE_COST_ROUTE_NOT_SELECTED,
    args : [ "BASE_COST" ]
};

function OffHireActivity() {
	this.validates = this.constructor.prototype.validates.concat({
        field : "EQUIP_TYPE",
        presence : true,
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_MISSING,
        args : [ "EQUIP_TYPE" ]
    });
}
OffHireActivity.prototype = Object.create(Activity.prototype, {
    constructor: {
        value: OffHireActivity
    }
});

function OnHireActivity() { 
	this.validates = this.constructor.prototype.validates.concat({
    field : "EQUIP_TYPE",
    presence : true,
    on : [ "create", "update" ],
    message : messages.MSG_FIELD_MISSING,
    args : [ "EQUIP_TYPE" ]
	});
}
OnHireActivity.prototype = Object.create(Activity.prototype, {
    constructor: {
        value: OnHireActivity
    }
});

function MRActivity() {
    this.validates = this.constructor.prototype.validates.concat({
        field : "EQUIP_TYPE",
        presence : true,
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_MISSING,
        args : [ "EQUIP_TYPE" ]
    }, baseCostValidation);
}
MRActivity.prototype = Object.create(Activity.prototype, {
    constructor: {
        value: MRActivity
    }
});

function RepositioningActivity() {
    this.validates = this.constructor.prototype.validates.concat({
        field : "EQUIP_TYPE",
        presence : true,
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_MISSING,
        args : [ "EQUIP_TYPE" ]
    }, baseCostValidation);
}
RepositioningActivity.prototype = Object.create(Activity.prototype, {
    constructor: {
        value: RepositioningActivity
    }
});

function RepositioningAvoidanceActivity() {
    this.validates = this.constructor.prototype.validates.concat([{
        field : "FROM_LOC_ID",
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_INVALID,
        args : [ "FROM_LOC_ID" ]
    }, {
        field : "TO_LOC_ID",
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_INVALID,
        args : [ "TO_LOC_ID" ]
    }, {
        field : "RESOURCE_TYPE",
        on : [ "estimateCost" ],
        message : messages.MSG_FIELD_INVALID,
        args : [ "RESOURCE_TYPE" ]
    }, {
        field : "EQUIP_TYPE",
        presence : true,
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_MISSING,
        args : [ "EQUIP_TYPE" ]
    }, baseCostValidation]);
}
RepositioningAvoidanceActivity.prototype = Object.create(Activity.prototype, {
    constructor: {
        value: RepositioningAvoidanceActivity
    }
});

function networkOperatorMapping(obj) {
    var list = [];
    obj.forEach(function(item) {
        var key = Object.keys(item);
        key.forEach(function(id) {
            var operator = {
                PARAMETER_ID : id,
                OPERATOR_CODE : item[id]
            };
            list.push(operator);
        });
    });
    return list;
}

function networkParameterMapping(obj) {
    var list = [];
    obj.forEach(function(item) {
        var keys = Object.keys(item);
        keys.forEach(function(id) {
            item[id].forEach(function(value) {
                var obj = {
                    PARAMETER_ID : id,
                    VALUE : value
                };
                list.push(obj);
            });
        });
    });
    return list;
}

function Networksetting() {
    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.MANDATORY_COST_MODEL_INPUT = obj.filters
                .hasOwnProperty("MANDATORY_COST_MODEL_ID") ? obj.filters.MANDATORY_COST_MODEL_ID
                .map(function(item) {
                    return {
                        COST_MODEL_ID : item
                    };
                })
                : [];

        obj.OPTIONAL_COST_MODEL_INPUT = obj.filters
                .hasOwnProperty("OPTIONAL_COST_MODEL_ID") ? obj.filters.OPTIONAL_COST_MODEL_ID
                .map(function(item) {
                    return {
                        COST_MODEL_ID : item
                    };
                })
                : [];
        obj.RESOURCE_CATEGORY = obj.RESOURCE_CATEGORY || null;
    };

    this.init = function(obj) {
        obj.PARAMETER_LIST = networkOperatorMapping(obj.PARAMETER_LIST);
        obj.VALUE_LIST = networkParameterMapping(obj.VALUE_LIST);
    };
}

Networksetting.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                on : [ "create" ],
                args : [ "NAME" ],
                message : messages.MSG_NAME_MISSING
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
                field : "NAME",
                on : [ "create" ],
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.planningcockpit::t_network_setting_group" WHERE lower(NAME) = lower(?)'
                },
                args : [ "{NAME}" ],
                message : messages.MSG_NAME_NON_UNIQUE
            }, {
                field : "MANDATORY_COST_MODEL_ID",
                presence : true,
                on : [ "update", "create" ],
                args : [ "MANDATORY_COST_MODEL_ID" ],
                message : messages.MSG_FIELD_MISSING
            } ],
    afterInitialize : [ {
        method : "facetInit",
        on : [ "queryFacetFilter" ]
    }, {
        method : "init",
        on : [ "update", "create" ]
    } ]
};

function BaseConnection() {
    this.init = function(obj, get) {
        obj.SIMULATION_PLAN_ID = get("planId");
        obj.SCENARIO_ID = get("scenarioId");
    };

    this.connObjInit = function(obj, get) {
        obj.FROM_LOCATION_NAME = get("FROM_LOCATION_NAME")
                || obj.FROM_LOCATION_NAME;
        obj.TO_LOCATION_NAME = get("TO_LOCATION_NAME") || obj.TO_LOCATION_NAME;
        obj.USED_FLAG = get("USED_FLAG") || obj.USED_FLAG;
        obj.MTR = get("MTR") || obj.MTR;
        obj.DISTANCE = get("DISTANCE") || obj.DISTANCE;
        obj.DURATION = get("DURATION") || obj.DURATION;
        obj.CARRIER = get("CARRIER") || obj.CARRIERS;

        var connId = get("CONNECTION_ID");
        obj.CONNECTION_ID_LIST = connId ? connId.split(",") : [];

        obj.BASE_CONNECTION = {
            FROM_LOCATION : obj.FROM_LOCATION_NAME,
            TO_LOCATION : obj.TO_LOCATION_NAME,
            MTR : obj.MTR,
            DISTANCE : obj.DISTANCE,
            DURATION : obj.DURATION,
            CARRIER : obj.CARRIERS
        };
    };

    this.coordinateInit = function(obj, get) {
        var minCoords = get("min_coordinate").split(";");
        var maxCoords = get("max_coordinate").split(";");

        obj.X_MIN = minCoords[0];
        obj.Y_MIN = minCoords[1];
        obj.X_MAX = maxCoords[0];
        obj.Y_MAX = maxCoords[1];

    };
}

BaseConnection.prototype = {
    validates : [ {
        field : "planId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "scenarioId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "FROM_LOCATION_NAME",
        allowBlank : true,
        presence : true,
        args : "{FROM_LOCATION_NAME}",
        condition : function(_, params) {
            return !params.get("CONNECTION_ID");
        },
        on : [ "query", "create", "update", "costs" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "TO_LOCATION_NAME",
        allowBlank : true,
        presence : true,
        condition : function(_, params) {
            return !params.get("CONNECTION_ID");
        },
        args : "{TO_LOCATION_NAME}",
        on : [ "query", "create", "update", "costs" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "DURATION",
        numericality : true,
        condition : function(_, params) {
            return !params.get("CONNECTION_ID");
        },
        args : "{DURATION}",
        on : [ "create", "update", "costs" ],
        message : messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field : "DURATION",
        numericality : true,
        validateWith: function(_, value) {
            return utils.checkPositiveInteger(parseInt(value) || 0);
        },
        args : "{DURATION}",
        on : [ "create", "update" ],
        message : messages.MSG_FIELD_INVALID
    },{
        field : "DISTANCE",
        numericality : true,
        condition : function(_, params) {
            return !params.get("CONNECTION_ID");
        },
        args : "{DISTANCE}",
        on : [ "create", "update", "costs" ],
        message : messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field : "USED_FLAG",
        type : Boolean,
        args : "{USED_FLAG}",
        on : [ "query" ],
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "MTR",
        allowBlank : true,
        type : String,
        condition : function(_, params) {
            return !params.get("CONNECTION_ID");
        },
        args : "{MTR}",
        on : [ "query", "costs", "create", "update" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "min_coordinate",
        presence : true,
        validateWith : function(_, value) {
            return typeof value === "string" && value.split(";").length >= 3;
        },
        args : "{min_coordinate}",
        on : "query",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "max_coordinate",
        presence : true,
        validateWith : function(_, value) {
            return typeof value === "string" && value.split(";").length >= 3;
        },
        args : "{max_coordinate}",
        on : "query",
        message : messages.MSG_FIELD_INVALID
    } ],
    afterInitialize : [ {
        method : "init"
    }, {
        method : "coordinateInit",
        on : [ "query" ]
    }, {
        method : "connObjInit",
        on : [ "create", "update", "costs", "query" ]
    } ]
};

function Network() {
    this.init = function(obj, get) {
        obj.SIMULATION_PLAN_ID = get("planId");
        obj.SCENARIO_ID = get("scenarioId");
    };
}

Network.prototype = {
    validates : [ {
        field : "planId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "scenarioId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    } ],
    afterInitialize : [ {
        method : "init"
    } ]
};

function Path() {
    this.init = function(obj, get) {
        obj.SIMULATION_PLAN_ID = get("planId");
        obj.SCENARIO_ID = get("scenarioId");
        obj.compositeType = (String(get("type")).toUpperCase() === "COMPOSITE");
    };

    this.coordinateInit = function(obj, get) {
        obj.FROM_LOCATION_NAME = get("FROM_LOCATION_NAME");
        obj.TO_LOCATION_NAME = get("TO_LOCATION_NAME");
        obj.USED_FLAG = get("USED_FLAG");
        obj.MTR = get("MTR");

        var minCoords = get("min_coordinate").split(";");
        var maxCoords = get("max_coordinate").split(";");

        obj.X_MIN = minCoords[0];
        obj.Y_MIN = minCoords[1];
        obj.X_MAX = maxCoords[0];
        obj.Y_MAX = maxCoords[1];

    };

    this.pathObjInit = function(obj) {
        if (obj.compositeType) {
            obj.COMPOSITE_PATH = {
                FROM_LOCATION : obj.FROM_LOCATION,
                TO_LOCATION : obj.TO_LOCATION,
                CONNECTION : obj.CONNECTION
            };
        } else {
            obj.BASIC_PATH = {
                FROM_LOCATION : obj.FROM_LOCATION,
                TO_LOCATION : obj.TO_LOCATION,
                MTR : obj.MTR,
                CARRIER : obj.CARRIER,
                CONNECTION : obj.CONNECTION
            };
        }
    };

    this.pathListInit = function(obj, get) {
        obj.PATH_ID_LIST = (!!get("PATH_ID")) ? get("PATH_ID").split(",")
                : undefined;
    };
}

Path.prototype = {
    validates : [
            {
                field : "planId",
                presence : true,
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "scenarioId",
                presence : true,
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "CONNECTION",
                validateWith : function(_, value) {
                    return value.every(function(item) {
                        return item.hasOwnProperty("FROM_LOCATION")
                                && item.hasOwnProperty("TO_LOCATION")
                                && item.hasOwnProperty("DISTANCE")
                                && item.hasOwnProperty("DURATION")
                                && item.hasOwnProperty("STAY_TIME")
                                && item.hasOwnProperty("SEQUENCE");
                    });
                },
                condition : function(_, params) {
                    return params.get("type") !== "COMPOSITE"
                            && !params.get("CONNECTION_ID");
                },
                args : "{CONNECTION}",
                on : [ "create", "update" ],
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "FROM_LOCATION",
                presence : true,
                args : "{FROM_LOCATION}",
                on : "create",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "TO_LOCATION",
                presence : true,
                args : "{TO_LOCATION}",
                on : "create",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "CONNECTION",
                type : Array,
                args : "{CONNECTION}",
                on : "create",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "MTR",
                allowBlank : true,
                type : String,
                args : "{MTR}",
                condition : function(_, params) {
                    return params.get("type") !== "COMPOSITE";
                },
                on : "create",
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "CONNECTION",
                validateWith : function(_, value) {
                    return value.every(function(item) {
                        return item.hasOwnProperty("FROM_LOCATION")
                                && item.hasOwnProperty("TO_LOCATION")
                                && item.hasOwnProperty("BASIC_PATH_ID")
                                && item.hasOwnProperty("PATH_TYPE")
                                && item.hasOwnProperty("SEQUENCE");
                    });
                },
                condition : function(_, params) {
                    return params.get("type") === "COMPOSITE";
                },
                args : "{CONNECTION}",
                on : "create",
                message : messages.MSG_FIELD_INVALID
            } ],
    afterInitialize : [ {
        method : "init"
    }, {
        method : "coordinateInit",
        on : "query"
    }, {
        method : "pathObjInit",
        on : [ "create", "updatePath", "costs" ]
    }, {
        method : "pathListInit",
        on : "costs"
    } ]
};

function DepartureRule() {
    this.init = function(obj, get) {
        obj.SIMULATION_PLAN_ID = get("planId");
        obj.SCENARIO_ID = get("scenarioId");
        obj.PATH_ID = get("pathId");
        obj.RULE_NUMBERS = (get("RULE_NUMBERS") || "").split(",");

        obj.PATTERN = [].concat(obj.PATTERN).map(function(i) {
            return String(i);
        }).join(",");
    };

    this.cycleTypeInit = function(obj) {
        if (obj.CYCLE_TYPE === "W") {
            // HANA encode the weekday as Monday(0), Tuesday(1), ... ,Sunday(6),
            // UI encode the weekday as Sunday(0), Monday(1), ..., Saturday(6).
            obj.PATTERN = (parseInt(obj.PATTERN, 10) + 6) % 7;
        }
    };
}

DepartureRule.prototype = {
    validates : [ {
        field : "pathId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "CYCLE_TYPE",
        inclusion : {
            scope : [ "D", "W", "M" ]
        },
        args : [ "{CYCLE_TYPE}" ],
        on : "create",
        message : messages.MSG_KEY_NOT_IN_ENUM
    }, {
        field : "PATTERN",
        validateWith : function(obj, val) {
            var rule = {
                D : [ 1 ],
                W : Array.apply(null, {
                    length : 7
                }).map(function(_, idx) {
                    return idx;
                }),
                M : Array.apply(null, {
                    length : 31
                }).map(function(_, idx) {
                    return idx + 1;
                })
            }[obj.CYCLE_TYPE];

            if (!rule) {
                return false;
            }

            return [].concat(val).every(function(v) {
                return rule.indexOf(v) !== -1;
            });
        },
        args : [ "{PATTERN}" ],
        on : "create",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "DEPARTURE_TIME",
        type : String,
        format : {
            expr : /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        },
        args : [ "{DEPARTURE_TIME}" ],
        on : "create",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "TIMEZONE",
        presence : true,
        args : [ "{TIMEZONE}" ],
        on : "create",
        message : messages.MSG_FIELD_MISSING
    } ],
    afterInitialize : [ {
        method : "init"
    }, {
        method : "cycleTypeInit",
        on : "create"
    } ]
};

function Voyage() {
    this.init = function(obj, get) {
        obj.PATH_ID = get("pathId");
        obj.SIMULATION_PLAN_ID = get("planId");
    };
}

Voyage.prototype = {
    validates : [
            {
                field : "pathId",
                presence : true,
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "FROM_TIME",
                type : Date,
                args : "{FROM_TIME}",
                on : "generate",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "TO_TIME",
                type : Date,
                args : "{TO_TIME}",
                on : "generate",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "RULE_NUMBERS",
                type : Array,
                args : "{RULE_NUMBERS}",
                on : "generate",
                message : messages.MSG_FIELD_INVALID
            },
            {
                field : "CAPACITY_LIST",
                type : Array,
                args : "{CAPACITY_LIST}",
                allowBlank : true,
                validateWith : function(_, val) {
                    return val.every(function(item) {
                        return item.hasOwnProperty("CAPACITY")
                                && item.hasOwnProperty("CAPACITY_UOM")
                                && item.hasOwnProperty("TRIP_ID")
                                && item.hasOwnProperty("SEQUENCE");
                    });
                },
                on : "updateCapacity",
                message : messages.MSG_FIELD_INVALID
            }, {
                field : "CAPACITY",
                presence : true,
                type : Number,
                args : "{CAPACITY}",
                allowBlank : true,
                on : "updateCapacity",
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "CAPACITY_UOM",
                type : String,
                args : "{CAPACITY_UOM}",
                allowBlank : true,
                on : "updateCapacity",
                message : messages.MSG_FIELD_MISSING
            } ],
    afterInitialize : [ {
        method : "init"
    } ]
};

function Route() {
    this.init = function(obj, get) {
        obj.planId = get("planId");
        obj.ROUTE_ID = get("ROUTE_ID");
        obj.scenarioId = get("scenarioId") || 0;
        obj.search_by = get("search_by");

        obj.FROM_LOC = get("FROM_LOC");
        obj.TO_LOC = get("TO_LOC");

        obj.START_TIME = get("START_TIME") || null;
        obj.END_TIME = get("END_TIME") || null;

        var minCoords = get("min_coordinate").split(";");
        var maxCoords = get("max_coordinate").split(";");

        obj.X_MIN = minCoords[0];
        obj.Y_MIN = minCoords[1];
        obj.X_MAX = maxCoords[0];
        obj.Y_MAX = maxCoords[1];
    };
}

Route.prototype = {
    validates : [ {
        field : "planId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "scenarioId",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "ROUTE_ID",
        numericality : true,
        allowBlank : true,
        args : "{ROUTE_ID}",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "search_by",
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "START_TIME",
        type : Date,
        allowBlank : true,
        args : "{START_TIME}",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "END_TIME",
        type : Date,
        allowBlank : true,
        args : "{END_TIME}",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "min_coordinate",
        presence : true,
        validateWith : function(_, value) {
            return typeof value === "string" && value.split(";").length >= 3;
        },
        args : "{min_coordinate}",
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "max_coordinate",
        presence : true,
        validateWith : function(_, value) {
            return typeof value === "string" && value.split(";").length >= 3;
        },
        args : "{max_coordinate}",
        message : messages.MSG_FIELD_INVALID
    } ],
    afterInitialize : [ {
        method : "init"
    } ]
};

function Dataset() {
    this.init = function(obj, get) {
        obj.SIMULATION_PLAN_ID = get("planId");
        obj.WITH_SUMMARY = get("withSummary");
    };
}

Dataset.prototype = {
    validates : [ {
        field : "planId",
        allowBlank : true,
        presence : true,
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "withSummary",
        type : Boolean,
        presence : true,
        on : "show",
        message : messages.MSG_FIELD_MISSING
    } ],
    afterInitialize : [ {
        method : "init"
    } ]
};
