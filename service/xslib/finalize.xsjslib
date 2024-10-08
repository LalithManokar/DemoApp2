var model = $.import('/sap/tm/trp/service/model/pickupreturn.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var util = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remoteAsync.xsjslib").RemoteClient;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN;
var SERVICE_PKG = "sap.tm.trp.service";

var pathPrefix = '/sap/bc/rest_trp/chgloc';

function transferDateToTmTimeStr(dateObj) {
	var fixLengthStr = function(num, length) {
		var numStr = num.toString();
		while (numStr.length < length) {
			numStr = '0' + numStr;
		}
		return numStr;
	};

	return (
		dateObj.getUTCFullYear() +
		fixLengthStr(dateObj.getUTCMonth() + 1, 2) +
		fixLengthStr(dateObj.getUTCDate(), 2) +
		fixLengthStr(dateObj.getUTCHours(), 2) +
		fixLengthStr(dateObj.getUTCMinutes(), 2) +
		fixLengthStr(dateObj.getUTCSeconds(), 2)
	);
}

function formatTuInput(tuList, runId, startTime) {
              tuList = tuList || [];
              var formatList = [];
              var beforeLoc, newLoc, beforeTime, newTime;

              for (var item in tuList) {
                            var affectedRow = tuList[item];
                            var obj = {};
                            
                            var ORIGINAL_PICKUP_DATE = affectedRow.ORIGINAL_PICKUP_DATE ? new Date(affectedRow.ORIGINAL_PICKUP_DATE.getTime() - affectedRow.ORIGINAL_PICKUP_DATE.getTimezoneOffset() * 60 * 1000) : null;
                            var ORIGINAL_RETURN_DATE = affectedRow.ORIGINAL_RETURN_DATE ? new Date(affectedRow.ORIGINAL_RETURN_DATE.getTime() - affectedRow.ORIGINAL_RETURN_DATE.getTimezoneOffset() * 60 * 1000) : null;
                            var PICKUP_DATE = affectedRow.PICKUP_DATE ? new Date(affectedRow.PICKUP_DATE.getTime() - affectedRow.PICKUP_DATE.getTimezoneOffset() * 60 * 1000) : null;
                            var RETURN_DATE = affectedRow.RETURN_DATE ? new Date(affectedRow.RETURN_DATE.getTime() - affectedRow.RETURN_DATE.getTimezoneOffset() * 60 * 1000) : null;

                            beforeLoc = affectedRow.RULE_TYPE === 1 ? affectedRow.ORIGINAL_PICKUP_LOCATION : affectedRow.ORIGINAL_RETURN_LOCATION;
                            newLoc = affectedRow.RULE_TYPE === 1 ? affectedRow.PICKUP_LOCATION : affectedRow.RETURN_LOCATION;
                            beforeTime = affectedRow.RULE_TYPE === 1 ? ORIGINAL_PICKUP_DATE : ORIGINAL_RETURN_DATE;
                            newTime = affectedRow.RULE_TYPE === 1 ? PICKUP_DATE : RETURN_DATE;

                            obj.BEFORE_LOC_NO = beforeLoc;
                            obj.NEW_LOC_NO = newLoc;
                            //obj.TU_UUID = util.hexToBase64(affectedRow.TU_UUID);
                            obj.TR_TU_UUID = affectedRow.TR_TU_UUID;
                            obj.TU_UUID = affectedRow.TU_UUID;
                            obj.BEFORE_TIME = transferDateToTmTimeStr(new Date(beforeTime.toUTCString()));
                            obj.NEW_TIME = transferDateToTmTimeStr(new Date(newTime.toUTCString()));
                            
                            obj.RULE_ID = affectedRow.RULE_ID.toString();
                            obj.TU_ID = affectedRow.TRANSPORTATION_ID;
                            obj.USER = affectedRow.USER;
                            obj.RUN_ID = runId;
                            obj.RULE_NAME = affectedRow.RULE_NAME;
                            obj.TIMESTAMP = transferDateToTmTimeStr(startTime);
                            obj.EXECUTION_ID = "";
                            
                            formatList.push(obj);
              }

              return formatList;
}

function formatReInput(tuList1, ruleId, runIdName) {
    tuList1 = tuList1 || [];
    var formatList1 = [];

    for (var item in tuList1) {
                  var affectedRow = tuList1[item];
                  var obj = {};

                  obj.RESOURCE_ID = affectedRow.RESOURCE_ID;
                  obj.SPECIAL_INSTRUCTION_CODE = affectedRow.SPECIAL_INSTRUCTION_CODE;
                  obj.TU_ID = affectedRow.TRANSPORTATION_ID;
                  obj.RULE_ID = ruleId;
                  obj.RUN_ID = runIdName;

                  formatList1.push(obj);
    }

    return formatList1;
}

function execute(ruleId, tu_ids, resourceCategory, logger, conn) {
	if (!logger) {
		logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
		logger.internal = true;
	}

	try {
		var connection = $.hdb.getConnection();
	    var writeLogProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_scheduling_trace_create');
        var getAffectedTuListProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_ext_get_tu_for_finalize_add_street_turn');
		var startTime = new Date();
		var endTime = null;
		var runIdName = "LocationRule_" + ruleId + "_Finalize_" + transferDateToTmTimeStr(startTime);
		if (!tu_ids) {
			tu_ids = {};
		}
		var tuIdsString = "";
        for (var i = 0; i < tu_ids.length; i++) {
        if(i !== tu_ids.length - 1) {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID + ",";
        } else {
            tuIdsString = tuIdsString + tu_ids[i].TU_ID;
        }
        }
		var getTuResult = getAffectedTuListProc(ruleId, tuIdsString, runIdName);
		var result={
				affectedTuList:[],
			    containerSpecialInstruction:[]
			};

		var row1=[],row2;
		for (i = 0; i< getTuResult.AFFECTED_DATA.length; i++ ) {
	    row1=Object.assign({},getTuResult.AFFECTED_DATA[i]);
	    result.affectedTuList[i]=row1;
	    }

	    for (i = 0; i< getTuResult.CONTAINER_SPECIAL_INSTRUCTION.length; i++ ) {
	    row2 = getTuResult.CONTAINER_SPECIAL_INSTRUCTION[i];
	    result.containerSpecialInstruction.push(row2);
	    }

		logger.info("LOC_ASSIGNMENT_GET_TU_FOR_FINALIZE", ruleId, result.affectedTuList);
		var finalizeProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_ext_location_assignment_finalize');
		
		//Call the TM service
		var tmStart = new Date();

		var TotalTuList, successTuList, errorTuList;
		var errorResponse;

		var settings = {
			url: pathPrefix,
			method: $.net.http.POST,
			data: {
				TU: formatTuInput(result.affectedTuList, runIdName, startTime),
				RESOURCE: formatReInput(result.containerSpecialInstruction, ruleId, runIdName)
			},
			success: function(data) {
			    successTuList = result.affectedTuList;
			},
			error: function(data) {
    			errorTuList = result.affectedTuList;
    			var h;
                for (h = 0; h < data.headers.length; ++h) {
                    if (data.headers[h].name === "~status_reason") {
                        errorResponse = data.headers[h].value;
                    }
                }
			}
		};

		var remote = new RemoteClient();
		remote.request(settings);

		//logger.success("LOC_ASSIGNMENT_GET_TOTAL_TU_LIST_FROM_TM", TotalTuList);
        logger.success("LOC_ASSIGNMENT_SEND_TU_TO_TM_FOR_PROCESSING", TotalTuList);
		var tmTime = new Date() - tmStart; //new Date();

		var dbStart = new Date();
		//Write the DB
		var errorFinalize = [];
		var finalizeList = [];
		for (var i in successTuList) {
			var obj = {};
			obj.TU_ID = successTuList[i].TRANSPORTATION_ID;
			finalizeList.push(obj);
		}
		var result;
		try {
			var finalizeListtuIdsString = "";
            for (var i = 0; i < finalizeList.length; i++) {
            if(i !== tu_ids.length - 1) {
                finalizeListtuIdsString = finalizeListtuIdsString + finalizeList[i].TU_ID + ",";
            } else {
                finalizeListtuIdsString = finalizeListtuIdsString + finalizeList[i].TU_ID;
            }
            }
			result = finalizeProc(ruleId, finalizeListtuIdsString, runIdName).STATUS;

			if (result !== "SUCCESS") {
				logger.error(
					"LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_FAILED",
					affectedRow.TRANSPORTATION_ID
				);
				for (var j in successTuList) {
					var o = {};
					//o.KEY = successTuList[j].TRANSPORTATION_ID;
					o.TEXT = 'LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_FAILED';
					o.INSTANCE_KEY = successTuList[j].TRANSPORTATION_ID;
					o.SEVERITY = 'SERVERITY';
					//o.TMP_ID = successTuList[j].TRANSPORTATION_ID;
					errorFinalize.push(o);
				}
			} else {
				logger.success(
					"LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL",
					''
				);
			}
		} catch (e) {
			logger.error(
				"LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_FAILED",
				'',
				e.message
			);
			for (var j in successTuList) {
				var o = {};
				//o.KEY = successTuList[j].TRANSPORTATION_ID;
				o.TEXT = 'LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_FAILED';
				o.INSTANCE_KEY = successTuList[j].TRANSPORTATION_ID;
				o.SEVERITY = 'SERVERITY';
				//o.TMP_ID = successTuList[j].TRANSPORTATION_ID;
				errorFinalize.push(o);
			}
		}

		//if (errorFinalize.length > 0) {
			//TotalTuList.error.push(errorFinalize);
		//} 

		//var errorTuList = TotalTuList.error;
		var errorMsgList = [];

		var errorInput = [];
		for (var e in errorTuList) {
			var obj = {};
			obj.TU_ID = errorTuList[e].TRANSPORTATION_ID;
			obj.MSG = errorResponse;
			errorInput.push(obj);
			errorMsgList.push(errorTuList[e].TRANSPORTATION_ID + ": " + errorResponse );
		}

		var recordFinalizeErrorProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_ext_location_assignment_finalize_record_error');
    	var errorInputString = "";
          for (var i = 0; i < errorInput.length; i++) {
              if (errorInput[i].TU_ID === "")     { errorInput[i].TU_ID = ' '; }
              if (errorInput[i].MSG === "")       { errorInput[i].MSG = ' '; }

              if (i !== errorInput.length - 1) {
                  errorInputString = errorInputString +   errorInput[i].TU_ID + "," + 
                                                        errorInput[i].MSG + "~";
              } else {
                  errorInputString = errorInputString + errorInput[i].TU_ID + "," + 
                                                      errorInput[i].MSG; 
              }
          }    
        recordFinalizeErrorProc(ruleId, errorInputString, runIdName);

		var dbTime = new Date() - dbStart;

		var resultStatus = errorMsgList.length > 0 ? -1 : 1;
		var resultErrorMessage = errorMsgList.join("\n");
		resultErrorMessage = resultErrorMessage.substring(0,2000);//truncate error message to avoid db error
		
		//Write the Log
		endTime = new Date();
		writeLogProc(
			runIdName,
			ruleId,
			startTime,
			endTime,
			resultStatus,
			resultErrorMessage
		);

		//clear the existing location
		var clearProc = connection.loadProcedure('SAP_TM_TRP','sap.tm.trp.db.pickupreturn::p_tu_location_clear');
		var clearProcResult = clearProc(ruleId, resourceCategory);
		if (clearProcResult.TOTAL_COUNT > 0) {
			//write log here
		}
		connection.commit();
        connection.close();
		return {
			STATUS: resultStatus,
			RUN_ID: runIdName,
			tmTime: tmTime,
			dbTime: dbTime
		};
	} finally {
		if (logger.internal) {
			logger.close();
		}
	}
}
