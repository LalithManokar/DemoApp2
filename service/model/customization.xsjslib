var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var RESOURCE_CATEGORY_TYPE = $.import('/sap/tm/trp/service/xslib/constants.xsjslib').RESOURCE_CATEGORY_TYPE;

function logisticsSystemSettings() {
    this.init = function(obj) {
        obj.NAME = obj.NAME || "";
    };
}

logisticsSystemSettings.prototype = {
	    validates : [{
	        field: "CLIENT_CODE_ID",
	        presence: true,
	        args: ["CLIENT_CODE_ID"],
	        message: messages.MSG_FIELD_MISSING,
	        on: ["update"]
	    },{
	        field: "ZONE_HIERARCHY_ID",
	        presence: true,
	        args: ["ZONE_HIERARCHY_ID"],
	        message: messages.MSG_FIELD_MISSING,
	        on: ["update"]
	    }],
	    afterInitialize : [{
	        method: "init",
	        on: ["update"]
	    }]
};

function mapProviders() {
    this.init = function(obj) {
        obj.NAME = obj.NAME || "";
    };
}

mapProviders.prototype = {
	    validates : [{
	        field: "NAME",
	        presence: true,
	        message: messages.MSG_NAME_MISSING,
	        on: ["create"]
	    }, {
	        field: "NAME",
	        format : {
	            expr : utils.HUMAN_READABLE_KEY_REGEX
	        },
	        message: messages.MSG_NAME_INVALID,
	        args: ["{NAME}"],
	        on: ["create"]
	    }, {
	        field: "NAME",
	        uniqueness: {
	            sql: 'SELECT 1 FROM "sap.tm.trp.db.systemmanagement::t_map_provider" WHERE lower(NAME) = lower(?)'
	        },
	        message: messages.MSG_NAME_NON_UNIQUE,
	        args: ["{NAME}"],
	        on: ["create"]
	    },{
	        field: "ENABLE_FLAG",
	        presence: true,
	        args: ["ENABLE_FLAG"],
	        message: messages.MSG_FIELD_MISSING,
	        on: ["update"]
	    },{
	        field: "URL_LIST",
	        presence: true,
	        args: ["URL_LIST"],
	        message: messages.MSG_FIELD_MISSING,
	        on: ["update"]
	    }],
	    afterInitialize : [{
	        method: "init",
	        on: ["create", "update"]
	    }]
};

function ExtendedColumn() {
    return;
}

ExtendedColumn.prototype = {
    validates : [{
        field: "PAGE_ID",
        presence: true,
        message: messages.MSG_KEY_MISSING,
        on: ["create"]
    }, {
        field: "NAME",
        presence: true,
        message: messages.MSG_NAME_MISSING,
        on: ["create"]
    }, {
        field: "NAME",
        format : {
            expr : /^[A-Z][A-Z_0-9]{0,49}$/
        },
        message: messages.MSG_NAME_INVALID,
        args: ["{NAME}"],
        on: ["create"]
    }, {
        field: "NAME",
        validateWith : function(obj) {
        	if( obj.PAGE_ID !=  3 ) {
	            var extendable = [$.import("/sap/tm/trp/db/semantic/order/extensibility.xsjslib").listExtendableColumns,
	                              $.import("/sap/tm/trp/db/semantic/resource/extensibility.xsjslib").listExtendableColumns][+obj.PAGE_ID - 1];
	            if(extendable) {
	                var avaliable = extendable();
	
	                return avaliable.some(function(col) { return col === obj.NAME;});
	            }
	
	            return false;
        	}
        	else{
        		return true;
        	}        		
        },
        message: messages.MSG_KEY_INVALID,
        args: ["{NAME}"],
        on: ["create"]
    },{
        field: "NAME",
        uniqueness: {
            sql: 'SELECT 1 FROM "sap.tm.trp.db.common::t_extended_fields" WHERE NAME = ? AND PAGE_ID = ?',
            scope: "{PAGE_ID}"
        },
        args: ["{NAME}"],
        message: messages.MSG_NAME_NON_UNIQUE,
        on: ["create","update"]
    },{
        field: "DISPLAY_NAME",
        presence: true,
        message: messages.MSG_NAME_MISSING,
        on: ["create", "update"]
    }, {
        field: "DISPLAY_NAME",
        uniqueness: {
            sql: 'SELECT 1 FROM "sap.tm.trp.db.common::t_extended_fields" WHERE DISPLAY_NAME = ? AND PAGE_ID = ?',
            scope: "{PAGE_ID}"
        },
        args: ["{DISPLAY_NAME}"],
        message: messages.MSG_NAME_NON_UNIQUE,
        on: ["create"]
    }]
};

