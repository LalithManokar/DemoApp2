var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var utils = $.import("/sap/tm/trp/service/massupload/utils.xsjslib");
var planLib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagementForUpload.xsjslib");
var csvErrorList = [];
csvParser.setLineSeparator(csvParser.LINE_SEPARATOR_WINDOWS);
csvParser.setSeparator(",");

// csv's check error message according to the database
var csvMessage = function(msgCode, rowIndex, colIndex) {
    return {
        REASON_CODE : msgCode,
        ROW_INDEX : rowIndex,
        COL_INDEX : colIndex
    };
};

var parseCSVFiles = function(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "supply_demand_plan.csv");
    } catch (e) {
        logger.error("SUPPLY_DEMAND_PLAN_FILE_ANTIVIRUS_FAILED",
                'Supply And Demand Plan', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("SUPPLY_DEMAND_PLAN_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    var DataSet = [], content = [], i, j, obj, visibilityName;
    for (i = 0; i < data.length; i++) {
        content = data[i];

        for(j = 0; j < 22; j++) {
        	if(typeof content[j] === 'string') {
        		content[j] = content[j].trim();
        	}
        }

        if (content.length !== 22) {
            logger.error("SUPPLY_DEMAND_PLAN_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Supply And Demand Plan', i, content.length, 21);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [21]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        if (content[0] === '' || content[0] === null){
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_NAME_IS_MANDATORY',
                    obj.ROW_INDEX, 1));
        }else if (utils.NotValidNameCheck(content[0])){
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_NAME_INVALID',
                    obj.ROW_INDEX, 1));
        }else {
        	obj.NAME = content[0].toUpperCase(); //Schedule S&D Plan name
        }

        if (content[1].length > 40){
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_DESC_GE_40',
                    obj.ROW_INDEX, 2));
        }else {
        	obj.DESCRIPTION = content[1];
        }

        if (content[2] !== 'Supply and Demand Plan' && content[2] !== 'Scheduled Supply and Demand Plan') {
        	csvErrorList.push(csvMessage('PLAN_TYPE_INVALID',
                    obj.ROW_INDEX, 3));
        	obj.TYPE_NAME = null;
        } else {
            //obj.TYPE_NAME = content[2];
            obj.TYPE_NAME = 'Supply and Demand Plan';
        }

        if (content[3].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_LOC_FLT_GE_20',
                    obj.ROW_INDEX, 4));
        	// give the default value in case the dberror when do validation
        	obj.LOCATION_FILTER_NAME = content[3].substring(0, 20);
        } else {
            obj.LOCATION_FILTER_NAME = content[3];
        }

        if (content[4].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_RES_FLT_GE_20',
                    obj.ROW_INDEX, 5));
        	// give the default value in case the dberror when do validation
        	obj.RESOURCE_FILTER_NAME = content[4].substring(0, 20);
        } else {
            obj.RESOURCE_FILTER_NAME = content[4];
        }

        if (content[5].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_TIME_FLT_GE_20',
                    obj.ROW_INDEX, 6));
        	// give the default value in case the dberror when do validation
        	obj.TIME_FILTER_NAME = content[5].substring(0, 20);
        } else {
            obj.TIME_FILTER_NAME = content[5];
        }

        if (content[6].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_CALC_MODEL_GE_20',
                    obj.ROW_INDEX, 7));
        	// give the default value in case the dberror when do validation
        	obj.CALCULATION_MODEL_NAME = content[6].substring(0, 20);
        } else {
            obj.CALCULATION_MODEL_NAME = content[6];
        }

        if (content[7].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_ALERT_RULE_GRP_GE_20',
                    obj.ROW_INDEX, 8));
        	// give the default value in case the dberror when do validation
        	obj.ALERT_RULE_GROUP_NAME = content[7].substring(0, 20);
        } else {
            obj.ALERT_RULE_GROUP_NAME = content[7];
        }

        if (content[8].length > 20) {
        	csvErrorList.push(csvMessage('SCHE_SUPP_DMND_PLAN_MLT_ATTR_FLT_GE_20',
                    obj.ROW_INDEX, 9));
        	// give the default value in case the dberror when do validation
        	obj.ATTRIBUTE_GROUP_NAME = content[8].substring(0, 20);
        } else {
            obj.ATTRIBUTE_GROUP_NAME = content[8];
        }
        

        // scheduling
        var schedulingFlag = true;
        if((!content[9]||content[9]==="")&&(!content[12]||content[12]==="")&&(!content[13]||content[13]==="")&&(!content[18]||content[18]==="")&&(!content[21]||content[21]==="")){
        	schedulingFlag = false;
        	obj.RECURRENCE_TYPE = '';
        	obj.RECURRENCE_DAY = null;
        	obj.RECURRENCE_INTERVAL = null;
        	obj.START_TIME = '';
        	obj.EXPIRY_TIME = '';
        	obj.EXECUTE_IN_WORKING_HOUR = '';
        	obj.START_WORKING_TIME = '';
        	obj.END_WORKING_TIME = '';
        	obj.TIMEZONES = '';
        }
