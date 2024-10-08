var File = $.import("/sap/tm/trp/service/xslib/file.xsjslib").File;
var artifacts = $.import("/sap/tm/trp/service/xslib/artifacts.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();


var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN + '.settings';
var SERVICE_PKG = "sap.tm.trp.service";

//service for locationGroup
var settingsService = new lib.SimpleRest({
    name: 'Pickup Return Settings',
    desc: 'API for Pickup Return Settings'
});

var actionDefinition = [
	{name: "readLocationGroup",privilege: "PickupReturnSettingsRead"},
	{name: "saveLocationGroup",privilege: "PickupReturnSettingsUpdate"},
	{name: "readLaneDetermination", privilege: "PickupReturnSettingsRead"},
    {name: "activateLaneDetermination", privilege: "PickupReturnSettingsUpdate"},
    {name: "deactivateLaneDetermination", privilege: "PickupReturnSettingsUpdate"},
    {name: "readPacketSize",privilege: "PickupReturnSettingsRead"},
    {name: "changePacketSize",privilege: "PickupReturnSettingsUpdate"}
];
var actionLogic = {
		readLocationGroup : function(conn,data){
	        var procName = PACKAGE + '::p_get_location_pair_group';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
	            connection: conn
	        });
			var result = procedureFunction();
			return {
				error:"",
				data:{
					active:result.ACTIVATION_STATUS,
					field1:result.GROUP_FIELD_NAME1,
					field2:result.GROUP_FIELD_NAME2,
				}
			};
		},
		saveLocationGroup : function(conn,data){
		    var procName = PACKAGE + '::p_set_location_pair_group';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
		        connection: conn
		    });
			data.active = data.active.toUpperCase();
			data.field1 = data.field1.toUpperCase();
			data.field2 = data.field2.toUpperCase();
			var error = "";
			var result = procedureFunction(data.active,data.field1,data.field2);
			error = result.ERROR_CODE;
			if(error===''){
				try{
					if(data.active!=='X'){
						data.field1 = null;
						data.field2 = null;
					}
					var createViews = $.import("/sap/tm/trp/db/semantic/location/enhanceGroup.xsjslib").generateView;
					var view = new File("v_location_enhance_group.hdbview", "sap/tm/trp/db/semantic/location");
			        
			        view.create(new artifacts.HDBView(createViews(data.field1,data.field2)), "data/hdbview");
//			        view.grant("SELECT", convertPathToObjectName(LOCAL_PACKAGE_ABS, EXT_SQLCC)); // need to be able to select for OData
				}catch(e){
					error = "MSG_ERROR_PICKUP_RETURN_LOCATION_GROUP_UPDATE_FAILED";
				}
			}
			
			return {
				error:error
			};
		},
		
		readLaneDetermination : function(conn,data){
	        var procName = PACKAGE + '::p_read_trp_lane';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
	            connection: conn
	        });
			var result = procedureFunction();
			return {
				error:"",
				data:{
					active:result.ACTIVATION_STATUS
				}
			};
		},
		
		activateLaneDetermination : function(conn,data){
		    var procName = PACKAGE + '::p_activate_trp_lane';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
		        connection: conn
		    });
			var result = procedureFunction();
			return {
				error:result.ERROR_CODE
			};
		},
		
		deactivateLaneDetermination : function(conn,data){
		    var procName = PACKAGE + '::p_deactivate_trp_lane';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
		        connection: conn
		    });
			var result = procedureFunction();
			return {
				error:result.ERROR_CODE
			};
		},
		
		readPacketSize : function(conn,data){
	        var procName = PACKAGE + '::p_read_packet_size';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
	            connection: conn
	        });
			var result = procedureFunction();
			return {
				error:"",
				data:{
					packetSize:result.SIZE
				}
			};
		},
		
		changePacketSize : function(conn,data){
		    var procName = PACKAGE + '::p_change_packet_size';
			var procedureFunction = new proc.procedure(SCHEMA, procName, {
		        connection: conn
		    });
			var result = procedureFunction(data.packetSize);
			return {
				error:result.ERROR_CODE
			};
		}
		
};

settingsService.create = function(params) {
	var actionName = params.obj.action;
	var data = params.obj.data;
	var error, responseData = {};
	
	var action = actionDefinition.filter(function(obj){return obj.name===actionName})[0];
	if(action){
	    var privilege = [SERVICE_PKG, action.privilege].join("::");
	    if (!$.session.hasAppPrivilege(privilege)) {
	        logger.error(
	            "LOC_RULE_UNAUTHORIZED",
	            privilege
	        );
	        throw new lib.NotAuthorizedError(privilege);
	    }
	    if(actionLogic[actionName]){
			var conn = $.db.getConnection();
			try{
		    	var actionResult = actionLogic[actionName](conn,data);
		    	responseData = actionResult.data;
		    	error = actionResult.error;
		        conn.commit();
			}catch(e){
		        conn.rollback();
	            throw new lib.InternalError(
	                    messages.MSG_ERROR_PICKUP_RETURN_SETTINGS_ISSUE, e);
			}
	    }
	}else{
		error = "PICKUP_RETURN_SETTING_ACTION_NOT_EXIST";
	}
	return {
		action:actionName,
		error:error,
		data:responseData
	};
}; 

try {
    settingsService.handle();
} finally {
    logger.close();
}