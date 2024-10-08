var model = $.import('/sap/tm/trp/service/model/pickupreturn.xsjslib'); 
var restLib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var calculation = $
        .import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var util = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var determinationExecute = $
        .import('/sap/tm/trp/service/xslib/determinationExecutor.xsjslib').execute;
var finalizeExecute = $.import('/sap/tm/trp/service/xslib/finalize.xsjslib').execute;
var getTUCost = $.import("/sap/tm/trp/service/xslib/getTUCost.xsjslib");
var locationRuleExecRunDelete = $.import('/sap/tm/trp/service/xslib/locationRuleExecRunDelete.xsjslib').execute;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN;
var SERVICE_PKG = "sap.tm.trp.service";

function generateServiceReturnObj(procReturnObj, outputInfoList){
    var serviceReturnObj = {};
    var obj = {};
    outputInfoList.forEach(function(outputInfo){
    	obj = procReturnObj[outputInfo.varName];
        serviceReturnObj[outputInfo.field] = 
        	//procReturnObj[outputInfo.varName].map(function(row)
        	Object.keys(obj).map(function(row)
        	{
            return {
                key: obj[row].KEY?obj[row].KEY.toString():obj[row].KEY,
                text: obj[row].TEXT
            };
        });
    });
    return serviceReturnObj;
}


function json2array(json){
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function(key){
        result.push(json[key]);
    });
    return result;
}

function isExtendedColumnActive(rule_type){
	var rs,count,conn;
	var status_active = 1;
    var sqlGet = "SELECT COUNT(1) AS COUNT FROM \"sap.tm.trp.db.pickupreturn::t_extended_fields_for_" + rule_type + "_config\" WHERE ACTIVATION_STATUS = ? ";
	var isExtendedCol = false;
	try {
	    conn = $.hdb.getConnection();
	    rs = conn.executeQuery(sqlGet, status_active);
	    count = rs[0]["COUNT"];
	    parseInt(count.toString()) === 1 ? isExtendedCol = true : isExtendedCol = false;
	        
	}catch (e) {
	    logger.error("EXTENDED_CONFIGURATION_READ_ERROR", e);
	    throw e;
	}finally {
	    conn.close();
	}
	return isExtendedCol;
}

function getRuleSetDetails(id){
    var page_id, rule_type;
    var sql = "SELECT RULE_TYPE FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE ID = ?"
    var conn = $.hdb.getConnection();
    var rs = conn.executeQuery(sql, id);
    conn.close();
    var type = rs[0]["RULE_TYPE"];
    if (type == 1) {
        rule_type = 'pickup';
    }
    if (type == 2) {
        rule_type = 'return';
    }
    return rule_type;
}
	
function mergeDeliveredExtended(result_delivered_field,result_extended_fields) {
	var result = [];
	var i,j;
	var index;
	var tu_id_current;
		
	//get the tu_id in a separate field to fetch index later
	var tu_id = Object.keys(result_delivered_field).map( key => result_delivered_field[key].TRANSPORTATION_ID);

	for (i = 0; i < result_extended_fields.length; i++ ){
		//get the tu_id being processed
		tu_id_current = result_extended_fields[i].TU_ID;
		//get index of tu_id in extended fields
		index = tu_id.indexOf(tu_id_current);
		result[i] = Object.assign({},result_delivered_field[index],result_extended_fields[i]);

	}
	return result;
}

function extendedColumnCheckFetchResult(ruleId, tu_booking_list, columnFilter, pageNumber, pageSize, offsetVal, result_delivered_field){
    
    var tuCount, final_result, tuIDList = [];
    var result_delivered_field_pagination = [];
    var result_extended_fields_pagination = [];

    //get the ruletype
    var ruleType = getRuleSetDetails(ruleId);
    if (isExtendedColumnActive(ruleType)){
        	
        	var conn1 = $.hdb.getConnection();
        	
        	//read the extended config
        	var status_active = 1;
        	var sql_ext_config = "SELECT SCHEMA_NAME, PROCEDURE_NAME, STRUCTURE_NAME FROM \"sap.tm.trp.db.pickupreturn::t_extended_fields_for_" + ruleType + "_config\" WHERE ACTIVATION_STATUS = ? ";        	
        	var rs_extended_config = conn1.executeQuery(sql_ext_config, status_active);
        	
        	//read output parameter name of custom proc
        	var sql_output_param = "SELECT PARAMETER_NAME FROM PROCEDURE_PARAMETERS WHERE SCHEMA_NAME = ? AND PROCEDURE_NAME = ? AND TABLE_TYPE_NAME = ?"
        	var rs_param = conn1.executeQuery(sql_output_param, rs_extended_config[0]["SCHEMA_NAME"], rs_extended_config[0]["PROCEDURE_NAME"], rs_extended_config[0]["STRUCTURE_NAME"]);
        	var output_param = rs_param[0]["PARAMETER_NAME"];
      	
        	var columnCheckProcExt = conn1.loadProcedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_ext_extended_column_check');    	
        	
            var parameterExt = columnCheckProcExt(columnFilter).PARAMETER;
        	
 
        	var customProc = conn1.loadProcedure(rs_extended_config[0]["SCHEMA_NAME"], 
        			rs_extended_config[0]["PROCEDURE_NAME"]);
        	       	
        	var result_ext = customProc(tu_booking_list,parameterExt);
        	
        	conn1.commit();
        	conn1.close();
        	
        	// SORT TU LIST BY TU_ID
        	var result_extended_fields = json2array(result_ext[output_param]).sort((a, b) => (a.TU_ID > b.TU_ID) ? 1 : -1);
        	
        	tuCount = result_extended_fields.length;
        	
        	// Read All TUID's for optimization action
        	tuIDList = result_extended_fields.map( TU => {return {TU_ID:TU.TU_ID}});
        	
        	var ind;
        	var paginated_index = 0;
        	for (ind = offsetVal; ind < result_extended_fields.length && ind < offsetVal + pageSize; ind++) {
        	    result_extended_fields_pagination[paginated_index++] = result_extended_fields[ind];
        	}
        	
        	//merge delivered and extended columns
        	final_result = mergeDeliveredExtended(result_delivered_field,result_extended_fields_pagination);
        	
        }
        else {
            // SORT TU LIST BY TRANSPORTATION_ID
            result_delivered_field = json2array(result_delivered_field).sort((a, b) => (a.TRANSPORTATION_ID > b.TRANSPORTATION_ID) ? 1 : -1);
            
            // Read All TUID's for optimization action
            tuIDList = result_delivered_field.map( TU => {return {TU_ID:TU.TRANSPORTATION_ID}});
            
            var paginated_index = 0;
            for (ind = offsetVal; ind<result_delivered_field.length && ind<offsetVal + pageSize; ind++) {
        	    result_delivered_field_pagination[paginated_index++] = result_delivered_field[ind];
        	}
            final_result = result_delivered_field_pagination;
            tuCount = result_delivered_field.length;
        }
        
        return {
            final_result : final_result,
            tuCount : tuCount,
            tuIDList: tuIDList,
        }
}