function resourceCategory() {
    this.init = function(obj) {
        obj.NAME = obj.NAME || "";
    };

    this.facetFilterInit = function (obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : '';
        var filterObj = obj.filters || {};
        obj.RESOURCE_CATEGORY_TYPE_LIST = filterObj.hasOwnProperty('RESOURCE_CATEGORY_TYPE')? filterObj.RESOURCE_CATEGORY_TYPE.map(function (type) {
            return {
                STR: type
            };
        }) : [];
        obj.ENABLE_FLAG_LIST = filterObj.hasOwnProperty('ENABLE_FLAG')? filterObj.ENABLE_FLAG.map(function (flag) {
            return {
                INT: flag
            };
        }) : [];
    };

    this.groupTypeInit = function (obj, getParams) {
        obj.resourceCategoryType = getParams('RESOURCE_CATEGORY_TYPE');
    };
}

resourceCategory.prototype = {
	    validates : [{
            field: 'RESOURCE_CATEGORY_TYPE',
            presence: true,
            on: 'getGroupTypes',
            args: ['RESOURCE_CATEGORY_TYPE'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'RESOURCE_CATEGORY_TYPE',
            on: 'getGroupTypes',
            inclusion: {
                scope: [RESOURCE_CATEGORY_TYPE.GENERIC, RESOURCE_CATEGORY_TYPE.RAILCAR, RESOURCE_CATEGORY_TYPE.CONTAINER]
            },
            args: ['RESOURCE_CATEGORY_TYPE', [RESOURCE_CATEGORY_TYPE.GENERIC, RESOURCE_CATEGORY_TYPE.RAILCAR, RESOURCE_CATEGORY_TYPE.CONTAINER].join(',')],
            message: messages.MSG_KEY_NOT_IN_ENUM
        }, {
            field: 'RESOURCE_GROUPS',
            presence: true,
            on: ['getResourceTypes', 'create', 'update'],
            args: ['RESOURCE_GROUPS'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'NAME',
            presence: true,
            message: messages.MSG_NAME_MISSING,
            args: ['NAME'],
            on: ['create']
        }, {
            field: 'NAME',
            format: {
                expr: utils.HUMAN_READABLE_KEY_REGEX
            },
            message: messages.MSG_NAME_INVALID,
            args: ['{NAME}'],
            on: ['create']
        }, {
            field: 'NAME',
            uniqueness: {
                sql: 'SELECT 1 FROM "sap.tm.trp.db.systemmanagement.customization::t_resource_category_settings" WHERE lower(CODE) = lower(?)'
            },
            message: messages.MSG_NAME_NON_UNIQUE,
            args: ['{NAME}'],
            on: ['create']
        }, {
            field: 'RESOURCE_CATEGORY_TYPE',
            presence: true,
            on: ['create', 'update'],
            args: ['RESOURCE_CATEGORY_TYPE'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'RESOURCE_GROUP_TYPE',
            presence: true,
            on: ['create', 'update'],
            args: ['RESOURCE_GROUP_TYPE'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'ENABLE_FLAG',
            presence: true,
            on: ['create', 'update'],
            args: ['ENABLE_FLAG'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'LEASE_CONTRACT_FLAG',
            presence: true,
            on: ['create', 'update'],
            args: ['LEASE_CONTRACT_FLAG'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'REPOSITIONING_PARAMETER',
            presence: true,
            on: ['create', 'update'],
            args: ['REPOSITIONING_PARAMETER'],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'ID',
            presence: true,
            on: ['update'],
            args: ['ID'],
            message: messages.MSG_FIELD_MISSING
        }],
	    afterInitialize : [{
	        method: 'groupTypeInit',
	        on: 'getGroupTypes'
	    }, {
            method: 'facetFilterInit',
            on: 'queryFacetFilter'
        }]
};
