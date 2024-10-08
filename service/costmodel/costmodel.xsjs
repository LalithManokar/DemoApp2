var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var graphCalc = $.import("/sap/tm/trp/service/planningcockpit/transportNetwork.xsjslib");
var model = $.import('/sap/tm/trp/service/model/costModel.xsjslib');
var calculate = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");


var costModelService = new lib.SimpleRest({
    name : "cost dataset",
    desc : "create/update/delete cost model",
    model : new model.costModel()
});

function getUserInfoAuthCheck(costModelId) {
    var checkUserTypeProc = "sap.tm.trp.db.costmodel::p_get_user_info_for_auth_check_cost_model";
    var getUserType = new proc.procedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(costModelId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            logger.error("COST_MODEL_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

//create a cost model
costModelService.create = function(params) {
	var newId, createProc, procedureName;
	procedureName = 'sp_cost_model_save';
	try {
		createProc = new proc.procedure(constants.SCHEMA_NAME,
        		constants.SP_PKG_COSTMODEL + '::' + procedureName);
        newId = createProc(params.obj.ID,
        		                params.obj.NAME,
        		                params.obj.DESC,
        		                params.obj.CURRENCY_CODE,
        		                params.obj.TRANSPORTATION_MODE_CODES,
        		                params.obj.CARRIER_IDS,
        		                params.obj.RANK,
        		                params.obj.RESOURCE_CATEGORY
        		              ).ID;
        return newId;
    } catch (e) {
    	logger.error(
                "COST_MODEL_CREATE_FAILED", 
                params.obj.NAME, 
                params.obj.DESC, 
                params.obj.CURRENCY_CODE, 
                params.obj.TRANSPORTATION_MODE_CODES, 
                params.obj.CARRIER_IDS, 
                params.obj.RANK,
                params.obj.RESOURCE_CATEGORY,
                e
            );
        throw new lib.InternalError(
                messages.MSG_ERROR_COST_MODEL_CREATE, e);
    }
};

//update a cost model
costModelService.update = function(params) {
	var updateProc, procedureName,updateMessage;
	procedureName = 'sp_cost_model_save';
	try {
		updateProc = new proc.procedure(constants.SCHEMA_NAME,
        		constants.SP_PKG_COSTMODEL + '::' + procedureName);
		updateMessage = updateProc(params.obj.ID,
                params.obj.NAME,
                params.obj.DESC,
                params.obj.CURRENCY_CODE,
                params.obj.TRANSPORTATION_MODE_CODES,
                params.obj.CARRIER_IDS,
                params.obj.RANK,
                params.obj.RESOURCE_CATEGORY);
        
        if (updateMessage.OUT_MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(updateMessage.OUT_MESSAGE);
        }
    
    } catch (e) {
    	logger.error(
                "COST_MODEL_UPDATE_FAILED",
                params.obj.NAME, 
                params.obj.DESC, 
                params.obj.CURRENCY_CODE, 
                params.obj.TRANSPORTATION_MODE_CODES, 
                params.obj.CARRIER_IDS, 
                params.obj.RANK, 
                params.id,
                params.obj.RESOURCE_CATEGORY,
                e
            );
        throw new lib.InternalError(
                messages.MSG_ERROR_COST_MODEL_UPDATE, e);
    }
};

//update a cost model
costModelService.destroy = function(params) {
	var deleteProc, procedureName;
	procedureName = 'sp_cost_model_delete';
	try {
		deleteProc = new proc.procedure(constants.SCHEMA_NAME,
        		constants.SP_PKG_COSTMODEL + '::' + procedureName);
		deleteProc(params.id);
    } catch (e) {
    	logger.error(
                "COST_MODEL_DELETE_FAILED", params.id, e
            );
        throw new lib.InternalError(
                messages.MSG_ERROR_COST_MODEL_DELETE, e);
    }
};

costModelService.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.costmodel::sp_cost_model_facet_filter");
        var result = query(params.obj.search, params.obj.currency_code, params.obj.RESOURCE_CATEGORY);
        return {
        	CURRENCY_CODE: result.CURRENCY_CODE_LIST_OUTPUT.map(function(item) { return {key: item.CODE, text: item.DESC};})
        };
    } catch (e) {
        logger.error(
                "QUERY_COST_MODEL_FACET_FILTER_FAILED", e
            );
        throw new lib.InternalError(messages.MSG_ERROR_FACET_FILTER_COST_MODEL, e);
    }

};

costModelService
.setFilters([
        {
            filter : function(params) {
            	var checkProc, procedureName, costDatasetList, checkFlag = true;
            	procedureName = 'sp_cost_model_carrier_check';
            	try {
            		checkProc = new proc.procedure(constants.SCHEMA_NAME,
                    		constants.SP_PKG_COSTMODEL + '::' + procedureName);
            		costDatasetList = checkProc(params.obj.CARRIER_IDS).DATASET_WITH_CARRIER_CONFLICT;
                } catch (e) {
                	logger.error(
                            "COST_MODEL_WITH_CARRIER_CONFLICT", params.obj.CARRIER_IDS, e
                        );
                    throw new lib.InternalError(
                            messages.MSG_ERROR_CHECK_COST_DATASET_WITH_CARRIER_CONFLICT, e);
                }
                if (costDatasetList.length > 0) {
                    for (var i in costDatasetList){
                        throw new lib.InternalError(
                                messages.MSG_ERROR_COST_DATASET_WITH_CARRIER_CONFLICT, {args:[costDatasetList[i].NAME]});
                    }	
                }
                return checkFlag;
            },
            only : [ "create", "update" ]
        },{
            filter : function(params) {
          	  var conn, entityLastCheckProc, entityCheckProc, result = true, checkResult, checkProc;
          	    try {
          	        conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
          	        conn.setAutoCommit(false);
          	        checkProc = new proc.procedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.costmodel::p_cost_model_delete_check', {
          	            connection: conn
          	        });
          	        checkResult = checkProc(params.id).WHEREUSED;
          	      conn.commit();
          	    } catch (e) {
          	        conn.rollback();
          	        logger.error("COST_MODEL_CHECK_FAILED", params.id, e);
          	        throw new lib.InternalError(messages.MSG_COST_MODEL_CHECK_USED_FAILED, e);
          	    }
          	  if(checkResult.length > 0) {
                	throw new lib.InternalError(messages.MSG_COST_MODEL_IS_USED);
                }
                return result;
          },
          only : [ "destroy" ]
        },{
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
        }]);

costModelService.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "queryFacetFilter"
}]);

try {
	costModelService.handle();
} finally {
    logger.close();
}