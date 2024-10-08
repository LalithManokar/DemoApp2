var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
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
        anti.scan(content, "virtual_supply_demand_plan.csv");
    } catch (e) {
        logger.error("VIRTUAL_SUPPLY_DEMAND_PLAN_FILE_ANTIVIRUS_FAILED",
                'Virtual Supply And Demand Plan', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("VIRTUAL_SUPPLY_DEMAND_PLAN_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var regex = /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/;
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 7) {
            logger.error("VIRTUAL_SUPPLY_DEMAND_PLAN_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Virtual Supply And Demand Plan', i, content.length, 15);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [15]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMAND_PLAN_NAME_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }else if ( regex.test(content[0]) === false ) {
            csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMAND_PLAN_NAME_LIMIT_INVALID',
                     obj.ROW_INDEX, 1));
        }else{
        	obj.VSDP_NAME = content[0].trim();
        }
        
        if ( content[1].length > 40 )
        {
          csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMANS_PLAN_DESC_LIMIT',
                     obj.ROW_INDEX, 2));  
        }else {
            obj.DESCRIPTION = content[1].trim();
        }
        
        if (content[4].length > 20){
            csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMANS_PLAN_LOC_LIMIT',
                     obj.ROW_INDEX, 5));  
        }else{
            obj.LOCATION_FILTER_NAME = content[4].trim();
        }
        
        if (content[5].length > 20){
            csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMANS_PLAN_RES_LIMIT',
                     obj.ROW_INDEX, 6));  
        }else{
            obj.RESOURCE_FILTER_NAME = content[5].trim();
        }
        
        if (content[6].length > 20){
            csvErrorList.push(csvMessage('VIRTUAL_SUPPLY_DEMANS_PLAN_SDP_LIMIT',
                     obj.ROW_INDEX, 7));
        }else{
            obj.SDP_NAME = content[6].trim();
        }
        
        obj.TYPE_NAME = content[2].trim();
        //obj.LOCATION_FILTER_NAME = content[4].trim();
        //obj.RESOURCE_FILTER_NAME = content[5].trim();
        //obj.SDP_NAME = content[6].trim();
        
        if ( utils.NotValidVisibilityCheck(content[3])){
             csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
        } else {
          obj.VISIBILITY = content[3].trim(); // visiblity
        }
        
        DataSet.push(obj);
    }
    return DataSet;
};

var checkVirtualSupplyDemandPlanName = function() {
    return "p_virtual_supply_demand_plan_validate";
};

var saveVirtualSupplyDemandPlanName = function() {
    return "p_virtual_supply_demand_plan_save";
};

var uploadVirtualSupplyDemandPlanName = function() {
    return "p_virtual_supply_demand_plan_upload";
};

var cleanVirtualSupplyDemandPlanName = function() {
    return "p_virtual_supply_demand_plan_temporary_data_clean";
};

var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);
    
    if (csvErrorList.length > 0) {
    	return csvErrorList;
    }

    // return different check procedure name according to the type
    var checProcName = checkVirtualSupplyDemandPlanName();

    // return different check procedure name according to the type
    var uploadProcName = uploadVirtualSupplyDemandPlanName();

    // check the remaining element in the procedure
    var checkCSVProc, uploadCSVProc;
    checkCSVProc = new proc.procedure(constants.SCHEMA_NAME,
            constants.SP_PKG_DATA_UPLOAD + '::' + checProcName);
    csvErrorList = csvErrorList.concat(checkCSVProc(csvFormat,
            resourceCategory,100).INVALID_ITEMS);

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
    var procName, saveCSVProc, createResults;
    try {
        procName = saveVirtualSupplyDemandPlanName();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId, resourceCategory);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("VIRTUAL_SUPPLY_DEMAND_PLAN_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanVirtualSupplyDemandPlanName();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("VIRTUAL_SUPPLY_DEMAND_PLAN_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};