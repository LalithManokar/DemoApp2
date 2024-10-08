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
        anti.scan(content, "lessor_upload.csv");
    } catch (e) {
        logger.error("LESSOR_FILE_ANTIVIRUS_FAILED",
                'Lessor Upload', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("LESSOR_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
};

var formatCSVFiles = function(data) {
    
    var DataSet = [], content = [], i, obj;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 19) {
            logger.error("LESSOR_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Lessor', i, content.length, 19);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [19]});
        }
        obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        
        if ( content[0] === ''  || content[0] === null){
        	csvErrorList.push(csvMessage('CODE_IS_MANDATORY',
                     obj.ROW_INDEX, 1));
        }
        else{
        	obj.CODE = content[0];
        }
      
       
        if(content[0].length > 22)
        {
        	  csvErrorList.push(csvMessage('CODE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 1));
        }
        else        	
        {
        	obj.CODE = content[0];
        }
        
        if ( content[1] === ''  || content[1] === null){
        	csvErrorList.push(csvMessage('LESSOR_AGREEMENT_REFERENCE_IS_MANDATORY',
                     obj.ROW_INDEX, 2));
        }
        else{
        	obj.LESSOR_AGREMENT_REFERENCE = content[1];
        }
      
       
        if(content[1].length > 100)
        {
        	  csvErrorList.push(csvMessage('LESSOR_AGREEMENT_REFERENCE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 2));
        }
        else        	
        {
        	obj.LESSOR_AGREMENT_REFERENCE = content[1];
        }
        
        if ( content[2] === ''  || content[2] === null){
        	csvErrorList.push(csvMessage('NAME_IS_MANDATORY',
                     obj.ROW_INDEX,3));
        }
        else{
        	obj.NAME = content[2].toUpperCase();
        }
       
        if(content[2].length > 100)
        {
        	  csvErrorList.push(csvMessage('NAME_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 3));
        }
        else        	
        {
        	obj.NAME = content[2];
        }
        
        if ( content[3] === ''  || content[3] === null){
        	csvErrorList.push(csvMessage('ADDRESS_LINE1_IS_MANDATORY',
                     obj.ROW_INDEX, 4));
        }
        else{
        	obj.ADDRESS_LINE1 = content[3];
        }
             
        
        if(content[3].length > 255)
        {
        	  csvErrorList.push(csvMessage('ADDRESS_LINE1_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 4));
        }
        else        	
        {
        	obj.ADDRESS_LINE1 = content[3];
        }
        
        if(content[4].length > 255)
        {
        	  csvErrorList.push(csvMessage('ADDRESS_LINE2_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 5));
        }
        else        	
        {
        	obj.ADDRESS_LINE2 = content[4];
        }
        
        if(content[5].length > 255)
        {
        	  csvErrorList.push(csvMessage('ADDRESS_LINE3_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 6));
        }
        else        	
        {
        	obj.ADDRESS_LINE3 = content[5];
        }
        
        if(content[6].length > 1000)
        {
        	  csvErrorList.push(csvMessage('DESCRIPTION_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 7));
        }
        else        	
        {
        	obj.DESCRIPTION = content[6];
        }
        
        if(content[7].length > 40)
        {
        	  csvErrorList.push(csvMessage('CITY_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 8));
        }
        else        	
        {
        	obj.CITY = content[7];
        }
        
        if(content[8].length > 40)
        {
        	  csvErrorList.push(csvMessage('STATE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 9));
        }
        else        	
        {
        	obj.STATE = content[8];
        }
        
        if(content[9].length > 40)
        {
        	  csvErrorList.push(csvMessage('COUNTRY_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 10));
        }
        else        	
        {
        	obj.COUNTRY = content[9];
        }
        
        if(content[10].length > 10)
        {
        	  csvErrorList.push(csvMessage('POST_CODE_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 11));
        }
        else        	
        {
        	obj.POST_CODE = content[10];
        }
        
        
        if(content[11].length > 30)
        {
        	  csvErrorList.push(csvMessage('PHONE1_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 12));
        }
        else        	
        {
        	obj.PHONE1 = content[11];
        }
        
        if(content[12].length > 30)
        {
        	  csvErrorList.push(csvMessage('PHONE2_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 13));
        }
        else        	
        {
        	obj.PHONE2 = content[12];
        }
        
        
        if(content[13].length > 30)
        {
        	  csvErrorList.push(csvMessage('FAX_NUMBER1_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 14));
        }
        else        	
        {
        	obj.FAX_NUMBER1 = content[13];
        }
        
        if(content[14].length > 30)
        {
        	  csvErrorList.push(csvMessage('FAX_NUMBER2_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 15));
        }
        else        	
        {
        	obj.FAX_NUMBER2 = content[14];
        }
        
        
        if(content[15].length > 30)
        {
        	  csvErrorList.push(csvMessage('EMAIL1_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 16));
        }
        else        	
        {
        	obj.EMAIL1 = content[15];
        }
        
        
        if(content[16].length > 30)
        {
        	  csvErrorList.push(csvMessage('EMAIL2_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 17));
        }
        else        	
        {
        	obj.EMAIL2 = content[16];
        }
        
        
        if(content[17].length > 255)
        {
        	  csvErrorList.push(csvMessage('COMPANY_URL_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 18));
        }
        else        	
        {
        	obj.COMPANY_URL = content[17];
        }
        
        
        if(content[18].length > 255)
        {
        	  csvErrorList.push(csvMessage('IMAGE_URL_LENGTH_TOO_HIGH',
                      obj.ROW_INDEX, 19));
        }
        else        	
        {
        	obj.IMAGE_URL = content[18];
        }
        
        DataSet.push(obj);
    }
    return DataSet;
};


var checkLessor = function() {
    return "p_lessor_validate";
};


var saveLessor = function() {
    return "p_lessor_save";
};

var uploadLessor = function() {
    return "p_lessor_upload";
};

var cleanLessor = function() {
    return "p_lessor_temporary_data_clean";
};


var upload = function(csv, connectionId) {

    // parse the csv file
    var csvParse = parseCSVFiles(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(csvParse.content || []);
    
    // return different check procedure name according to the type
    var checProcName = checkLessor();

    // return different check procedure name according to the type
    var uploadProcName = uploadLessor();

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
        procName = saveLessor();
        saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        createResults = saveCSVProc(connectionId);
        return createResults.EXECUTION_RESULTS;
    } catch (e) {
        logger.error("LESSOR_SAVE_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
    
};

var cancel = function(connectionId) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = cleanLessor();
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + procName);
        cleanDataProc(connectionId);
    } catch (e) {
        logger.error("LESSOR_TEMPORARY_DATA_CLEAN_FAILED",
                connectionId, e);
        throw new lib.InternalError(messages.MSG_ERROR_TEMP_DATA_CLEAN, e);
    }
};