//        if(content[9]!==""&&content[10]!==""&&content[11]!==""&&content[12]!==""&&content[13]!==""
//        	&&content[18]!==""&&content[19]!==""&&content[20]!==""&&content[21]!==""){
//        	schedulingFlag = true;
//        }
        
        if(schedulingFlag){
            switch (content[9].toUpperCase()){
               case 'MONTHS':
            	   obj.RECURRENCE_TYPE = 'MONTH';

            	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 31){
            		  csvErrorList.push(csvMessage('DAY_OF_MONTH_INVALID', obj.ROW_INDEX, 12));
                      obj.RECURRENCE_DAY = null;
            	   }else{
            		  obj.RECURRENCE_DAY = content[11]; // Executed on
            	   }

            	   if (utils.NotNumberCheck(content[10]) || content[10] <=0 || content[10] > 99 ){
                       csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                               obj.ROW_INDEX, 11));
                       // give the default value in case the dberror when upload
    				   // check
                       obj.RECURRENCE_INTERVAL = 0;
                   } else {
                	   obj.RECURRENCE_INTERVAL = content[10]; // Execute Every
                   }

            	   break;
               case 'WEEKS':
            	   obj.RECURRENCE_TYPE = 'WEEK';
            	   switch (content[11].toUpperCase()){
            	    case 'SUNDAY': obj.RECURRENCE_DAY = 0; break;
            	    case 'MONDAY': obj.RECURRENCE_DAY = 1; break;
            	    case 'TUESDAY': obj.RECURRENCE_DAY = 2; break;
            	    case 'WEDNESDAY': obj.RECURRENCE_DAY = 3; break;
            	    case 'THURSDAY': obj.RECURRENCE_DAY = 4; break;
            	    case 'FRIDAY': obj.RECURRENCE_DAY = 5; break;
            	    case 'SATURDAY': obj.RECURRENCE_DAY = 6; break;
            	    default:
            	      csvErrorList.push(csvMessage('DAY_OF_WEEK_INVALID', obj.ROW_INDEX, 12));
                      obj.RECURRENCE_DAY = null;
            	   }

            	   if (utils.NotNumberCheck(content[10]) || content[10] <=0 || content[10] > 99 ){
                       csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                               obj.ROW_INDEX, 11));
                       // give the default value in case the dberror when upload
    					// check
                       obj.RECURRENCE_INTERVAL = 0;
                   } else {
                   	obj.RECURRENCE_INTERVAL = content[10]; // Execute Every
                   }

            	   break;
               case 'DAYS':
            	   obj.RECURRENCE_TYPE = 'DAY';
            	   if (utils.NotNumberCheck(content[10]) || content[10] <=0 || content[10] > 99 ){
                       csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                               obj.ROW_INDEX, 11));
                       // give the default value in case the dberror when upload
    					// check
                       obj.RECURRENCE_INTERVAL = 0;
                   } else {
                   	obj.RECURRENCE_INTERVAL = content[10]; // Execute Every
                   }

            	   obj.RECURRENCE_DAY = null;
            	   break;
               case 'HOURS':
            	   obj.RECURRENCE_TYPE = 'HOUR';
            	   if (utils.NotNumberCheck(content[10]) || content[10] <=0 || content[10] > 23 ){
                       csvErrorList.push(csvMessage('HOUR_INVALID_RECURRENCE_INTERVAL',
                               obj.ROW_INDEX, 11));
                       // give the default value in case the dberror when upload
    					// check
                       obj.RECURRENCE_INTERVAL = 0;
                   } else {
                   	obj.RECURRENCE_INTERVAL = content[10]; // Execute Every
                   }

            	   obj.RECURRENCE_DAY = null;
            	   break;
               case 'MINUTES':
            	   obj.RECURRENCE_TYPE = 'MINUTE';
            	   if (utils.NotNumberCheck(content[10]) || content[10] <=0 || content[10] > 59 ){
                       csvErrorList.push(csvMessage('MINUTE_INVALID_RECURRENCE_INTERVAL',
                               obj.ROW_INDEX, 11));
                       // give the default value in case the dberror when upload
    					// check
                       obj.RECURRENCE_INTERVAL = 0;
                   } else {
                   	obj.RECURRENCE_INTERVAL = content[10]; // Execute Every
                   }

             	   obj.RECURRENCE_DAY = null;
             	   break;
             default:
            	 csvErrorList.push(csvMessage('RECURRENCE_TYPE_INVALID',
                         obj.ROW_INDEX, 10));
                 obj.RECURRENCE_TYPE = '';
            }

            if (utils.NotDatetimeCheck(content[12])){
                csvErrorList.push(csvMessage('START_TIME_INVALID',
                        obj.ROW_INDEX, 13));
                // give the default value in case the dberror when upload check
                obj.START_TIME = null;
            } else {
                obj.START_TIME = content[12] || null;
            }

            if (utils.NotDatetimeCheck(content[13])){
                csvErrorList.push(csvMessage('EXPIRY_TIME_INVALID',
                        obj.ROW_INDEX, 14));
                // give the default value in case the dberror when upload check
                obj.EXPIRY_TIME = null;
            } else {
                obj.EXPIRY_TIME = content[13] || null;
            }

            if(obj.START_TIME != null && obj.EXPIRY_TIME != null) {
            	if(utils.CompareDatetime(obj.START_TIME, obj.EXPIRY_TIME) < 2) {
            		csvErrorList.push(csvMessage('START_TIME_GE_EXPIRY_TIME',
                            obj.ROW_INDEX, 13));
            	}
            }
        }

        if (utils.NotValidVisibilityCheck(content[14])){
            csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 15));
            // give the default value in case the dberror when upload check
            obj.VISIBILITY_FLAG = 0;
        } else {
        	visibilityName = content[14].toUpperCase();
        	if(visibilityName === 'GLOBAL') {
        		obj.VISIBILITY_FLAG = 1;
        	} else {
        		obj.VISIBILITY_FLAG = 0;
        	}
        }

        obj.KEEP_EXECUTION_RUNS = null;

        if (utils.NotValidKeepExecRunsCheck(content[15])){
        	csvErrorList.push(csvMessage('EXECUTION_RUNS_VALIDATE_RANGE',
                    obj.ROW_INDEX, 16));
        }else{
        	if( content[15] !== '' && content[15] !== null){
        		obj.KEEP_EXECUTION_RUNS = content[15];
        	}
        }

        if (content[16].length > 40) {
        	csvErrorList.push(csvMessage('PLAN_USAGE_GE_40',
                    obj.ROW_INDEX, 17));
        	// give the default value in case the dberror when do validation
        	obj.PLAN_USAGE = content[16].substring(0, 40);
        } else {
            obj.PLAN_USAGE = content[16];
        }

        if (content[17].toUpperCase() !== 'YES' && content[17].toUpperCase() !== 'NO') {
        	csvErrorList.push(csvMessage('DISABLE_INTERMEDIATE_NODE_INVALID',
                    obj.ROW_INDEX, 18));
        	// give the default value in case the dberror when do validation
        	obj.DISABLE_INTERMEDIATE_NODE = '';
        } else {
        	if(content[17].toUpperCase() === 'YES') {
        		obj.DISABLE_INTERMEDIATE_NODE = 'X';
        	} else {
        		obj.DISABLE_INTERMEDIATE_NODE = '';
        	}
        }

        if(schedulingFlag){
            if(content[9].toUpperCase() === 'HOURS' || content[9].toUpperCase() === 'MINUTES') {
    	        if (content[18].toUpperCase() !== 'YES' && content[18].toUpperCase() !== 'NO') {
    	        	csvErrorList.push(csvMessage('EXECUTE_IN_WORKING_HOUR_NODE_INVALID',
    	                    obj.ROW_INDEX, 19));
    	        	// give the default value in case the dberror when do validation
    	        	obj.EXECUTE_IN_WORKING_HOUR = '';
    	        } else {
    	        	if(content[18].toUpperCase() === 'YES') {
    	        		obj.EXECUTE_IN_WORKING_HOUR = 'X';
    	        	} else {
    	        		obj.EXECUTE_IN_WORKING_HOUR = '';
    	        	}
    	        }

    	        // Only assign the START_WORKING_TIME & END_WORKING_TIME when EXECUTE_IN_WORKING_HOUR = 'YES'
    	        if(content[18].toUpperCase() === 'YES') {
    		        if (utils.NotValidHourMinCheck(content[19])){
    		            csvErrorList.push(csvMessage('START_WORKING_TIME_INVALID',
    		                    obj.ROW_INDEX, 20));
    		            // give the default value in case the dberror when upload check
    		            obj.START_WORKING_TIME = null;
    		        } else {
    		            obj.START_WORKING_TIME = content[19] + ':00' || null;
    		        }

    		        if (utils.NotValidHourMinCheck(content[20])){
    		            csvErrorList.push(csvMessage('END_WORKING_TIME_INVALID',
    		                    obj.ROW_INDEX, 21));
    		            // give the default value in case the dberror when upload check
    		            obj.END_WORKING_TIME = null;
    		        } else {
    		            obj.END_WORKING_TIME = content[20] + ':00' || null;
    		        }

    		        if(obj.START_WORKING_TIME === obj.END_WORKING_TIME) {
    		        	csvErrorList.push(csvMessage('START_WORKING_TIME_EQ_END_WORKING_TIME',
    		                    obj.ROW_INDEX, 20));
    		        }
    	        }
            } else {
            	if(content[18].toUpperCase() === 'YES') {
            		csvErrorList.push(csvMessage('EXECUTE_IN_WORKING_HOURS_NOT_RELEVANT',
    	                    obj.ROW_INDEX, 19));
            	} else {
            		obj.EXECUTE_IN_WORKING_HOUR = '';
            	}
            }

            if (content[21].length > 40) {
            	csvErrorList.push(csvMessage('TIMEZONES_40',
                        obj.ROW_INDEX, 22));
            	// give the default value in case the dberror when do validation
            	obj.TIMEZONES = content[21].substring(0, 40);
            } else {
                obj.TIMEZONES = content[21];
            }
        }

        DataSet.push(obj);
    }
    return DataSet;
};

