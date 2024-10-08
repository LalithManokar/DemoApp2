var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagementForUpload.xsjslib");
var utils = $.import("/sap/tm/trp/service/massupload/utils.xsjslib");
var SCHEDULE_TYPE = 'LOCATION_RULE';
var connSqlcc = 'sap.tm.trp.service.xslib::JobUser';
var jobSqlcc = '/sap/tm/trp/service/xslib/JobUser.xssqlcc';
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";

csvParser.setLineSeparator(csvParser.LINE_SEPARATOR_WINDOWS);
csvParser.setSeparator(",");

var csvErrorList = [];
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
        anti.scan(content, 'Pickup return ruleset.csv');
    } catch (e) {
        logger.error("PICKUP_RETURN_RULESET_FILE_ANTIVIRUS_FAILED",
                'Pickup return ruleset.csv', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("PICKUP_RETURN_RULESET_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data, resourceCategory) { 
    var DataSet = [], content = [], i, j, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        
        for(j = 0; j < 20; j++) {
        	if(typeof content[j] === 'string') {
        		content[j] = content[j].trim();
        	}
        }
        
         if (content.length !== 20) {
            logger.error("PICKUP_RETURN_RULESET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Pick-up Return Ruleset', i, content.length, 20);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [20]});
        }
        
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        if ( content[0] === ''  || content[0] === null){
            csvErrorList.push(csvMessage('RULESET_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
            obj.RULE_NAME = null;
        }else if (utils.NotValidNameCheck(content[0]) ) {
            csvErrorList.push(csvMessage('UPLOAD_OBJECT_NAME_INVALID',
                     obj.ROW_INDEX, 1));
            obj.RULE_NAME = null;
        }else{
            obj.RULE_NAME = content[0].toUpperCase();
        }
        
        
        if (content[1].length > 40){
        	csvErrorList.push(csvMessage('UPLOAD_DESC_LENGTH_TOO_HIGH',
                    obj.ROW_INDEX, 2));
        	obj.DESC= content[1];
        }else {
        	obj.DESC = content[1];
        }
        
        if ( content[2] === '' || content[2] === null ){
          csvErrorList.push(csvMessage('RULESET_TYPE_IS_MANDATORY',
              obj.ROW_INDEX, 3));
          obj.RULE_TYPE_NAME = null;
        } else if ( content[2].toUpperCase() !== 'PICK-UP' 
                    && content[2].toUpperCase() !== 'RETURN'){
            csvErrorList.push(csvMessage('RULESET_TYPE_INVALID',
                     obj.ROW_INDEX, 3)); 
            obj.RULE_TYPE_NAME = null;
        } else {
           obj.RULE_TYPE_NAME = content[2].toUpperCase();
        }
        
        if ( utils.NotValidVisibilityCheck(content[3])){
             csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
             obj.ALLOWED_USAGE = null;
        } else {
          obj.ALLOWED_USAGE = content[3]; // visiblity
        }
        
        if ( utils.NotNumberCheck(content[4]) || content[4] <= 0 || content[4] > 999 ) {
           csvErrorList.push(csvMessage('MSG_LOCATION_RULE_TIME_RANGE_INTERGER',
                     obj.ROW_INDEX, 5)); 
           obj.DUE_TO = 0;
        } else {
           obj.DUE_TO = content[4];
        }
       
        obj.TIME_UNIT_NAME = content[5]; 
        if( content[6].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_LOC_FLT_GE_20',
                    obj.ROW_INDEX, 7));
        	// give the default value in case the dberror when do validation
        	obj.LOCATION_FILTER_NAME = content[6];
        }else{
          obj.LOCATION_FILTER_NAME = content[6];
        }
       
        if( content[7].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_RES_FLT_GE_20',
                    obj.ROW_INDEX, 8));
        	// give the default value in case the dberror when do validation
        	obj.RESOURCE_FILTER_NAME = content[7];
        }else{
        	obj.RESOURCE_FILTER_NAME = content[7];
        }
        
        obj.EXCLUDE_YES_OR_NO = content[8];
        if( content[9].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_EXC_RULE_GE_20',
                    obj.ROW_INDEX, 10));
        	// give the default value in case the dberror when do validation
        	obj.EXCLUSIVE_RULE_NAME = content[9];
        }else{
           obj.EXCLUSIVE_RULE_NAME = content[9];
        }
     
        if( content[10].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_SD_PLAN_GE_20',
                    obj.ROW_INDEX, 11));
        	// give the default value in case the dberror when do validation
        	obj.SD_PLAN_NAME = content[10];
        }else{
        	obj.SD_PLAN_NAME = content[10];
        }
        
        if( content[11].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_NETSET_GRP_GET_20',
                    obj.ROW_INDEX, 12));
        	// give the default value in case the dberror when do validation
        	obj.NETWORK_SETTING_GROUP_NAME = content[11];
        }else{
          obj.NETWORK_SETTING_GROUP_NAME = content[11];  
        }
             
        obj.OP_SETTING_NAME = content[12];
        
        if(content[13].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_LOCDET_GET_20',
                    obj.ROW_INDEX, 14));
        	obj.LOCATION_DETERMIN_NAME = content[13];
        }else{
          obj.LOCATION_DETERMIN_NAME = content[13]; // Location Determination Rule
        }
       
        obj.OPTIMIZATION_NAME= content[14]; // Automatic Optimization
        
        if ( content[15] === '' || content[15] === null ){
            csvErrorList.push(csvMessage('MANUAL_OR_SCHEDULED_INVALID',
                    obj.ROW_INDEX, 16));
            obj.SCHEDULE_TYPE_NAME = null;
        }else{
            
            if ( content[15].toUpperCase() === 'SCHEDULED'){
               obj.SCHEDULE_TYPE_NAME = content[15].toUpperCase();
			   obj.EXECUTE_INTERVAL_NAME = null;
               obj.EXECUTE_TIME_UINT_NAME = null;
               obj.START_DATE_TIME = null;
               obj.END_DATE_TIME = null;
			   obj.EXECUTE_IN_WORKING_HOUR = '';
			   obj.START_WORKING_TIME = null;			   // Scheduled or Manual
			   obj.END_WORKING_TIME = null;
               
            }else if ( content[15].toUpperCase() === 'MANUAL' ){
               obj.SCHEDULE_TYPE_NAME = content[15].toUpperCase(); // Scheduled or Manual  
               obj.EXECUTE_INTERVAL_NAME = null;
               obj.EXECUTE_TIME_UINT_NAME = null;
               obj.START_DATE_TIME = null;
               obj.END_DATE_TIME = null;
			   obj.EXECUTE_IN_WORKING_HOUR = '';
			   obj.START_WORKING_TIME = null;
			   obj.END_WORKING_TIME = null;
            }else {
              csvErrorList.push(csvMessage('MANUAL_OR_SCHEDULED_INVALID', obj.ROW_INDEX, 16));
			   obj.EXECUTE_INTERVAL_NAME = null;
               obj.EXECUTE_TIME_UINT_NAME = null;
               obj.START_DATE_TIME = null;
               obj.END_DATE_TIME = null;
			   obj.EXECUTE_IN_WORKING_HOUR = '';
			   obj.START_WORKING_TIME = null;
			   obj.END_WORKING_TIME = null;
            }           
        }
        
       
        if (   (content[16] !== '' && content[16] !== null && utils.NotNumberCheck(content[16]) )
            || (content[16] !== '' && content[16] !== null && (content[16] <= 0 || content[16] > 9999) )
            ) {
          csvErrorList.push(csvMessage('MSG_LOCATION_RULE_HANDLING_TIME_BUFFER_INTEGER',
                     obj.ROW_INDEX, 17)); 
          obj.HANDING_TIME_BUFFER = null;
        }else{
           obj.HANDING_TIME_BUFFER = content[16];
        }
        
        if ( (content[17] !== '' && content[17] !== null && utils.NotNumberCheck(content[17]) )
           || (content[17] !== '' && content[17] !== null && (content[17] <= 0 || content[17] > 9999) )
           ) {
           csvErrorList.push(csvMessage('MSG_LOCATION_RULE_MAXIMUM_HIT_INTEGER',
                     obj.ROW_INDEX, 18)); 
           obj.MAX_HITS = null;
        }else{
          obj.MAX_HITS = content[17];
        }
        
        obj.KEEP_EXECUTION_RUNS = null;
        
        if (utils.NotValidKeepExecRunsCheck(content[18])){
        	csvErrorList.push(csvMessage('EXECUTION_RUNS_VALIDATE_RANGE',
                    obj.ROW_INDEX, 19));         	
        }else{
        	if( content[18] !== '' && content[18] !== null){
        		obj.KEEP_EXECUTION_RUNS = content[18];       
        	}        	 	
        }
        
        obj.SELECTION_DATE = null;
        
        
        	if(content[19] !== null){
        		obj.SELECTION_DATE = content[19];       
        	}        	 	

        DataSet.push(obj);
    }
    return DataSet;
};


