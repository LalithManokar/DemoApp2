var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
// var graphCalc =
// $.import("/sap/tm/trp/service/planningcockpit/transportNetwork.xsjslib");
var model = $.import('/sap/tm/trp/service/model/costModel.xsjslib');
var calculate = $
        .import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var csvErrorList = [];

csvParser.setLineSeparator(csvParser.LINE_SEPARATOR_WINDOWS);
csvParser.setSeparator(",");

// rewrite unmarshall
lib.ContentType.csv = {
    type : [ "application/vnd.ms-excel", "text/csv" ],
    unmarshall : function(content) {
        return content.replace(/"/g, "");
    },
    priority : lib.ContentType.Priority.MIN_PRIORITY
};

var costDataSetService = new lib.SimpleRest(
        {
            name : "cost dataset",
            desc : "create/update/delete cost dataset & triggerRefresh/upload/download CSV",
            model : new model.costDataset()
        });

function getUserInfoAuthCheck(costDatasetId) {
    var checkUserTypeProc = "sap.tm.trp.db.costmodel::p_get_user_info_for_auth_check_cost_dataset";
    var getUserType = new proc.procedure(
            constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(costDatasetId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session
                .getUsername()) {
            logger.error("COST_DATASET_ACCESS_NOT_AUTHORIZED",
                    userType.CREATOR,
                    $.session.getUsername());

            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

var checkCSVEmpty = function(content) {
    return content === "undefined" ? true : false;
};

// check some column in the csv whether it is a number
var NotNumberCheck = function(int) {
    var re = /^\d+$/;
    return !re.test(int);
};

// check some column in the csv whether it is Decimal(13,3)
var NotDecimalCheck = function(int) {
    var re = /^\d{1,9}\.?\d{0,3}$/;
    return !re.test(int);
};

// check the default storage cost dataset
var NotDefaultStorageCostCheck = function(thresholdFrom, location,
        resourceType, uom) {
    return !(thresholdFrom === -1 && location === '*' && resourceType === '*' && uom === 'TEU');
};

// check time to be HH:MM:SS OR HH:MM:SS AM/PM/am/pm
var formatTimeCheck = function(str) {
    var re = /^(?:[01]\d|2[0-3])(?::[0-5]\d){2}(\s)*(AM|PM|am|pm)?$/;
    var result = re.test(str);
    return !result;
};

// csv's check error message according to the database
var csvMessage = function(msgCode, rowIndex, colIndex) {
    return {
        REASON_CODE : msgCode,
        ROW_INDEX : rowIndex,
        COL_INDEX : colIndex
    };
};

function parseDistanceBasedFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "cost_dataset.csv");
    } catch (e) {
        logger.error("COST_DATASET_FILE_ANTIVIRUS_FAILED",
                'Distance-based cost', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("COST_DATASET_DISTANCE_BASED_COST_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

function parseLocationBasedFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "cost_dataset.csv");
    } catch (e) {
        logger.error("COST_DATASET_FILE_ANTIVIRUS_FAILED",
                'Location-based cost', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("COST_DATASET_LOCATION_BASED_COST_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

function parseHandlingFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "cost_dataset.csv");
    } catch (e) {
        logger.error("COST_DATASET_FILE_ANTIVIRUS_FAILED", 'Handling cost', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("COST_DATASET_HANDLING_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

function parseTimeBasedFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "cost_dataset.csv");
    } catch (e) {
        logger
                .error("COST_DATASET_FILE_ANTIVIRUS_FAILED", 'Time-based cost',
                        e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("COST_DATASET_TIME_BASED_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

function parseQuantityBasedFile(content) {
    try {
        var anti = new $.security.AntiVirus();
        anti.scan(content, "cost_dataset.csv");
    } catch (e) {
        logger.error("COST_DATASET_FILE_ANTIVIRUS_FAILED",
                'Quantity-based cost', e);
        throw new lib.InternalError(messages.MSG_ERROR_VIRUS_SCAN, e);
    }

    try {
        return csvParser.parse(content);
    } catch (e) {
        logger.error("COST_DATASET_QUANTITY_BASED_FILE_PARSE_FAILED", e);
        throw new lib.ValidationError(messages.MSG_ERROR_PARSE_FILE, e);
    }
}

var parseCSVFiles = function(type, content) {
    var csv;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        csv = parseDistanceBasedFile(content);
        break;
    case 'LOCATION_BASED_COST':
        csv = parseLocationBasedFile(content);
        break;
    case 'HANDLING_COST':
        csv = parseHandlingFile(content);
        break;
    case 'TIME_STORAGE_COST':
        csv = parseTimeBasedFile(content);
        break;
    case 'QTY_STORAGE_COST':
        csv = parseQuantityBasedFile(content);
        break;
    }
    return csv;
};

/**
 * Format dataset cost into JSON format
 * 
 * @param data
 * @returns {Array}
 */

var formatDistanceBasedFile = function(data) {
    var CostDataSet = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 5) {
            logger.error("COST_DATASET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'Distance based cost', i, content.length, 5);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [5]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.TRANSPORTATION_MODE_CODE = content[0];
        obj.RESOURCE_TYPE = content[1];
        obj.CARRIER_ID = content[2];
        obj.UOM_CODE = content[3];
        if (NotDecimalCheck(content[4])){
            csvErrorList.push(csvMessage('COST_INVALID',
                    obj.ROW_INDEX, 5));
            // give the default value in case the dberror when upload check
            obj.COST = 0;
        } else {
            obj.COST = content[4] || null;
        }
        obj.DATA_SOURCE_CODE = null;
        obj.LAST_MODIFIED_ON = null;
        CostDataSet.push(obj);
    }
    return CostDataSet;
};

var formatLocationBasedFile = function(data) {
    var CostDataSet = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 7) {
            logger.error("COST_DATASET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'location based cost', i, content.length, 7);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [7]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.FROM_LOCATION_NAME = content[0];
        obj.TO_LOCATION_NAME = content[1];
        obj.TRANSPORTATION_MODE_CODE = content[2];
        obj.RESOURCE_TYPE = content[3];
        obj.CARRIER_ID = content[4];
        obj.UOM_CODE = content[5];
        if (NotDecimalCheck(content[6])){
            csvErrorList.push(csvMessage('COST_INVALID',
                    obj.ROW_INDEX, 7));
            // give the default value in case the dberror when upload check
            obj.COST = 0;
        } else {
            obj.COST = content[6] || null;
        }
        obj.DATA_SOURCE_CODE = null;
        obj.LAST_MODIFIED_ON = null;
        CostDataSet.push(obj);
    }
    return CostDataSet;
};

var formatHandlingFile = function(data) {
    var CostDataSet = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 7) {
            logger.error("COST_DATASET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'handling cost', i, content.length, 7);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [7]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.LOCATION_NAME = content[0];
        obj.HANDLING_TYPE = content[1];
        obj.FROM_MOT = content[2];
        obj.TO_MOT = content[3];
        obj.RESOURCE_TYPE = content[4];
        obj.UOM_CODE = content[5];
        if (NotDecimalCheck(content[6])){
            csvErrorList.push(csvMessage('COST_INVALID',
                    obj.ROW_INDEX, 7));
            // give the default value in case the dberror when upload check
            obj.COST = 0;
        } else {
            obj.COST = content[6] || null;
        }
        obj.DATA_SOURCE_CODE = null;
        obj.LAST_MODIFIED_ON = null;
        CostDataSet.push(obj);
    }
    return CostDataSet;
};

var formatTimeBasedFile = function(data) {
    var CostDataSet = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 6) {
            logger.error("COST_DATASET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'time based cost', i, content.length, 6);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [6]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.RESOURCE_TYPE = content[0] || null;
        obj.LOCATION_NAME = content[1] || null;
        if (NotNumberCheck(content[2])) {
            csvErrorList.push(csvMessage('THRESHOLD_FROM_INVALID',
                    obj.ROW_INDEX, 3));
            // give the default value in case the dberror when upload
            obj.THRESHOLD_FROM = 0;
        } else {
            obj.THRESHOLD_FROM = parseInt(content[2], 10);
        }
        if (NotNumberCheck(content[3]) && content[3] !== null
                && content[3] !== 'NULL' && content[3].trim().length !== 0) {
            csvErrorList.push(csvMessage('THRESHOLD_TO_INVALID', obj.ROW_INDEX,
                    4));
            // give the default value in case the dberror when upload check
            obj.THRESHOLD_TO = 0;
        } else {
            obj.THRESHOLD_TO = parseInt(content[3], 10) || null;
        }
        if (NotDecimalCheck(content[4])){
            csvErrorList.push(csvMessage('PER_DIEM_COST_INVALID',
                    obj.ROW_INDEX, 5));
            // give the default value in case the dberror when upload check
            obj.PER_DIEM_COST = 0;
        } else {
            obj.PER_DIEM_COST = content[4] || null;
        }
        obj.UOM_CODE = content[5] || null;
        obj.DATA_SOURCE_CODE = null;
        obj.LAST_MODIFIED_ON = null;
        CostDataSet.push(obj);
    }
    return CostDataSet;
};

var formatQuantityBasedFile = function(data) {
    var CostDataSet = [], content = [], i;
    for (i = 0; i < data.length; i++) {
        content = data[i];
        if (content.length !== 9) {
            logger.error("COST_DATASET_FILE_VALIDATION_COLUMN_COUNT_FAILED",
                    'quantity based cost', i, content.length, 9);
            throw new lib.ValidationError(messages.MSG_ERROR_CSV_FORMAT, {args: [9]});
        }
        var obj = {};
        // line number start from 2
        obj.ROW_INDEX = i + 2;
        obj.RESOURCE_TYPE = content[0];
        obj.LOCATION_NAME = content[1];
        obj.FREE_POOL_TYPE = content[2];
        if (NotNumberCheck(content[3])) {
            csvErrorList.push(csvMessage('START_AT_INVALID', obj.ROW_INDEX, 4));
            // give the default value in case the dberror when upload check
            obj.START_AT = 0;
        } else {
            obj.START_AT = parseInt(content[3], 10);
        }
        if (formatTimeCheck(content[4])) {
            csvErrorList
                    .push(csvMessage('START_TIME_INVALID', obj.ROW_INDEX, 5));
            // give the default value in case the dberror when upload check
            obj.START_TIME = '08:00:00';
        } else {
            obj.START_TIME = content[4];
        }
        if (NotNumberCheck(content[5])) {
            csvErrorList.push(csvMessage('THRESHOLD_FROM_INVALID',
                    obj.ROW_INDEX, 6));
            // give the default value in case the dberror when upload check
            obj.THRESHOLD_FROM = 0;
        } else {
            obj.THRESHOLD_FROM = parseInt(content[5], 10);
        }
        if (NotNumberCheck(content[6]) && content[6] !== null
                && content[6] !== 'NULL' && content[6].trim().length !== 0) {
            csvErrorList.push(csvMessage('THRESHOLD_TO_INVALID', obj.ROW_INDEX,
                    7));
            // give the default value in case the dberror when upload check
            obj.THRESHOLD_TO = 0;
        } else {
            obj.THRESHOLD_TO = parseInt(content[6], 10) || null;
        }
        if (NotDecimalCheck(content[7])){
            csvErrorList.push(csvMessage('PER_DIEM_COST_INVALID',
                    obj.ROW_INDEX, 8));
            // give the default value in case the dberror when upload check
            obj.PER_DIEM_COST = 0;
        } else {
            obj.PER_DIEM_COST = content[7] || null;
        }
        obj.UOM_CODE = content[8] || null;
        obj.DATA_SOURCE_CODE = null;
        obj.LAST_MODIFIED_ON = null;
        CostDataSet.push(obj);
    }
    return CostDataSet;
};

var formatCSVFiles = function(type, content) {
    var format;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        format = formatDistanceBasedFile(content);
        break;
    case 'LOCATION_BASED_COST':
        format = formatLocationBasedFile(content);
        break;
    case 'HANDLING_COST':
        format = formatHandlingFile(content);
        break;
    case 'TIME_STORAGE_COST':
        format = formatTimeBasedFile(content);
        break;
    case 'QTY_STORAGE_COST':
        format = formatQuantityBasedFile(content);
        break;
    }
    return format;
};

var checkCostDatasetName = function(type) {
    var name;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        name = "sp_distance_based_cost_validate";
        break;
    case 'LOCATION_BASED_COST':
        name = "sp_location_based_cost_validate";
        break;
    case 'HANDLING_COST':
        name = "sp_handling_based_cost_validate";
        break;
    case 'TIME_STORAGE_COST':
        name = "sp_time_based_storage_cost_validate";
        break;
    case 'QTY_STORAGE_COST':
        name = "sp_quantity_based_storage_cost_validate";
        break;
    }
    return name;
};

var saveCostDatasetName = function(type) {
    var name;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        name = "sp_distance_based_cost_upload";
        break;
    case 'LOCATION_BASED_COST':
        name = "sp_location_based_cost_upload";
        break;
    case 'HANDLING_COST':
        name = "sp_handling_based_cost_upload";
        break;
    case 'TIME_STORAGE_COST':
        name = "sp_time_based_storage_cost_upload";
        break;
    case 'QTY_STORAGE_COST':
        name = "sp_quantity_based_storage_cost_upload";
        break;
    }
    return name;
};

/**
 * Parse Cost CSV
 * 
 * @param tranFile
 */
costDataSetService.upload = function(params) {
    // get resource category from query string
    var resourceCategory = params.get("RESOURCE_CATEGORY");
    // get the CONNECTION_ID, ACTION, SEQUENCE
    var metaData = params.obj[0];
    var connection_id = metaData.CONNECTION_ID;
    var action = metaData.ACTION;
    var sequence = metaData.SEQUENCE;
    var type = metaData.TYPE;
    var csv = params.obj[1];

    // check the csv file is empty or not
    if (checkCSVEmpty(csv)) {
        throw new lib.InternalError(messages.MSG_ERROR_CSV_IS_EMPTY);
    }

    // parse the csv file
    var csvParse = parseCSVFiles(type, csv);

    // format the csv content according to the procedure, then save it
    var csvFormat = formatCSVFiles(type, csvParse.content || []);

    // return different check procedure name according to the type
    var checProcName = checkCostDatasetName(type);

    // return different check procedure name according to the type
    var saveProcName = saveCostDatasetName(type);

    // write to the database
    try {
        // check the remaining element in the procedure
        var uploadCSVProc, saveCSVProc;
        uploadCSVProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + checProcName);
        csvErrorList = csvErrorList.concat(uploadCSVProc(csvFormat,
                resourceCategory).INVALID_ITEMS);

        if (csvErrorList.length === 0) {
            // if there are no invalid items, save them to the database
            saveCSVProc = new proc.procedure(constants.SCHEMA_NAME,
                    constants.SP_PKG_COSTMODEL + '::' + saveProcName);
            saveCSVProc(csvFormat, connection_id, action, sequence);
        }
        return csvErrorList;
    } catch (e) {
        logger.error("COST_DATASET_FILE_UPLOAD_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_UPLOAD, e);
    }
};

var costDatasetInfoName = function(type) {
    var name;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        name = "sap.tm.trp.db.costmodel/cv_distance_based_cost_download/proc";
        break;
    case 'LOCATION_BASED_COST':
        name = "sap.tm.trp.db.costmodel/cv_location_based_cost_download/proc";
        break;
    case 'HANDLING_COST':
        name = "sap.tm.trp.db.costmodel/cv_handling_based_cost_download/proc";
        break;
    case 'TIME_STORAGE_COST':
        name = "sap.tm.trp.db.costmodel/cv_time_based_cost_download/proc";
        break;
    case 'QTY_STORAGE_COST':
        name = "sap.tm.trp.db.costmodel/cv_quantity_based_cost_download/proc";
        break;
    }
    return name;
};

/**
 * download cost dataset as zip file
 */
costDataSetService.download = function(params) {
    var data, downloadCSVProc;
    // return different procedure name according to the type
    var procedureName = costDatasetInfoName(params.obj.type);
    // get cost dataset
    try {
        downloadCSVProc = new proc.procedure("_SYS_BIC", procedureName);
        data = downloadCSVProc(params.id).VAR_OUT;
    } catch (e) {
        logger.error("COST_DATASET_GET_DOWNLOAD_DATA_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_DOWNLOAD, e);
    }

    if (data === null) {
        logger.error("COST_DATASET_DOWNLOAD_NO_DATA");
        throw new lib.BadRequestError(
                "Could not retrieve costmodel data for costmodel '" + params.id
                        + "' from database");
    }

    // Export as CSV
    try {
        var fileInfo = constants.COST_DATASET_CSV_FILES[params.obj.type];
        zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
                data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
                ","));
        // Here some manual override has to be done, not responding via RailXS
        $.response.status = $.net.http.OK;
        $.response.contentType = "application/zip";
        $.response.headers.set("Content-Disposition",
                "attachment; filename = \"costdataset_" + params.obj.name + '_'
                        + params.obj.type + ".zip\"");
        $.response.setBody(zipper.createZip());
    } catch (e) {
        logger.error("COST_DATASET_DOWNLOAD_FAILED", params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_DOWNLOAD, e);
    }
};

// create a cost dataset
costDataSetService.create = function(params) {
    var newId, saveDatasetProc, procedureName;
    procedureName = 'sp_cost_dataset_save';
    try {
        saveDatasetProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + procedureName);
        newId = saveDatasetProc(params.obj.COST_DATASET_ID, params.obj.NAME,
                params.obj.DESC, params.obj.COST_TYPE_CODE,
                params.obj.CURRENCY_CODE, params.obj.CONNECTION_TYPE_CODE,
                params.obj.DEFAULT_UOM_CODE, params.obj.PURCHASE_ORG_ID,
                params.obj.AGREEMENT_ID, params.obj.PROFILE_ID,
                params.obj.EXPIRED_DURATION, params.obj.CARRIER_ID_LIST,
                params.obj.CONNECTION_ID, params.obj.RESOURCE_CATEGORY).ID;
        return newId;
    } catch (e) {
        logger.error("COST_DATASET_CREATE_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_CREATE, e);
    }
};

// update a cost dataset
costDataSetService.update = function(params) {
    var saveDatasetProc, checkDatasetProc, updateMessage, procedureName, checkProcedureName, costModelNameList = [];
    procedureName = 'sp_cost_dataset_save';
    checkProcedureName = 'sp_cost_dataset_carrier_check';
    try {
        // check the confict about cost model in carrier
        checkDatasetProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + checkProcedureName);
        costModelNameList = checkDatasetProc(params.id,
                params.obj.CARRIER_ID_LIST).COST_MODEL_WITH_CARRIER_CONFLICT;
    } catch (e) {
        logger.error("COST_DATASET_UPDATE_FAILED", params.id, e);
        throw new lib.InternalError(
                messages.MSG_ERROR_CHECK_COST_MODEL_WITH_CARRIER_CONFLICT, e);
    }

    if (costModelNameList.length > 0) {
        for (var i in costModelNameList) {
            throw new lib.InternalError(
                    messages.MSG_ERROR_COST_MODEL_WITH_CARRIER_CONFLICT, {
                        args : [costModelNameList[i].NAME]
                    });
        }
    }

    try {
        saveDatasetProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + procedureName);
        updateMessage = saveDatasetProc(params.id, params.obj.NAME,
                params.obj.DESC, params.obj.COST_TYPE_CODE,
                params.obj.CURRENCY_CODE, params.obj.CONNECTION_TYPE_CODE,
                params.obj.DEFAULT_UOM_CODE, params.obj.PURCHASE_ORG_ID,
                params.obj.AGREEMENT_ID, params.obj.PROFILE_ID,
                params.obj.EXPIRED_DURATION, params.obj.CARRIER_ID_LIST,
                params.obj.CONNECTION_ID, params.obj.RESOURCE_CATEGORY).OUT_MESSAGE;

        if (updateMessage !== "MSG_SUCCESS_STATUS") {
            throw new lib.InternalError(updateMessage);
        }
    } catch (e) {
        logger.error("COST_DATASET_UPDATE_FAILED", params.id, e);
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_UPDATE, e);
    }
};

