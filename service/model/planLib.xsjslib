var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var timeFormatHelperUtils = $
        .import('/sap/tm/trp/service/xslib/timeFormatHelper.xsjslib');
var FIELD = constants.FIELD;

function transformPolygon(minPoint, maxPoint) {
    var min = minPoint.split(';');
    var max = maxPoint.split(';');
    return "Polygon((%(min0)s %(min1)s, %(max0)s %(min1)s, %(max0)s %(max1)s, %(min0)s %(max1)s, %(min0)s %(min1)s))"
            .replace(/%\(min0\)s/g, min[0]).replace(/%\(min1\)s/g, min[1])
            .replace(/%\(max0\)s/g, max[0]).replace(/%\(max1\)s/g, max[1]);
}

function resultInit(obj, getParams) {
    obj.nodeId = parseInt(getParams('node_id'), 10) || -1;
    obj.execId = parseInt(getParams('exec_id'), 10) || 0;// If there is no
                                                            // exec_id, then
    obj.resourceTypeCode = (getParams('resource_type_code') === 'ALL' ? ''
            : getParams('resource_type_code'))
            || '';
    if (getParams('node_name')) {
        obj.nodeName = getParams('node_name');
    } else {
        obj.nodeName = "";
    }
    if (getParams("resource_type")) {
        obj.resourceType = getParams("resource_type");
    }
    if (getParams("timezone")) {
        obj.timezone = getParams("timezone");
    }
    if (getParams("geo_id")) {
        obj.locations = getParams("geo_id").split(",").map(function(item) {
            return {
                ID : item
            };
        });
        obj.geoId = getParams('geo_id');
    } else {
        obj.locations = [];
        obj.geoId = 0;
    }

    obj.locationType = getParams("location_type") || 0;
}

function downloadInit(obj, getParams) {
    obj.downloadType = getParams("download_type");
}

function mapInit(obj, getParams) {
    if (getParams("exec_id")) {
        obj.execId = parseInt(getParams("exec_id"), 10) || 0;
    }
    if (getParams("node_id")) {
        obj.nodeId = parseInt(getParams("node_id"), 10) || -1;
    }
    if (getParams("hierarchy_level")) {
        obj.hierarchyLevel = parseInt(getParams("hierarchy_level"), 10) || 0;
    }
    if (getParams("node_name")) {
        obj.nodeName = getParams("node_name");
    }
    if (getParams("resource_type")) {
        obj.resourceType = getParams("resource_type");
    }
    if (getParams("timezone")) {
        obj.timezone = getParams("timezone");
    }
    if (getParams("sequence")) {
        obj.sequence = getParams("sequence");
    }
    obj.polygon = transformPolygon(getParams("min_coordinate"),
            getParams("max_coordinate"));
    if (getParams("location_id")) {
        obj.locationId = getParams("location_id");
    } else {
        obj.locationId = '';
    }
    obj.startTime = getParams("start_time");
    obj.sequence = getParams("sequence");
}

function locationInit(obj, getParams) {
    obj.execId = parseInt(getParams("exec_id"), 10);
    obj.nodeId = parseInt(getParams("node_id"), 10);
    if (getParams("timezone")) {
        obj.timezone = getParams("timezone");
    }
}

function detailsInit(obj, getParams) {
    if (getParams('detail_type')) {
        obj.type = getParams('detail_type');
        obj.outputKeys = getParams("detail_type").split(",").map(function(i) {
            return {
                OUTPUT_KEY : i
            };
        });
    } else {
        obj.type = '';
    }
    if (getParams("geo_id")) {
        obj.locations = getParams("geo_id").split(",").map(function(i) {
            return {
                ID : i
            };
        });
        obj.geoId = getParams("geo_id");
    } else {
        obj.locations = [];
        obj.geoId = "";
    }
    if (getParams("node_name")) {
        obj.nodeName = getParams("node_name");
    } else {
        obj.nodeName = "";
    }
    if (getParams("node_id")) {
        obj.nodeId = parseInt(getParams("node_id"), 10);
    }
    if (getParams("exec_id")) {
        obj.execId = parseInt(getParams("exec_id"), 10);
    }
    obj.startTime = getParams("start_time");
    obj.sequence = getParams("sequence");
    obj.resourceTypeCode = (getParams('resource_type_code') === 'ALL' ? ''
            : getParams('resource_type_code'))
            || '';
    obj.locationType = getParams("location_type") || 0;
    if (getParams("timezone")) {
        obj.timezone = getParams("timezone");
    }
}

function kpiTableInit(obj, getParams) {
    obj.nodeId = parseInt(getParams("node_id"), 10) || -1;
    obj.nodeName = getParams("node_name") || "";
    obj.execId = parseInt(getParams("exec_id"), 10);

    if (getParams("resource_type_code")) {
        obj.resourceTypeCode = getParams("resource_type_code");
    }

    if (getParams("location_type")) {
        obj.locationType = getParams("location_type");
    }

    if (getParams("geo_id")) {
        obj.geoId = getParams("geo_id");
        obj.locations = obj.geoId.split(",").map(function(i) {
            return {
                ID : i
            };
        });
    }
}

