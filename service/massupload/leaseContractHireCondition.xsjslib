var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var utils = $.import("/sap/tm/trp/service/massupload/utils.xsjslib");

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
        anti.scan(content, "lease_contract_hire_condition_upload.csv");
    } catch (e) {
        logger.error("LEASE_CONTRACT_HIRE_CONDITION_FILE_ANTIVIRUS_FAILED",
                'Lease Contract Hire Condition Upload', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LEASE_CONTRACT_HIRE_CONDITION_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
	
	var regex = /^[1,2,3,4,5,6]$/;
	var regex1 = /^[0,1]$/;
	var regex2 = /^[1,2]$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 8) {
            logger.error("LEASE_CONTRACT_HIRE_CONDITION_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Lease Contract Hire Condition', i, content.length, 8);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [8]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }
        else{
        	obj.LEASE_CONTRACT_REFERENCE = content[0];
        }
      
       
        if(content[0].length > 100)
        {
        	  csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 1));
        }
        else        	
        {
        	obj.LEASE_CONTRACT_REFERENCE = content[0];
        }
        
        
        obj.HIRE_TYPE = null;
        
      if ( content[1] !== ''  && content[1] !== null){
        if( regex2.test(content[1]) === false ){
        		 csvErrorList.push(csvMessage('HIRE_TYPE_IS_INVALID',
                obj.ROW_INDEX, 2));}
        else{
        	obj.HIRE_TYPE = content[1];
        }
        }

      
      obj.LOCATION_TYPE = null;
      
      if ( content[2] !== ''  && content[2] !== null){ 
        if ( regex.test(content[2]) === false ) {
            csvErrorList.push(csvMessage('LOCATION_TYPE_IS_INVALID',
                     obj.ROW_INDEX, 3));
        }else{
        	obj.LOCATION_TYPE = content[2];
        }
       }
        
        if(content[3].length > 22)
        {
        	  csvErrorList.push(csvMessage('LOCATION_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 4));
        }
        else        	
        {
        	obj.LOCATION = content[3];
        }
        

        if(content[4].length > 50)
        {
        	  csvErrorList.push(csvMessage('EQUIPMENT_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 5));
        }
        else        	
        {
        	obj.EQUIPMENT = content[4];
        }
        
        
        obj.MIN_HIRE_QUANTITY = null;
       
        if(content[5] !== ''  && content[5] !== null){  
        if (utils.NotNumberCheck(content[5])){
            csvErrorList.push(csvMessage('MIN_HIER_QUANTITY_NOT_VALID',
                    obj.ROW_INDEX, 6));
        } else {
               obj.MIN_HIRE_QUANTITY = content[5] ;
        } 
        }	
 
        
        obj.MAX_HIRE_QUANTITY = null;
        
      if(content[6] !== ''  && content[6] !== null){  
        if (utils.NotNumberCheck(content[6])){
            csvErrorList.push(csvMessage('MAX_HIER_QUANTITY_NOT_VALID',
                    obj.ROW_INDEX, 7));
        } else {
               obj.MAX_HIRE_QUANTITY = content[6] ;
        } 
      }

        	if ( content[7] === ''  || content[7] === null){
                csvErrorList.push(csvMessage('ACTIVE_IS_MANDATORY',
                      obj.ROW_INDEX, 8));           
            } else if( regex1.test(content[7]) === false ){
	   		 csvErrorList.push(csvMessage('ACTIVE_IS_INVALID',
	           obj.ROW_INDEX, 8));}
	        else{
	        		obj.ACTIVE = content[7];
		    }
	        
        
        DataSet.push(obj);
    }
    return DataSet;
};


var checkLeaseContractHireCondition = function() {
    return "p_lease_contract_hire_condition_validate";
};


var saveLeaseContractHireCondition = function() {
    return "p_lease_contract_hire_condition_save";
};

var uploadLeaseContractHireCondition = function() {
    return "p_lease_contract_hire_condition_upload";
};

var cleanLeaseContractHireCondition = function() {
    return "p_lease_contract_hire_condition_clean";
};


var upload = function(csv, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);
    
    // return different check procedure name according to the type
    var checProcName = checkLeaseContractHireCondition();

    // return different check procedure name according to the type
    var uploadProcName = uploadLeaseContractHireCondition();

    // check the remaining element in the procedure
    var checkCSVProc,uploadCSVProc;
    
    checkCSVProc = new proc.procedure(constants.SCHEMA_NAME,
            constants.SP_PKG_DATA_UPLOAD + '::' + checProcName);
    if (csvErrorList.length === 0){    
    csvErrorList = csvErrorList.concat(checkCSVProc(csvFormat,100).INVALID_ITEMS);
    }
    
    if (csvErrorList.length === 0) {
        // if there are no invalid items, save them to the database
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_DATA_UPLOAD + '::' + uploadProcName);
        // insert CSV content to temporary table
        uploadCSVProc(csvFormat, connectionId);        
    }
    return csvErrorList;
};


var save = function(connectionId) {    
    // save the upload file(csv)
    var procName, saveCSVProc,createResults;
    try {
        procName = saveLeaseContractHireCondition();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LEASE_CONTRACT_HIRE_CONDITION_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
    
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLeaseContractHireCondition();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LEASE_CONTRACT_HIRE_CONDITION_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};