var upload = function(csv, resourceCategory, connection_id) {

     // parse the csv file
    var csvParse = parseCSVFiles(csv);
    var csvContent = csvParse.content || [];
    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvContent, resourceCategory);
   
    var validationProcedureName = constants.SP_PKG_DATA_UPLOAD + '::' + "p_ext_pickup_return_ruleset_validate";
    var uploadProcedureName = constants.SP_PKG_DATA_UPLOAD + '::' + "p_ext_pickup_return_ruleset_upload";
    var csvValidationProc, uploadCSVProc;   
  
    if ( csvErrorList.length === 0 ) {
        // check the remaining element in the procedure    	
        csvValidationProc = new proc.procedure(constants.SCHEMA_NAME, validationProcedureName);
        var csvInvalidItems = csvValidationProc(csvErrorList,csvFormat , resourceCategory, 100);
        csvErrorList = csvInvalidItems.INVALID_ITEMS;	    
    }
        
    if ( csvErrorList.length === 0 ){
        // insert CSV content to temporary table
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME, uploadProcedureName);
        uploadCSVProc(csvFormat, resourceCategory, connection_id);	    	
    }

    return csvErrorList;
    
};

var upsertAndCancelSchedule = function(createResults, resourceCategory) {
    
    var parameter,job_action,ifUpdate;
    var array = [], recurrence_day ;
    for(var i=0; i<createResults.length; i++) {
        var createResult = createResults[i];
        job_action = createResult.JOB_ACTION;
        switch(job_action){
        case 'JOB_CREATE':
        	ifUpdate = 0;
             break;
        case 'JOB_UPDATE':
        	ifUpdate = 1;             
             break;
        case 'JOB_CANCEL':               
        	ifUpdate = 2;
            break;
        }
       
       parameter = {
            xsJob : xsJob,
            scheduleType : SCHEDULE_TYPE,
            startTime : createResult.START_DATE_TIME,
            expiryTime : createResult.END_DATE_TIME,
            timezone : createResult.TIMEZONES,
            recurrence : {
                TYPE : createResult.EXECUTE_TIME_UINT,
                INTERVAL : createResult.EXECUTE_INTERVAL,
                DAY : recurrence_day,
            },
            execworkhour: createResult.EXECUTE_IN_WORKING_HOUR,
            startworkhour: createResult.START_WORKING_TIME,
            endworkhour: createResult.END_WORKING_TIME,
            modelId : createResult.ID,
            connSqlcc : connSqlcc,
            jobSqlcc : jobSqlcc,
            ifUpdate : ifUpdate,
            resourceCategory : resourceCategory
        };

        array.push(parameter);
     }
    if( array.length > 0){
    	var job = new jobManager.Job(array);
    	job.upsertAndDeleteSchedules();
    }   
};

var save = function(resourceCategory, connectionId) {    
    // retrieve data from temporary table and upsert to pick-up return ruleset table
    var procName, saveCSVProc, results,scheduleDetails;
   
    procName = constants.SP_PKG_DATA_UPLOAD + '::' + "p_ext_pickup_return_ruleset_save";
    saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    
    results = saveCSVProc(connectionId, resourceCategory);
    if(results){
    return results.EXECUTION_RESULTS;
    }
};

var cancel = function(connectionId) {
    // clean temporary table
    var procName, cleanDataProc;
    procName = constants.SP_PKG_DATA_UPLOAD + '::' + "p_pickup_return_ruleset_temporary_data_clean";
    cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    cleanDataProc(connectionId);
};