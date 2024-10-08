var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");


function Extensibility() {
    this.init = function(obj, getParams) {
    	obj.MAPPED_NAME = obj.MAPPED_NAME || getParams("MAPPED_NAME");
        obj.DISPLAY_NAME = obj.DISPLAY_NAME || getParams("DISPLAY_NAME") ;
        obj.SEARCHABLE=obj.SEARCHABLE || getParams("SEARCHABLE");
        //obj.FILTERABLE=obj.FILTERABLE || getParams("FILTERABLE");
        obj.PAGE_ID=obj.PAGE_ID || getParams("PAGE_ID");
        obj.DESCRIPTION=obj.DESCRIPTION || getParams("DESCRIPTION");

    };

    this.extensibleFacetFilter = function(obj){
        obj.search = obj.search ? obj.search.toLowerCase() : "";
        var filterObj = obj.filters || {};
        obj.PAGE_ID_LIST_INPUT = filterObj.hasOwnProperty('PAGE_ID') ? filterObj.PAGE_ID.map(function(id){ return {ID: id}; }) : [];
    };
}

Extensibility.prototype = {
	    validates: [
	                {
				        field: "MAPPED_NAME",
				        presence: true,
				        on:["register"],
				        args: ["MAPPED_NAME"],
				        message: messages.MSG_FIELD_MISSING
				    },
				    {
				        field: "DISPLAY_NAME",
				        presence: true,
				        args: ["DISPLAY_NAME"],
				        on:["register"],
				        message: messages.MSG_FIELD_MISSING
				    },
				    {
				        field: "SEARCHABLE",
				        numericality: true,
				        args: ["SEARCHABLE"],
				        on:["register"],
				        message: messages.MSG_KEY_NOT_IN_ENUM
				    },
				    /*{
				        field: "FILTERABLE",
				        numericality: true,
				        args: ["FILTERABLE"],
				        on:["register"],
				        message: messages.MSG_KEY_NOT_IN_ENUM
				    },*/
				    {
				        field: "PAGE_ID",
				        presence: true,
				        args: ["PAGE_ID"],
				        on:["register","unregister","getRegisteredColumns","getExtendableColumns"],
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
				                if (filterObj.hasOwnProperty('MAPPED_NAME') && !(filterObj.MAPPED_NAME instanceof Array)){
				                    return false;
				                }
				                if (filterObj.hasOwnProperty('DISPLAY_NAME') && !(filterObj.DISPLAY_NAME instanceof Array)){
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
					     method: 'extensibleFacetFilter',
					     on: ['facetFilter']
					},
					{
					     method: 'init',
					     on: ['register',"unregister","getRegisteredColumns","getExtendableColumns"]
					}]
};

