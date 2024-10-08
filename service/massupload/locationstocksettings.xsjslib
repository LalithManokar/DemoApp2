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
        anti.scan(content, "location_stock_settings.csv");
    } catch (e) {
        logger.error("LOCATION_STOCK_SETTINGS_FILE_ANTIVIRUS_FAILED",
                'Location Stock Settings', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LOCATION_STOCK_SETTINGS_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 7) {
            logger.error("LOCATION_STOCK_SETTINGS_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Location Stock Settings', i, content.length, 6);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [7]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0].length > 20 )
        {
        	csvErrorList.push(csvMessage('LOCATION_STOCK_NAME_GT_20',
                     obj.ROW_INDEX, 1));  
        }else {
        	obj.LOCATION_NAME = content[0].trim();
        }
        
        if ( content[1].length > 20 )
        {
        	csvErrorList.push(csvMessage('LOCATION_STOCK_RESOURCE_NAME_GT_20',
                     obj.ROW_INDEX, 2));  
        }else {
        	obj.RESOURCE_TYPE = content[1].trim();
        }
        
        if (utils.NotNumberCheck(content[2])){
            csvErrorList.push(csvMessage('RESOURCE_FILTER_TYPE_INVALID',
                    obj.ROW_INDEX, 3));
            // give the default value in case the dberror when upload check
        } else {
            obj.RESOURCE_FILTER_TYPE = content[2] || null;
        }
        
        
        if (content[3] === null || content[3] === ""){
            obj.MIN_SAFETY_STOCK = content[3] || null;
            
        } else {
            
            if(utils.isNumber(content[3])){
                obj.MIN_SAFETY_STOCK = content[3];
            }else {
            csvErrorList.push(csvMessage('MIN_SAFETY_STOCK_NOT_VALID',
                    obj.ROW_INDEX, 4));
            }
            // give the default value in case the dberror when upload check
        }
        
        if (content[4] === null || content[4] === ""){
            obj.MAX_SAFETY_STOCK = content[4] || null;
            
        } else {
            if(utils.isNumber(content[4])){
                obj.MAX_SAFETY_STOCK = content[4];
            }else {
            csvErrorList.push(csvMessage('MAX_SAFETY_STOCK_NOT_VALID',
                    obj.ROW_INDEX, 5));
            }
            // give the default value in case the dberror when upload check
        }        
        
        if (content[5] === null || content[5] === ""){
            obj.MAX_PHYSICAL_STOCK = content[5] || null;
            
        } else {
            if(utils.isNumber(content[5])){
                obj.MAX_PHYSICAL_STOCK = content[5];
            }else {
            csvErrorList.push(csvMessage('MAX_CAPACITY_NOT_VALID',
                    obj.ROW_INDEX, 6));
            }
            // give the default value in case the dberror when upload check
        }

        if (content[6] === null || content[6] === ""){
            obj.HANDLING_CAPACITY = content[6] || null;
            
        } else {
            if(utils.isNumber(content[6])){
                obj.HANDLING_CAPACITY = content[6];
            }else {
            csvErrorList.push(csvMessage('HANDLING_CAPACITY_INVALID',
                    obj.ROW_INDEX, 7));
            }
            // give the default value in case the dberror when upload check
        }

        DataSet.push(obj);
    }
    return DataSet;
};


var checkLocationStockSettingsName = function() {
    return "p_location_stock_settings_validate";
};

var saveLocationStockSettingsName = function() {
    return "p_location_stock_settings_save";
};

var uploadLocationStockSettingsName = function() {
    return "p_location_stock_settings_upload";
};

var cleanLocationStockSettingsName = function() {
    return "p_location_stock_settings_temporary_data_clean";
};


var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);

    // return different check procedure name according to the type
    var checProcName = checkLocationStockSettingsName();

    // return different check procedure name according to the type
    var uploadProcName = uploadLocationStockSettingsName();

    // check the remaining element in the procedure
    var checkCSVProc, uploadCSVProc;
    checkCSVProc = new proc.procedure(constants.SCHEMA_NAME,
            constants.SP_PKG_DATA_UPLOAD + '::' + checProcName);
    // proceed with procedure only if all initial checks are passed.    
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
        procName = saveLocationStockSettingsName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(resourceCategory,connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LOCATION_STOCK_SETTINGS_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
    
};

var cancel = function(connectionId) {
    // clean the temporary data table
    var procName, cleanDataProc;
    try {
        procName = cleanLocationStockSettingsName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LOCATION_STOCK_SETTINGS_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};