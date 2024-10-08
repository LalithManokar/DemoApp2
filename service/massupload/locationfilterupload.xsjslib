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
        anti.scan(content, "location_filter_upload.csv");
    } catch (e) {
        logger.error("LOCATION_FILTER_FILE_ANTIVIRUS_FAILED",
                'Location Filter Upload', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LOCATION_FILTER_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var regex = /^[A-Z][A-Z0-9_]{0,19}$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 5) {
            logger.error("LOCATION_FILTER_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Location Filter', i, content.length, 5);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [5]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('LOCATION_FILTER_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }else if ( regex.test(content[0]) === false ) {
            csvErrorList.push(csvMessage('LOCATION_FILTER_NAME_INVALID',
                     obj.ROW_INDEX, 1));
        }else{
        	obj.LOCATION_FILTER_NAME = content[0].toUpperCase();
        }
      
        // although descritpion field is 500 in DB table we are only using 40 
        //because in ui only 40 are visible correctly
        if(content[1].length > 40)
        {
        	  csvErrorList.push(csvMessage('DESCRIPTION_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 1));
        }
        else        	
        {
        	obj.DESCRIPTION = content[1];
        }
        
        if ( content[2] === ''  || content[2] === null){
        	csvErrorList.push(csvMessage('LOCATION_FILTER_TYPE_IS_MANDATORY',
                     obj.ROW_INDEX, 3));
        }
        else{
        obj.LOCATION_FILTER_TYPE = content[2].toUpperCase();
        }
        if ( utils.NotValidVisibilityCheck(content[3])){
             csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
        } else {
          obj.VISIBILITY = content[3]; // visiblity
        }
        if ( content[4] === ''  || content[4] === null){
        	csvErrorList.push(csvMessage('LOCATION_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 5));
        }
        else if(content[4].length >20)
        {
        	csvErrorList.push(csvMessage('LOCATION_NAME_LENGTH_TOO_HIGH',
                    obj.ROW_INDEX, 5));
        }
        else{
        obj.LOCATION_NAME = content[4];   
        }
        DataSet.push(obj);
    }
    return DataSet;
};


var checkLocationFilterName = function() {
    return "p_location_filter_validate";
};

var saveLocationFilterName = function() {
    return "p_location_filter_save";
};

var uploadLocationFilterName = function() {
    return "p_location_filter_upload";
};

var cleanLocationFilterName = function() {
    return "p_location_filter_temporary_data_clean";
};


var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    // return different check procedure name according to the type
    var checProcName = checkLocationFilterName();

    // return different check procedure name according to the type
    var uploadProcName = uploadLocationFilterName();

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
    var procName, saveCSVProc,createResults;
    try {
        procName = saveLocationFilterName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(resourceCategory,connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LOCATION_FILTER_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
    
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLocationFilterName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LOCATION_FILTER_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};