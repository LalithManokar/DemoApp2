var helper = $.import("/sap/tm/trp/service/common/job/JobHelper.xsjslib");
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var ruleExecutor = $.import('/sap/tm/trp/service/archive/executeRule.xsjslib');

function execute(input)
{
    var id = null,jobStatus;
    try {
        id = input.threadId;
        //Get the thread meta data info
        var meta = helper.getThreadMetaData(id);
        if(meta === null || meta === undefined || meta.STATUS < helper.STATUS.SCHEDULED )
        {
            jobStatus = helper.STATUS.ERROR;
            throw new lib.InternalError("Unable to find thread metadata for id " + id);
        }
        if(meta.STATUS === helper.STATUS.RUNNING)
        {
            jobStatus = helper.STATUS.RUNNING;
            //$.trace.debug("scheduleisrunning");
            throw new lib.InternalError("Thread instance is running for ID= " + id);
        }
        //Import and execute the lib
        $.import(meta.PKG,meta.LIB);
        /*
        --this is old way trigger schedule job to archive data
        var remotefn = eval("$." + meta.PKG + "." + meta.LIB + "." + meta.FUNCTION);
        helper.setStatus(id,helper.STATUS.RUNNING);
        var result = remotefn(meta.PARAMS);
        */
        helper.setStatus(id,helper.STATUS.RUNNING);
        ruleExecutor.execute(id,meta.PARAMS);
        
        helper.setStatus(id,helper.STATUS.SUCCESS);
        logger.success("JOB_EXECUTED", id);
    } catch(e) {
        logger.error("JOB_EXECUTE_FAILED",
            id,
            e);
        helper.setStatus(id,jobStatus);
    } finally {
        logger.close(); 
    }
}