function getFacetFilterResult(result_get_tu) {
    
    var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
                result_get_tu, [ {
                    field : "EXECUTION_STATUS",
                    varName : "EXEC_STATUS_LIST_OUTPUT"
                }, {
                    field : "EQUIPMENT_ID",
                    varName : "EQUIP_TYPE_LIST_OUTPUT"
                }, {
                    field : "SHIPPER_NAME",
                    varName : "SHIPPER_LIST_OUTPUT"
                }, {
                    field : "CONSIGNEE_NAME",
                    varName : "CONSIGNEE_LIST_OUTPUT"
                }, {
                    field : "SHIPPER_LOCATION",
                    varName : "SHIPPER_LOC_LIST_OUTPUT"
                }, {
                    field : "CONSIGNEE_LOCATION",
                    varName : "CONSIGNEE_LOC_LIST_OUTPUT"
                }, {
                    field : "POL_NAME",
                    varName : "POL_LIST_OUTPUT"
                }, {
                    field : "POD_NAME",
                    varName : "POD_LIST_OUTPUT"
                }, {
                    field : "CUR_LOCATION_NAME",
                    varName : "CURRENT_LOC_LIST_OUTPUT"
                }, ]);  
                
    return facetFilterResult;
}

var transportationUnitService = new restLib.SimpleRest({
    name : 'transportationUnit',
    desc : 'transportation unit service',
    model : new model.TransportationUnit()
});

transportationUnitService.reset = function(params) {
    
    var resetTuProc, result, colfil = [];
    var pageSize = params.obj.pageSize;
    
    try {
        // GET TU
    	var connection = $.hdb.getConnection(); 
    	resetTuProc = connection.loadProcedure(constants.SCHEMA_NAME, [
            constants.SP_PKG_PICKUP_RETURN, 'p_tu_location_clear' ]
        .   join('::'));
        var result1 = resetTuProc(params.id, params.obj.RESOURCE_CATEGORY);
        connection.commit();
        connection.close();
        
        var result_delivered_field = result1.TU_OUTPUT; 
        var tu_booking_list = result1.TU_BOOKING_LIST;
        var facetFilterResult = getFacetFilterResult(result1);
        
        var withExtendedResult = extendedColumnCheckFetchResult(params.id, tu_booking_list,
            colfil, 0, pageSize, 0, result_delivered_field)
        
        return {
            TOTAL_COUNT : withExtendedResult.tuCount,
            TU_OUTPUT : withExtendedResult.final_result,
            TuIDSet: withExtendedResult.tuIDList,
            facetFilterResult: facetFilterResult
        };
 
    } catch (e) {
        logger.error("LOCATION_RULE_TU_CLEAR_FAILED", params.id, e);
        throw new restLib.InternalError(messages.MSG_ERROR_RESET_TU, e);
    }
};

transportationUnitService.executeDetermination = function(params) {
	var connection = $.hdb.getConnection();
    var lane = [], errorMessage = {}, executeDeterminationProc;
    var sql = "SELECT COUNT(NAME) as count FROM \"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" where NAME = 'LANE_TRP' AND VALUE = 'X'";
        var rs = connection.executeQuery(sql);
        var count = parseInt(rs[0].COUNT);
        
    if (count == 0) {

            
    try {
        lane = getTUCost.execute(params.id, params.obj.TU_IDS);
    } catch (e) {
        errorMessage.message = e.message;
        errorMessage.cause = e.cause;
    }
   
    try {
    	  var lv_loc_cost_clob = "";
          for (var i = 0; i < lane.length; i++) {
              if (lane[i].FROM_LOCATION === "")   { lane[i].FROM_LOCATION = ' '; }
              if (lane[i].TO_LOCATION === "")     { lane[i].TO_LOCATION = ' '; }
              if (lane[i].MTR === "")             { lane[i].MTR = ' '; }
              if (lane[i].RESOURCE_TYPE === "")   { lane[i].RESOURCE_TYPE = ' '; }
              if (lane[i].CARRIER === "")         { lane[i].CARRIER = ' '; }
              if (lane[i].DISTANCE === "")        { lane[i].DISTANCE = 0; }
              if (lane[i].DURATION === "")        { lane[i].DURATION = 0; }
              if (i !== lane.length - 1) {
                  lv_loc_cost_clob = lv_loc_cost_clob + lane[i].FROM_LOCATION + "," + 
                                                        lane[i].TO_LOCATION + "," + 
                                                        lane[i].MTR + "," + 
                                                        lane[i].RESOURCE_TYPE + "," + 
                                                        lane[i].CARRIER + "," + 
                                                        lane[i].DISTANCE + "," + 
                                                        lane[i].DURATION + "~";
              } else {
                  //last line - no tilt concat required
                  lv_loc_cost_clob = lv_loc_cost_clob + lane[i].FROM_LOCATION + "," + 
                                                      lane[i].TO_LOCATION + "," + 
                                                      lane[i].MTR + "," + 
                                                      lane[i].RESOURCE_TYPE + "," + 
                                                      lane[i].CARRIER + "," + 
                                                      lane[i].DISTANCE + "," + 
                                                      lane[i].DURATION; 
              }
          }
          
    	var executeDeterminationProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_ext_determination_for_facet_filter');
        // executeDeterminationProc = new procLib.procedure(
        //         constants.SCHEMA_NAME, [ constants.SP_PKG_PICKUP_RETURN,
        //                 'p_ext_determination_for_facet_filter' ].join('::'));
         executeDeterminationProc(params.id, lv_loc_cost_clob);
        logger.success("PR_LOCATION_DETERMINATION_RULE_EXECUTE_SUCCEED",
                params.obj.LOCATION_RULE_ID);
        connection.commit();
        return {
            ERRORMESSAGE : errorMessage
        };
    } catch (e) {
    	if (e.code === 304) {
    		//var conn = $.hdb.getConnection();
			var sql1 ='select RESOURCE_CATEGORY FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE ID= \'' + params.id + '\'';
			var rs1 = connection.executeQuery(sql1);
			if (typeof rs1[0] !== 'undefined') {
			var getResourceType = connection.loadProcedure(constants.SCHEMA, "sap.tm.trp.db.costmodel.storagecost::p_get_resource_type_teu");
			var resourceTypeTEUCount = getResourceType(rs1[0].RESOURCE_CATEGORY);
			var resourceType = [];
			for (var i = 0; i < resourceTypeTEUCount.RESOURCE_TYPE_TEU.length; i++) {
				if (resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].TEU < 1) {
					resourceType.push(resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].RESOURCE_TYPE);
				}
				}
			}
			logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
			throw new restLib.InternalError(messages.MSG_ERROR_BALANCE_COST_CALCULATE, {
				args: resourceType.join()
			});
	        connection.commit();
	        //conn.close();
		} else {
			logger.error("PR_EXECUTE_DETERMINATION_FAILED", params.id, e);
			throw new restLib.InternalError(
                messages.MSG_ERROR_EXECUTE_DETERMINATION_RULE_FAILED, e);
		}
    }}
    else {
    	/*var TU_IDS_STR = "";
    	for (var i = 0; i <  params.obj.TU_IDS.length; i++) {
            if(i !==  params.obj.TU_IDS.length - 1) {
                TU_IDS_STR = TU_IDS_STR +  params.obj.TU_IDS[i].TU_ID + ",";
            } else {
                TU_IDS_STR = TU_IDS_STR + params.obj.TU_IDS[i].TU_ID;
            }
        };*/
    
    	try {
    		// executeDeterminationProc = new procLib.procedure(
            //         constants.SCHEMA_NAME, [ constants.SP_PKG_PICKUP_RETURN+'.harmonization.ruleset',
            //                 'p_ext_determination_for_facet_filter_harmonized' ].join('::'));
            var executeDeterminationProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn.harmonization.ruleset::p_ext_determination_for_facet_filter_harmonized');
            executeDeterminationProc(params.id);

            logger.success("PR_LOCATION_DETERMINATION_RULE_EXECUTE_SUCCEED",
                    params.obj.LOCATION_RULE_ID);
            connection.commit();
            return {
                ERRORMESSAGE : errorMessage
            };
        } catch (e) {
        	if (e.code === 304) {
        		//var conn = $.hdb.getConnection();
    			var sql1 ='select RESOURCE_CATEGORY FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE ID= \'' + params.id + '\'';
    			var rs1 = connection.executeQuery(sql1);
    			if (typeof rs1[0] !== 'undefined') {
    			var getResourceType = connection.loadProcedure(constants.SCHEMA, "sap.tm.trp.db.costmodel.storagecost::p_get_resource_type_teu");
    			var resourceTypeTEUCount = getResourceType(rs1[0].RESOURCE_CATEGORY);
    			var resourceType = [];
    			for (var i = 0; i < resourceTypeTEUCount.RESOURCE_TYPE_TEU.length; i++) {
    				if (resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].TEU < 1) {
    					resourceType.push(resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].RESOURCE_TYPE);
    				}
    				}
    			}
    			logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
    			throw new restLib.InternalError(messages.MSG_ERROR_BALANCE_COST_CALCULATE, {
    				args: resourceType.join()
    			});
    	        connection.commit();
    	        //conn.close();
    		} else {
            logger.error("PR_EXECUTE_DETERMINATION_FAILED", params.id, e);
            throw new restLib.InternalError(
                    messages.MSG_ERROR_EXECUTE_DETERMINATION_RULE_FAILED, e);
        }	
    	
    }}
};