var checkSupplyDemandPlanName = function() {
    return "p_supply_demand_plan_upload_validate";
};

var saveSupplyDemandPlanName = function() {
    return "p_supply_demand_plan_save";
};

var uploadSupplyDemandPlanName = function() {
    return "p_supply_demand_plan_upload";
};

var cleanSupplyDemandPlanName = function() {
    return "p_supply_demand_plan_temporary_data_clean";
};

var upsertSchedules = function(createResults) {
	var array = [];
    for(var i=0; i<createResults.length; i++) {
        var createResult = createResults[i];
        var parameters = {
            xsJob : planLib.xsJob,
            scheduleType : planLib.SCHEDULE_TYPE,
            startTime : createResult.START_TIME,
            expiryTime : createResult.EXPIRY_TIME,
            recurrence : {
                TYPE : createResult.RECURRENCE_TYPE,
                INTERVAL : createResult.RECURRENCE_INTERVAL,
                DAY : createResult.RECURRENCE_DAY
            },
            modelId : createResult.PLAN_MODEL_ID,
            connSqlcc : planLib.connSqlcc,
            jobSqlcc : planLib.jobSqlcc,
            ifUpdate : createResult.IF_UPDATE,
            execworkhour:  createResult.EXECUTE_IN_WORKING_HOUR,
            startworkhour: createResult.START_WORKING_TIME,
            endworkhour: createResult.END_WORKING_TIME,
            timezone: createResult.TIMEZONES
        };
        
        if(parameters.ifUpdate!==-1 && parameters.timezone!==null && parameters.timezone!==''){
            array.push(parameters);
        }
    }
    if(array.length>0){
        var job = new jobManager.Job(array);
        job.upsertSchedules();
    }
};