// delete a cost dataset
costDataSetService.destroy = function(params) {
    var deleteDatasetProc, procedureName, result = 0;
    procedureName = 'sp_cost_dataset_delete';
    try {
        deleteDatasetProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + procedureName);
        result = deleteDatasetProc(params.id).IS_DATASET_USED_BY_COST_MODEL;
        // result = 1 means that a dataset has been used by a cost model
        if (result === 1) {
            throw new lib.InternalError(messages.MSG_COST_DATASET_IS_USED);
        }
    } catch (e) {
        logger.error("COST_DATASET_DELETE_FAILED", params.id, e);
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_DELETE, e);
    }
};
/**
 * Cancel Editing Cost Dataset
 */
costDataSetService.cancel = function(params) {
    // clean the upload file(csv)
    var procName, cleanDataProc;
    try {
        procName = constants.SP_PKG_COSTMODEL
                + "::sp_cost_model_temporary_data_clean";
        cleanDataProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        cleanDataProc(params.obj.CONNECTION_ID);
    } catch (e) {
        logger.error("COST_DATASET_TEMPORARY_DATA_CLEAN_FAILED",
                params.obj.CONNECTION_ID, e);
        throw new lib.InternalError(messages.MSG_ERROR_COST_DATASET_CLEAN, e);
    }
};

