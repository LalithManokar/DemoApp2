var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var model = $.import("/sap/tm/trp/service/model/dataprotection.xsjslib");

var consentService = new lib.SimpleRest(
        {
            name : "consent",
            desc : "upload CSV",
            model: new model.Consent()
        });

var csvErrorList = [];

//csv's check error message according to the database
var csvMessage = function(msgCode, rowIndex, colIndex) {
    return {
        REASON_CODE : msgCode,
        ROW_INDEX : rowIndex,
        COL_INDEX : colIndex
    };
};

//rewrite unmarshall
lib.ContentType.csv = {
    type : [ "application/vnd.ms-excel", "text/csv" ],
    unmarshall : function(content) {
        return content.replace(/"/g, "");
    },
    priority : lib.ContentType.Priority.MIN_PRIORITY
};

var checkCSVEmpty = function(content) {
    return content === "undefined" ? true : false;
};

//check time to be YYYY-MM-DDTHH:MM:SS
var formatTimeCheck = function(str) {
    var re = /^(?:(?!0000)[0-9]{4}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:0[48]|[2468][048]|[13579][26])00)-02-29)T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    var result = re.test(str);
    return !result;
};

function parseConsentFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "consent.csv");
    } catch (e) {
        logger.error("CONSENT_FILE_ANTIVIRUS_FAILED",
                'CONSENT', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("CONSENT_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

var formatConsentFile = function(data) {
    var Consent = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 5) {
            logger.error("COSENT_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'CONSENT', i, content.length, 5);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [5]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.USERNAME = content[0];
        if (formatTimeCheck(content[1])) {
            csvErrorList
                    .push(csvMessage('VALID_FROM', obj.ROW_INDEX, 2));
            // give the default value in case the dberror when upload check
            obj.VALID_FROM = '1970-01-01T00:00:00';
        } else {
            obj.VALID_FROM = content[1];
        }
        if (formatTimeCheck(content[2])) {
            csvErrorList
                    .push(csvMessage('VALID_TO', obj.ROW_INDEX, 3));
            // give the default value in case the dberror when upload check
            obj.VALID_TO = '1970-01-01T00:00:00';
        } else {
            obj.VALID_TO = content[2];
        }
        obj.CONSENT_STATEMENT = content[3];
        obj.ENABLED_FLAG = content[4];
        Consent.push(obj);
    }
    return Consent;
};

/**
 * Parse Cost CSV
 * 
 * @param tranFile
 */
consentService.upload = function(params) {
    // get the CONNECTION_ID, ACTION, SEQUENCE
    var metaData = params.obj[0];
    var connection_id = metaData.CONNECTION_ID;
    var action = metaData.ACTION;
    var sequence = metaData.SEQUENCE;
    
    //get CSV file
    var csv = params.obj[1];
    
    // check the csv file is empty or not
    if (checkCSVEmpty(csv)) {
        throw new lib.InternalError(messages.MSG_ERROR_CSV_IS_EMPTY);
    }

    // parse the csv file
    var csvParse = parseConsentFile(csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatConsentFile(csvParse.content || []);

    var checProcName = "sap.tm.trp.db.dataprotectionprivacy::p_ext_user_consent_validate";

    var saveProcName = "sap.tm.trp.db.dataprotectionprivacy::p_ext_user_consent_upload";

    // write to the database
    try {
        // check the remaining element in the procedure
        var uploadCSVProc, saveCSVProc;
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME, checProcName);
        csvErrorList = csvErrorList.concat(uploadCSVProc(csvFormat).INVALID_USER_CONSENT);

        if (csvErrorList.length === 0) {
            // if there are no invalid items, save them to the database
            saveCSVProc = new proc.procedure(constants.SCHEMA_NAME, saveProcName);
            saveCSVProc(csvFormat, connection_id, action, sequence);
        }
        return csvErrorList;
    } catch (e) {
        logger.error("USER_CONSENT_FILE_UPLOAD_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_USER_CONSENT_UPLOAD, e);
    }
};

/**
 * Delete user consent.
 * If user consent doesn't exists, notify user
 * @param {string} USER_NAME user's consent to delete.
 */
consentService.delete = function(params){
    var deleteUserConsentProcName = "sap.tm.trp.db.dataprotectionprivacy::p_ext_user_consent_delete";
    var errMsg = "USER_CONSENT_DELETE_FAILED";
    try{
        var deleteUserConsentProc, deleteMessage;
        deleteUserConsentProc = new proc.procedure(constants.SCHEMA_NAME, deleteUserConsentProcName);
        deleteMessage = deleteUserConsentProc(params.obj.userName);
        if (deleteMessage.MESSAGE === 'USER_NOT_EXIST') {
            //throw user consent not found exception
            throw new lib.NotFoundError(messages.MSG_ERROR_USER_CONSENT_NOT_EXIST, null);
        }
    }catch(e){
        logger.error(errMsg, e);
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_USER_CONSENT_FAILED, e);
    }
};

consentService.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "upload"
},{
    method : $.net.http.DELETE,
    scope : "collection",
    action : "delete"
}]);


try {
    consentService.handle();
} finally {
    logger.close();
}