var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var model = $.import('/sap/tm/trp/service/model/planningcockpit.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var networksettingService = new lib.SimpleRest({
    name : 'network setting service',
    desc : 'operations about network',
    model : new model.Networksetting()
});

function getUserInfoAuthCheck(networkSettingId) {
    var checkUserTypeProc = "sap.tm.trp.db.planningcockpit::p_get_user_info_for_auth_check_network_setting_group";
    var getUserType = new proc.procedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(networkSettingId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            logger.error("NETWORK_SETTING_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

networksettingService.destroy = function(params) {
    var procName, deleteProc;
    try {
        procName = 'sap.tm.trp.db.planningcockpit::p_network_setting_group_delete';
        deleteProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        deleteProc(params.id);
    } catch(e) {
    	logger.error("NETWORK_SETTING_GROUP_DELETE_FAILED", params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_NETWORK_SETTING, e);
    }
};

networksettingService.create = function(params) {
    var procName, createProc, newId;
    try {
        procName = 'sap.tm.trp.db.planningcockpit::p_network_setting_group_create';
        createProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        newId = createProc(params.obj.NAME,
        		   params.obj.DESC,
        		   params.obj.MANDATORY_COST_MODEL_ID,
        		   params.obj.OPTIONAL_COST_MODEL_ID,
        		   params.obj.PARAMETER_LIST,
        		   params.obj.VALUE_LIST,
        		   params.obj.RESOURCE_CATEGORY).GROUP_ID;
        return newId;
    } catch(e) {
    	logger.error("NETWORK_SETTING_GROUP_CREATE_FAILED",e);
        throw new lib.InternalError(messages.MSG_ERROR_CREATE_NETWORK_SETTING, e);
    }
};

networksettingService.update = function(params) {
    var procName, updateProc;
    try {
        procName = 'sap.tm.trp.db.planningcockpit::p_network_setting_group_update';
        updateProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        updateProc(params.id,
        		params.obj.DESC,
     		    params.obj.MANDATORY_COST_MODEL_ID,
     		    params.obj.OPTIONAL_COST_MODEL_ID,
     		    params.obj.PARAMETER_LIST,
     		    params.obj.VALUE_LIST);
    } catch(e) {
    	logger.error("NETWORK_SETTING_GROUP_UPDATE_FAILED",params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_NETWORK_SETTING, e);
    }
};

networksettingService.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.planningcockpit::p_get_network_setting_group_facet_filter");
        var result = query(params.obj.search, 
        				   params.obj.MANDATORY_COST_MODEL_INPUT, 
        				   params.obj.OPTIONAL_COST_MODEL_INPUT,
        				   params.obj.RESOURCE_CATEGORY);

        return {
        	MANDATORY_COST_MODEL_ID: result.MANDATORY_COST_MODEL_ID_LIST_OUTPUT.map(function(i) { return {key : i.ID, text : i.DESC};}),
        	OPTIONAL_COST_MODEL_ID: result.OPTIONAL_COST_MODEL_ID_LIST_OUTPUT.map(function(i) { return  {key : i.ID, text : i.DESC};})
        };
    } catch (e) {
    	logger.error("QUERY_FACET_FILTER_FAILED",e);
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_NETWORK_SETTING, e);
    }
};

networksettingService.setFilters({
	//add check about the input PARAMETER_LIST
    filter: function(params){
        var procName, checkProc, result;
        try {
            procName = 'sap.tm.trp.db.planningcockpit::p_network_setting_group_parameter_check';
            checkProc = new proc.procedure(constants.SCHEMA_NAME, procName);
            result = checkProc(
         		    params.obj.MANDATORY_COST_MODEL_ID,
         		    params.obj.OPTIONAL_COST_MODEL_ID,
         		    params.obj.VALUE_LIST
         		    ).OUTPUT;
            if (result.length > 0) {
            	throw new lib.InternalError(messages.MSG_ERROR_NETWORK_SETTING_PARAMETER_VALUE_INVALID, {args:result});
            }
            return true;
        } catch(e) {
        	logger.error("CHECK_PARAMETER_VALUE_FAILED",e);
        	if (e instanceof lib.WebApplicationError) {
                throw e;
            }
        	throw new lib.InternalError(messages.MSG_ERROR_CHECK_NETWORK_SETTING_PARAMETER_VALUE, e);
        }
    },
    only: ["create", "update"]
}, {
    filter : function(params) {
  	  var conn, result = true, checkResult, checkProc;
  	    try {
  	        conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
  	        conn.setAutoCommit(false);
  	        checkProc = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.planningcockpit::p_network_setting_group_delete_check", {
  	            connection: conn
  	        });
  	        checkResult = checkProc(params.id).WHEREUSED;
  	      conn.commit();
  	    } catch (e) {
  	        conn.rollback();
  	        logger.error("NETWORK_SETTING_GROUP_CHECK_FAILED", e, params.id);
  	        throw new lib.InternalError(messages.MSG_NETWORK_SETTING_GROUP_CHECK_USED_FAILED, e);
  	    }
  	  if(checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_NETWORK_SETTING_GROUP_FILTER_IS_USED);
        }
        return result;
  },
  only : [ "destroy" ]
}, {
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "destroy" ]
}, {
    filter : function(params) {
        try {
          return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
});

networksettingService.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}]);

try {
	networksettingService.handle();
} finally {
    logger.close();
}