transportationUnitService.finalize = function(params) {
    try {
        var result = finalizeExecute(params.id, params.obj.TU_IDS, params.obj.RESOURCE_CATEGORY);
        return result;
    } catch (e) {
        throw new restLib.InternalError(e.message, e);
    } finally {
            
            var conn = $.hdb.getConnection();
        	conn.setAutoCommit(true);
            locationRuleExecRunDelete(params.id, conn);
            conn.close();

    }
};

transportationUnitService.editLoc = function(params) {
    try {
    	var tu_ids = params.obj.TU_IDS;
    	var tuIdsString = "";
        for (var i = 0; i < tu_ids.length; i++) {
        if(i !== tu_ids.length - 1) {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID + ",";
        } else {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID;
        }
        } 
    	var connection = $.hdb.getConnection();
    	var updateLocationProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_ext_location_assignment_loc_update');
        /*var updateLocationProc = new procLib.procedure(SCHEMA, [ PACKAGE,
                'p_ext_location_assignment_loc_update' ].join('::'));*/
        var result = updateLocationProc(params.id, tuIdsString,
                params.obj.LOCATION_NAME);
        if (result.MESSAGE !== 'SUCCESS') {
            throw new restLib.InternalError(result.MESSAGE);
        }
        logger.success("PR_EDIT_LOCATION_SUCCESS", params.id);
        connection.commit();
		connection.close();
        return result;
    } catch (e) {
        logger.error("PR_EDIT_LOCATION_FAILED", params.id, e);

        if (e instanceof restLib.WebApplicationError) {
            throw e;
        }
        throw new restLib.InternalError(
                messages.MSG_ERROR_INVALID_LOCATION_NAME, e);
    }
};

transportationUnitService.editDate = function(params) {
    var result;
    try {
    	var connection = $.hdb.getConnection();
        // var updateDateProc = new procLib.procedure(SCHEMA, [ PACKAGE,
        //         'p_ext_location_assignment_date_update' ].join('::'));
        var updateDateProc = connection.loadProcedure(SCHEMA, [ PACKAGE,
                 'p_ext_location_assignment_date_update' ].join('::'));
        result = updateDateProc(params.obj.LOCATION_RULE_ID, params.obj.TU_ID,
                params.obj.PICKUP_DATE);
    } catch (e) {
        logger.error("PR_EDIT_DATE_FAILED", params.id, e);
        throw new restLib.InternalError('MSG_ERROR_DATE_ASSIGNMENT', e);
    }
    // var timeOffset = params.obj.USER_TIMEZONE_OFFSET;
    if (result.MESSAGE !== 'SUCCESS') {
        logger.error("PR_EDIT_DATE_FAILED", params.id, result.MESSAGE);
        throw new restLib.InternalError(messages.MSG_DATE_INTERVAL,
                {
                    args : [ /*util.localUITime(result.START_DATE, timeOffset),
                             util.localUITime(result.END_DATE, timeOffset)*/
                             result.START_DATE, result.END_DATE ]
                });

    }
    logger.success("PR_EDIT_DATE_SUCCESS", params.id);
    connection.commit();
    connection.close();
    return result;
};

