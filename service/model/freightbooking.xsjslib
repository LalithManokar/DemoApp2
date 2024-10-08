var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function FreightBookingInformation() {
    this.freightBookingFacetFilterInit = function(obj){
             obj.search = obj.search ? obj.search.toLowerCase() : "";
             var filterObj = obj.filters || {};
//             obj.SCHEDULE_ID_LIST_INPUT = filterObj.hasOwnProperty('SCHEDULE_ID') ? filterObj.SCHEDULE_ID.map(function(str){ return {STR: str}; }) : [];
//             obj.VOYAGE_ID_LIST_INPUT = filterObj.hasOwnProperty('VOYAGE_ID') ? filterObj.VOYAGE_ID.map(function(str){ return {STR: str}; }) : [];
             obj.RESOURCE_TYPE_LIST_INPUT = filterObj.hasOwnProperty('RESOURCE_TYPE') ? filterObj.RESOURCE_TYPE.map(function(str){ return {STR: str}; }) : [];
             obj.SOURCE_LOCATION_LIST_INPUT = filterObj.hasOwnProperty('SOURCE_LOCATION') ? filterObj.SOURCE_LOCATION.map(function(str){ return {STR: str}; }) : [];

    };
}

FreightBookingInformation.prototype = {
		validates: [{
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
//	                if (filterObj.hasOwnProperty('SCHEDULE_ID') && !(filterObj.SCHEDULE_ID instanceof Array)){
//	                    return false;
//	                }
//	                if (filterObj.hasOwnProperty('VOYAGE_ID') && !(filterObj.VOYAGE_ID instanceof Array)){
//	                    return false;
//	                }
	                if (filterObj.hasOwnProperty('RESOURCE_TYPE') && !(filterObj.RESOURCE_TYPE instanceof Array)){
	                    return false;
	                }
	                if (filterObj.hasOwnProperty('SOURCE_LOCATION') && !(filterObj.SOURCE_LOCATION instanceof Array)){
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
			    method: 'freightBookingFacetFilterInit',
			    on: ['facetFilter']
			}
	    ]
	};
