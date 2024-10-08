var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var RemoteClient = $.import("/sap/tm/trp/service/xslib/remoteAsync.xsjslib").RemoteClient;
var finalizeTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/finalizeTU/executor.xsjob';
var rulesetGroupExecRunDelete = $.import('/sap/tm/trp/service/xslib/rulesetGroupExecRunDelete.xsjslib').execute;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");
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
			dateObj.getFullYear() +
			fixLengthStr(dateObj.getMonth() + 1, 2) +
			fixLengthStr(dateObj.getDate(), 2) +
			fixLengthStr(dateObj.getHours(), 2) +
			fixLengthStr(dateObj.getMinutes(), 2) +
			fixLengthStr(dateObj.getSeconds(), 2)
	);
}

function transferDateToTmTimeStr1(dateObj) {
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

function formatTuInput(tuList,startTime1,executionId) {
	tuList = tuList || [];
	var formatList = [];
	var beforeLoc, newLoc, beforeTime, newTime;

	for (var item in tuList) {
		var affectedRow = tuList[item];
		var obj = {};

		beforeLoc = affectedRow.RULE_TYPE === 1 ? affectedRow.ORIGINAL_PICKUP_LOCATION : affectedRow.ORIGINAL_RETURN_LOCATION;
		newLoc = affectedRow.RULE_TYPE === 1 ? affectedRow.PICKUP_LOCATION : affectedRow.RETURN_LOCATION;
		beforeTime = affectedRow.RULE_TYPE === 1 ? affectedRow.ORIGINAL_PICKUP_DATE : affectedRow.ORIGINAL_RETURN_DATE;
		newTime = affectedRow.RULE_TYPE === 1 ? affectedRow.PICKUP_DATE : affectedRow.RETURN_DATE;

		obj.BEFORE_LOC_NO = beforeLoc;
		obj.NEW_LOC_NO = newLoc;
		obj.TR_TU_UUID = affectedRow.TR_TU_UUID;
		obj.TU_UUID = affectedRow.TU_UUID;
		obj.BEFORE_TIME = transferDateToTmTimeStr(new Date(beforeTime.toUTCString()));
		obj.NEW_TIME = transferDateToTmTimeStr(new Date(newTime.toUTCString()));
		obj.RULE_ID = parseInt(affectedRow.RULE_ID).toString();
		obj.TU_ID = affectedRow.TRANSPORTATION_ID;
		obj.USER = affectedRow.USER;
		obj.RUN_ID = affectedRow.RUN_ID;
		obj.RULE_NAME = affectedRow.RULE_NAME;
		obj.TIMESTAMP = transferDateToTmTimeStr1(startTime1);
		obj.EXECUTION_ID = executionId;

		formatList.push(obj);
	}

	return formatList;
}

function formatReInput(tuList1) {
	tuList1 = tuList1 || [];
	var formatList1 = [];

	for (var item in tuList1) {
		var affectedRow = tuList1[item];
		var obj = {};

		obj.RESOURCE_ID = affectedRow.RESOURCE_ID;
		obj.SPECIAL_INSTRUCTION_CODE = affectedRow.SPECIAL_INSTRUCTION_CODE;
		obj.TU_ID = affectedRow.TRANSPORTATION_ID;
		obj.RULE_ID = affectedRow.RULE_ID;
		obj.RUN_ID = affectedRow.RUN_ID;

		formatList1.push(obj);
	}

	return formatList1;
}

function execute(ruleGroupId, executionId, conn) {   //Max size of one record is 0.6KB, Average size of one record is 0.3KB

	if (!conn) {
		conn = $.hdb.getConnection();		
	}
conn.setAutoCommit(false);
try {
	var getAffectedTuListProc = conn.loadProcedure(
			constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup', 'p_ext_get_tu_for_finalize_add_street_turn_rulegroup'].join('::'));
	var finalizeProc = conn.loadProcedure(
			constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup', 'p_ext_location_assignment_finalize_rulegroup'].join('::'));
	var startTime1 = new Date();
	var startTime = startTime1.getUTCFullYear() + '-' +
	('00' + (startTime1.getUTCMonth()+1)).slice(-2) + '-' +
	('00' + startTime1.getUTCDate()).slice(-2) + ' ' + 
	('00' + startTime1.getUTCHours()).slice(-2) + ':' + 
	('00' + startTime1.getUTCMinutes()).slice(-2) + ':' + 
	('00' + startTime1.getUTCSeconds()).slice(-2);
	var endTime = null;
	var getTuResult = getAffectedTuListProc(ruleGroupId, executionId, startTime);
	var countAffectedTuList = getTuResult.COUNT_AFFECTED_DATA;
	var countContainerSpecialInstruction = getTuResult.COUNT_CONTAINER_SPECIAL_INSTRUCTION;
	logger.info("LOC_ASSIGNMENT_GET_TU_FOR_FINALIZE_SCHEDULED", ruleGroupId, countAffectedTuList);
	
	//slicing of payload by packet size
	var sqlRecordIsLimited =
		"SELECT VALUE FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" WHERE NAME = 'PICKUP_RETURN_PACKET_SIZE'";
	var recordIsLimited = conn.executeQuery(sqlRecordIsLimited);
	if (typeof(recordIsLimited[0]) != 'undefined') {
		var recordsLimit = parseInt(recordIsLimited[0].VALUE);
		if (recordsLimit > 0) {
			var iterationNumber = Math.ceil(Math.max(countAffectedTuList, countContainerSpecialInstruction) / recordsLimit);
		} else {
			var defaultRecords = Math.max(countAffectedTuList, countContainerSpecialInstruction);
			if (defaultRecords > 0) {
				var iterationNumber = 1;
				recordsLimit = defaultRecords;
			} else {
				var iterationNumber = 0;
			}
		}
	} else {
		var defaultRecords = Math.max(countAffectedTuList, countContainerSpecialInstruction);
		if (defaultRecords > 0) {
			var iterationNumber = 1;
			recordsLimit = defaultRecords;
		} else {
			var iterationNumber = 0;
		}
	}
	
	var remote = new RemoteClient();

	var tmStart = new Date();
	var successTuList=[]; 
	var errorTuList = [];
	var i;
	//packaging
	if (iterationNumber>0) {
		for(i = 1; i <= iterationNumber; i++){			
			var offset = (i-1) * recordsLimit;	
			var sqlQuery1 = "SELECT * FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pickupreturn.rulesetgroup::t_finalize_affected_tu_temp_rulegroup\" limit ? offset ?";
			var sqlQuery2 = "SELECT * FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pickupreturn.rulesetgroup::t_finalize_resource_special_instruction_temp_rulegroup\" limit ? offset ?";
			var affectedTuList = conn.executeQuery(sqlQuery1,recordsLimit,offset);
			var containerSpecialInstruction = conn.executeQuery(sqlQuery2,recordsLimit,offset);
			var settings = {
					url: pathPrefix,
					method: $.net.http.POST,
					data: {
						TU: formatTuInput(affectedTuList,startTime1,executionId),
						RESOURCE: formatReInput(containerSpecialInstruction)
					},
					success: function(data) {
						successTuList = affectedTuList;
					},
					error: function(data) {
						errorTuList = affectedTuList;
					}
			};
			//call to TM sync	
			remote.request(settings);

			if (errorTuList.length==0){
				logger.success("LOC_ASSIGNMENT_SEND_TU_TO_TM_FOR_PROCESSING_SCHEDULED", successTuList, i);

				var finalizeList = [];
				for (var j in successTuList) {
					var obj = {};
					obj.TU_ID = successTuList[j].TRANSPORTATION_ID;
					finalizeList.push(obj);
				}
				//update sent TU to history table
				finalizeProc(ruleGroupId, executionId, finalizeList, startTime);
				conn.commit();
			} 
			else {
				logger.error("LOC_ASSIGNMENT_SEND_TU_TO_TM_FOR_PROCESSING_SCHEDULED_FAIL", errorTuList, i);	
			}} }//end of send to TM

	else {
		conn.commit();	
	}

	logger.success("LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_SCHEDULED");

	var resultStatus = 1;
	var tmTime = new Date() - tmStart;
	var dbStart = new Date();
} catch (e) {
	conn.rollback();
	logger.error(
			"LOC_ASSIGNMENT_WRITEBACK_TU_TO_RESULT_TBL_FAILED_SCHEDULED",e.message);
	resultStatus = -1;
}

finally {
	var dbTime = new Date() - dbStart;

	logger.success("LOC_ASSIGNMENT_FINALIZE_PROCESS_STAT_SCHEDULED",resultStatus,executionId,tmTime,dbTime);

	rulesetGroupExecRunDelete(ruleGroupId, conn, logger);
	logger.success("PR_DELETE_RULESET_GROUP_EXEC_RUNS_SUCCEED", ruleGroupId);
	conn.commit();
	conn.close();
	if (logger.internal) {
		logger.close();
	}	
}
}


function run(params) {
	var job, schedule, parameters, eventId = {};
	var status_running = "RUNNING";

	parameters = {};
	//set the next schedule
	parameters.scheduleType = params.SCHEDULE_TYPE;
	parameters.startTime = params.START_TIME;
	parameters.expiryTime = params.EXPIRE_TIME;

	parameters.recurrence = params.RECURRENCE;
	parameters.modelId = params.MODEL_ID;
	parameters.xsJob = finalizeTUJob;
	parameters.connSqlcc = params.CONN_SQLCC;
	parameters.jobSqlcc = params.JOB_SQLCC;
	parameters.resourceCategory = params.RESOURCE_CATEGORY;

	if(params.hasOwnProperty("EXECWORKHOUR")){
		parameters.execWorkHour = params.EXECWORKHOUR;
	}

	if(params.hasOwnProperty("STARTWORKHOUR")){
		parameters.startWorkHour = params.STARTWORKHOUR;
	}

	if(params.hasOwnProperty("ENDWORKHOUR")){
		parameters.endWorkHour = params.ENDWORKHOUR;
	}

	if(params.hasOwnProperty("TIMEZONE")){
		parameters.timezone = params.TIMEZONE;
	}





	var conn = $.hdb.getConnection();

	//create next schedule
	job = new jobManager.Job(parameters);
	schedule = new job.schedule()
	eventId = schedule.currentScheduleId();
	schedule.next();     


	// check if any schedule for the job is already running, If schedule is running, do not run the current job

	try {
		var sql = "SELECT B.ID FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.job::t_job_schedule\" A INNER JOIN \"_SYS_XS\".\"JOB_LOG\" B ON A.SCHEDULE_ID = B.ID WHERE A.SCHEDULE_TYPE = ? AND A.MODEL_ID = ? AND B.STATUS =?";
		var rs = conn.executeQuery(sql,  params.SCHEDULE_TYPE, params.MODEL_ID, status_running);
		if (rs.length === 1) {    //no schedule running

			execute(params.MODEL_ID, parseInt(eventId),conn);
		}
		conn.close();
	} catch (e) {
		conn.close();
	}
}