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
        anti.scan(content, "location_groups.csv");
    } catch (e) {
        logger.error("LOCATION_GROUP_FILE_ANTIVIRUS_FAILED",
                'Location Groups', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LOCATION_GROUP_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var regex = /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 6) {
            logger.error("LOCATION_GROUP_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Location Groups', i, content.length, 6);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [6]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('LOCATION_GROUP_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }else if ( regex.test(content[0]) === false ) {
            csvErrorList.push(csvMessage('LOCATION_GROUP_NAME_INVALID',
                     obj.ROW_INDEX, 1));
        }else if ( content[0].length > 20 ) {
        	csvErrorList.push(csvMessage('LOCATION_GROUP_ID_GT_20',
                    obj.ROW_INDEX, 1));
        }else {
        	obj.LOCATION_GROUP_NAME = content[0].trim();
        }
        
        if ( content[1].length > 40 )
        {
          csvErrorList.push(csvMessage('LOCATION_GROUP_DESC_LIMIT',
                     obj.ROW_INDEX, 2));  
        }else {
        obj.DESC = content[1].trim();
        }
        
        if ( content[2].length > 50 )
        {
        	csvErrorList.push(csvMessage('LOCATION_GROUP_TYPE_GT_50',
                     obj.ROW_INDEX, 3));  
        }else {
        	obj.LOC_GROUP_TYPE = content[2].trim();
        }
                     
        if ( utils.NotValidVisibilityCheck(content[3])){
             csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
        } else {
          obj.VISIBILITY = content[3].trim(); // visiblity
        }
        
        if ( content[4].length > 20 )
        {
        	csvErrorList.push(csvMessage('LOCATION_GROUP_LOCATION_NAME_GT_20',
                     obj.ROW_INDEX, 5));  
        }else {
        	obj.LOCATION_NAME = content[4].trim();
        }
        
        if ( content[5].length > 20 )
        {
        	csvErrorList.push(csvMessage('LOCATION_GROUP_PRIME_LOCATION_NAME_GT_20',
                     obj.ROW_INDEX, 6));  
        }else {
        	obj.PRIME_LOCATION_NAME = content[5].trim();
        }
               
        DataSet.push(obj);
    }
    return DataSet;
};


var checkLocationGroupsName = function() {
    return "p_location_group_validate";
};

var saveLocationGroupsName = function() {
    return "p_location_group_save";
};

var uploadLocationGroupsName = function() {
    return "p_location_group_upload";
};

var cleanLocationGroupsName = function() {
    return "p_location_group_temporary_data_clean";
};


var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    // return different check procedure name according to the type
    var checProcName = checkLocationGroupsName();

    // return different check procedure name according to the type
    var uploadProcName = uploadLocationGroupsName();

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
        procName = saveLocationGroupsName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(resourceCategory,connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LOCATION_GROUP_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLocationGroupsName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LOCATION_GROUP_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};