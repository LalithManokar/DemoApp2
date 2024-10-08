var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function TrackingHistory() {
};

TrackingHistory.prototype = {
    validates: [{
        field: "RESOURCE_FILTER_ID",
        on: ['facetFilter'],
        presence: true,
        args: ["RESOURCE_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "RESOURCE_FILTER_ID",
        on: ['facetFilter'],
        format: {
            expr: /[0-9]+/
        },
        args: ['{RESOURCE_FILTER_ID}'],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "RESOURCE_FILTER_ID",
        on: ['facetFilter'],
        length: {
            within: [1, 22]
        },
        args: ['{RESOURCE_FILTER_ID}'],
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        on: ['facetFilter'],
        presence: true,
        args: ["LOCATION_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "LOCATION_FILTER_ID",
        on: ['facetFilter'],
        format: {
            expr: /[0-9]+/
        },
        args: ['{LOCATION_FILTER_ID}'],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        on: ['facetFilter'],
        length: {
            within: [1, 22]
        },
        args: ['{LOCATION_FILTER_ID}'],
        message: messages.MSG_KEY_LENGTH_INVALID
    },{
        field: 'filters',
        on: ['facetFilter'],
        validateWith: function(obj){
            var filterObj = obj.filters;
            if (!filterObj){
                return true;
            } else {
                if (!(filterObj instanceof Object)){
                    return false;
                }
                if (filterObj.hasOwnProperty('LOCATION') && !(filterObj.LOCATION instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('CHANGED_FILED') && !(filterObj.CHANGED_FILED instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('BEFORE_VALUE') && !(filterObj.BEFORE_VALUE instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('NEW_VALUE') && !(filterObj.NEW_VALUE instanceof Array)){
                    return false;
                }
                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}'],
    },],
    afterInitialize: [
        {
            method: function(obj){
                var transferStrToRow = function(str){
                    return {STR: str};
                };
                obj.search = obj.search ? obj.search.toLowerCase() : "";
                var filterObj = obj.filters || {};
                obj.LOCATION_LIST_INPUT = filterObj.LOCATION ? filterObj.LOCATION.map(transferStrToRow) : [];
                obj.CHANGED_FIELD_LIST_INPUT = filterObj.CHANGED_FIELD ? filterObj.CHANGED_FIELD.map(transferStrToRow) : [];
                obj.BEFORE_VALUE_LIST_INPUT = filterObj.BEFORE_VALUE ? filterObj.BEFORE_VALUE.map(transferStrToRow) : [];
                obj.NEW_VALUE_LIST_INPUT = filterObj.NEW_VALUE ? filterObj.NEW_VALUE.map(transferStrToRow) : [];
                obj.EQUIP_FILTER_ID = obj.EQUIP_FILTER_ID || -999;
                obj.LOCATION_FILTER_ID = obj.LOCATION_FILTER_ID || -999;
            },on: ['facetFilter']
        },{
           method: function(obj,getParams) {
               obj.RESOURCE_FILTER_ID = getParams("RESOURCE_FILTER_ID") || obj.RESOURCE_FILTER_ID || 0;
               obj.LOCATION_FILTER_ID = getParams("LOCATION_FILTER_ID") || obj.LOCATION_FILTER_ID || 0;
               obj.START_TIME = getParams("START_TIME") || obj.START_TIME || '1900-01-01T00:00:00.000Z';
               obj.END_TIME = getParams("END_TIME") || obj.END_TIME || '1900-01-01T00:00:00.000Z';
         },on: ['facetFilter']
        }]
};
