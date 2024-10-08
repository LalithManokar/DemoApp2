var TRP = {
        railxs: $.import('/sap/tm/trp/service/xslib/railxs.xsjslib'),
        constants: $.import('/sap/tm/trp/service/xslib/constants.xsjslib'),
        Procedure: $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').procedure,
        utils: $.import('/sap/tm/trp/service/xslib/utils.xsjslib')
    };

var check = function(){
    var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
    var conn = $.db.getConnection();
    var failedCheckList = [];
    var checkConfigList = [
        {
            getTableProcedure: 'p_get_location_related_tables',
            checkQueryStrTemplate: 'SELECT CHECK_TBL.%COL% FROM "%SCHEMA%"."%TBL%" AS CHECK_TBL ' +
                'LEFT OUTER JOIN "sap.tm.trp.db.semantic.location::v_all_location" AS LOC_TBL ON CHECK_TBL.%COL% = LOC_TBL.ID ' +
                'WHERE LOC_TBL.ID IS NULL AND CHECK_TBL.%COL% IS NOT NULL',
            appLogMessageEntry: {
                success: "LOCATION_CONSISTENCY_CHECK_OK",
                fail: "LOCATION_CONSISTENCY_CHECK_FAILED"
            },
            errorMsgTemplate: "Location Consistency Check Failed.  Failed Locations: %ERROR_INFO%"
        },
        {
            getTableProcedure: 'p_get_zone_related_tables',
            checkQueryStrTemplate: 'SELECT CHECK_TBL.%COL% FROM "%SCHEMA%"."%TBL%" AS CHECK_TBL ' +
                'LEFT OUTER JOIN "sap.tm.trp.db.semantic.location::v_all_zone" AS ZONE_ID_TBL ON CHECK_TBL.%COL% = ZONE_ID_TBL.ID ' +
                'WHERE ZONE_ID_TBL.ID IS NULL AND CHECK_TBL.%COL% IS NOT NULL',
            appLogMessageEntry: {
                success: "ZONE_CONSISTENCY_CHECK_OK",
                fail: "ZONE_CONSISTENCY_CHECK_FAILED"
            },
            errorMsgTemplate: "Zone Consistency Check Failed.  Failed Zones: %ERROR_INFO%"
        },
        {
            getTableProcedure: 'p_get_resource_related_tables',
            checkQueryStrTemplate: 'SELECT CHECK_TBL.%COL% FROM "%SCHEMA%"."%TBL%" AS CHECK_TBL ' +
                'LEFT OUTER JOIN "sap.tm.trp.db.semantic.resource::v_resource_master" AS RES_TBL ON CHECK_TBL.%COL% = RES_TBL.RESOURCE_ID ' +
                'WHERE RES_TBL.RESOURCE_ID IS NULL AND CHECK_TBL.%COL% IS NOT NULL',
            appLogMessageEntry: {
                success: "RESOURCE_CONSISTENCY_CHECK_OK",
                fail: "RESOURCE_CONSISTENCY_CHECK_FAILED"
            },
            errorMsgTemplate: "Resource Consistency Check Failed.  Failed Resources: %ERROR_INFO%"
        }
    ];
    try {
        failedCheckList = checkConfigList.map(function(checkConfig){
            var getRelatedTableInfo = new TRP.Procedure(
                TRP.constants.SCHEMA_NAME,
                [TRP.constants.SP_PKG_CONSISTENCY_CHECK, checkConfig.getTableProcedure].join('::'),
                {connection: conn}
            );
            var relatedTableList = [];
            var checkResultList = [];
            var invalidTableList = [];
            var quote = TRP.utils.quote;
            relatedTableList = getRelatedTableInfo().TABLE_COL_INFO;
            checkResultList = relatedTableList.map(function(tableColInfo){
                var checkQueryStr = checkConfig.checkQueryStrTemplate
                        .replace(/%COL%/g, tableColInfo.COLUMN_NAME)
                        .replace(/%TBL%/g, tableColInfo.TABLE_NAME)
                        .replace(/%SCHEMA%/g, tableColInfo.SCHEMA_NAME);
                var pstmt = conn.prepareStatement(checkQueryStr);
                var resultSet = pstmt.executeQuery();
                var invalidValueList = [];
                var valueListRemaining = 5;
                while (resultSet.next()){
                    //to prevent that too many invalid values
                    if (valueListRemaining > 0){
                        invalidValueList.push(resultSet.getString(1));
                        valueListRemaining--;
                    }
                    else {
                        invalidValueList.push("...");
                        break;
                    }
                }
                return {
                    COLUMN: quote(tableColInfo.SCHEMA_NAME) + '.' + quote(tableColInfo.TABLE_NAME) + ':' + quote(tableColInfo.COLUMN_NAME),
                    INVALID_VALUES: invalidValueList
                };
            });
            invalidTableList = checkResultList.filter(function(checkResult){
                return checkResult.INVALID_VALUES.length > 0
            });
            if (invalidTableList.length > 0){
                var errorInfo = invalidTableList.map(
                    function(invalidColValInfo){
                        return invalidColValInfo.COLUMN + ': [' + invalidColValInfo.INVALID_VALUES.join(',') + ']'
                    }
                ).join(';\n');
                logger.error(
                    checkConfig.appLogMessageEntry.fail,
                    errorInfo
                );
                return {
                    success: false,
                    errorMsg: checkConfig.errorMsgTemplate.replace(/%ERROR_INFO%/g, errorInfo)
                };
            }
            else {
                logger.success(
                    checkConfig.appLogMessageEntry.success
                );
                return {
                    success: true,
                    errorMsg: ""
                };
            }
        }).filter(function(checkResult){return !checkResult.success;});
        //throw the exception here
        if (failedCheckList.length > 0){
            throw new TRP.railxs.InternalError("TRP Consistency Check Error: \n" + failedCheckList.map(function(failedCheck){return failedCheck.errorMsg;}).join("\n"));
        }
    }
    finally {
        logger.close();
    }
};

/*
var message = "";
try {
    check();
    message = "OK";
}
catch (e){
    message = e.toString();
}
$.response.status = $.net.http.OK;
$.response.contentType = "application/json";
$.response.setBody(JSON.stringify({
    result: message
}));
*/
