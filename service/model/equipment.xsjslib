var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');

function LocationStock() {
    this.init = function(obj, getParams) {
        obj.EQUIPMENT_FILTER_ID = getParams("EQUIPMENT_FILTER_ID");
        obj.GEO_FILTER_ID = getParams("GEO_FILTER_ID");
    };

    this.mapInit = function(obj, getParams) {
        obj.MIN = getParams("MIN_COORDINATE").split(';');
        obj.MAX = getParams("MAX_COORDINATE").split(';');
        obj.MAP_LEVEL = Number(getParams("MAP_LEVEL"), 10) || 0;
    };
}

LocationStock.prototype = {
    validates: [{
        field: "EQUIPMENT_FILTER_ID",
        presence: true,
        args: ["EQUIPMENT_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "EQUIPMENT_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        args: ["EQUIPMENT_FILTER_ID"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "EQUIPMENT_FILTER_ID",
        length: {
            within: [1, 22]
        },
        args: ["EQUIPMENT_FILTER_ID"],
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "GEO_FILTER_ID",
        presence: true,
        args: ["GEO_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "GEO_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        args: ["GEO_FILTER_ID"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "GEO_FILTER_ID",
        length: {
            within: [1, 22]
        },
        args: ["GEO_FILTER_ID"],
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "MAP_LEVEL",
        on: "getMapData",
        numericality: true,
        args: ["MAP_LEVEL"],
        message: messages.MSG_KEY_NOT_A_NUMBER
    }, {
        field: "MIN_COORDINATE",
        presence: true,
        args: ["MIN_COORDINATE"],
        on: ["getMapData"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "MIN_COORDINATE",
        format: {
            expr: /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
        },
        args: ["MIN_COORDINATE", /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/],
        on: ["getMapData"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "MAX_COORDINATE",
        presence: true,
        args: ["MAX_COORDINATE"],
        on: ["getMapData"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "MAX_COORDINATE",
        format: {
            expr: /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/
        },
        args: ["MAX_COORDINATE", /-?\d*(.\d*)?;-?\d*(.\d*)?;-?\d*(.\d*)?/],
        on: ["getMapData"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }],
    afterInitialize: [{
        method: "init",
        on: ["getChartData", "getTableData", "getMapData"]
    }, {
        method: "mapInit",
        on: ["getMapData"]
    }]
};

function EquipmentInformation() {}

EquipmentInformation.prototype.validates = [{
        field: "RESOURCE_FILTER_ID",
        presence: true,
        on: ["facetFilter"],
        args: ["RESOURCE_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "RESOURCE_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        on: ["facetFilter"],
        args: ["RESOURCE_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "RESOURCE_FILTER_ID",
        length: {
            within: [1, 22]
        },
        on: ["facetFilter"],
        args: ["RESOURCE_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        presence: true,
        on: ["facetFilter"],
        args: ["LOCATION_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "LOCATION_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        on: ["facetFilter"],
        args: ["LOCATION_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        length: {
            within: [1, 22]
        },
        on: ["facetFilter"],
        args: ["LOCATION_FILTER_ID"],
        condition: function(obj) {
            return utils.isEmpty(obj.RES_ID);
        },
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "ATTRIBUTE_GROUP_ID",
        presence: true,
        on: ["facetFilter"],
        args: ["ATTRIBUTE_GROUP_ID"],
        condition : function(obj) {
            return obj.hasOwnProperty('ATTRIBUTE_GROUP_ID');
        },
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "ATTRIBUTE_GROUP_ID",
        numericality: true,
        on: ["facetFilter"],
        args: ["ATTRIBUTE_GROUP_ID"],
        condition : function(obj) {
            return obj.hasOwnProperty('ATTRIBUTE_GROUP_ID');
        },
        message: messages.MSG_KEY_FORMAT_INVALID
    },{
        field: 'filters',
        on: ['facetFilter'],
        validateWith: function(obj){
            var filterObj = obj.filters;
            if (!filterObj){
                return true;
            }
            else {
                return facetFilterUtils.checkFilterObj(filterObj, [
                    "RESOURCE_STATUS",
                    "OWNER",
                    "BLOCK_STATUS",
                    "FOOD_GRADE",
                    "RESOURCE_CONDITION",
                ]);
            }
        },
        condition : function(obj) {
            return obj.hasOwnProperty('ATTRIBUTE_GROUP_ID');
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['filters'],
    }];
    EquipmentInformation.prototype.afterInitialize = [
        {
            method: function(obj, getParams){
                obj.ATTRIBUTE_NODE_LIST = obj.ATTRIBUTE_NODE_LIST || "";
                obj.LOCATION = obj.LOCATION || "";
                obj.RESOURCE_TYPE = obj.RESOURCE_TYPE || "";
                obj.LEASE_CONTRACT_REFERENCE = obj.LEASE_CONTRACT_REFERENCE || "";
                obj.IN_MOVEMENT_STATUS = obj.IN_MOVEMENT_STATUS || "";
                obj.IN_RESOURCE_STATUS = obj.BLOCK_STATUS || "";

                var transferStrToRow = function(str){
                    return {STR: str};
                };
                obj.search = obj.search ? obj.search.toLowerCase() : "";
                var filterObj = obj.filters || {};
                obj.RESOURCE_STATUS_LIST = filterObj.RESOURCE_STATUS ? filterObj.RESOURCE_STATUS.map(transferStrToRow) : [];
                obj.OWNER_LIST = filterObj.OWNER ? filterObj.OWNER.map(transferStrToRow) : [];
                obj.BLOCK_STATUS_LIST = filterObj.BLOCK_STATUS ? filterObj.BLOCK_STATUS.map(transferStrToRow) : [];
                obj.FOOD_GRADE_LIST = filterObj.FOOD_GRADE ? filterObj.FOOD_GRADE.map(transferStrToRow) : [];
                obj.RESOURCE_CONDITION_LIST = filterObj.RESOURCE_CONDITION ? filterObj.RESOURCE_CONDITION.map(transferStrToRow) : [];
                obj.MOVEMENT_STATUS_LIST = filterObj.MOVEMENT_STATUS_CODE ? filterObj.MOVEMENT_STATUS_CODE.map(transferStrToRow) : [];
            },
            on: ['facetFilter']
        },

    ];

function LeaseInformation() {
    this.leaseFacetFilterInit = function(obj){
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.LEASE_CONTRACT_TYPE_LIST_INPUT = filterObj.hasOwnProperty('LEASE_CONTRACT_TYPE') ? filterObj.LEASE_CONTRACT_TYPE.map(function(str){ return {STR: str}; }) : [];
    };
}

LeaseInformation.prototype = {
        validates: [{
            field: "FILTER_LEASE_PERIOD_BY",
            presence: true,
            on: ["facetFilter"],
            args: ["FILTER_LEASE_PERIOD_BY"],
            message: messages.MSG_FIELD_MISSING
        },
        {
            field: "FILTER_LEASE_PERIOD_BY",
            on: "facetFilter",
            numericality: true,
            args: ["FILTER_LEASE_PERIOD_BY"],
            message: messages.MSG_KEY_NOT_A_NUMBER
        },
        {
            field: "FROM_DATE",
            presence: true,
            on: ["facetFilter"],
            args: ["FROM_DATE"],
            message: messages.MSG_FIELD_MISSING
        },{
            field: 'FROM_DATE',
            on: ['facetFilter'],
            validateWith: function(obj) {
                return obj.FROM_DATE ? Date.parse(obj.FROM_DATE) : true;
            },
            message: messages.MSG_FIELD_INVALID,
            args: ['FROM_DATE']
        },
        {
            field: "TO_DATE",
            presence: true,
            on: ["facetFilter"],
            args: ["TO_DATE"],
            message: messages.MSG_FIELD_MISSING
        }, {
            field: 'TO_DATE',
            on: ['facetFilter'],
            validateWith: function(obj) {
                return obj.TO_DATE ? Date.parse(obj.TO_DATE) : true;
            },
            message: messages.MSG_FIELD_INVALID,
            args: ['TO_DATE']
        },
        {
            field: 'filters',
            on: ['facetFilter'],
            validateWith: function(obj){
                var filterObj = obj.filters;
                if (!filterObj){
                    return true;
                }
                else {
                    if (!(filterObj instanceof Object)){
                        return false;
                    }
                    if (filterObj.hasOwnProperty('LEASE_CONTRACT_TYPE') && !(filterObj.LEASE_CONTRACT_TYPE instanceof Array)){
                        return false;
                    }

                    return true;
                }
            },
            message: messages.MSG_FIELD_INVALID,
            args: ['filters'],
        }],
        afterInitialize: [
            {
                method: 'leaseFacetFilterInit',
                on: ['facetFilter']
            }
        ]
    };