transportationUnitService.getSuggestLocations = function(params) {
    var errorMessage = {}, lane = [];
    var sql = "SELECT COUNT(NAME) as count FROM \"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" where NAME = 'LANE_TRP' AND VALUE = 'X'";
        var connection = $.hdb.getConnection();
        var rs = connection.executeQuery(sql);
        var count = parseInt(rs[0].COUNT);
        
    if (count == 0) {
    try {
        lane = getTUCost.execute(params.id, params.obj.TU_IDS);
    } catch (e) {
        errorMessage.message = e.message;
        errorMessage.cause = e.cause;
    }
    try {
    	var getSuggestedLocProc = connection.loadProcedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_ext_location_suggest_new_c');
        
        //Generate TU_IDs Clob
        var TU_IDS_STR = "";
        for (var i = 0; i < params.obj.TU_IDS.length; i++) {
            if (i !== params.obj.TU_IDS.length - 1) {
                TU_IDS_STR = TU_IDS_STR + params.obj.TU_IDS[i].TU_ID + ",";
            } else {
                TU_IDS_STR = TU_IDS_STR + params.obj.TU_IDS[i].TU_ID;
            }
        }
        //Generate Lane Clob
        
        var lv_loc_cost_clob = "";
        for (var i = 0; i < lane.length; i++) {
            if (lane[i].FROM_LOCATION === "")   { lane[i].FROM_LOCATION = ' '; }
            if (lane[i].TO_LOCATION === "")     { lane[i].TO_LOCATION = ' '; }
            if (lane[i].MTR === "")             { lane[i].MTR = ' '; }
            if (lane[i].RESOURCE_TYPE === "")   { lane[i].RESOURCE_TYPE = ' '; }
            if (lane[i].CARRIER === "")         { lane[i].CARRIER = ' '; }
            if (lane[i].DISTANCE === "")        { lane[i].DISTANCE = 0; }
            if (lane[i].DURATION === "")        { lane[i].DURATION = 0; }
            if (i !== lane.length - 1) {
                lv_loc_cost_clob = lv_loc_cost_clob + lane[i].FROM_LOCATION + "," + 
                                                      lane[i].TO_LOCATION + "," + 
                                                      lane[i].MTR + "," + 
                                                      lane[i].RESOURCE_TYPE + "," + 
                                                      lane[i].CARRIER + "," + 
                                                      lane[i].DISTANCE + "," + 
                                                      lane[i].DURATION + "~";
            } else {
                //last line - no tilt concat required
                lv_loc_cost_clob = lv_loc_cost_clob + lane[i].FROM_LOCATION + "," + 
                                                    lane[i].TO_LOCATION + "," + 
                                                    lane[i].MTR + "," + 
                                                    lane[i].RESOURCE_TYPE + "," + 
                                                    lane[i].CARRIER + "," + 
                                                    lane[i].DISTANCE + "," + 
                                                    lane[i].DURATION; 
            }
        }
        
        var res = getSuggestedLocProc(params.id, TU_IDS_STR, lv_loc_cost_clob);
        connection.commit();
        connection.close();
        var res1 = json2array(res.result);
        return {
            RESULT : res1,
            ERRORMESSAGE : errorMessage
        };
    } catch (e) {
    	if (e.code === 304) {
    		var conn = $.hdb.getConnection();
			var sql1 ='select RESOURCE_CATEGORY FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE ID= \'' + params.id + '\'';
			var rs1 = conn.executeQuery(sql1);
			if (typeof rs1[0] !== 'undefined') {
			var getResourceType = conn.loadProcedure(constants.SCHEMA, "sap.tm.trp.db.costmodel.storagecost::p_get_resource_type_teu");
			var resourceTypeTEUCount = getResourceType(rs1[0].RESOURCE_CATEGORY);
			var resourceType = [];
			for (var i = 0; i < resourceTypeTEUCount.RESOURCE_TYPE_TEU.length; i++) {
				if (resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].TEU < 1) {
					resourceType.push(resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].RESOURCE_TYPE);
				}
				}
			}
			logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
			throw new restLib.InternalError(messages.MSG_ERROR_BALANCE_COST_CALCULATE, {
				args: resourceType.join()
			});
	        conn.commit();
	        conn.close();
		} else {
        logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
        throw new restLib.InternalError(messages.MSG_ERROR_SUGGEST_LOCATION, e);
    }}}
    else {
    	
    	var TU_IDS_STR = "";
    	for (var i = 0; i <  params.obj.TU_IDS.length; i++) {
            if(i !==  params.obj.TU_IDS.length - 1) {
                TU_IDS_STR = TU_IDS_STR +  params.obj.TU_IDS[i].TU_ID + ",";
            } else {
                TU_IDS_STR = TU_IDS_STR + params.obj.TU_IDS[i].TU_ID;
            }
        };
        
    	 try {
    	    	var getSuggestedLocProc = connection.loadProcedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn.harmonization.ruleset::p_ext_location_suggest_new_harmonized');
    	        var res = getSuggestedLocProc(params.id, TU_IDS_STR);
    	        connection.commit();
    	        connection.close();
    	        var res1 = json2array(res.result);

    	        return {
    	            RESULT : res1,
    	            ERRORMESSAGE : errorMessage
    	        };
    	    } catch (e) {
    	    	if (e.code === 304) {
    	    		var conn = $.hdb.getConnection();
    				var sql1 ='select RESOURCE_CATEGORY FROM \"sap.tm.trp.db.pickupreturn::t_location_assignment_rule\" WHERE ID= \'' + params.id + '\'';
    				var rs1 = conn.executeQuery(sql1);
    				if (typeof rs1[0] !== 'undefined') {
    				var getResourceType = conn.loadProcedure(constants.SCHEMA, "sap.tm.trp.db.costmodel.storagecost::p_get_resource_type_teu");
    				var resourceTypeTEUCount = getResourceType(rs1[0].RESOURCE_CATEGORY);
    				var resourceType = [];
    				for (var i = 0; i < resourceTypeTEUCount.RESOURCE_TYPE_TEU.length; i++) {
    					if (resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].TEU < 1) {
    						resourceType.push(resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].RESOURCE_TYPE);
    					}
    					}
    				}
    				logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
    				throw new restLib.InternalError(messages.MSG_ERROR_BALANCE_COST_CALCULATE, {
    					args: resourceType.join()
    				});
    		        conn.commit();
    		        conn.close();
    			} else {
    	    	logger.error("PR_SUGGEST_LOCATION_FAILED", params.id, e);
    	        throw new restLib.InternalError(messages.MSG_ERROR_SUGGEST_LOCATION, e);
    	    }	
    }}
};