/**
 * facet filter in cost dataset
 */
costDataSetService.queryFacetFilter = function(params) {
    try {
        var query = new proc.procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.costmodel::sp_cost_dataset_facet_filter");
        var result = query(params.obj.search, params.obj.cost_type,
                params.obj.currency_code, params.obj.RESOURCE_CATEGORY);
        return {
            COST_TYPE_CODE : result.COST_TYPE_CODE_LIST_OUTPUT.map(function(
                    item) {
                return {
                    key : item.CODE,
                    text : item.DESC
                };
            }),
            CURRENCY_CODE : result.CURRENCY_CODE_LIST_OUTPUT
                    .map(function(item) {
                        return {
                            key : item.CODE,
                            text : item.DESC
                        };
                    })
        };
    } catch (e) {
        logger.error("QUERY_COST_DATASET_FACET_FILTER_FAILED", e);
        throw new lib.InternalError(
                messages.MSG_ERROR_FACET_FILTER_COST_DATASET, e);
    }

};

costDataSetService.setFilters([ {
    filter : function(params) {
        var conn, checkResult, checkProc;
        try {
            conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
            conn.setAutoCommit(false);
            checkProc = new proc.procedure(constants.SCHEMA_NAME,
                    'sap.tm.trp.db.costmodel::p_cost_dataset_delete_check', {
                        connection : conn
                    });
            checkResult = checkProc(params.id).WHEREUSED;
            conn.commit();
        } catch (e) {
            conn.rollback();
            logger.error("COST_DATASET_CHECK_FAILED", params.id, e);
            throw new lib.InternalError(
                    messages.MSG_COST_DATASET_CHECK_USED_FAILED, e);
        }
        if (checkResult.length > 0) {
            throw new lib.InternalError(messages.MSG_COST_DATASET_IS_USED);
        }
        return true;
    },
    only : [ "destroy" ]
},{
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "destroy" ]
}, {
    filter : function(params) {
        try {
          return getUserInfoAuthCheck(params.id);
        } catch (e) {
            if (e instanceof lib.WebApplicationError) {
                throw e;
            }
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
} ]);

var PrepareDataProcName = function(type) {
    var name;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        name = "sp_distance_based_cost_trigger_refresh_info_prepare";
        break;
    case 'LOCATION_BASED_COST':
        name = "sp_location_based_cost_trigger_refresh_info_prepare";
        break;
    /*
     * case 'HANDLING_COST' : name =
     * "sp_handling_based_cost_trigger_refresh_info_prepare"; break; case
     * 'TIME_STORAGE_COST' : name =
     * "sp_time_based_storage_cost_trigger_refresh_info_prepare"; break; case
     * 'QTY_STORAGE_COST' : name =
     * "sp_quantity_based_storage_cost_trigger_refresh_info_prepare"; break;
     */
    }
    return name;
};

