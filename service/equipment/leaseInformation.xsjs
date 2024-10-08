var model = $.import("/sap/tm/trp/service/model/equipment.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var reviseSDArraylib = $.import('/sap/tm/trp/service/xslib/reviseSDArray.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE=constants.SP_PKG_LEASECONTRACT;

var leaseInformationService = new lib.SimpleRest({
    name: "Lease Information",
    desc: "provides lease information",
    model: new model.LeaseInformation()
});

leaseInformationService.facetFilter = function(params) {
    try {
        var filterProc = new proc.procedure(
            SCHEMA,
            [PACKAGE, 'sp_equipment_lease_facet_filter'].join('::')
        );
        var filteredData = filterProc(
            params.obj.search,
            params.obj.RESOURCE_CATEGORY,
            params.obj.FILTER_LEASE_PERIOD_BY,
            params.obj.FROM_DATE,
            params.obj.TO_DATE,
            params.obj.LEASE_CONTRACT_TYPE_LIST_INPUT
        ).FILTERED_OUTPUT;
        var leaseContractTypeList = filteredData.map(function(row){
            return {
                key: row.LEASE_CONTRACT_TYPE,
                text: row.LEASE_CONTRACT_TYPE,
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());
        return {
            LEASE_CONTRACT_TYPE:leaseContractTypeList

        };
    } catch (e) {
        logger.error("LEASE_INFORMATION_FACET_FILTER_GET_FAILED",
                JSON.stringify(params),
                e);
        throw e;
    }
};

leaseInformationService.checkPerDiemAuthorization = function() {
    var privilege = "sap.tm.trp.service::DisplayPerdiem";
    var auth = $.session.hasAppPrivilege(privilege);

    if (!auth) {
        logger.warn("LEASE_INFORMATION_DISPLAY_PER_DIEM_NOT_AUTHORIZED",
                $.session.getUsername(),
                privilege);
    }

    return auth;
}
;

leaseInformationService.setFilters({
    filter: function() {
        var priv="sap.tm.trp.service::LeasePlanner";
        if (!$.session.hasAppPrivilege(priv)) {
            throw new lib.NotAuthorizedError(priv);
        }
        return true;
}});

leaseInformationService.setRoutes([
{
    method: $.net.http.POST,
    scope: 'collection',
    action: 'facetFilter'
},
{
    method: $.net.http.GET,
    scope: "collection",
    action: "checkPerDiemAuthorization"
}
]);

try {
    leaseInformationService.handle();
} finally {
    logger.close();
}