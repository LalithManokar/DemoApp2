var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var fetchTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/fetchTU/executor.xsjob';
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagementForUpload.xsjslib");
var utils = $.import("/sap/tm/trp/service/massupload/utils.xsjslib");
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
        
        for(j = 0; j < 12; j++) {
        	if(typeof content[j] === 'string') {
        		content[j] = content[j].trim();
        	}
        }
        
         if (content.length !== 12) {
            logger.error("PICKUP_RETURN_RULESET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Pick-up Return Ruleset', i, content.length, 12);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [12]});
        }
        
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        //ruleset group name
        if ( content[0] === ''  || content[0] === null){
            csvErrorList.push(csvMessage('RULESET_GROUP_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
            obj.RULE_GROUP_NAME = null;
        }else if (utils.NotValidNameCheck(content[0]) ) {
            csvErrorList.push(csvMessage('UPLOAD_OBJECT_NAME_INVALID',
                     obj.ROW_INDEX, 1));
            obj.RULE_GROUP_NAME = null;
        }else{
            obj.RULE_GROUP_NAME = content[0].toUpperCase();
        }
        
        //desc
        if (content[1].length > 40){
        	csvErrorList.push(csvMessage('UPLOAD_DESC_LENGTH_TOO_HIGH',
                    obj.ROW_INDEX, 2));
        	obj.DESC= content[1];
        }else {
        	obj.DESC = content[1];
        }
        
        //ruleset type
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
        
        //timezones
        if ( content[3] === '' || content[3] === null ){
         csvErrorList.push(csvMessage('TIMEZONE_ENTRY_MANDATORY',
              obj.ROW_INDEX, 4));
          obj.TIMEZONES = null;
        }
        else if (content[3].length > 40) {
            csvErrorList.push(csvMessage('TIMEZONES_40',obj.ROW_INDEX, 28));
            // give the default value in case the dberror when do validation
            obj.TIMEZONES = content[3].substring(0, 40);
        } else {
            obj.TIMEZONES = content[3];
        }
        
        // Recurrence
         if ( content[4] === '' || content[4] === null ){
              csvErrorList.push(csvMessage('RECURRENCE_UNIT_MANDATORY',
              obj.ROW_INDEX, 5));
              obj.EXECUTE_TIME_UNIT_NAME = null;
         }
         else
         {
         obj.EXECUTE_TIME_UNIT_NAME = content[4]; 
         }
         
        //Executed every
         if ( content[5] === '' || content[5] === null ){
              csvErrorList.push(csvMessage('RECURRENCE_INTERVAL_MANDATORY',
                              obj.ROW_INDEX, 6)); 
                   obj.EXECUTE_INTERVAL_NAME = null;
         }
         else
         {
             if ( utils.NotNumberCheck(content[5]) || content[5] <= 0 || content[5] > 999 ) {
                   csvErrorList.push(csvMessage('MSG_LOCATION_RULE_EXECUTE_INTERVAL_INTEGER',
                              obj.ROW_INDEX, 6)); 
                   obj.EXECUTE_INTERVAL_NAME = null;
                } else {
                    obj.EXECUTE_INTERVAL_NAME = content[5]; 
               }
         }
         
        // start time
        if ( content[6] === null || content[6] === ''){
                  csvErrorList.push(csvMessage('START_TIME_INVALID', obj.ROW_INDEX, 7)); 
                  obj.START_DATE_TIME = null;
               }else if ( utils.NotDatetimeCheck(content[6])){
                   csvErrorList.push(csvMessage('START_TIME_INVALID', obj.ROW_INDEX, 7)); 
                   obj.START_DATE_TIME = null;
                }else {
                   obj.START_DATE_TIME = content[6];
                } 
        
       // end time        
       if ( content[7] === null || content[7] === '' ){
          csvErrorList.push(csvMessage('END_TIME_INVALID', obj.ROW_INDEX, 8)); 
          obj.END_DATE_TIME = null;  
       } else if (utils.NotDatetimeCheck(content[7])){
          csvErrorList.push(csvMessage('END_TIME_INVALID', obj.ROW_INDEX, 8)); 
          obj.END_DATE_TIME = null;  
        }else {
          obj.END_DATE_TIME = content[7];  
        }
                
        //execute in working hours
    	if (content[4].toUpperCase() === 'HOURS' || content[4].toUpperCase() === 'MINUTES') {
        if (content[8].toUpperCase() !== 'YES' && content[8].toUpperCase() !== 'NO') {
        	csvErrorList.push(csvMessage('EXECUTE_IN_WORKING_HOUR_NODE_INVALID',
                    obj.ROW_INDEX, 9));
        	// give the default value in case the dberror when do validation
        	obj.EXECUTE_IN_WORKING_HOUR = '';
        } else {
        	if(content[8].toUpperCase() === 'YES') {
        		obj.EXECUTE_IN_WORKING_HOUR = 'X';
        	} else {
        		obj.EXECUTE_IN_WORKING_HOUR = '';
        	}
        }
    	}

       // Only assign the START_WORKING_TIME & END_WORKING_TIME when EXECUTE_IN_WORKING_HOUR = 'YES'
        if(content[8].toUpperCase() === 'YES') {
	        if (utils.NotValidHourMinCheck(content[9])){
	            csvErrorList.push(csvMessage('START_WORKING_TIME_INVALID',
	                    obj.ROW_INDEX, 10));
	            // give the default value in case the dberror when upload check
	            obj.START_WORKING_TIME = null;
	        } else {
	            obj.START_WORKING_TIME = content[9] + ':00' || null;
	        }
	        
	        if (utils.NotValidHourMinCheck(content[10])){
	            csvErrorList.push(csvMessage('END_WORKING_TIME_INVALID',
	                    obj.ROW_INDEX, 11));
	            // give the default value in case the dberror when upload check
	            obj.END_WORKING_TIME = null;
	        } else {
	            obj.END_WORKING_TIME = content[10] + ':00' || null;
	        }
	        
	        if(obj.START_WORKING_TIME === obj.END_WORKING_TIME) {
	        	csvErrorList.push(csvMessage('START_WORKING_TIME_EQ_END_WORKING_TIME',
	                    obj.ROW_INDEX, 11));
	        }
        } 

         //rule name
      if ( content[11] === ''  || content[11] === null){
            csvErrorList.push(csvMessage('RULESET_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 12));
            obj.RULE_NAME = null;   
      }
      else if( content[11].length > 20){
	    csvErrorList.push(csvMessage('UPLOAD_OBJECT_NAME_INVALID',
            obj.ROW_INDEX, 12));
	        obj.RULE_NAME = null;
       }else{
        	obj.RULE_NAME = content[11];
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
   
    var validationProcedureName = constants.SP_PKG_RULEGROUP_DATA_UPLOAD + '::' + "p_ext_pr_fetch_ruleset_group_validate";
    var uploadProcedureName = constants.SP_PKG_RULEGROUP_DATA_UPLOAD + '::' + "p_ext_pr_ruleset_group_upload";
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
            xsJob : fetchTUJob,
            scheduleType : 'FETCH_TU',
            startTime : createResult.START_DATE_TIME,
            expiryTime : createResult.END_DATE_TIME,
            timezone : createResult.TIMEZONES,
            recurrence : {
                TYPE : createResult.EXECUTE_TIME_UNIT,
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
   
    procName = constants.SP_PKG_RULEGROUP_DATA_UPLOAD + '::' + "p_ext_pr_fetch_ruleset_group_save";
    saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    
    results = saveCSVProc(connectionId, resourceCategory);
    
    if(results){
    	scheduleDetails = results.SCHEDULE_DETAILS;
    	if( scheduleDetails.length > 0 ){
    	 upsertAndCancelSchedule(scheduleDetails, resourceCategory);
    	} 	 	    
 	    return results.EXECUTION_RESULTS;
    }
};

var cancel = function(connectionId) {
    // clean temporary table
    var procName, cleanDataProc;
    procName = constants.SP_PKG_RULEGROUP_DATA_UPLOAD + '::' + "p_pickup_return_ruleset_group_temporary_data_clean";
    cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    cleanDataProc(connectionId);
};