transportationUnitService.getSuggestTU = function(params) {
    var errorMessage = {};
    var laneInfo = null;
    var sql = "SELECT COUNT(NAME) as count FROM \"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" where NAME = 'LANE_TRP' AND VALUE = 'X'"
        var connection = $.hdb.getConnection();
        var rs = connection.executeQuery(sql);
        var count = parseInt(rs[0].COUNT);
        //connection.close();
      
    if (count == 0) {
    try {
    	laneInfo = getTUCost.getLaneOnly(params.id);
    	var mydata={ data:[]};
    	Object.keys(laneInfo.connectionCarrier).forEach(function(key,value,map){
            var t=parseInt(laneInfo.connectionCarrier[value].CONNECTION_ID); 
            var t1={"CONNECTION_ID":t,"CARRIER_ID":laneInfo.connectionCarrier[value].CARRIER,};
            mydata.data.push(t1);
    	});

    	var getSuggestedTU = connection.loadProcedure(constants.SCHEMA_NAME,
        "sap.tm.trp.db.streetturn::p_streetturn_get_ranking");

    	var res = getSuggestedTU(params.obj.RESOURCE_CATEGORY,params.obj.TU_ID,params.id, 
					laneInfo.basicConnection,mydata.data);

		return {
		 RESULT : res.OT_SUGGEST,
		 ERRORMESSAGE : errorMessage
		};
        
    } catch (e) {
        logger.error("PR_SUGGEST_TU_FAILED", params.id, e);
        throw new restLib.InternalError(messages.MSG_ERROR_SUGGEST_TU, e);
    }}
    else {
    	try {
    		var getSuggestedTU = connection.loadProcedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.pickupreturn.harmonization.ruleset::p_streetturn_get_ranking_harmonized");
 
			 var res = getSuggestedTU(params.obj.RESOURCE_CATEGORY,params.obj.TU_ID,params.id);
			
			 return {
			     RESULT : res.OT_SUGGEST,
			     ERRORMESSAGE : errorMessage
			 };
            
        } catch (e) {
            logger.error("PR_SUGGEST_TU_FAILED", params.id, e);
            throw new restLib.InternalError(messages.MSG_ERROR_SUGGEST_TU, e);
        }	
    }
    connection.close();
};

transportationUnitService.assign = function(params) {
    var locationId;
    try {
    	// check the location_name first
        var connection = $.hdb.getConnection();
    	var getLocationId = connection.loadProcedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.pickupreturn::p_ext_assign_location_check");
        // var getLocationId = new procLib.procedure(constants.SCHEMA_NAME,
        //         "sap.tm.trp.db.pickupreturn::p_ext_assign_location_check");
        locationId = getLocationId(params.obj.LOCATION_NAME).OUT_LOCATION_ID;
        connection.commit();
		connection.close();
    } catch (e) {
        throw new restLib.InternalError(
                messages.MSG_ERROR_INVALID_LOCATION_NAME, e);
    }

    try {
    	var tu_ids = params.obj.TU_IDS;
    	var tuIdsString = "";
        for (var i = 0; i < tu_ids.length; i++) {
        if(i !== tu_ids.length - 1) {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID + ",";
        } else {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID;
        }
        } 
    	var connection = $.hdb.getConnection();
    	var assignProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_tu_location_assign');
       /* var assignProc = new procLib.procedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_tu_location_assign' ]
                .join('::'));*/
    	
        var result = assignProc(params.id, tuIdsString, locationId);
        logger.success("PR_ASSIGN_LOCATION_SUCCESS", params.id);
        connection.commit();
		connection.close();
        return result;
    } catch (e) {
        logger.error("PR_ASSIGN_LOCATION_FAILED", params.id, e);
        throw new restLib.InternalError(
                messages.MSG_ERROR_ASSIGN_LOCATION_FOR_TU, e);
    }
};

