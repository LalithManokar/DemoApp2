var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var ZONE_TYPE = constants.ZONE_TYPE;
var FIELD = constants.FIELD;
var RO_TYPE = constants.REGISTRATION_OBJECT_TYPE;

function User() {
    this.init = function(obj) {
        obj.ROLES = (obj.ROLES || []).map(function(item) {
            return {
                ID : item.ID
            };
        });
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.userIdList = obj.filters.hasOwnProperty("USER_TYPE_ID") ? obj.filters.USER_TYPE_ID
                .map(function(item) {
                    return {
                        USER_TYPE_ID : item
                    };
                })
                : [];
    };
}

User.prototype = {
    validates : [ {
        field : "TEMPERATURE_UNIT_CODE",
        presence : true,
        on : [ "update", "create" ],
        args : [ "TEMPERATURE_UNIT_CODE" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "WEIGHT_UNIT_CODE",
        presence : true,
        on : [ "update", "create" ],
        args : [ "WEIGHT_UNIT_CODE" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "DISTANCE_CODE",
        presence : true,
        on : [ "update", "create" ],
        args : [ "DISTANCE_CODE" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "VOLUME_UNIT_CODE",
        presence : true,
        on : [ "update", "create" ],
        args : [ "VOLUME_UNIT_CODE" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "DATE_FORMAT_ID",
        presence : true,
        on : [ "update", "create" ],
        args : [ "DATE_FORMAT_ID" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "TIME_FORMAT_ID",
        presence : true,
        on : [ "update", "create" ],
        args : [ "TIME_FORMAT_ID" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "DECIMAL_NOTATION_ID",
        presence : true,
        on : [ "update", "create" ],
        args : [ "DECIMAL_NOTATION_ID" ],
        message : messages.MSG_FIELD_MISSING
    }, {
        field : "search",
        presence : true,
        allowBlank : true,
        on : [ "queryFacetFilter" ],
        args : [ "{search}" ],
        message : messages.MSG_FIELD_INVALID
    }, {
        field : "filters",
        presence : true,
        on : [ "queryFacetFilter" ],
        args : [ "{filters}" ],
        message : messages.MSG_FIELD_INVALID
    } ],
    afterInitialize : [ {
        method : "init",
        on : [ "update" ]
    }, {
        method : "facetInit",
        on : [ "queryFacetFilter" ]
    } ]
};

// 0 means x, 1 means y
function transformPolygon(minPoint, maxPoint) {
    var min = minPoint.split(";");
    var max = maxPoint.split(";");
    return "Polygon((%(min0)s %(min1)s, %(max0)s %(min1)s, %(max0)s %(max1)s, %(min0)s %(max1)s, %(min0)s %(min1)s))"
            .replace(/%\(min0\)s/g, min[0]).replace(/%\(min1\)s/g, min[1])
            .replace(/%\(max0\)s/g, max[0]).replace(/%\(max1\)s/g, max[1]);
}

function Role() {
    this.init = function(obj) {
        obj.NAME = utils.trim(obj.NAME || "");
        obj.DESC = utils.trim(obj.DESC || "");
        if (obj.hasOwnProperty("ROLE_GROUP_ID")) {
            switch (obj.ROLE_GROUP_ID) {
            case constants.ROLE_TYPE.DEPOT_MGR:
                obj.POSITIONS = obj.LOCATIONS || [];
                break;
            /*case constants.ROLE_TYPE.LOCAL_PLR:
                obj.POSITIONS = obj.ZONES || [];
                break;
                */
            case constants.ROLE_TYPE.REGIONAL_PLR:
                obj.POSITIONS = obj.ZONES || [];
                break;
            case constants.ROLE_TYPE.RESOURCE:
                obj.POSITIONS = obj.RESOURCE_ATTS || [];
                break;
            }
        }
    };
    this.depotManagerInit = function(obj, getParams) {
        obj.mapArea = transformPolygon(getParams("MIN_COORDINATE"),
                getParams("MAX_COORDINATE"));
        obj.mapLevel = parseInt(getParams("MAP_LEVEL"), 10); // MAP_LEVEL is
        // 1(country)/2/3/4
        obj.locations = []; // default
        obj.field = getParams("FIELD");
        var b = getParams("LOCATION_IDS");
        if (b) {
            obj.locations = b.replace(/\s/g, "").split(";").map(function(item) {
                return {
                    ID : item
                };
            });
        }
    };
    this.localAndRegionalPlrInit = function(obj, getParams) {
        obj.mapArea = transformPolygon(getParams("MIN_COORDINATE"),
                getParams("MAX_COORDINATE"));
        obj.zones = []; // default
        var b = getParams("ZONE_IDS");
        if (b) {
            obj.zones = b.replace(/\s/g, "").split(";").map(function(item) {
                return {
                    ID : item
                };
            });
        }
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.ROLE_GROUP_ID = obj.filters.hasOwnProperty("ROLE_GROUP_ID") ? obj.filters.ROLE_GROUP_ID
                .map(function(item) {
                    return {
                        ROLE_GROUP_ID : item
                    };
                })
                : [];
    };
}

Role.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                on : [ "update", "create" ],
                args : [ "NAME" ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : "NAME",
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                on : [ "create" ]
            },
            {
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.systemmanagement.user::t_role" WHERE LOWER(NAME) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "ROLE_GROUP_ID",
                presence : true,
                on : [ "update", "create" ],
                args : [ "ROLE_GROUP_ID" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "MAP_LEVEL",
                presence : true,
                on : [ "listDepotsOnMap", "showDepotManagerOnMap" ],
                args : [ "MAP_LEVEL" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "MAP_LEVEL",
                numericality : true,
                on : [ "listDepotsOnMap", "showDepotManagerOnMap" ],
                args : [ "MAP_LEVEL" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            },
            {
                field : "MIN_COORDINATE",
                presence : true,
                on : [ "listDepotsOnMap", "listZonesOnMap",
                        "listHierarchyOnMap", "showDepotManagerOnMap",
                        "showLocalPlannerOnMap", "showRegionalPlannerOnMap" ],
                args : [ "MIN_COORDINATE" ],
                message : messages.MSG_FIELD_MISSING
            },
            {
                field : "MIN_COORDINATE",
                format : {
                    expr : /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
                },
                on : [ "listDepotsOnMap", "listZonesOnMap",
                        "listHierarchyOnMap", "showDepotManagerOnMap",
                        "showLocalPlannerOnMap", "showRegionalPlannerOnMap" ],
                message : messages.MSG_KEY_FORMAT_INVALID,
                args : [ "MIN_COORDINATE",
                        /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/ ]
            },
            {
                field : "MAX_COORDINATE",
                presence : true,
                on : [ "listDepotsOnMap", "listZonesOnMap",
                        "listHierarchyOnMap", "showDepotManagerOnMap",
                        "showLocalPlannerOnMap", "showRegionalPlannerOnMap" ],
                message : messages.MSG_FIELD_MISSING,
                args : [ "MAX_COORDINATE" ]
            },
            {
                field : "MAX_COORDINATE",
                format : {
                    expr : /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
                },
                on : [ "listDepotsOnMap", "listZonesOnMap",
                        "listHierarchyOnMap", "showDepotManagerOnMap",
                        "showLocalPlannerOnMap", "showRegionalPlannerOnMap" ],
                message : messages.MSG_KEY_FORMAT_INVALID,
                args : [ "MAX_COORDINATE",
                        /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/ ]
            },
            {
                field : "FIELD",
                inclusion : {
                    scope : [ FIELD.POINT, FIELD.AGGR_POINT, FIELD.POLYGON ]
                },
                message : messages.MSG_KEY_NOT_IN_ENUM,
                on : [ "listDepotsOnMap", "showDepotManagerOnMap" ],
                args : [
                        "FIELD",
                        [ FIELD.POINT, FIELD.AGGR_POINT, FIELD.POLYGON ]
                                .join(",") ]
            }, {
                field : "ZONE_IDS",
                on : "listHierarchyOnMap",
                format : {
                    expr : /([\w\{\}]+;?)+/
                },
                message : messages.MSG_KEY_FORMAT_INVALID,
                args : [ "ZONE_IDS", /([\w\{\}]+;?)+/ ]
            }, {
                field : "LOCATION_IDS",
                on : "listDepotsOnMap",
                format : {
                    expr : /([\w\{\}]+;?)+/
                },
                message : messages.MSG_KEY_FORMAT_INVALID,
                args : [ "LOCATION_IDS", /([\w\{\}]+;?)+/ ]
            }, {
                field : "filters",
                presence : true,
                on : [ "queryFacetFilter" ],
                args : [ "{filters}" ],
                message : messages.MSG_FIELD_INVALID
            } ],
    // afterInitialize: ["init"]
    afterInitialize : [
            {
                method : "init",
                on : [ "create", "update" ]
            },
            {
                method : "depotManagerInit",
                on : [ "listDepotsOnMap", "showDepotManagerOnMap" ]
            },
            {
                method : "localAndRegionalPlrInit",
                on : [ "listZonesOnMap", "listHierarchyOnMap",
                        "showLocalPlannerOnMap", "showRegionalPlannerOnMap" ]
            }, {
                method : "facetInit",
                on : [ "queryFacetFilter" ]
            } ]
};

function Region() {
};

Region.prototype = {
    validates : [ {
        field : "NAME",
        presence : true,
        on : "create",
        message : messages.MSG_NAME_MISSING
    }, {
        field : "NAME",
        format : {
            expr : utils.HUMAN_READABLE_KEY_REGEX
        },
        message : messages.MSG_NAME_INVALID,
        args : [ "{NAME}" ],
        on : [ "create" ]
    } ]
};

function Zone() {
    this.zoneInit = function(obj, getParams) {
        if (obj.MIN_COORDINATE) { // post method
            obj.MAP_AREA = transformPolygon(obj.MIN_COORDINATE,
                    obj.MAX_COORDINATE);
            obj.SELECTED_ITEMS.IDS = obj.SELECTED_ITEMS.IDS || [];
            obj.SELECTED_ITEMS_MAP = obj.SELECTED_ITEMS.IDS || [];
        } else {
            obj.mapArea = transformPolygon(getParams("min_coordinate"),
                    getParams("max_coordinate"));
            obj.selectedType = Number(getParams("SELECTED_TYPE"));
        }
    };
}

Zone.prototype.validates = [
        {
            field : "NAME",
            presence : true,
            message : messages.MSG_NAME_MISSING,
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
            field : "MIN_COORDINATE",
            presence : true,
            args : [ "MIN_COORDINATE" ],
            on : [ "showConvexHullOnMap", "showOnMap" ],
            message : messages.MSG_NAME_MISSING
        },
        {
            field : "MIN_COORDINATE",
            format : {
                expr : /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
            },
            args : [ "MIN_COORDINATE", /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/ ],
            on : [ "showConvexHullOnMap", "showOnMap" ],
            message : messages.MSG_KEY_FORMAT_INVALID
        },
        {
            field : "MAX_COORDINATE",
            presence : true,
            args : [ "MAX_COORDINATE" ],
            on : [ "showConvexHullOnMap", "showOnMap" ],
            message : messages.MSG_NAME_MISSING
        },
        {
            field : "MAX_COORDINATE",
            format : {
                expr : /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
            },
            args : [ "MAX_COORDINATE", /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/ ],
            on : [ "showConvexHullOnMap", "showOnMap" ],
            message : messages.MSG_KEY_FORMAT_INVALID
        },
        {
            field : "SELECTED_TYPE",
            presence : true,
            on : "showConvexHullOnMap",
            args : [ "SELECTED_TYPE" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "SELECTED_TYPE",
            on : "showConvexHullOnMap",
            inclusion : {
                scope : [ ZONE_TYPE.LOCATION, ZONE_TYPE.ADMIN_DIVISION,
                        ZONE_TYPE.POSTAL_CODE ]
            },
            args : [
                    "SELECTED_TYPE",
                    [ ZONE_TYPE.LOCATION, ZONE_TYPE.ADMIN_DIVISION,
                            ZONE_TYPE.POSTAL_CODE ].join(",") ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "SELECTED_TYPE",
            presence : true,
            on : "showOnMap",
            args : [ "SELECTED_TYPE" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "SELECTED_TYPE",
            on : "showOnMap",
            inclusion : {
                scope : [ ZONE_TYPE.LOCATION.toString(),
                        ZONE_TYPE.ADMIN_DIVISION.toString(),
                        ZONE_TYPE.POSTAL_CODE.toString() ]
            },
            args : [
                    "SELECTED_TYPE",
                    [ ZONE_TYPE.LOCATION.toString(),
                            ZONE_TYPE.ADMIN_DIVISION.toString(),
                            ZONE_TYPE.POSTAL_CODE.toString() ].join(",") ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "SELECTED_ITEMS/IDS",
            presence : true,
            on : "showConvexHullOnMap",
            args : [ "SELECTED_ITEMS/IDS" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "SELECTED_ITEMS/IDS",
            on : "showConvexHullOnMap",
            args : [ "SELECTED_ITEMS/IDS" ],
            message : messages.MSG_FIELD_INVALID,
            validateWith : function(obj) {
                switch (obj.SELECTED_TYPE) {
                case ZONE_TYPE.LOCATION:
                    return obj.SELECTED_ITEMS.IDS.every(function(val) {
                        return val.hasOwnProperty("ID");
                    });
                case ZONE_TYPE.ADMIN_DIVISION:
                    return obj.SELECTED_ITEMS.IDS.every(function(val) {
                        return val.hasOwnProperty("COUNTRY_CODE")
                                && val.hasOwnProperty("STATE_CODE");
                    });
                case ZONE_TYPE.POSTAL_CODE:
                    return obj.SELECTED_ITEMS.IDS.every(function(val) {
                        return val.hasOwnProperty("COUNTRY_CODE")
                                && val.hasOwnProperty("POSTAL_CODE_FROM")
                                && val.hasOwnProperty("POSTAL_CODE_TO");
                    });
                default:
                    return false;
                }
            }
        } ];
Zone.prototype.afterInitialize = [ {
    method : "zoneInit",
    on : [ "showConvexHullOnMap", "showOnMap" ]
} ];
// Hierarchy

function Hierarchy() {
}

Hierarchy.prototype.validates = [ {
    field : "NAME",
    presence : true,
    message : messages.MSG_NAME_MISSING,
    on : [ "create" ]
}, {
    field : "NAME",
    format : {
        expr : utils.HUMAN_READABLE_KEY_REGEX
    },
    message : messages.MSG_NAME_INVALID,
    args : [ "{NAME}" ],
    on : [ "create" ]
} ];

// Equipment Group

function ResourceGroup() {
    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];
    };
}

ResourceGroup.prototype.afterInitialize = [ {
    method : "facetInit",
    on : [ "queryFacetFilter" ]
} ];
ResourceGroup.prototype.validates = [
        {
            field : "RESOURCE_CATEGORY",
            presence : true,
            on : [ "create", "update" ],
            args : [ "RESOURCE_CATEGORY" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "NAME",
            presence : true,
            message : messages.MSG_NAME_MISSING,
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
            field : "NAME",
            uniqueness : {
                sql : 'SELECT 1 FROM "sap.tm.trp.db.systemmanagement::t_equipment_group" WHERE LOWER(DESC) = LOWER(?)'
            },
            message : messages.MSG_NAME_NON_UNIQUE,
            args : [ "{NAME}" ],
            on : [ "create" ]
        }, {
            field : "VISIBILITY",
            presence : true,
            args : [ "VISIBILITY" ],
            message : messages.MSG_FIELD_MISSING,
            on : [ "create", "update" ]
        }, {
            field : "VISIBILITY",
            inclusion : {
                scope : [ "P", "G" ]
            // P means personal, G means global.
            },
            on : [ "create", "update" ],
            args : [ "VISIBILITY", [ "P", "G" ].join(",") ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        }, {
            field : "ITEMS",
            presence : true,
            args : [ "ITEMS" ],
            message : messages.MSG_FIELD_MISSING,
            on : [ "create", "update" ]
        }, {
            field : "ITEMS",
            length : {
                minimum : 1
            },
            args : [ "ITEMS", "[1,*)" ],
            on : [ "create", "update" ],
            message : messages.MSG_KEY_LENGTH_INVALID
        }, {
            field : "filters",
            presence : true,
            on : [ "queryFacetFilter" ],
            args : [ "{filters}" ],
            message : messages.MSG_FIELD_INVALID
        }, {
            field : "RESOURCE_CATEGORY",
            presence : true,
            on : [ "queryFacetFilter" ],
            args : [ "RESOURCE_CATEGORY" ],
            message : messages.MSG_FIELD_MISSING
        } ];

// Location Group

function LocationGroup() {
    this.init = function(obj, getParams) {
        obj.TYPE = Number(getParams("TYPE") || obj.TYPE);
        obj.PRIME_LOC_ID = obj.PRIME_LOC_ID || "";
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];

        obj.TYPES = obj.filters.hasOwnProperty("TYPE") ? obj.filters.TYPE
                .map(function(item) {
                    return {
                        TYPE : item
                    };
                }) : [];
    };
}

LocationGroup.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                message : messages.MSG_NAME_MISSING,
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
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.systemmanagement::v_geo_group_desc_for_check" WHERE LOWER(DESC) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            }, {
                field : "TYPE",
                presence : true,
                args : [ "TYPE" ],
                message : messages.MSG_FIELD_MISSING,
                on : [ "create", "update" ]
            }, {
                field : "VISIBILITY",
                presence : true,
                args : [ "VISIBILITY" ],
                message : messages.MSG_FIELD_MISSING,
                on : [ "create", "update" ]
            }, {
                field : "VISIBILITY",
                inclusion : {
                    scope : [ "P", "G" ]
                // P means personal, G means global.
                },
                on : [ "create", "update" ],
                args : [ "VISIBILITY", [ "P", "G" ].join(",") ],
                message : messages.MSG_KEY_NOT_IN_ENUM
            }, {
                field : "ITEMS",
                presence : true,
                on : [ "create", "update" ],
                args : [ "ITEMS" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "ITEMS",
                length : {
                    minimum : 1
                },
                args : [ "ITEMS", "[1,*)" ],
                on : [ "create", "update" ],
                message : messages.MSG_KEY_LENGTH_INVALID
            }, {
                field : "filters",
                presence : true,
                on : [ "queryFacetFilter" ],
                args : [ "{filters}" ],
                message : messages.MSG_FIELD_INVALID
            } ],
    afterInitialize : [
            {
                method : "init",
                on : [ "create", "update", "destroy", "visibleCheck",
                        "deleteCheck", "updateCheck" ]
            }, {
                method : "facetInit",
                on : "queryFacetFilter"
            } ]
};

function TimeFilters() {
    this.init = function(obj) {
        obj.ITEMS.forEach(function(item, index) {
            item.SEQUENCE = index + 1;
        });
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.DIRECTION_FLAG = obj.filters.hasOwnProperty("DIRECTION_FLAG") ? obj.filters.DIRECTION_FLAG
                .map(function(item) {
                    return {
                        DIRECTION_FLAG : item
                    };
                })
                : [];

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];
    };
}

TimeFilters.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                message : messages.MSG_NAME_MISSING,
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
                field : "NAME",
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.filter::t_time_filter" WHERE CODE = ?'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "VISIBILITY",
                inclusion : {
                    scope : [ "G", "P" ]
                },
                message : messages.MSG_KEY_NOT_IN_ENUM,
                args : [ "{VISIBILITY}", [ "G", "P" ] ],
                on : [ "create", "update" ]
            },
            {
                field : "DIRECTION_FLAG",
                presence : true,
                message : messages.MSG_FIELD_MISSING,
                on : [ "create", "update" ]
            },
            {
                field : "TIME_ZONE_ID",
                presence : true,
                message : messages.MSG_FIELD_MISSING,
                on : [ "create", "update" ]
            },
            {
                field : "ENABLE_OFFSET_MOMENT",
                presence : true,
                inclusion : {
                    scope : [ 0, 1 ]
                },
                validateWith : function(obj) {
                    return obj.hasOwnProperty("OFFSET_START_TIME_HOUR")
                            || obj.hasOwnProperty("OFFSET_START_TIME_MINUTE")
                            || obj.hasOwnProperty("OFFSET_START_TIME_WEEK_DAY")
                            || obj
                                    .hasOwnProperty("OFFSET_START_TIME_MONTH_DAY");
                },
                message : messages.MSG_FIELD_INVALID,
                on : [ "create", "update" ]
            },
            {
                field : "OFFSET_START_TIME_HOUR",
                range : {
                    bw : [ 0, 23 ]
                },
                message : messages.MSG_KEY_LENGTH_INVALID,
                args : [ "OFFSET_START_TIME_HOUR", "[0,23]" ],
                on : [ "create", "update" ]
            },
            {
                field : "OFFSET_START_TIME_MINUTE",
                range : {
                    bw : [ 0, 59 ]
                },
                message : messages.MSG_KEY_LENGTH_INVALID,
                args : [ "OFFSET_START_TIME_MINUTE", "[0,59]" ],
                on : [ "create", "update" ]
            },
            {
                field : "OFFSET_START_TIME_WEEK_DAY",
                range : {
                    bw : [ 0, 6 ]
                },
                message : messages.MSG_KEY_LENGTH_INVALID,
                args : [ "OFFSET_START_TIME_WEEK_DAY", "[0,6]" ],
                on : [ "create", "update" ]
            },
            {
                field : "OFFSET_START_TIME_MONTH_DAY",
                range : {
                    bw : [ 1, 30 ]
                },
                message : messages.MSG_KEY_LENGTH_INVALID,
                args : [ "OFFSET_START_TIME_MONTH_DAY", "[1,30]" ],
                on : [ "create", "update" ]
            },
            {
                field : "ITEMS",
                presence : true,
                validateWith : function(obj) {
                    return Array.isArray(obj.ITEMS)
                            && obj.ITEMS.every(function(val) {
                                return val.hasOwnProperty("VALUE")
                                        && val.hasOwnProperty("UNIT")
                                        && val.hasOwnProperty("REPEAT_TIME");
                            });
                },
                message : messages.MSG_FIELD_MISSING,
                on : [ "create", "update" ]
            }, {
                field : "filters",
                presence : true,
                on : [ "queryFacetFilter" ],
                args : [ "{filters}" ],
                message : messages.MSG_FIELD_INVALID
            } ],

    afterInitialize : [ {
        method : "init",
        on : [ "create", "update" ]
    }, {
        method : "facetInit",
        on : [ "queryFacetFilter" ]
    } ]
};

/** ------------- RegistrationObject ---------------------* */

function RegistrationObject() {
    this.facetFilterInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.TYPE_ID_LIST = filterObj.hasOwnProperty('TYPE_ID') ? filterObj.TYPE_ID
                .map(function(id) {
                    return {
                        ID : id
                    };
                })
                : [];
        obj.CATEGORY_ID_LIST = filterObj.hasOwnProperty('CATEGORY_ID') ? filterObj.CATEGORY_ID
                .map(function(id) {
                    return {
                        ID : id
                    };
                })
                : [];
    };
    this.init = function(obj) {
        obj.DESC = obj.DESC || "";
    };
}

RegistrationObject.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                on : [ "create", "update" ],
                args : [ "NAME" ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : 'NAME',
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.objectregistration::v_registered_object_ui" WHERE lower(NAME) = lower(?)'
                },
                on : [ 'create' ],
                args : [ '{NAME}' ],
                message : messages.MSG_NAME_NON_UNIQUE
            }, {
                field : "NAME",
                format : {
                    expr : utils.HUMAN_READABLE_KEY_REGEX
                },
                message : messages.MSG_NAME_INVALID,
                args : [ "{NAME}" ],
                on : [ "create" ]
            }, {
                field : "CATEGORY",
                presence : true,
                on : [ "create", "update" ],
                args : [ "CATEGORY" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "SCHEMA",
                presence : true,
                on : [ "create", "update" ],
                args : [ "SCHEMA" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "PROCEDURE_NAME",
                presence : true,
                on : [ "create", "update" ],
                args : [ "PROCEDURE_NAME" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "TYPE_ID",
                presence : true,
                on : [ "create" ],
                args : [ "TYPE_ID" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "TYPE",
                inclusion : {
                    scope : Object.keys(RO_TYPE).map(function(key) {
                        return parseInt(key, 10);
                    })
                },
                on : [ "create" ],
                args : [ "TYPE", JSON.stringify(RO_TYPE) ],
                message : messages.MSG_KEY_NOT_IN_ENUM
            }, {
                field : "TYPE",
                on : [ "create" ],
                args : [ "TYPE" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "TABLE_NAME",
                presence : true,
                on : [ "create", "update" ],
                condition : function(obj) {
                    return obj.hasOwnProperty("TYPE") && obj.TYPE === 3;
                },
                args : [ "TABLE_NAME" ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : "CATEGORY",
                numericality : true,
                on : [ "create", "update" ],
                args : [ "CATEGORY" ],
                message : messages.MSG_KEY_NOT_A_NUMBER
            }, {
                field : 'filters',
                on : [ 'facetFilter' ],
                presence : true,
                args : [ 'filters' ],
                message : messages.MSG_FIELD_MISSING
            } ],
    afterInitialize : [ {
        method : 'facetFilterInit',
        on : [ 'facetFilter' ]
    },
    {
        method: "init",
        on: ["create","update"]
    }]
};

function AttributeGroup() {
    this.init = function(obj) {
        /*
         * we store prefix expression to avoid bracket and for later enhancement
         * means [EQUIPMENT_ID equal 1, LENGTH between 4 and 9] will be
         * automatically 1. concat length - 1 AND (by default) logical operators
         * 2. add SEQ to indicate the SEQUENCE 3. flatten the values so after
         * transformation, it would generate the following 1. ITEMS: [(1, 1,
         * AND, undefined, undefined, undefined), (2, 2, undefined,
         * EQUIPMENT_ID, equal, [1]), (3, 3, undefined, LENGTH, between, [4,
         * 9])] 2. VALUES: [(2, EQUIPMENT_ID, 1),(3, LENGTH, 4),(2, LENGTH, 9)]
         */
        obj.ITEMS = Array.apply(null, {
            length : obj.ITEMS.length > 0 ? obj.ITEMS.length - 1 : 0
        }).map(function() {
            return {
                LOGIC_OPERATOR : "AND"
            };
        }).concat(obj.ITEMS).map(function(item, index) {
            return {
                ITEM_ID : index + 1,
                SEQUENCE : index + 1,
                LOGIC_OPERATOR : item.LOGIC_OPERATOR,
                ATTRIBUTE_ID : item.ATTRIBUTE_ID,
                OPERATOR_CODE : item.OPERATOR,
                VALUES : item.VALUES
            };
        });

        obj.VALUES = obj.ITEMS.map(function(item) {
            return (item.VALUES || []).map(function(itm) {
                return {
                    ITEM_ID : item.ITEM_ID,
                    ATTRIBUTE_ID : item.ATTRIBUTE_ID,
                    VALUE : itm
                };
            });
        }).reduce(function(prev, succ) {
            return prev.concat(succ);
        });

        obj.DESC = obj.DESC || '';
    };

    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];
    };
}

AttributeGroup.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                on : [ "create" ],
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
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.filter::t_attribute_group" WHERE LOWER(CODE) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            },
            {
                field : "VISIBILITY",
                presence : true,
                inclusion : {
                    scope : [ "G", "P" ]
                },
                on : [ "create", "update" ],
                message : messages.MSG_ERROR_VISIBILITY
            },
            {
                field : "ITEMS",
                validateWith : function(obj) {
                    return Array.isArray(obj.ITEMS)
                            && obj.ITEMS.every(function(val) {
                                return val.hasOwnProperty("ATTRIBUTE_ID")
                                        && val.hasOwnProperty("ATTRIBUTE_CODE")
                                        && val.hasOwnProperty("OPERATOR")
                                        && val.hasOwnProperty("VALUES");
                            });
                },
                on : [ "create", "update" ],
                message: messages.MSG_FIELD_INVALID
            }, {
                field: 'ITEMS',
                validateWith: function(obj) {
                    return Array.isArray(obj.ITEMS)
                    && obj.ITEMS.every(function(val) {
                        if (val.TYPE === 'Number'){
                            return utils.checkNonNegativeInteger(parseInt(val.VALUES[0]) || 0);
                        } 
                        return true;
                    });
                },
                on: [ "create", "update" ],
                message: messages.MSG_FIELD_INVALID
            }, {
                field : "filters",
                presence : true,
                on : [ "queryFacetFilter" ],
                args : [ "{filters}" ],
                message : messages.MSG_FIELD_INVALID
            } ],

    afterInitialize : [ {
        method : "init",
        on : [ "create", "update" ]
    }, {
        method : "facetInit",
        on : [ "queryFacetFilter" ]
    } ]
};

function LocationFilter() {
    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];

        obj.TYPES = obj.filters.hasOwnProperty("TYPE") ? obj.filters.TYPE
                .map(function(item) {
                    return {
                        TYPE : item
                    };
                }) : [];
    };
}

LocationFilter.prototype.afterInitialize = [ {
    method : "facetInit",
    on : [ "queryFacetFilter" ]
} ];
LocationFilter.prototype.validates = [
        {
            field : "VISIBILITY",
            presence : true,
            on : [ "create", "update" ],
            args : [ "VISIBILITY" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "VISIBILITY",
            inclusion : {
                scope : [ 'P', 'G' ]
            },
            on : [ "create", "update" ],
            args : [ "VISIBILITY", [ 'P', 'G' ].join(',') ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "ITEMS",
            length : {
                minimum : 1
            },
            args : [ "ITEMS", '[1,*)' ],
            message : messages.MSG_KEY_LENGTH_INVALID,
            on : [ "create", "update" ]
        },
        {
            field : "ITEMS",
            presence : true,
            on : [ "create", "update" ],
            args : [ "ITEMS" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "TYPE",
            presence : true,
            on : [ "create", "update" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "TYPE",
            inclusion : {
                scope : [ 1, 2, 3, 4, 5, 6 ]
            },
            on : [ "create", "update" ],
            args : [ "TYPE", [ 1, 2, 3, 4, 5, 6 ].join(',') ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "NAME",
            presence : true,
            on : [ "update", "create" ],
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
            uniqueness : {
                sql : 'SELECT 1 FROM  "sap.tm.trp.db.filter::t_location_filter" WHERE LOWER(DESC) = LOWER(?)'
            },
            message : messages.MSG_NAME_NON_UNIQUE,
            args : [ "{NAME}" ],
            on : [ "create" ]
        }, {
            field : "filters",
            presence : true,
            on : [ "queryFacetFilter" ],
            args : [ "{filters}" ],
            message : messages.MSG_FIELD_INVALID
        } ];

function ResourceFilter() {
    this.facetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";

        obj.VISIBILITY = obj.filters.hasOwnProperty("VISIBILITY") ? obj.filters.VISIBILITY
                .map(function(item) {
                    return {
                        VISIBILITY : item
                    };
                })
                : [];

        obj.TYPES = obj.filters.hasOwnProperty("TYPE") ? obj.filters.TYPE
                .map(function(item) {
                    return {
                        TYPE : item
                    };
                }) : [];
    };
}

ResourceFilter.prototype.afterInitialize = [ {
    method : "facetInit",
    on : [ "queryFacetFilter" ]
} ];
ResourceFilter.prototype.validates = [
        {
            field : "RESOURCE_CATEGORY",
            presence : true,
            on : [ "create", "update" ],
            args : [ "RESOURCE_CATEGORY" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "VISIBILITY",
            presence : true,
            on : [ "create", "update" ],
            args : [ "VISIBILITY" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "VISIBILITY",
            inclusion : {
                scope : [ 'P', 'G' ]
            },
            on : [ "create", "update" ],
            args : [ "VISIBILITY", [ 'P', 'G' ].join(',') ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "ITEMS",
            length : {
                minimum : 1
            },
            args : [ "ITEMS", '[1,*)' ],
            message : messages.MSG_KEY_LENGTH_INVALID,
            on : [ "create", "update" ]
        },
        {
            field : "ITEMS",
            presence : true,
            on : [ "create", "update" ],
            args : [ "ITEMS" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "TYPE",
            presence : true,
            on : [ "create", "update" ],
            args : [ "TYPE" ],
            message : messages.MSG_FIELD_MISSING
        },
        {
            field : "TYPE",
            inclusion : {
                scope : [ 1, 2 ]
            },
            on : [ "create", "update" ],
            args : [ "TYPE", [ 1, 2 ].join(',') ],
            message : messages.MSG_KEY_NOT_IN_ENUM
        },
        {
            field : "NAME",
            presence : true,
            on : [ "create" ],
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
            uniqueness : {
                sql : 'SELECT 1 FROM  "sap.tm.trp.db.filter::t_equipment_filter" WHERE LOWER(DESC) = LOWER(?)'
            },
            message : messages.MSG_NAME_NON_UNIQUE,
            args : [ "{NAME}" ],
            on : [ "create" ]
        }, {
            field : "filters",
            presence : true,
            on : [ "queryFacetFilter" ],
            args : [ "{filters}" ],
            message : messages.MSG_FIELD_INVALID
        }, {
            field : "RESOURCE_CATEGORY",
            presence : true,
            on : [ "queryFacetFilter" ],
            args : [ "RESOURCE_CATEGORY" ],
            message : messages.MSG_FIELD_MISSING
        } ];

function CostModel() {

}

CostModel.prototype = {
    validates : [
            {
                field : "NAME",
                presence : true,
                on : [ "create" ],
                message : messages.MSG_NAME_INVALID
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
                uniqueness : {
                    sql : 'SELECT 1 FROM  "sap.tm.trp.db.costmodel::t_cost_model_new" WHERE LOWER(CODE) = LOWER(?)'
                },
                message : messages.MSG_NAME_NON_UNIQUE,
                args : [ "{NAME}" ],
                on : [ "create" ]
            } ]
};