function kpiChartInit(obj, getParams) {
    if (getParams("exec_id")) {
        obj.execId = parseInt(getParams("exec_id"), 10);
    }
    if (getParams("node_id")) {
        obj.nodeId = parseInt(getParams("node_id"), 10);
    }
    if (getParams("node_name")) {
        obj.nodeName = getParams("node_name");
    }
    if (getParams("geo_id")) {
        obj.locations = getParams("geo_id").split(",").map(function(item) {
            return {
                ID : item
            };
        });
    } else {
        obj.locations = [];
    }
}

function availableInit(obj, getParams) {
    obj.LOCATION_FILTER_ID = parseInt(getParams('LOCATION_FILTER_ID'), 10);
    if (getParams('SUB_PLAN_IDS')) {
        obj.SUB_PLAN_IDS = getParams('SUB_PLAN_IDS');
    } else {
        obj.SUB_PLAN_IDS = '';
    }
    obj.RESOURCE_FILTER_ID = parseInt(getParams('RESOURCE_FILTER_ID'), 10);
    obj.RESOURCE_CATEGORY = getParams("RESOURCE_CATEGORY");
}

function checkInit(obj) {
    obj.FULL_CHECK = Number(obj.FULL_CHECK);
    obj.SUB_PLANS = (obj.SUB_PLANS || []).map(function(item) {
        return {
            PLAN_MODEL_ID : item.ID,
            LOCATION_FILTER_ID : item.LOCATION_FILTER_ID
        };
    });
    obj.COMPARE_SUB_PLANS = (obj.COMPARE_SUB_PLANS || []).map(function(item) {
        return {
            PLAN_MODEL_ID : item.ID,
            LOCATION_FILTER_ID : item.LOCATION_FILTER_ID
        };
    });
}

function infoInit(obj) {
    obj.nodeName = "";
}

// Plans
function Plans() {
    this.init = function(obj) {
        obj.NAME = obj.NAME || '#Adhoc'
                + timeFormatHelperUtils.secondFormat(new Date());
        obj.VISIBILITY_FLAG = obj.VISIBILITY; // `G` or `P`
        obj.VISIBILITY = obj.VISIBILITY === 'G' ? 1 : 0;
        obj.SUB_PLANS = (obj.SUB_PLANS || []).map(function(item) {
            return {
                ID : item.ID
            };
        });
        obj.ATTRIBUTE_GROUP_ID = obj.ATTRIBUTE_GROUP_ID || -1;
    };
    this.facetInit = function(obj) {
        obj.planTypeId = (obj.filters.PLAN_TYPE_ID || []).map(function(item) {
            return {
                ID : item
            };
        });
        obj.resourceFilterId = (obj.filters.RESOURCE_FILTER_ID || [])
                .map(function(item) {
                    return {
                        ID : item
                    };
                });
        obj.locationFilterId = (obj.filters.LOCATION_FILTER_ID || [])
                .map(function(item) {
                    return {
                        ID : item
                    };
                });
        obj.timeFilterId = (obj.filters.TIME_FILTER_ID || [])
                .map(function(item) {
                    return {
                        ID : item
                    };
                });
        obj.visibility = (obj.filters.VISIBILITY || []).map(function(item) {
            return {
                ID : item === 'G' ? 1 : 0
            };
        });
        obj.locationFilterType = (obj.filters.LOCATION_FILTER_TYPE || [])
                .map(function(item) {
                    return {
                        ID : item
                    };
                });
        obj.planStatus = (obj.filters.PLAN_STATUS || []).map(function(item) {
            return {
                ID : item
            };
        });
    };
}

Plans.prototype = {
    validates : [
            {
                field : 'NAME',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'NAME' ],
                message : messages.MSG_NAME_MISSING
            },
            {
                field : 'NAME',
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
                uniqueness : {
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.pipeline::t_plan_model" WHERE lower(NAME) = lower(?)'
                },
                args : [ '{NAME}' ],
                message : messages.MSG_NAME_NON_UNIQUE
            }, {
                field : 'DESC',
                length : {
                    within : [ 1, 40 ]
                },
                allowBlank : true,
                on : [ 'create', 'update' ],
                args : [ 'DESC', '[1,40]' ],
                message : messages.MSG_KEY_LENGTH_INVALID
            }, {
                field : 'PLAN_TYPE_ID',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'PLAN_TYPE_ID' ],
                message : messages.MSG_NAME_MISSING
            }, {
                field : 'VISIBILITY',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'VISIBILITY' ],
                message : messages.MSG_NAME_MISSING
            }, {
                field : 'RESOURCE_FILTER_ID',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'RESOURCE_FILTER_ID' ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : 'RESOURCE_FILTER_ID',
                format : {
                    expr : /[0-9]*/
                },
                on : [ 'create', 'update' ],
                args : [ 'RESOURCE_FILTER_ID', /[0-9]*/ ],
                message : messages.MSG_KEY_FORMAT_INVALID
            }, {
                field : 'LOCATION_FILTER_ID',
                presence : true,
                on : [ 'create', 'update' ],
                args : [ 'LOCATION_FILTER_ID' ],
                message : messages.MSG_FIELD_MISSING
            }, {
                field : 'LOCATION_FILTER_ID',
                format : {
                    expr : /[0-9]*/
                },
                on : [ 'create', 'update' ],
                args : [ 'LOCATION_FILTER_ID', /[0-9]*/ ],
                message : messages.MSG_KEY_FORMAT_INVALID
            } ],
    afterInitialize : [ {
        method : 'init',
        on : [ 'create', 'update', 'destroy' ]
    }, {
        method : 'facetInit',
        on : [ 'queryItems' ]
    } ]
};