var upsetProcName = function(type) {
    var name;
    switch (type) {
    case 'DISTANCE_BASED_COST':
        name = "sp_distance_based_cost_connection_result_upsert";
        break;
    case 'LOCATION_BASED_COST':
        name = "sp_location_based_cost_connection_result_upsert";
        break;
    /*
     * case 'HANDLING_COST' : name = "replicateHandingBasedTransportCostFromTM";
     * break; case 'TIME_STORAGE_COST' : name =
     * "replicateTimeStorageTransportCostFromTM"; break; case 'QTY_STORAGE_COST' :
     * name = "replicateQTYStorageTransportCostFromTM"; break;
     */
    }
    return name;
};

/**
 * trigger refresh in cost dataset
 */
costDataSetService.triggerRefresh = function(params) {
    var conn, prepareDataProc, prepareResult, prepareProcedureName, datasetConnectionInfo = [], costDatasetData = [], upsetProcedureName, upsetProc, cost;
    try {
        // prepare data
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        prepareProcedureName = PrepareDataProcName(params.obj.TYPE);
        prepareDataProc = new proc.procedure(constants.SCHEMA_NAME,
                constants.SP_PKG_COSTMODEL + '::' + prepareProcedureName, {
                    connection : conn
                });
        prepareResult = prepareDataProc(params.id);
        datasetConnectionInfo = prepareResult.DATASET_CONNECTION_INFO;
        if (params.obj.TYPE === 'DISTANCE_BASED_COST') {
            costDatasetData = prepareResult.DISTANCE_BASED_OUT;
        } else if (params.obj.TYPE === 'LOCATION_BASED_COST') {
            costDatasetData = prepareResult.LOCATION_BASED_OUT;
        }

        // call TM
        var cost = calculate.calculateCostFromTM(params.id,
                datasetConnectionInfo[0], costDatasetData, conn);

        // upset data
        if (cost && cost.length > 0) {
            upsetProcedureName = upsetProcName(params.obj.TYPE);
            upsetProc = new proc.procedure(constants.SCHEMA_NAME,
                    constants.SP_PKG_COSTMODEL + '::' + upsetProcedureName, {
                        connection : conn
                    });
            upsetProc(params.id, cost);
        }
        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("COST_DATASET_TRIGGER_REFRESH_FAILED", params.id, e);
        throw new lib.InternalError(messages.MSG_ERROR_TRIGGER_REFRESH, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

costDataSetService.setRoutes([ {
    method : $.net.http.GET,
    scope : "member",
    action : "download"
}, {
    method : $.net.http.POST,
    scope : "collection",
    action : "upload"
}, {
    method : $.net.http.PUT,
    scope : "collection",
    action : "cancel",
    response : $.net.http.NO_CONTENT
}, {
    method : $.net.http.POST,
    scope : "collection",
    action : "queryFacetFilter"
}, {
    method : $.net.http.PUT,
    scope : "member",
    action : "triggerRefresh",
    response : $.net.http.NO_CONTENT
} ]);

try {
    costDataSetService.handle();
} finally {
    logger.close();
}
