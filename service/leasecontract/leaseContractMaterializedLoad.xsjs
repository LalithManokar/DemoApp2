var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var handler = $.import("/sap/tm/trp/service/leasecontract/materializedViewHandler.xsjslib");
var jobFactory = $.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var leaseContractFullMaterializtion = new lib.SimpleRest({
    name: "Lease Contract Full Materializtion",
    desc: "Lease Contract Full Materializtion Service",
    model:{}
});

var notifier = new handler.MaterializedViewNotifier(handler.SOURCE.LOCATION); 

leaseContractFullMaterializtion.notify = function(params) {
    notifier.notify(-1,-1,handler.ACTION.EXTERNAL);
    return 1;
    
};

leaseContractFullMaterializtion.refresh = function(params) {
    try {
        jobFactory.create("MaterializedViewHandler job - Refresh","sap.tm.trp.service.leasecontract","materializedViewHandler","execute",{});
        logger.success(
                "LEASE_CONTRACT_MATERIALIZATION_REFRESH"
            );
    } catch(e) {
        logger.error("LEASE_CONTRACT_MATERIALIZATION_REFRESH_ERROR",
            e);
        throw e;
    }
    return 1;
};


leaseContractFullMaterializtion.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "notify"
},
{
    method: $.net.http.GET,
    scope: "collection",
    action: "refresh"
}
]);

try {
    leaseContractFullMaterializtion.handle();
} finally {
    logger.close();
}