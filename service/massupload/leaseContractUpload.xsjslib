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
        anti.scan(content, "lease_contract_upload.csv");
    } catch (e) {
        logger.error("LEASE_CONTRACT_FILE_ANTIVIRUS_FAILED",
                'Lease Contracts', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LEASE_CONTRACT_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var regex = /^[0,1]$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 14) {
            logger.error("LEASE_CONTRACT_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Lease Contracts', i, content.length, 14);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [14]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
               csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_IS_MANDATORY',
                    obj.ROW_INDEX, 1));
        }else if ( content[0].length > 100 ) {
               csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_GT_100',
                    obj.ROW_INDEX, 1));
        }else {
               obj.LEASE_CONTRACT_REFERENCE = content[0].trim();
        }
        
        
        if ( content[1] === ''  || content[1] === null){
               csvErrorList.push(csvMessage('LEASE_TYPE_CODE_IS_MANDATORY',
                     obj.ROW_INDEX, 2));
        }else if ( content[1].length > 22 ) {
               csvErrorList.push(csvMessage('LEASE_TYPE_CODE_GT_22',
                    obj.ROW_INDEX, 2));
        }else {
               obj.LEASE_TYPE_CODE = content[1].trim();
        }
        
        if ( content[2] === ''  || content[2] === null){
               csvErrorList.push(csvMessage('LESSOR_CODE_MANDATORY',
                     obj.ROW_INDEX, 3));
        }else if ( content[2].length > 22 ) {
               csvErrorList.push(csvMessage('LESSOR_CODE_GT_22',
                    obj.ROW_INDEX, 3));
        }else {
               obj.LESSOR_CODE = content[2].trim();
        }
        
        if(content[3] !== ''  ) {
        	if (utils.NotDatetimeCheck(content[3])){
            csvErrorList.push(csvMessage('START_TIME_INVALID',
                    obj.ROW_INDEX, 4));
            // give the default value in case the dberror when upload check
            obj.START_TIME = null;
        }else { 
            obj.START_TIME = content[3] || null;
        }}
        
        if(content[4] !== '' ) {
        	if (utils.NotDatetimeCheck(content[4])){
            csvErrorList.push(csvMessage('END_TIME_INVALID',
                    obj.ROW_INDEX, 5));
            // give the default value in case the dberror when upload check
            obj.END_TIME = null;
        }else {
            obj.END_TIME = content[4] || null;
        }}

        if ( content[5] === ''  || content[5] === null){
               csvErrorList.push(csvMessage('CURRENCY_CODE_IS_MANDATORY',
                     obj.ROW_INDEX, 6));
        } else if( content[5].length > 3 ) {
          csvErrorList.push(csvMessage('CURRENCY_CODE_GT_3',
                     obj.ROW_INDEX, 6));  
        } else {
        obj.CURRENCY_CODE= content[5].trim();
        }
        
        if (content[6].length > 3 )
        {
               csvErrorList.push(csvMessage('UNIT_GT_3',
                     obj.ROW_INDEX, 7));  
        }else {
               obj.UNIT = content[6].trim();
        }
        
        
        obj.MAX_HIRE_QUANTITY = null;
        
        if(content[7] !== ''  && content[7] !== null){
        if (utils.NotNumberCheck(content[7])){
            csvErrorList.push(csvMessage('MAX_HIRE_QUANTITY_NOT_VALID',
                    obj.ROW_INDEX, 8));
            // give the default value in case the db error when upload check
        } else {
               obj.MAX_HIRE_QUANTITY = content[7] ;
        }
        }

        
        obj.MIN_HIRE_QUANTITY = null;
        
        if(content[8] !== ''  && content[8] !== null){
        if (utils.NotNumberCheck(content[8])){
            csvErrorList.push(csvMessage('MIN_HIRE_QUANTITY_NOT_VALID',
                    obj.ROW_INDEX, 9));
            // give the default value in case the db error when upload check
        } else {
               obj.MIN_HIRE_QUANTITY = content[8] ;
        }      
        }
        
        if ( content[9] === ''  || content[9] === null){
               csvErrorList.push(csvMessage('ACTIVE_IS_MANDATORY',
                     obj.ROW_INDEX, 10));           
        }else if ( regex.test(content[9]) === false ) {
            csvErrorList.push(csvMessage('ACTIVE_IS_INVALID',
                    obj.ROW_INDEX, 10));
        } else {obj.ACTIVE = content[9];
               
        }
        
        
        if ( content[10] === ''  || content[10] === null){
               csvErrorList.push(csvMessage('UNIT_TYPE_IS_MANDATORY',
                     obj.ROW_INDEX, 11));          
        }else if( content[10].length > 50 )
        {
               csvErrorList.push(csvMessage('UNIT_TYPE_GT_50',
                     obj.ROW_INDEX, 11));  
        }else {
               obj.UNIT_TYPE = content[10].trim();
        }
        
        
        if ( content[11].length > 50 )
        {
               csvErrorList.push(csvMessage('EQUIPMENT_GT_50',
                     obj.ROW_INDEX, 12));  
        }else {
               obj.EQUIPMENT = content[11].trim();
        }
        
        
        if(content[12] === ''  || content[12] === null){
     	   obj.FEE = content[12];
        }
        else if(utils.NotDecimalCheck(content[12])){
        	csvErrorList.push(csvMessage('PER_DIEM_NOT_VALID',
                    obj.ROW_INDEX, 13));
        }
        else {
        	obj.PER_DIEM = content[12];
        }  
        
        if ( content[13] === ''  || content[13] === null){
            csvErrorList.push(csvMessage('PER_DIEM_ACTIVE_IS_MANDATORY',
                  obj.ROW_INDEX, 14));           
     }else if ( regex.test(content[13]) === false ) {
         csvErrorList.push(csvMessage('PER_DIEM_ACTIVE_IS_INVALID',
                 obj.ROW_INDEX, 14));
     } else {obj.PER_DIEM_ACTIVE = content[13];
            
     }
        DataSet.push(obj);
    }
    return DataSet;
};

    


var checkLeaseContractName = function() {
    return "p_lease_contract_validate";
};

var saveLeaseContractName = function() {
    return "p_lease_contract_save";
};

var uploadLeaseContractName = function() {
    return "p_lease_contract_upload";
};

var cleanLeaseContractName = function() {
    return "p_lease_contract_temporary_data_clean";
};


var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    // return different check procedure name according to the type
    var checProcName = checkLeaseContractName();

    // return different check procedure name according to the type
    var uploadProcName = uploadLeaseContractName();

    // check the remaining element in the procedure
    var checkCSVProc, uploadCSVProc;
    checkCSVProc = new proc.procedure(constants.SCHEMA_NAME,
            constants.SP_PKG_DATA_UPLOAD + '::' + checProcName);
    if (csvErrorList.length === 0){    
    csvErrorList = csvErrorList.concat(checkCSVProc(csvFormat,
            100).INVALID_ITEMS);
    }

    if (csvErrorList.length === 0) {
        // if there are no invalid items, save them to the database
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_DATA_UPLOAD + '::' + uploadProcName);
        // insert CSV content to temporary table
        uploadCSVProc(csvFormat, resourceCategory, connectionId);        
    }
    return csvErrorList;
};


var save = function(resourceCategory, connectionId) {    
    // save the upload file(csv)
    var procName, saveCSVProc,createResults;
    try {
        procName = saveLeaseContractName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId, resourceCategory);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LEASE_CONTRACT_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLeaseContractName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LEASE_CONTRACT_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};

