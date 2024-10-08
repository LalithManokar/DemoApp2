var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var utils = $.import("/sap/tm/trp/service/massupload/utils.xsjslib");


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
        anti.scan(content, "lease_contract.csv");
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
    
    var regex = /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 13) {
            logger.error("LEASE_CONTRACT_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Lease Contracts', i, content.length, 13);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [13]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }else if ( regex.test(content[0]) === false ) {
            csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_INVALID',
                     obj.ROW_INDEX, 1));
        }else if ( content[0].length > 100 ) {
        	csvErrorList.push(csvMessage('LEASE_CONTRACT_REFERENCE_GT_100',
                    obj.ROW_INDEX, 1));
        }else {
        	obj.LEASE_CONTRACT_REFERENCE = content[0].trim();
        }
        
        if ( content[1] === ''  || content[1] === null){
        	csvErrorList.push(csvMessage('LEASE_TYPE_IS_MANDATORY',
                     obj.ROW_INDEX, 2));
        }else if ( regex.test(content[1]) === false ) {
            csvErrorList.push(csvMessage('LEASE_TYPE_INVALID',
                     obj.ROW_INDEX, 2));
        }else if ( content[1].length > 100 ) {
        	csvErrorList.push(csvMessage('LEASE_TYPE_GT_100',
                    obj.ROW_INDEX, 2));
        }else {
        	obj.LEASE_TYPE = content[1].trim();
        }
        
        if ( content[2] === ''  || content[2] === null){
        	csvErrorList.push(csvMessage('LESSOR_IS_MANDATORY',
                     obj.ROW_INDEX, 3));
        }else if ( regex.test(content[2]) === false ) {
            csvErrorList.push(csvMessage('LESSOR_INVALID',
                     obj.ROW_INDEX, 3));
        }else if ( content[2].length > 100 ) {
        	csvErrorList.push(csvMessage('LESSOR_GT_100',
                    obj.ROW_INDEX, 3));
        }else {
        	obj.LESSOR = content[2].trim();
        }
        
        if ( content[5] === ''  || content[2] === null){
        	csvErrorList.push(csvMessage('CURRENCY_CODE_IS_MANDATORY',
                     obj.ROW_INDEX, 6));
        } else if( content[5].length > 3 ) {
          csvErrorList.push(csvMessage('CURRENCY_CODE_GT_3',
                     obj.ROW_INDEX, 6));  
        } else {
        obj.CURRENCY_CODE= content[5].trim();
        }
        
        if ( content[6].length > 3 )
        {
        	csvErrorList.push(csvMessage('UNIT_GT_3',
                     obj.ROW_INDEX, 7));  
        }else {
        	obj.UNIT = content[6].trim();
        }
        
        if(utils.isNumber(content[7])){
            obj.MAX_HIER_QUANTITY = content[7];
        }else {
        csvErrorList.push(csvMessage('MAX_HIER_QUANTITY_NOT_VALID',
                obj.ROW_INDEX, 8));
        }
        
        
        if(utils.isNumber(content[8])){
            obj.MIN_HIER_QUANTITY = content[8];
        }else {
        	csvErrorList.push(csvMessage('MIN_HIER_QUANTITY_NOT_VALID',
                obj.ROW_INDEX, 9));
        }
        
        if ( content[9] === ''  || content[9] === null){
        	csvErrorList.push(csvMessage('ACTIVE_IS_MANDATORY',
                     obj.ROW_INDEX, 10));           
        } else if (utils.isNumber(content[9])){
            obj.MIN_HIER_QUANTITY = content[9];
        }else {
        	csvErrorList.push(csvMessage('ACTIVE_NOT_VALID',
                obj.ROW_INDEX, 10));
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
        
        
        if(utils.isNumber(content[12])){
            obj.PER_DIEM = content[12];
        }
        else if ( content[12].length > 13 )
        {
        	csvErrorList.push(csvMessage('PER_DIEM_GT_13',
                     obj.ROW_INDEX, 14));
        }else {
        	csvErrorList.push(csvMessage('PER_DIEM_NOT_VALID',
                obj.ROW_INDEX, 14));
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
            resourceCategory,100).INVALID_ITEMS);
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
    var procName, saveCSVProc,conn,createResults;
    try {
        procName = saveLeaseContractName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(resourceCategory,connectionId);
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