transportationUnitService.facetFilter = function(params) {
    try {
        // COLUMN CHECK
    	var connection = $.hdb.getConnection();
        // var columnCheckProc = new procLib.procedure(constants.SCHEMA_NAME, [
        //         constants.SP_PKG_PICKUP_RETURN, 'p_ext_column_check' ]
        //         .join('::'));
        var columnCheckProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_ext_column_check' ]
                .join('::'));
        var parameter = columnCheckProc(params.obj.COLUMN_FILTERS).PARAMETER;
        
        var EXEC_STATUS_LIST_STR = "",
        EQUIP_TYPE_LIST_STR = "",
        SHIPPER_LIST_STR = "",
        CONSIGNEE_LIST_STR = "",
        SHIPPER_LOC_LIST_STR = "",
        CONSIGNEE_LOC_LIST_STR = "",
        POL_LIST_STR = "",
        POD_LIST_STR = "",
        CURRENT_LOC_LIST_STR = "";
        
        for (var i = 0; i <  params.obj.EXEC_STATUS_LIST.length; i++) {
            if(i !==  params.obj.EXEC_STATUS_LIST.length - 1) {
                EXEC_STATUS_LIST_STR = EXEC_STATUS_LIST_STR +  params.obj.EXEC_STATUS_LIST[i].STR + ",";
            } else {
                EXEC_STATUS_LIST_STR = EXEC_STATUS_LIST_STR + params.obj.EXEC_STATUS_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.EQUIP_TYPE_LIST.length; i++) {
            if(i !==  params.obj.EQUIP_TYPE_LIST.length - 1) {
                EQUIP_TYPE_LIST_STR = EQUIP_TYPE_LIST_STR +  params.obj.EQUIP_TYPE_LIST[i].STR + ",";
            } else {
                EQUIP_TYPE_LIST_STR = EQUIP_TYPE_LIST_STR + params.obj.EQUIP_TYPE_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.SHIPPER_LIST.length; i++) {
            if(i !==  params.obj.SHIPPER_LIST.length - 1) {
                SHIPPER_LIST_STR = SHIPPER_LIST_STR +  params.obj.SHIPPER_LIST[i].STR + ",";
            } else {
                SHIPPER_LIST_STR = SHIPPER_LIST_STR + params.obj.SHIPPER_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CONSIGNEE_LIST.length; i++) {
            if(i !==  params.obj.CONSIGNEE_LIST.length - 1) {
                CONSIGNEE_LIST_STR = CONSIGNEE_LIST_STR +  params.obj.CONSIGNEE_LIST[i].STR + ",";
            } else {
                CONSIGNEE_LIST_STR = CONSIGNEE_LIST_STR + params.obj.CONSIGNEE_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.SHIPPER_LOC_LIST.length; i++) {
            if(i !==  params.obj.SHIPPER_LOC_LIST.length - 1) {
                SHIPPER_LOC_LIST_STR = SHIPPER_LOC_LIST_STR +  params.obj.SHIPPER_LOC_LIST[i].STR + ",";
            } else {
                SHIPPER_LOC_LIST_STR = SHIPPER_LOC_LIST_STR + params.obj.SHIPPER_LOC_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CONSIGNEE_LOC_LIST.length; i++) {
            if(i !==  params.obj.CONSIGNEE_LOC_LIST.length - 1) {
                CONSIGNEE_LOC_LIST_STR = CONSIGNEE_LOC_LIST_STR +  params.obj.CONSIGNEE_LOC_LIST[i].STR + ",";
            } else {
                CONSIGNEE_LOC_LIST_STR = CONSIGNEE_LOC_LIST_STR + params.obj.CONSIGNEE_LOC_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.POL_LIST.length; i++) {
            if(i !==  params.obj.POL_LIST.length - 1) {
                POL_LIST_STR = POL_LIST_STR +  params.obj.POL_LIST[i].STR + ",";
            } else {
                POL_LIST_STR = POL_LIST_STR + params.obj.POL_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.POD_LIST.length; i++) {
            if(i !==  params.obj.POD_LIST.length - 1) {
                POD_LIST_STR = POD_LIST_STR +  params.obj.POD_LIST[i].STR + ",";
            } else {
                POD_LIST_STR = POD_LIST_STR + params.obj.POD_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CURRENT_LOC_LIST.length; i++) {
            if(i !==  params.obj.CURRENT_LOC_LIST.length - 1) {
                CURRENT_LOC_LIST_STR = CURRENT_LOC_LIST_STR +  params.obj.CURRENT_LOC_LIST[i].STR + ",";
            } else {
                CURRENT_LOC_LIST_STR = CURRENT_LOC_LIST_STR + params.obj.CURRENT_LOC_LIST[i].STR;
            }
        }

     // var facetFilterProc = new procLib.procedure(constants.SCHEMA_NAME, [
        //         constants.SP_PKG_PICKUP_RETURN,
        //         'p_tu_location_assignment_facet_filter_get' ].join('::'));
        var facetFilterProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN,
                'p_tu_location_assignment_facet_filter_get' ].join('::'));
        var filteredData = facetFilterProc(params.obj.search, params.id,
                parameter, params.obj.RESOURCE_CATEGORY, EXEC_STATUS_LIST_STR,
                EQUIP_TYPE_LIST_STR, SHIPPER_LIST_STR,
                CONSIGNEE_LIST_STR, SHIPPER_LOC_LIST_STR,
                CONSIGNEE_LOC_LIST_STR, POL_LIST_STR,
                POD_LIST_STR, CURRENT_LOC_LIST_STR);
        var facetFilterResult = generateServiceReturnObj(
        // var facetFilterResult = facetFilterUtils.generateServiceReturnObj(
                filteredData, [ {
                    field : "EXECUTION_STATUS",
                    varName : "EXEC_STATUS_LIST_OUTPUT"
                }, {
                    field : "EQUIPMENT_ID",
                    varName : "EQUIP_TYPE_LIST_OUTPUT"
                }, {
                    field : "SHIPPER_NAME",
                    varName : "SHIPPER_LIST_OUTPUT"
                }, {
                    field : "CONSIGNEE_NAME",
                    varName : "CONSIGNEE_LIST_OUTPUT"
                }, {
                    field : "SHIPPER_LOCATION",
                    varName : "SHIPPER_LOC_LIST_OUTPUT"
                }, {
                    field : "CONSIGNEE_LOCATION",
                    varName : "CONSIGNEE_LOC_LIST_OUTPUT"
                }, {
                    field : "POL_NAME",
                    varName : "POL_LIST_OUTPUT"
                }, {
                    field : "POD_NAME",
                    varName : "POD_LIST_OUTPUT"
                }, {
                    field : "CUR_LOCATION_NAME",
                    varName : "CURRENT_LOC_LIST_OUTPUT"
                }, ]);
        logger.success("PR_FETCH_FACET_FILTER_SUCCESS", params.id);
        connection.commit();
		connection.close();
        return facetFilterResult;
    } catch (e) {
        logger.error("PR_FETCH_FACET_FILTER_FAILED", params.id, e);
        throw new restLib.InternalError(
                messages.MSG_ERROR_GET_FACET_FILTER_FOR_TU, e);
    }
};

transportationUnitService.copyToAll = function(params) {
	var locationId;
    try {
        // check the location_name first
        var connection = $.hdb.getConnection();
        // var getLocationId = new procLib.procedure(constants.SCHEMA_NAME,
        //         "sap.tm.trp.db.pickupreturn::p_ext_assign_location_check");
        var getLocationId = connection.loadProcedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.pickupreturn::p_ext_assign_location_check");
        locationId = getLocationId(params.obj.LOCATION_NAME).OUT_LOCATION_ID;
        connection.commit();
		connection.close();
    } catch (e) {
        throw new restLib.InternalError(
                messages.MSG_ERROR_INVALID_LOCATION_NAME, e);
    }

    try {
        // copy to all
        var connection = $.hdb.getConnection();
        // var copy = new procLib.procedure(constants.SCHEMA_NAME,
        //         "sap.tm.trp.db.pickupreturn::p_ext_location_assign_copytoall");
        var copy = connection.loadProcedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.pickupreturn::p_ext_location_assign_copytoall");
        var result = copy(locationId, params.id, params.obj.TU_IDS);
        connection.commit();
		connection.close();
        return result;
    } catch (e) {
        logger.error("PR_COPY_TO_ALL_TUS_FAILED", params.obj.LOCATION_NAME,
                params.id, params.obj.TU_IDS, e);

        throw new restLib.InternalError(
                messages.MSG_ERROR_COPY_TO_ALL_TUS_FAILED, e);
    }
};

transportationUnitService.getTu = function(params) {
	
	
    var columnCheckProc, parameter, getTuProc, result_delivered_fields, result_get_tu, result, final_result;
    
    try {
    	var EXEC_STATUS_LIST_STR = "",
        EQUIP_TYPE_LIST_STR = "",
        SHIPPER_LIST_STR = "",
        CONSIGNEE_LIST_STR = "",
        SHIPPER_LOC_LIST_STR = "",
        CONSIGNEE_LOC_LIST_STR = "",
        POL_LIST_STR = "",
        POD_LIST_STR = "",
        CURRENT_LOC_LIST_STR = "";
        
        if(params.obj.LOCATION_RULE_ID === 0)
        {  
            return {
                    resultSet : [],
                    TuIDSet: [],
                    tuCount : 0,
                    facetFilterResult:{}
                };
        }
        
        else 
        {
        for (var i = 0; i <  params.obj.EXEC_STATUS_LIST.length; i++) {
            if(i !==  params.obj.EXEC_STATUS_LIST.length - 1) {
                EXEC_STATUS_LIST_STR = EXEC_STATUS_LIST_STR +  params.obj.EXEC_STATUS_LIST[i].STR + ",";
            } else {
                EXEC_STATUS_LIST_STR = EXEC_STATUS_LIST_STR + params.obj.EXEC_STATUS_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.EQUIP_TYPE_LIST.length; i++) {
            if(i !==  params.obj.EQUIP_TYPE_LIST.length - 1) {
                EQUIP_TYPE_LIST_STR = EQUIP_TYPE_LIST_STR +  params.obj.EQUIP_TYPE_LIST[i].STR + ",";
            } else {
                EQUIP_TYPE_LIST_STR = EQUIP_TYPE_LIST_STR + params.obj.EQUIP_TYPE_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.SHIPPER_LIST.length; i++) {
            if(i !==  params.obj.SHIPPER_LIST.length - 1) {
                SHIPPER_LIST_STR = SHIPPER_LIST_STR +  params.obj.SHIPPER_LIST[i].STR + ",";
            } else {
                SHIPPER_LIST_STR = SHIPPER_LIST_STR + params.obj.SHIPPER_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CONSIGNEE_LIST.length; i++) {
            if(i !==  params.obj.CONSIGNEE_LIST.length - 1) {
                CONSIGNEE_LIST_STR = CONSIGNEE_LIST_STR +  params.obj.CONSIGNEE_LIST[i].STR + ",";
            } else {
                CONSIGNEE_LIST_STR = CONSIGNEE_LIST_STR + params.obj.CONSIGNEE_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.SHIPPER_LOC_LIST.length; i++) {
            if(i !==  params.obj.SHIPPER_LOC_LIST.length - 1) {
                SHIPPER_LOC_LIST_STR = SHIPPER_LOC_LIST_STR +  params.obj.SHIPPER_LOC_LIST[i].STR + ",";
            } else {
                SHIPPER_LOC_LIST_STR = SHIPPER_LOC_LIST_STR + params.obj.SHIPPER_LOC_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CONSIGNEE_LOC_LIST.length; i++) {
            if(i !==  params.obj.CONSIGNEE_LOC_LIST.length - 1) {
                CONSIGNEE_LOC_LIST_STR = CONSIGNEE_LOC_LIST_STR +  params.obj.CONSIGNEE_LOC_LIST[i].STR + ",";
            } else {
                CONSIGNEE_LOC_LIST_STR = CONSIGNEE_LOC_LIST_STR + params.obj.CONSIGNEE_LOC_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.POL_LIST.length; i++) {
            if(i !==  params.obj.POL_LIST.length - 1) {
                POL_LIST_STR = POL_LIST_STR +  params.obj.POL_LIST[i].STR + ",";
            } else {
                POL_LIST_STR = POL_LIST_STR + params.obj.POL_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.POD_LIST.length; i++) {
            if(i !==  params.obj.POD_LIST.length - 1) {
                POD_LIST_STR = POD_LIST_STR +  params.obj.POD_LIST[i].STR + ",";
            } else {
                POD_LIST_STR = POD_LIST_STR + params.obj.POD_LIST[i].STR;
            }
        }
        
        for (var i = 0; i <  params.obj.CURRENT_LOC_LIST.length; i++) {
            if(i !==  params.obj.CURRENT_LOC_LIST.length - 1) {
                CURRENT_LOC_LIST_STR = CURRENT_LOC_LIST_STR +  params.obj.CURRENT_LOC_LIST[i].STR + ",";
            } else {
                CURRENT_LOC_LIST_STR = CURRENT_LOC_LIST_STR + params.obj.CURRENT_LOC_LIST[i].STR;
            }
        }  
        var pageNumber = params.obj.pageNumber;
        var pageSize = params.obj.pageSize;
	    var offsetVal = parseInt((pageNumber == 0) ? 0 : (pageNumber * pageSize), 10);
    
    	var connection = $.hdb.getConnection();
    	
    	columnCheckProc = connection.loadProcedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_ext_column_check');    	
        parameter = columnCheckProc(params.obj.COLUMN_FILTERS).PARAMETER;
        
        getTuProc = connection.loadProcedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_get_tu_by_facet_filter_column_filter');
        result_get_tu = getTuProc(params.obj.search, params.id, params.obj.RESOURCE_CATEGORY, parameter,
                EXEC_STATUS_LIST_STR, EQUIP_TYPE_LIST_STR,
                SHIPPER_LIST_STR, CONSIGNEE_LIST_STR,
                SHIPPER_LOC_LIST_STR, CONSIGNEE_LOC_LIST_STR,
                POL_LIST_STR, POD_LIST_STR,
                CURRENT_LOC_LIST_STR);
        
        connection.commit();
        connection.close();
        
        var result_delivered_field = result_get_tu.FILTERED_OUTPUT; 
        var tu_booking_list = result_get_tu.TU_BOOKING_LIST;
        
        var facetFilterResult = getFacetFilterResult(result_get_tu)
 
        //get the final list depending on whether extended column is active or not
        var withExtendedResult = extendedColumnCheckFetchResult(params.id, tu_booking_list, params.obj.COLUMN_FILTERS, pageNumber, pageSize, offsetVal, result_delivered_field)

        return {
                    resultSet : withExtendedResult.final_result,
                    TuIDSet: withExtendedResult.tuIDList,
                    tuCount : withExtendedResult.tuCount,
                    facetFilterResult:facetFilterResult
                }; 
        }
    } catch (e) {
        throw new restLib.InternalError(
                messages.MSG_ERROR_GET_TU_FOR_LOCATION_ASSIGNMENT, e);
    }
};

transportationUnitService.saveSpecialInstruction = function(params) {
    try {
    	var connection = $.hdb.getConnection();
        /*var saveACProc = new procLib.procedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN,
                'p_ext_special_instruction_save' ].join('::'));*/
    	var code={data:[]};
        Object.keys(params.obj.SPECIAL_INSTRUCTION).forEach(function(key){
        	code.data.push({"RESOURCE_ID" : params.obj.SPECIAL_INSTRUCTION[key].RESOURCE_ID, SPECIAL_INSTRUCTION_CODE : params.obj.SPECIAL_INSTRUCTION[key].SPECIAL_INSTRUCTION_CODE});
        })
        var saveACProc = connection.loadProcedure(constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN,'p_ext_special_instruction_save' ].join('::'))
        var result = saveACProc(params.id, params.obj.TU_ID,
                code.data).RESOURCE_INFO;
        connection.commit();
        connection.close();
        return result;
    } catch (e) {
        throw new restLib.InternalError(
                messages.MSG_ERROR_SAVE_SPECIAL_INSTRUCTION, e);
    }
};

transportationUnitService.getAssignedContainers = function(params) {
    try {
    	var connection=$.hdb.getConnection();
        var getACProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_get_assigned_containers' ]
                .join('::'));
        var result = getACProc(params.id, params.obj.transportaionId).RESOURCE_INFO;
        connection.commit();
        connection.close();
        return result;
    } catch (e) {
        throw new restLib.InternalError(
                messages.MSG_ERROR_GET_ASSIGNED_CONTAINERS, e);
    }
};

transportationUnitService.getFinalizeTU = function(params) {
    try {
    	var connection=$.hdb.getConnection();
        var getTUProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_ext_get_tu_for_finalize' ]
                .join('::'));
        var result = getTUProc(params.id, params.obj.TU_IDS);
        var a=[],b=[];
        Object.keys(result.AFFECTED_DATA).map(function(keys){
            a.push(result.AFFECTED_DATA[keys]);
        });
        Object.keys(result.CONTAINER_SPECIAL_INSTRUCTION).map(function(keys){
            b.push(result.CONTAINER_SPECIAL_INSTRUCTION[keys]);
        });
        connection.commit();
        connection.close();
        return {
            FINALIZE_TU : a,
            CONTAINER_SPECIAL_INSTRUCTION : b
        };
    } catch (e) {
        throw new restLib.InternalError(messages.MSG_ERROR_GET_FINALIZE_TU, e);
    }
};

transportationUnitService.assignStreetTurn = function(params) {
    try {
    	var connection=$.hdb.getConnection();
        var assignProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_tu_street_turn_assign' ]
                .join('::'));
        var result = assignProc(params.id, params.obj.TU_IDS, params.obj.STREETTURN_TU_ID);
        logger.success("PR_ASSIGN_STREET_TURN_SUCCESS", params.id);
        connection.commit();
        connection.close();
        return result;
    } catch (e) {
        logger.error("PR_ASSIGN_STREET_TURN_FAILED", params.id, e);
        throw new restLib.InternalError(
                messages.MSG_ERROR_ASSIGN_LOCATION_FOR_TU, e);
    }
};
//todo:: update it once the procedure is ready
transportationUnitService.unassignStreetTurn = function(params) {
    try {
    	var connection=$.hdb.getConnection();
        var assignProc = connection.loadProcedure(constants.SCHEMA_NAME, [
                constants.SP_PKG_PICKUP_RETURN, 'p_tu_street_turn_assign_clear' ]
                .join('::'));
        var result = assignProc(params.id, params.obj.TU_IDS);
        logger.success("PR_UNASSIGN_STREET_TURN_SUCCESS", params.id);
        connection.commit();
        connection.close();
        return result;
    } catch (e) {
        logger.error("PR_UNASSIGN_STREET_TURN_FAILED", params.id, e);
        throw new restLib.InternalError(
                messages.MSG_ERROR_ASSIGN_LOCATION_FOR_TU, e);
    }
};

transportationUnitService.setRoutes([ {
    method : $.net.http.POST,
    scope : 'member',
    action : 'reset',
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'executeDetermination',
    response : $.net.http.OK
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'finalize'
}, {
    method : $.net.http.PUT,
    scope : 'member',
    action : 'editLoc',
    response : $.net.http.OK
}, {
    method : $.net.http.PUT,
    scope : 'member',
    action : 'editDate'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'getSuggestLocations'
},{
    method : $.net.http.POST,
    scope : 'member',
    action : 'getSuggestTU'
},  {
    method : $.net.http.PUT,
    scope : 'member',
    action : 'assign',
    response : $.net.http.OK
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'facetFilter'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'fetchTUs'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'copyToAll'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'getTu'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'saveSpecialInstruction'
}, {
    method : $.net.http.GET,
    scope : 'member',
    action : 'getAssignedContainers'
}, {
    method : $.net.http.POST,
    scope : 'member',
    action : 'getFinalizeTU'
}, {
    method : $.net.http.PUT,
    scope : 'member',
    action : 'assignStreetTurn',
    response : $.net.http.OK
}, {
    method : $.net.http.PUT,
    scope : 'member',
    action : 'unassignStreetTurn',
    response : $.net.http.OK
}]);

var filterObjectList = [ {
    service : [ "finalize" ],
    privilege : "FinalizeTuData"
}, {
    service : [ "editDate", "executeDetermination" ],
    privilege : "EditDateForTU"
}, {
    service : [ "getSuggestLocations" ],
    privilege : "GetSuggestedLocationForTU"
}, {
    service : [ "assign", "executeDetermination" ],
    privilege : "AssignLocationOrDateForTU"
}, {
    service : [ "fetchTUs" ],
    privilege : "FetchTuDataFromTM"
}, {
    service : [ "facetFilter", "executeDetermination" ],
    privilege : "ReadTuData"
}, {
    service : [ "copyToAll" ],
    privilege : "CopyLocationToSelectedTU"
} ]
        .map(
                function(checkPrivInfo) {
                    return {
                        filter : function(params) {
                            var privilege = [ SERVICE_PKG,
                                    checkPrivInfo.privilege ].join("::");

                            if (!$.session.hasAppPrivilege(privilege)) {
                                logger.error("LOC_ASSIGNMENT_UNAUTHORIZED",
                                        privilege);
                                throw new restLib.NotAuthorizedError(privilege);
                            }
                            return true;
                        },
                        only : checkPrivInfo.service
                    }
                })
        .concat(
                [ {
                    filter : function(params) {
                        try {
                        	var conn=$.hdb.getConnection()
                            var procName = PACKAGE
                                    + '::p_status_check_location_rule';
                            var locationRuleCheck = conn.loadProcedure(
                                    SCHEMA, procName);
                            var locationRuleCheckResult = locationRuleCheck(params.id);

                            if (locationRuleCheckResult.MESSAGE !== 'MSG_LOCATION_RULE_VALID') {
                                throw new restLib.InternalError(
                                        locationRuleCheckResult.MESSAGE,
                                        'INVALID');
                            }
                            conn.close();
                            return true;
                        } catch (e) {
                            logger.error("STATUS_CHECK_LOCATION_RULE_FAILED",
                                    params.id,
                                    e);
                            throw e;
                        }
                    },
                    only : [ 'fetchTUs', 'facetFilter', 'assign',
                            'getSuggestLocations', 'editDate', 'editLoc',
                            'finalize', 'executeDetermination', 'reset',
                            'getTu', 'getFinalizeTU', 'saveSpecialInstruction',
                            'getAssignedContainers' ]
                } ,{//check location filter whether is location based
                    filter : function(params) {
                        var locationFilterCheckProc, checkResult;
                        try {
                        	var conn=$.hdb.getConnection();
                            locationFilterCheckProc = conn.loadProcedure(
                                constants.SCHEMA_NAME, [ constants.SP_PKG_PICKUP_RETURN,
                                                         'p_ext_supplydemand_location_filter_check' ].join('::'));
                            checkResult = locationFilterCheckProc(params.id);
                            conn.close();
                            if (checkResult.MESSAGE !== "MSG_SUCCESS_STATUS") {
                                throw new restLib.InternalError(checkResult.MESSAGE);
                            }
                        } catch (e) {
                            if (e instanceof restLib.WebApplicationError) {
                                throw e;
                            }
                            throw new restLib.InternalError(messages.MSG_ERROR_SUPPLYDEMAND_LOCATION_FILTER_CHECK_FAILED, e);
                        }
                       return true;
                    },
                    only : [ 'getSuggestLocations', 'executeDetermination']
                }]);

transportationUnitService.setFilters.apply(transportationUnitService,
        filterObjectList);

try {
    transportationUnitService.handle();
} finally {
    logger.close();
}
