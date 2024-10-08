var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");

function executeDeleteInvalidUser() {
    var conn;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        var deteleProc = new proc.procedure("SAP_TM_TRP", "sap.tm.trp.db.dataprotectionprivacy::p_ext_user_delete_by_invalid_consent", {
            connection: conn
        });
        deteleProc();
        conn.commit();
    } catch (e) {
        conn.rollback();
        logger.error("PR_DELETE_INVALID_USER", e);
    } finally {
        if (conn) {
            conn.close();
        }
        logger.close();
    }
}

function run() {
    //execute
    executeDeleteInvalidUser();
}
