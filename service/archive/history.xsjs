var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var model = $.import("/sap/tm/trp/service/model/archiveHistoryManagement.xsjslib");
var remote = $.import("/sap/tm/trp/service/xslib/remote.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var jobFactory=$.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");

var DATA_ARCHIVE_READ_MODE = "sap.tm.trp.service::DataArchiveRead";
var DATA_ARCHIVE_CONFIGURE_MODE = "sap.tm.trp.service::DataArchiveConfigure";
var DATA_ARCHIVE_RULE_CREATION_MODE = "sap.tm.trp.service::DataArchiveRuleCreation";
var DATA_ARCHIVE_RULE_EXECUTION_MODE = "sap.tm.trp.service::DataArchiveRuleExecution";
var DATA_ARCHIVE_NO_ACCESS = "sap.tm.trp.service::DataArchiveNoAccess";
var output = {};

var archiveHistoryManagement = new lib.SimpleRest({
    name : "Archive History Management",
    desc : "Archive History",
    model : new model.ArchiveHistoryManagement()
});

function doesRuleExist(ruleName){
    var sqlGet = "SELECT COUNT(1) AS COUNT FROM \"sap.tm.trp.db.archive::t_archive_rule\" WHERE RULE_NAME=? ";
    var conn,rs,count;
    var doesRuleNameExist = false;
    try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet,ruleName);
        count = rs[0]["COUNT"];        
        if(count>0) {
            doesRuleNameExist = true;
        }
        logger.success("RULE_NAME_VALIDATED", logger.Parameter.String(0, ruleName));
    }catch (e) {
        logger.error("RULE_NAME_VALIDATION_FAILURE", 
            logger.Parameter.String(0, ruleName),
            logger.Parameter.Exception(1, e));
        throw e;
    }
    finally {
        conn.close();
    }
    return doesRuleNameExist;
}

archiveHistoryManagement.facetFilter = function (params) {

    var filterProc = new proc.procedure(constants.SCHEMA_NAME, [
                'sap.tm.trp.db.archive', 'sp_archive_rule_history_facet_filter']
            .join('::'));
    var facetResult = filterProc(params.obj.search,
            params.obj.TYPES,params.obj.STATUS);
    
    var filteredTypes = facetResult.FILTERED_TYPE_OUTPUT;
    var filteredStatus = facetResult.FILTERED_STATUS_OUTPUT;
    var typeList = filteredTypes.map(function (row) {
            return {
                key : row.TYPE,
                text : row.TYPE_DESC
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());
    var statusList = filteredStatus.map(function (row) {
            return {
                key : row.STATUS,
                text : row.STATUS_DESC
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());        
    return {
        TYPE : typeList,
        STATUS : statusList

    }
};

archiveHistoryManagement.setFilters({
    filter : function () {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {

            logger.error("DATA_ARCHIVE_NO_ACCESS", logger.Parameter.String(0,
                    DATA_ARCHIVE_NO_ACCESS));
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_READ_MODE)) {
            logger.error("DATA_ARCHIVE_READ", logger.Parameter.String(0,
                    DATA_ARCHIVE_READ_MODE));
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_READ_MODE);
        }

        return true;

    },
    only : ["facetFilter"]
});

/**
 *
 */
archiveHistoryManagement.setRoutes([
    {
        method : $.net.http.POST,
        scope : 'collection',
        action : 'facetFilter'
    }
]);

try {
    archiveHistoryManagement.handle();    
} finally {
    logger.close();
}