var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

function ActiveResource() {
	this.mapInit = function(obj, getParams) {
        if(getParams("location_filter_id")) {
            obj.location_filter_id = parseInt(getParams("location_filter_id"), 10) || 0;
        }
        if(getParams("resource_filter_id")) {
            obj.resource_filter_id = parseInt(getParams("resource_filter_id"), 10) || 0;
        }
        if(getParams("attribute_group_item_id")) {
            obj.attributeGroupId = parseInt(getParams("attribute_group_item_id"), 10) || 0;
        }
        if(getParams("hierarchy_level")) {
            obj.hierarchyLevel = parseInt(getParams("hierarchy_level"), 10);
        }
        if(getParams("start_date_time")) {
            obj.start_date_time = getParams("start_date_time");
        }
        if(getParams("end_date_time")) {
            obj.end_date_time = getParams("end_date_time");
        }
        if(getParams("time_filter_by")) {
            obj.time_filter_by = getParams("time_filter_by");
        }
        if(getParams("location")) {
            obj.location = getParams("location");
        }
        if(getParams("equipment_type")) {
            obj.equipment_type = getParams("equipment_type");
        }
        if(getParams("searchText")) {
            obj.searchText = getParams("searchText");
        }
        if(getParams("RESOURCE_CATEGORY")) {
            obj.resource_category = getParams("RESOURCE_CATEGORY");
        }
        // 'RC' or 'CN' or 'GE'
        if(getParams("RESORUCE_CATEGORY_TYPE")) {
        	obj.resource_category_type = getParams("RESOURCE_CATEGORY_TYPE");
        }

        if(getParams("min_coordinate") && getParams("max_coordinate")) {
            obj.MIN = getParams("min_coordinate").split(';');
            obj.MAX = getParams("max_coordinate").split(';');
        }
    };
}

var transferStrToRow = function(str){
    return {STR: str};
};

