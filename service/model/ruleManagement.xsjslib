var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');

function RuleManagement() {
	this.init=function(obj,getParams){
		if(getParams("rule_id")){
			obj.ruleId=parseInt(getParams("rule_id"));
		}
		if(getParams("type")){
			obj.type=parseInt(getParams("type"));
		}
	};
	this.initCreation=function(obj,getParams){
		if(getParams("rule_name")){
			obj.rule_name = getParams("rule_name");
		}
		if(getParams("rule_desc")){
			obj.rule_desc = getParams("rule_desc");
		}
		if(getParams("table_id")){
			obj.table_id = getParams("table_id");
		}
		if(getParams("date_from")){
			obj.date_from = getParams("date_from");
		}
		if(getParams("date_to")){
			obj.date_to = getParams("date_to");
		}
		if(getParams("type")){
			obj.type = getParams("type");
		}
		if(getParams("unarchive_type")){
			obj.unarchive_type = getParams("unarchive_type");
		}
	};

	 this.initfacetFilter = function(obj){
	        obj.search = obj.search ? obj.search.toLowerCase() : "";
	        var filterObj = obj.filters || {};
	       obj.filters = filterObj.hasOwnProperty('TYPE') ? filterObj.TYPE.map(function(id){ return {ID: id}; }) : [];
	       };
}

RuleManagement.prototype = {
validates: [
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
                    sql : 'SELECT 1 FROM "sap.tm.trp.db.archive::t_archive_rule" WHERE lower(RULE_NAME) = lower(?)'
                },
                args : [ '{NAME}' ],
                message : messages.MSG_NAME_NON_UNIQUE
            },
    {
    	field: "TYPE",
    	presence:true,
    	on:['create'],
    	format: {
            expr: /[1-4]+/
        },
        args:["type"],
        message: messages.MSG_FIELD_INVALID
    },
    {
    	field:"ID",
    	presence:true,
    	on:['delete'],
    	format: {
            expr: /[0-9]+/
        },
        args:["ID"],
        message:messages.MSG_FIELD_INVALID
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
                if (filterObj.hasOwnProperty('TYPE') && !(filterObj.TYPE instanceof Array)){
                    return false;
                }
                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}']
    }

],

afterInitialize: [{
  method:'initCreation',
  on:['create']
},
{
  	  method:'init',
	  on:['execute','delete']
},
{
	method:'initfacetFilter',
	on:['facetFilter']
}

]
};
