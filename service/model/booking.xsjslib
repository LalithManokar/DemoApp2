var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function TMBookingInfo(){
	this.init = function(obj, getParams) {
		obj.ORDER_ID = getParams("ORDER_ID");
	}
}

TMBookingInfo.prototype = {
	    validates: [{
	        field: "ORDER_ID",
	        length: {

	            within: [1, 200]
	        },
	    }
	    ],
	afterInitialize: ["init"]
};

function BookingInformation() {
    this.init = function(obj){
    	 obj.EQUIPMENT_FILTER_ID = parseInt(obj.EQUIPMENT_FILTER_ID, 10);
    	 obj.LOCATION_FILTER_ID = parseInt(obj.LOCATION_FILTER_ID, 10);
    	 obj.FILTER_ON = parseInt(obj.FILTER_ON, 10);
    	 obj.FROM_DATE = obj.FROM_DATE || "";
    	 obj.TO_DATE = obj.TO_DATE || "";
         obj.BOOKING_TYPE = obj.BOOKING_TYPE || "";
         obj.LOCATION = obj.LOCATION || "";
         obj.EQUIPMENT_TYPE = obj.EQUIPMENT_TYPE || "";
         obj.DATA_PROVIDER_TYPE = obj.DATA_PROVIDER_TYPE || "";
         obj.search = obj.search ? obj.search.toLowerCase() : "";
         var filterObj = obj.filters || {};
         obj.TU_TYPE_LIST_INPUT = filterObj.hasOwnProperty('TU_TYPE_CODE') ? filterObj.TU_TYPE_CODE.map(function(str){ return {STR: str}; }) : [];
         obj.RESOURCE_TYPE_LIST_INPUT = filterObj.hasOwnProperty('RESOURCE_TYPE') ? filterObj.RESOURCE_TYPE.map(function(str){ return {STR: str}; }) : [];
         obj.PLANNING_RELEVANT_LIST_INPUT = filterObj.hasOwnProperty('HAULAGE_TYPE') ? filterObj.HAULAGE_TYPE.map(function(str){ return {STR: str}; }) : [];
         obj.EXECUTION_STATUS_LIST_INPUT = filterObj.hasOwnProperty('EXECUTION_STATUS_CODE') ? filterObj.EXECUTION_STATUS_CODE.map(function(str){ return {STR: str}; }) : [];
         obj.LIFECYCLE_STATUS_LIST_INPUT = filterObj.hasOwnProperty('LIFECYCLE_STATUS_CODE') ? filterObj.LIFECYCLE_STATUS_CODE.map(function(str){ return {STR: str}; }) : [];
         obj.LEASE_CONTRACT_LIST_INPUT = filterObj.hasOwnProperty('LEASE_AGREEMENT') ? filterObj.LEASE_AGREEMENT.map(function(str){ return {STR: str}; }) : [];
         obj.LEASE_CONTRACT_TYPE_LIST_INPUT = filterObj.hasOwnProperty('LEASE_TYPE_CODE') ? filterObj.LEASE_TYPE_CODE.map(function(str){ return {STR: str}; }) : [];
         obj.SPECIAL_INSTRUCTION_LIST_INPUT = filterObj.hasOwnProperty('SPECIAL_INSTRUCTION_CODE') ? filterObj.SPECIAL_INSTRUCTION_CODE.map(function(str){ return {STR: str}; }) : [];
    };

    this.resourceFacetInit = function(obj) {
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        obj.TOR_ID = obj.TOR_ID || "";
        var filterObj = obj.filters || {};
        obj.RESOURCE_STATUS_LIST = filterObj.hasOwnProperty('RESOURCE_STATUS') ? filterObj.RESOURCE_STATUS.map(function(str){ return {STR: str}; }) : [];
        obj.OWNER_LIST = filterObj.hasOwnProperty('OWNER') ? filterObj.OWNER.map(function(str){ return {STR: str}; }) : [];
        obj.FOOD_GRADE_LIST = filterObj.hasOwnProperty('FOOD_GRADE') ? filterObj.FOOD_GRADE.map(function(str){ return {STR: str}; }) : [];
        obj.RESOURCE_CONDITION_LIST = filterObj.hasOwnProperty('RESOURCE_CONDITION') ? filterObj.RESOURCE_CONDITION.map(function(str){ return {STR: str}; }) : [];
        obj.SPECIAL_INSTRUCTION_LIST = filterObj.hasOwnProperty('SPECIAL_INSTRUCTION') ? filterObj.SPECIAL_INSTRUCTION.map(function(str){ return {STR: str}; }) : [];
    };
}

BookingInformation.prototype = {
	    validates: [
	    {
	        field: "FILTER_ON",
	        on: "getFacetFilter",
	        numericality: true,
	        args: ["FILTER_ON"],
	        message: messages.MSG_KEY_NOT_A_NUMBER
	    },
	    {
            field: 'FROM_DATE',
            on: ['getFacetFilter'],
            validateWith: function(obj) {
                return obj.FROM_DATE ? Date.parse(obj.FROM_DATE) : true;
            },
            message: messages.MSG_FIELD_INVALID,
            args: ['{FROM_DATE}']
        }, {
            field: 'TO_DATE',
            on: ['getFacetFilter'],
            validateWith: function(obj) {
                return obj.TO_DATE ? Date.parse(obj.TO_DATE) : true;
            },
            message: messages.MSG_FIELD_INVALID,
            args: ['{TO_DATE}']
        },  {
	        field: 'filters',
	        on: ['getFacetFilter'],
	        validateWith: function(obj){
	            var filterObj = obj.filters;
	            if (!filterObj){
	                return true;
	            }
	            else {
	                if (!(filterObj instanceof Object)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('LEASE_CONTRACT_ID') && !(filterObj.LEASE_CONTRACT_ID instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('LESSOR') && !(filterObj.LESSOR instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('LEASE_CONTRACT_TYPE') && !(filterObj.LEASE_CONTRACT_TYPE instanceof Array)){
	                    return false;
	                }
	                return true;
	            }
	        },
	        message: messages.MSG_FIELD_INVALID,
	        args: ['{filters}'],
	},  {
        field: 'filters',
        on: ['resourceFacetFilter'],
        validateWith: function(obj){
            var filterObj = obj.filters;
            if (!filterObj){
                return true;
            }
            else {
                if (!(filterObj instanceof Object)){
                    return false;
                }
                if (filterObj.hasOwnProperty('RESOURCE_STATUS') && !(filterObj.RESOURCE_STATUS instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('OWNER') && !(filterObj.OWNER instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('FOOD_GRADE') && !(filterObj.FOOD_GRADE instanceof Array)){
                    return false;
                }
                if (filterObj.hasOwnProperty('RESOURCE_CONDITION') && !(filterObj.RESOURCE_CONDITION instanceof Array)){
                    return false;
                }

                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}'],
    }, {
        field: "TOR_ID",
        format: {
            expr: /[0-9]+/
        },
        args: ["TOR_ID", /[0-9]+/],
        message: messages.MSG_KEY_FORMAT_INVALID,
        on: ['resourceFacetFilter']
    }],
    afterInitialize: [{
		    method: 'init',
		    on: ['getFacetFilter']
	}, {
        method: 'resourceFacetInit',
        on: ['resourceFacetFilter']
	}]
};