ActiveResource.prototype = {
	    validates: [
	     {
	        field: "EQUIP_FILTER_ID",
	        presence: true,
	        on: ["facetFilter"],
	        args: ["EQUIP_FILTER_ID"],
	        message: messages.MSG_FIELD_MISSING
	    }, {
	        field: "EQUIP_FILTER_ID",
	        format: {
	            expr: /[0-9]+/
	        },
            on: ["facetFilter"],
	        args: ["EQUIP_FILTER_ID"],
	        message: messages.MSG_KEY_FORMAT_INVALID
	    }, {
	        field: "EQUIP_FILTER_ID",
	        length: {
	            within: [1, 22]
	        },
            on: ["facetFilter"],
	        args: ["EQUIP_FILTER_ID"],
	        message: messages.MSG_KEY_LENGTH_INVALID
	    },
	    {
	        field: "LOCATION_FILTER_ID",
	        presence: true,
	        on: ["facetFilter"],
	        args: ["LOCATION_FILTER_ID"],
	        message: messages.MSG_FIELD_MISSING
	    }, {
	        field: "LOCATION_FILTER_ID",
	        format: {
	            expr: /[0-9]+/
	        },
            on: ["facetFilter"],
	        args: ["LOCATION_FILTER_ID"],
	        message: messages.MSG_KEY_FORMAT_INVALID
	    }, {
	        field: "LOCATION_FILTER_ID",
	        length: {
	            within: [1, 22]
	        },
            on: ["facetFilter"],
	        args: ["LOCATION_FILTER_ID"],
	        message: messages.MSG_KEY_LENGTH_INVALID
	    },
	    {
	        field: "START_DATE_TIME",
	        presence: true,
	        on: ["facetFilter"],
	        args: ["START_DATE_TIME"],
	        message: messages.MSG_FIELD_MISSING
	    },
	    {
	        field: 'START_DATE_TIME',
	        on: ['facetFilter'],
	        validateWith: function(obj) {
	        	return obj.START_DATE_TIME ? Date.parse(obj.START_DATE_TIME) : true;
	        },
	        message: messages.MSG_FIELD_INVALID,
	        args: ['{START_DATE_TIME}']
	    },
	    {
	        field: "END_DATE_TIME",
	        presence: true,
	        on: ["facetFilter"],
	        args: ["END_DATE_TIME"],
	        message: messages.MSG_FIELD_MISSING
	    },
	    {
	        field: 'END_DATE_TIME',
	        on: ['facetFilter'],
	        validateWith: function(obj) {
	            return obj.END_DATE_TIME ? Date.parse(obj.END_DATE_TIME) : true;
	        },
	        message: messages.MSG_FIELD_INVALID,
	        args: ['{END_DATE_TIME}']
	    },
	    {
	        field: "TIME_FILTER_BY",
	        presence: true,
	        on: ["facetFilter"],
	        args: ["TIME_FILTER_BY"],
	        message: messages.MSG_FIELD_MISSING
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
	                if (filterObj.hasOwnProperty('ACTIVE_RESOURCE_ID') && !(filterObj.ACTIVE_RESOURCE_ID instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('ACTIVE_RESOURCE_TYPE') && !(filterObj.ACTIVE_RESOURCE_TYPE instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('SCHEDULE_ID') && !(filterObj.SCHEDULE_ID instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('ORIGIN') && !(filterObj.ORIGIN instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('LAST_LOCATION') && !(filterObj.LAST_LOCATION instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('DESTINATION') && !(filterObj.DESTINATION instanceof Array)){
	                    return false;
	                }

	                return true;
	            }
	        },
	        message: messages.MSG_FIELD_INVALID,
	        args: ['{filters}']
	    }],
	    afterInitialize: [
	        {
	            method: function(obj){
	                obj.search = obj.search ? obj.search.toLowerCase() : "";
                    var filterObj = obj.filters || {};

                    obj.TRAIN_ID_LIST_INPUT = filterObj.VOYAGE ? filterObj.VOYAGE.map(transferStrToRow) : [];
                    obj.RESPONSIBLE_PERSON_LIST_INPUT = filterObj.RESPONSIBLE_PERSON ? filterObj.RESPONSIBLE_PERSON.map(transferStrToRow) : [];
                    obj.SOURCE_LOCATION_LIST_INPUT = filterObj.SOURCE_LOCATION ? filterObj.SOURCE_LOCATION.map(transferStrToRow) : [];
                    obj.DESTINATION_LOCATION_LIST_INPUT = filterObj.DESTINATION_LOCATION ? filterObj.DESTINATION_LOCATION.map(transferStrToRow) : [];


                    obj.SCHEDULE_ID_LIST_INPUT = filterObj.SCHEDULE_ID ? filterObj.SCHEDULE_ID.map(transferStrToRow) : [];
                    obj.LAST_LOCATION_LIST_INPUT = filterObj.LAST_LOCATION ? filterObj.LAST_LOCATION.map(transferStrToRow) : [];

	            },
	            on: ['facetFilter']
	        },
	        {
          	  method:'mapInit',
          	  on:['getMapData']
            }]
	};


function LoadDischarge() {
    this.loadDischargeFacetFilterInit = function(obj){
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.LOCATION_LIST_INPUT = filterObj.hasOwnProperty('LOCATION') ? filterObj.LOCATION.map(transferStrToRow) : [];
        obj.RESOURCE_TYPE_LIST_INPUT = filterObj.hasOwnProperty('RESOURCE_TYPE') ? filterObj.RESOURCE_TYPE.map(transferStrToRow) : [];
        obj.SCHEDULE_ID_LIST_INPUT = filterObj.hasOwnProperty('SCHEDULE_ID') ? filterObj.SCHEDULE_ID.map(transferStrToRow) : [];
        obj.ACTIVE_RESOURCE_ID_LIST_INPUT = filterObj.hasOwnProperty('ACTIVE_RESOURCE_ID') ? filterObj.ACTIVE_RESOURCE_ID.map(transferStrToRow) : [];
        obj.ACTIVE_RESOURCE_TYPE_LIST_INPUT = filterObj.hasOwnProperty('ACTIVE_RESOURCE_TYPE') ? filterObj.ACTIVE_RESOURCE_TYPE.map(transferStrToRow) : [];
        obj.FREIGHT_BOOKING_ID_LIST_INPUT = filterObj.hasOwnProperty('FREIGHT_BOOKING_ID') ? filterObj.FREIGHT_BOOKING_ID.map(transferStrToRow) : [];
        };
}

LoadDischarge.prototype = {
    validates: [{
        field: "EQUIP_FILTER_ID",
        presence: true,
        on: ["facetFilter"],
        args: ["EQUIP_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "EQUIP_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        args: ["EQUIP_FILTER_ID"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "EQUIP_FILTER_ID",
        length: {
            within: [1, 22]
        },
        args: ["EQUIP_FILTER_ID"],
        message: messages.MSG_KEY_LENGTH_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        presence: true,
        on: ["facetFilter"],
        args: ["LOCATION_FILTER_ID"],
        message: messages.MSG_FIELD_MISSING
    }, {
        field: "LOCATION_FILTER_ID",
        format: {
            expr: /[0-9]+/
        },
        args: ["LOCATION_FILTER_ID"],
        message: messages.MSG_KEY_FORMAT_INVALID
    }, {
        field: "LOCATION_FILTER_ID",
        length: {
            within: [1, 22]
        },
        args: ["LOCATION_FILTER_ID"],
        message: messages.MSG_KEY_LENGTH_INVALID
    },
    {
        field: "TIME_FILTER_BY",
        presence: true,
        on: ["facetFilter"],
        args: ["TIME_FILTER_BY"],
        message: messages.MSG_FIELD_MISSING
    },
    {
        field: "TIME_FILTER_BY",
        on: "facetFilter",
        numericality: true,
        args: ["TIME_FILTER_BY"],
        message: messages.MSG_KEY_NOT_A_NUMBER
    },
    {
        field: "START_DATE_TIME",
        presence: true,
        on: ["facetFilter"],
        args: ["START_DATE_TIME"],
        message: messages.MSG_FIELD_MISSING
    },
    {
        field: "END_DATE_TIME",
        presence: true,
        on: ["facetFilter"],
        args: ["END_DATE_TIME"],
        message: messages.MSG_FIELD_MISSING
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
                if (filterObj.hasOwnProperty('LOCATION') && !(filterObj.LOCATION instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('RESOURCE_TYPE') && !(filterObj.RESOURCE_TYPE instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('SCHEDULE_ID') && !(filterObj.SCHEDULE_ID instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('ACTIVE_RESOURCE_ID') && !(filterObj.ACTIVE_RESOURCE_ID instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('ACTIVE_RESOURCE_TYPE') && !(filterObj.ACTIVE_RESOURCE_TYPE instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('FREIGHT_BOOKING_ID') && !(filterObj.FREIGHT_BOOKING_ID instanceof Array)){
                    return false;
                }

                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}'],
    }],
    afterInitialize: [
 {
	 method: 'loadDischargeFacetFilterInit',
     on: ['facetFilter']
 }]
};