var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    if (csvErrorList.length > 0) {
    	return csvErrorList;
    }

    // return different check procedure name according to the type
    var checProcName = checkSupplyDemandPlanName();

    // return different check procedure name according to the type
    var uploadProcName = uploadSupplyDemandPlanName();

    // check the remaining element in the procedure
    var checkCSVProc, uploadCSVProc, createResults;
    checkCSVProc = new proc.procedure(constants.SCHEMA_NAME,
            constants.SP_PKG_DATA_UPLOAD + '::' + checProcName);
    csvErrorList = checkCSVProc(csvErrorList, csvFormat,
            resourceCategory,100).INVALID_ITEMS;

    if (csvErrorList.length === 0) {
        // if there are no invalid items, save them to the database
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_DATA_UPLOAD + '::' + uploadProcName);
        createResults = uploadCSVProc(csvFormat, connectionId, resourceCategory).SCHEDULE_DETAILS;
    }
    return csvErrorList;
};

var save = function(resourceCategory, connectionId) {
    // save the upload file(csv)
    var procName, saveCSVProc, createResults, scheduleDetails;
    try {
        procName = saveSupplyDemandPlanName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId, resourceCategory);
        scheduleDetails = createResults.SCHEDULE_DETAILS;
        upsertSchedules(scheduleDetails);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("SUPPLY_DEMAND_PLAN_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_CLEAN, e);
    }
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanSupplyDemandPlanName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("SUPPLY_DEMAND_PLAN_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_CLEAN, e);
    }
};