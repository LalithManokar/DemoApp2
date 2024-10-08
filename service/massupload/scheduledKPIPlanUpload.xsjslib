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
        anti.scan(content, "SCHEDULED_KPI_PLAN.csv");
    } catch (e) {
        logger.error("SCHEDULED_KPI_PLAN_FILE_ANTIVIRUS_FAILED",
                'Scheduled KPI Plan', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("SCHEDULED_KPI_PLAN_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};


var formatCSVFiles = function(data) {
    var DataSet = [], content = [], i, j,obj, visibilityName;
    for (i = 0; i < data.length; i++) {
        content = data[i];

        for(j = 0; j < 17; j++) {
        	if(typeof content[j] === 'string') {
        		content[j] = content[j].trim();
        	}
        }

        if (content.length !== 17) {
            logger.error("SCHEDULED_KPI_PLAN_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Scheduled KPI Plan', i, content.length, 16);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [16]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        if ( content[0] === '' || content[0] === null){
        	csvErrorList.push(csvMessage('SCHE_KPI_PLAN_NAME_IS_MANDATORY',
                    obj.ROW_INDEX, 1));
        }else if (utils.NotValidNameCheck(content[0])){
        	csvErrorList.push(csvMessage('UPLOAD_OBJECT_NAME_INVALID',
                    obj.ROW_INDEX, 1));
        }else {
        	obj.NAME = content[0].toUpperCase(); //Schedule KPI Plan name
        }

        if (content[1].length > 40){
        	csvErrorList.push(csvMessage('UPLOAD_DESC_LENGTH_TOO_HIGH',
                    obj.ROW_INDEX, 2));
        }else {
        	obj.DESCRIPTION = content[1];
        }

        obj.TYPE_NAME = content[2];
        if (utils.NotValidVisibilityCheck(content[3])){
            csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
            // give the default value in case the dberror when upload check
            obj.VISIBILITY_FLAG = 0;
        } else {
        	visibilityName = content[3].toUpperCase();
        	if(visibilityName === 'GLOBAL') {
        		obj.VISIBILITY_FLAG = 1;
        	} else {
        		obj.VISIBILITY_FLAG = 0;
        	}
        }
        if( content[4].length > 20 ){
        	csvErrorList.push(csvMessage('UPLOAD_LOC_FLT_GE_20',
                    obj.ROW_INDEX, 5));
        	// give the default value in case the dberror when do validation
        	obj.LOCATION_FILTER_NAME = content[4];
        }else{
          obj.LOCATION_FILTER_NAME = content[4];
        }

        if( content[5].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_RES_FLT_GE_20',
                    obj.ROW_INDEX, 6));
        	// give the default value in case the dberror when do validation
        	obj.RESOURCE_FILTER_NAME = content[5];
        }else{
          obj.RESOURCE_FILTER_NAME = content[5];
        }

        if( content[6].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_TIME_FLT_GE_20',
                    obj.ROW_INDEX, 7));
        	// give the default value in case the dberror when do validation
        	obj.TIME_FILTER_NAME = content[6];
        }else{
          obj.TIME_FILTER_NAME = content[6];
        }

        if(content[7].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_CAL_MODEL_GE_20',
                    obj.ROW_INDEX, 8));
        	// give the default value in case the dberror when do validation
        	obj.CALCULATION_MODEL_NAME = content[7];
        }else{
          obj.CALCULATION_MODEL_NAME = content[7];
        }

        if(content[8].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_ALERT_RULEGRP_GE_20',
                    obj.ROW_INDEX, 9));
        	obj.ALERT_RULE_GROUP_NAME = content[8];
        }else{
        	obj.ALERT_RULE_GROUP_NAME = content[8];
        }

        if(content[9].length > 20 ){
        	csvErrorList.push(csvMessage('UPLOAD_MULT_ATTRI_GE_20',
                    obj.ROW_INDEX, 10));
        	 obj.ATTRIBUTE_GROUP_NAME = content[9];
        }else{
           obj.ATTRIBUTE_GROUP_NAME = content[9];
        }


        switch (content[10].toUpperCase()){
           case 'MONTHS':
        	   obj.RECURRENCE_TYPE = 'MONTH';

        	   if (utils.NotNumberCheck(content[12]) || content[12] <=0 || content[12] > 31){
        		  csvErrorList.push(csvMessage('DAY_OF_MONTH_INVALID', obj.ROW_INDEX, 13));
                  obj.RECURRENCE_DAY = null;
        	   }else{
        		  obj.RECURRENCE_DAY = content[12]; //Executed on
        	   }

        	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 99 ){
                   csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                           obj.ROW_INDEX, 12));
                   // give the default value in case the dberror when upload check
                   obj.RECURRENCE_INTERVAL = 0;
               } else {
               	obj.RECURRENCE_INTERVAL = content[11]; //Execute Every
               }

        	   break;
           case 'WEEKS':
        	   obj.RECURRENCE_TYPE = 'WEEK';//Recurrence
        	   switch (content[12].toUpperCase()){
        	    case 'SUNDAY': obj.RECURRENCE_DAY = 0; break;
        	    case 'MONDAY': obj.RECURRENCE_DAY = 1; break;
        	    case 'TUESDAY': obj.RECURRENCE_DAY = 2; break;
        	    case 'WEDNESDAY': obj.RECURRENCE_DAY = 3; break;
        	    case 'THURSDAY': obj.RECURRENCE_DAY = 4; break;
        	    case 'FRIDAY': obj.RECURRENCE_DAY = 5; break;
        	    case 'SATURDAY': obj.RECURRENCE_DAY = 6; break;
        	    default:
        	      csvErrorList.push(csvMessage('DAY_OF_WEEK_INVALID', obj.ROW_INDEX, 13));
                  obj.RECURRENCE_DAY = null;
        	   }

        	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 99 ){
                   csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                           obj.ROW_INDEX, 12));
                   // give the default value in case the dberror when upload check
                   obj.RECURRENCE_INTERVAL = 0;
               } else {
               	obj.RECURRENCE_INTERVAL = content[11]; //Execute Every
               }

        	   break;
           case 'DAYS':
        	   obj.RECURRENCE_TYPE = 'DAY';//Recurrence
        	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 99 ){
                   csvErrorList.push(csvMessage('DAY_WEEK_MONTH_INVALID_RECURRENCE_INTERVAL',
                           obj.ROW_INDEX, 12));
                   // give the default value in case the dberror when upload check
                   obj.RECURRENCE_INTERVAL = 0;
               } else {
               	obj.RECURRENCE_INTERVAL = content[11]; //Execute Every
               }

        	   obj.RECURRENCE_DAY = null;
        	   break;
           case 'HOURS':
        	   obj.RECURRENCE_TYPE = 'HOUR'//Recurrence
        	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 23 ){
                   csvErrorList.push(csvMessage('HOUR_INVALID_RECURRENCE_INTERVAL',
                           obj.ROW_INDEX, 12));
                   // give the default value in case the dberror when upload check
                   obj.RECURRENCE_INTERVAL = 0;
               } else {
               	obj.RECURRENCE_INTERVAL = content[11]; //Execute Every
               }

        	   obj.RECURRENCE_DAY = null;
        	   break;
           case 'MINUTES':
        	   obj.RECURRENCE_TYPE = 'MINUTE';//Recurrence
        	   if (utils.NotNumberCheck(content[11]) || content[11] <=0 || content[11] > 59 ){
                   csvErrorList.push(csvMessage('MINUTE_INVALID_RECURRENCE_INTERVAL',
                           obj.ROW_INDEX, 12));
                   // give the default value in case the dberror when upload check
                   obj.RECURRENCE_INTERVAL = 0;
               } else {
               	obj.RECURRENCE_INTERVAL = content[11]; //Execute Every
               }

         	   obj.RECURRENCE_DAY = null;
         	   break;
         default:
        	 csvErrorList.push(csvMessage('RECURRENCE_TYPE_INVALID',
                     obj.ROW_INDEX, 11));
        }


        if (utils.NotDatetimeCheck(content[13])){
            csvErrorList.push(csvMessage('START_TIME_INVALID',
                    obj.ROW_INDEX, 14));
            // give the default value in case the dberror when upload check
            obj.START_TIME = null;
        } else {
            obj.START_TIME = content[13] || null;
        }

        if (utils.NotDatetimeCheck(content[14])){
            csvErrorList.push(csvMessage('EXPIRY_TIME_INVALID',
                    obj.ROW_INDEX, 15));
            // give the default value in case the dberror when upload check
            obj.EXPIRY_TIME = null;
        } else {
            obj.EXPIRY_TIME = content[14] || null;
        }

        if(obj.START_TIME != null && obj.EXPIRY_TIME != null) {
        	if(utils.CompareDatetime(obj.START_TIME, obj.EXPIRY_TIME) < 2) {
        		csvErrorList.push(csvMessage('START_TIME_GE_EXPIRY_TIME',
                        obj.ROW_INDEX, 14));
        	}
        }

        if (content[15].length > 40) {
        	csvErrorList.push(csvMessage('PLAN_USAGE_GE_40',
                    obj.ROW_INDEX, 16));
        	// give the default value in case the dberror when do validation
        	obj.PLAN_USAGE = content[15].substring(0, 40);
        } else {
            obj.PLAN_USAGE = content[15];
        }

 /*       if (content[16] !== 'YES' && content[16] !== 'NO') {
        	csvErrorList.push(csvMessage('DISABLE_INTERMEDIATE_NODE_INVALID',
                    obj.ROW_INDEX, 17));
        	// give the default value in case the dberror when do validation
        	obj.DISABLE_INTERMEDIATE_NODE = '';
        } else {
        	if(content[16] === 'YES') {
        		obj.DISABLE_INTERMEDIATE_NODE = 'X';
        	} else {
        		obj.DISABLE_INTERMEDIATE_NODE = '';
        	}
        }
 */
        if (content[16].length > 40) {
        	csvErrorList.push(csvMessage('TIMEZONES_40',
                    obj.ROW_INDEX, 17));
        	// give the default value in case the dberror when do validation
        	obj.TIMEZONES = content[16].substring(0, 40);
        } else {
            obj.TIMEZONES = content[16];
        }

        DataSet.push(obj);
    }
    return DataSet;
};

