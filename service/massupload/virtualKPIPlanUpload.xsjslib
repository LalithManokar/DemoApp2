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
        anti.scan(content, "Virtual_KPI_PLAN.csv");
    } catch (e) {
        logger.error("VIRTUAL_KPI_PLAN_FILE_ANTIVIRUS_FAILED",
                'Virtual KPI Plan', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("VIRTUAL_KPI_PLAN_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};


var formatCSVFiles = function(data) {
    var DataSet = [], content = [], i, j,obj, visibilityName;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        
        if (content.length !== 7) {
            logger.error("VIRTUAL_KPI_PLAN_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Virtual KPI Plan', i, content.length, 7);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [7]});
        }
        
         for(j = 0; j < 7; j++) {
        	if(typeof content[j] === 'string') {
        		content[j] = content[j].trim();
        	}
        }
        
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        if ( content[0] === '' || content[0] === null){
        	csvErrorList.push(csvMessage('VKPI_PLAN_NAME_IS_MANDATORY',
                    obj.ROW_INDEX, 1));
        }else if (utils.NotValidNameCheck(content[0])){
        	csvErrorList.push(csvMessage('UPLOAD_OBJECT_NAME_INVALID',
                    obj.ROW_INDEX, 1));
        }else {
        	obj.VKPIPLAN_NAME = content[0].toUpperCase(); //Virtual KPI Plan name
        }
        
        if (content[1].length > 40){
        	csvErrorList.push(csvMessage('UPLOAD_DESC_LENGTH_TOO_HIGH',
                    obj.ROW_INDEX, 2));
        }else {
        	obj.DESCRIPTION = content[1];
        }
        
        obj.TYPE_NAME = content[2];
        
        if ( utils.NotValidVisibilityCheck(content[3])){
             csvErrorList.push(csvMessage('VISIBILITY_INVALID',
                    obj.ROW_INDEX, 4));
        } else {
          obj.VISIBILITY = content[3].trim(); // visiblity
        }
        
        if( content[4].length > 20 ){
        	csvErrorList.push(csvMessage('UPLOAD_LOC_FLT_GE_20',
                    obj.ROW_INDEX, 5));
        	// give the default value in case the dberror when do validation
        	obj.LOCATION_FILTER_NAME = content[4];
        }else{
          obj.LOCATION_FILTER_NAME = content[4];	
        }
        
        if( content[5].length > 20){
        	csvErrorList.push(csvMessage('UPLOAD_RES_FLT_GE_20',
                    obj.ROW_INDEX, 6));
        	// give the default value in case the dberror when do validation
        	obj.RESOURCE_FILTER_NAME = content[5];
        }else{
          obj.RESOURCE_FILTER_NAME = content[5];
        }
        
        if(content[6].length > 20){
          csvErrorList.push(csvMessage('UPLOAD_SKPI_PLAN_GE_20',obj.ROW_INDEX, 7));
          obj.SKPIPLAN_NAME = content[6]; 
        }else{
          obj.SKPIPLAN_NAME = content[6];
        }
        DataSet.push(obj);
    }
    return DataSet;
};


var upload = function(csv, resourceCategory, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);
  
    var checProcName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_virtual_kpi_plan_validate'; 
    var uploadProcName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_virtual_kpi_plan_upload';

    var checkCSVProc, uploadCSVProc, createResults;
    
    if (csvErrorList.length === 0) {
    	// check the remaining element in the procedure
	   checkCSVProc = new proc.procedure(constants.SCHEMA_NAME, checProcName);
	   csvErrorList = checkCSVProc(csvFormat,resourceCategory,100).INVALID_ITEMS;
   
    if (csvErrorList.length === 0) {
        // if there are no invalid items, save them to the corresponding temporary table
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME, uploadProcName);
        createResults = uploadCSVProc(csvFormat, resourceCategory, connectionId);
     }
    }
    return csvErrorList;
};

var save = function(resourceCategory, connectionId) {    
    // save corresponding temporary table data to table
    var procName, saveCSVProc, createResults, scheduleDetails;
    
    procName =  constants.SP_PKG_DATA_UPLOAD + '::' + 'p_virtual_kpi_plan_save';
    saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    createResults = saveCSVProc(connectionId, resourceCategory);
    return createResults.EXECUTION_RESULTS;  
};

var cancel = function(connectionId) {
    // clean corresponding temporary table data 
    var procName, cleanDataProc;
 
    procName = constants.SP_PKG_DATA_UPLOAD + '::' + 'p_virtual_kpi_plan_temporary_data_clean';
    cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, procName);
    cleanDataProc(connectionId);    
};