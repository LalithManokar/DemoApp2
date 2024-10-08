var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");


function DataManagement() {
	this.init=function(obj,getParams){
		if(getParams("rule_id")){
			obj.ruleId=parseInt(getParams("rule_id"));
		}
		if(getParams("type")){
			obj.type=parseInt(getParams("type"));
		}
	};
	this.viewArchive=function(obj,getParams){
		if(getParams("rule_id")){
			obj.ruleId=parseInt(getParams("rule_id"),10);
		}
		obj.tableId=getParams('tableId');
		obj.date_from=getParams('date_from')||'';
		obj.date_to=getParams('date_to')||'';
		obj.search_value=getParams('search_value')||'';
		obj.fields=getParams('search_fields')||'';
		obj.pageSize=parseInt(getParams('pageSize'),10);
		obj.pageNo=parseInt(getParams('pageNo'),10);
	};
	this.viewMetadata=function(obj,getParams){
		obj.tableId=getParams('tableId');
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

	this.initConfigure=function(obj,getParams){
		/*if(getParams("configuration_type")){
			obj.configuration_type = getParams("configuration_type");
		}
		if(getParams("datasource_name")){
			obj.datasource_name = getParams("datasource_name");
		}
		if(getParams("schema_name")){
			obj.schema_name = getParams("schema_name");
		}
		if(getParams("database_name")){
			var database_name = getParams("database_name");
			obj.configuration_object = database_name===null? "NULL":database_name;
		}
//		if(getParams("side_car")){
//			obj.configuration_object = getParams("side_car");

		if(getParams("configuration_object")){
			obj.configuration_object = getParams("configuration_object");
		}*/

	};

	this.initGetArchiveRules=function(obj,getParams){
		if(getParams("tableId")){
			obj.tableId = getParams("tableId");
		}
	};

	 this.initfacetFilter = function(obj){
	        obj.search = obj.search ? obj.search.toLowerCase() : "";
	        var filterObj = obj.filters || {};
	       obj.TYPE_LIST_INPUT = filterObj.hasOwnProperty('TYPE') ? filterObj.TYPE.map(function(id){ return {ID: id}; }) : [];
	       obj.STATUS_LIST_INPUT = filterObj.hasOwnProperty('STATUS') ? filterObj.STATUS.map(function(id){ return {ID: id}; }) : [];
	        };
}

DataManagement.prototype = {
validates: [
    {
    	field: "type",
    	presence:true,
    	on:['createRule','executeRule'],
    	format: {
            expr: /[1-3]+/
        },
        args:["type"],
        message: messages.MSG_FIELD_INVALID,
    },
    {
    	field:"RULE_ID",
    	presence:true,
    	on:['executeRule','deleteRule'],
    	format: {
            expr: /[0-9]+/
        },
        args:["RULE_ID"],
        message:messages.MSG_FIELD_INVALID
    },
    {
    	field:"tableId",
    	presence:true,
    	on:['archivedData','callMetadata'],
    	args:["tableId"],
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
                if (filterObj.hasOwnProperty('STATUS') && !(filterObj.STATUS instanceof Array)){
                    return false;
                }

                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}'],
    }

],
afterInitialize: [{
  method:'initCreation',
  on:['createRule']
},
/*{
	  method:'initConfigure',
	  on:['configure']
	},*/
{
  	  method:'init',
	  on:['validateExecute','executeRule','deleteRule']
}
,
{
  	  method:'viewArchive',
  	  on:['getArchivedData']
},
{
	  method:'viewMetadata',
	  on:['callMetadata']
},
{
		method:'initGetArchiveRules',
		on:['getArchiveRules']
},
{
	method:'initfacetFilter',
	on:['facetFilter']
}


]
};