var upsertSchedules = function(createResults,resourceCategory) {
	var array = [];
    for(var i=0; i<createResults.length; i++) {
        var createResult = createResults[i];
        var parameters = {
            xsJob : planLib.xsJob,
            scheduleType : planLib.SCHEDULE_TYPE,
            startTime : createResult.START_TIME,
            expiryTime : createResult.EXPIRY_TIME,
            timezone : createResult.TIMEZONES,
            recurrence : {
                TYPE : createResult.RECURRENCE_TYPE,
                INTERVAL : createResult.RECURRENCE_INTERVAL,
                DAY : createResult.RECURRENCE_DAY
            },
            modelId : createResult.PLAN_MODEL_ID,
            connSqlcc : planLib.connSqlcc,
            jobSqlcc : planLib.jobSqlcc,
            ifUpdate : createResult.IF_UPDATE,
            resourceCategory : resourceCategory
        };

        array.push(parameters);
    }
    var job = new jobManager.Job(array);
    job.upsertAndDeleteSchedules();
};

var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    var checProcName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_scheduled_kpi_plan_validate';
    var uploadProcName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_scheduled_kpi_plan_upload';

    var checkCSVProc, uploadCSVProc, createResults;

    if (csvErrorList.length === 0) {
    	// check the remaining element in the procedure
	   checkCSVProc = new proc.procedure(constants.SCHEMA_NAME, checProcName);
	   csvErrorList = checkCSVProc(csvErrorList,csvFormat,
		                        resourceCategory,100).INVALID_ITEMS;

    if (csvErrorList.length === 0) {
        // if there are no invalid items, save them to the corresponding temporary table
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME, uploadProcName);
        createResults = uploadCSVProc(csvFormat, resourceCategory, connectionId);
     }
    }
    return csvErrorList;
};

var save = function(resourceCategory, connectionId) {
    // save corresponding temporary table data to table
    var procName, saveCSVProc, createResults, scheduleDetails;

    procName =  constants.SP_PKG_DATA_UPLOAD + '::' + 'p_scheduled_kpi_plan_save';
    saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    createResults = saveCSVProc(connectionId, resourceCategory);
    scheduleDetails = createResults.SCHEDULE_DETAILS;
    upsertSchedules(scheduleDetails, resourceCategory);
    return createResults.EXECUTION_RESULTS;
};

var cancel = function(connectionId) {
    // clean corresponding temporary table data
    var procName, cleanDataProc;

    procName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_scheduled_kpi_plan_temporary_data_clean';
    cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    cleanDataProc(connectionId);
};