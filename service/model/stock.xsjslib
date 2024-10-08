var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var timeFormatHelperUtils = $.import('/sap/tm/trp/service/xslib/timeFormatHelper.xsjslib');
var FIELD = constants.FIELD;
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');

// Stocks
function Stocks() {
    this.init = function(obj) {
        obj.locationId = obj.GEO_ID;
        obj.locationType = obj.GEO_TYPE;
        obj.stockSettings = [{
                MIN_SAFETY_STOCK: obj.STOCK_SETTINGS.MIN_SAFETY_STOCK === "" ? null : obj.STOCK_SETTINGS.MIN_SAFETY_STOCK,
                MAX_SAFETY_STOCK: obj.STOCK_SETTINGS.MAX_SAFETY_STOCK === "" ? null : obj.STOCK_SETTINGS.MAX_SAFETY_STOCK,
                MAX_PHYSICAL_STOCK: obj.STOCK_SETTINGS.MAX_PHYSICAL_STOCK === "" ? null : obj.STOCK_SETTINGS.MAX_PHYSICAL_STOCK,
                HANDLING_CAPACITY: obj.STOCK_SETTINGS.HANDLING_CAPACITY === "" ? null : obj.STOCK_SETTINGS.HANDLING_CAPACITY
            }];
        obj.stockThresholds = (obj.STOCK_THRESHOLDS || []).map(function(item) {
            return {
                RESOURCE_ID: item.RESOURCE_ID === "" ? null : item.RESOURCE_ID,
                RESOURCE_TYPE: item.RESOURCE_TYPE === "" ? null : item.RESOURCE_TYPE,
                MIN_SAFETY_STOCK: item.MIN_SAFETY_STOCK === "" ? null : item.MIN_SAFETY_STOCK,
                MAX_SAFETY_STOCK: item.MAX_SAFETY_STOCK === "" ? null : item.MAX_SAFETY_STOCK,
                MAX_PHYSICAL_STOCK: item.MAX_PHYSICAL_STOCK === "" ? null : item.MAX_PHYSICAL_STOCK                		
            };
        });
    };

    this.mapInit = function(obj, getParams) {
        if(getParams('location_filter_id')) {
            obj.locationFilterId = parseInt(getParams('location_filter_id'), 10) || -1;
        }
        if(getParams('resource_filter_id')) {
            obj.resourceFilterId = parseInt(getParams('resource_filter_id'), 10) || -1;
        }
        if(getParams('hierarchy_level')) {
            obj.hierarchyLevel = parseInt(getParams('hierarchy_level'), 10);
        }
        if (getParams("resource_type")) {
            obj.resourceType = getParams("resource_type");
        }
        if(getParams('min_coordinate') && getParams('max_coordinate')) {
            obj.MIN = getParams('min_coordinate').split(';');
            obj.MAX = getParams('max_coordinate').split(';');
        }
        if(getParams('attribute_group_items')) {
            obj.nodeIdList = getParams('attribute_group_items').split(',').map(function(item) { return { NODE_ID: item};});
        } else {
            obj.nodeIdList = [];
        }
        obj.attributeGroupId = obj.nodeIdList.length > 0 ? parseInt(getParams('attribute_group_id'), 10) : -1;
    };

    this.tableInit = function(obj) {
        obj.locationFilterId = parseInt(obj.LOCATION_FILTER_ID, 10) || -1;
        obj.resourceFilterId = parseInt(obj.RESOURCE_FILTER_ID, 10) || -1;
        obj.resourceCategory = obj.RESOURCE_CATEGORY;
        obj.nodeIdList = (obj.ATTRIBUTE_GROUP_ITEMS || []).map(function(item) {
            return {
                NODE_ID: item.ID
            };
        });
        obj.attributeGroupId = obj.nodeIdList.length > 0 ? parseInt(obj.ATTRIBUTE_GROUP_ID, 10) : -1;
        obj.locationIdList = (obj.LOCATIONS || []).map(function(item) {
            return {
                ID: item.ID,
                NAME: item.NAME,
                TYPE: item.TYPE
            };
        });
        obj.resourceTypeList = (obj.RESOURCES || []).map(function(item) {
            return {
            	RESOURCE_TYPE_CODE: item.ID,
            	RESOURCE_TYPE_NAME: item.NAME,
                RESOURCE_TYPE: item.TYPE
            };
        });
    };

   this.chartInit = function(obj) {
       obj.locationFilterId = obj.LOCATION_FILTER_ID || -1;
       obj.resourceFilterId = obj.RESOURCE_FILTER_ID || -1;
       obj.nodeIdList = (obj.ATTRIBUTE_GROUP_ITEMS || []).map(function(item) {
           return {
               NODE_ID: item.ID
           };
       });
       obj.attributeGroupId = obj.nodeIdList.length > 0 ? parseInt(obj.ATTRIBUTE_GROUP_ID, 10) : -1;
       obj.locationIdList = (obj.LOCATIONS || []).map(function(item) {
           return {
               ID: item.ID,
               NAME: item.NAME,
               TYPE: item.TYPE
           };
       });
    };

    this.hierarchyInit = function(obj, getParams) {
        obj.locationFilterId = getParams('location_filter_id');
    };
}

