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
        anti.scan(content, "lease_contract_type_upload.csv");
    } catch (e) {
        logger.error("LEASE_CONTRACT_TYPE_FILE_ANTIVIRUS_FAILED",
                'Lease Contract Type Upload', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LEASE_CONTRACT_TYPE_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 2) {
           logger.error("LEASE_CONTRACT_TYPE_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Lease Contract Type', i, content.length, 2);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [2]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
             csvErrorList.push(csvMessage('LEASE_CONTRACT_TYPE_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }
        else{
             obj.LEASE_CONTRACT_TYPE = content[0].toUpperCase();
        }
      
       
        if(content[0].length > 22)
        {
               csvErrorList.push(csvMessage('LEASE_CONTRACT_TYPE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 1));
        }
        else              
        {
             obj.LEASE_CONTRACT_TYPE = content[0];
        }
        
        if ( content[1] === ''  || content[1] === null){
             csvErrorList.push(csvMessage('DESCRIPTION_IS_MANDATORY',
                     obj.ROW_INDEX, 2));
        }
        else{
             obj.DESCRIPTION = content[1].toUpperCase();
        }
       
        if(content[1].length > 100)
        {
               csvErrorList.push(csvMessage('DESCRIPTION_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 2));
        }
        else              
        {
             obj.DESCRIPTION = content[1];
        }
        
        DataSet.push(obj);
    }
    return DataSet;
};


var checkLeaseContractType = function() {
    return "p_lease_contract_type_validate";
};

var saveLeaseContractType = function() {
    return "p_lease_contract_type_save";
};

var uploadLeaseContractType = function() {
    return "p_lease_contract_type_upload";
};

var cleanLeaseContractType = function() {
    return "p_lease_contract_type_temporary_data_clean";
};


var upload = function(csv, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);
    
    // return different check procedure name according to the type
    var checProcName = checkLeaseContractType();

    // return different check procedure name according to the type
    var uploadProcName = uploadLeaseContractType();

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
        procName = saveLeaseContractType();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LEASE_CONTRACT_TYPE_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
    
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLeaseContractType();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LEASE_CONTRACT_TYPE_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};