Stocks.prototype = {
    validates: [{
        field: 'GEO_ID',
        presence: true,
        on: ['create', 'updateSettings'],
        args: ['GEO_ID'],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: 'GEO_TYPE',
        presence: true,
        on: ['updateSettings'],
        args: ['GEO_TYPE'],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: 'STOCK_SETTINGS',
        validateWith: function(obj) {
            return utils.checkNonNegativeInteger(obj.STOCK_SETTINGS.MIN_SAFETY_STOCK || 0);
        },
        on: ['updateSettings'],
        args: ['MIN_SAFETY_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'STOCK_SETTINGS',
        validateWith: function(obj) {
            return utils.checkNonNegativeInteger(obj.STOCK_SETTINGS.MAX_SAFETY_STOCK || 0);
        },
        on: ['updateSettings'],
        args: ['MAX_SAFETY_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'STOCK_SETTINGS',
        validateWith: function(obj) {
            return utils.checkNonNegativeInteger(obj.STOCK_SETTINGS.MAX_PHYSICAL_STOCK || 0);
        },
        on: ['updateSettings'],
        args: ['MAX_PHYSICAL_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'STOCK_THRESHOLDS',
        validateWith: function(obj) {
        	for (var i in obj.STOCK_THRESHOLDS) {
        		if (!utils.checkNonNegativeInteger(obj.STOCK_THRESHOLDS[i].MIN_SAFETY_STOCK || 0))
        			return false;
        	}
        	return true;
        },
        on: ['updateSettings'],
        args: ['MIN_SAFETY_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'STOCK_THRESHOLDS',
        validateWith: function(obj) {
        	for (var i in obj.STOCK_THRESHOLDS) {
        		if (!utils.checkNonNegativeInteger(obj.STOCK_THRESHOLDS[i].MAX_SAFETY_STOCK || 0))
        			return false;
        	}
        	return true;
        },
        on: ['updateSettings'],
        args: ['MAX_SAFETY_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'STOCK_THRESHOLDS',
        validateWith: function(obj) {
        	for (var i in obj.STOCK_THRESHOLDS) {
        		if (!utils.checkNonNegativeInteger(obj.STOCK_THRESHOLDS[i].MAX_PHYSICAL_STOCK || 0))
        			return false;
        	}
        	return true;
        },
        on: ['updateSettings'],
        args: ['MAX_PHYSICAL_STOCK'],
        message: messages.MSG_FIELD_INVALID
    }, {
        field: 'RESOURCE_CATEGORY',
        presence: true,
        on: ['updateSettings'],
        args: ['RESOURCE_CATEGORY'],
        message: messages.MSG_FIELD_MISSING
    },{
        field: 'LOCATION_FILTER_ID',
        presence: true,
        numericality: true,
        on: ['stockChart'],
        args: ['LOCATION_FILTER_ID'],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: 'RESOURCE_FILTER_ID',
        presence: true,
        numericality: true,
        on: ['stockChart'],
        args: ['RESOURCE_FILTER_ID'],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: 'LOCATIONS',
        presence: true,
        on: ['stockChart'],
        args: ['LOCATIONS'],
        message: messages.MSG_LOCATIONS_MISSING
    }],
    afterInitialize: [{
        method: 'mapInit',
        on: ['alertsOnMap', 'bubbleOnMap', 'pieOnMap']
    },{
        method: 'chartInit',
        on: ['stockChart']
    },{
        method: 'hierarchyInit',
        on: ['locationHierarchyForMap','locationHierarchy']
    },{
        method: 'tableInit',
        on: ['stockTable', 'geoTable']
    },{
        method: 'init',
        on: ['updateSettings']
    }]
};
