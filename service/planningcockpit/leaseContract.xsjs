var model = $.import("/sap/tm/trp/service/model/planninglease.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var reviseSDArraylib = $.import('/sap/tm/trp/service/xslib/reviseSDArray.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_LEASECONTRACT;

var planningLeaseInformationService = new lib.SimpleRest({
    name: "Lease Information",
    desc: "provide lease information",
    model: new model.PlanningLeaseInformation()
});

planningLeaseInformationService.queryFacetFilter = function(params) {
    try {
        var filterProc = new proc.procedure(
            SCHEMA,
            [PACKAGE, 'p_get_lease_contract_availablity_facet_filter'].join('::')
        );
        var filteredData = filterProc(
            params.obj.search,
            params.obj.LEASE_CONTRACT_TYPE_LIST_INPUT,
            params.obj.LOCATION,
            params.obj.DATE,
            params.obj.RESOURCE_TYPE,
            params.obj.DEMAND_QUANTITY,
            params.obj.SCENARIO_ID,
            params.obj.HIRE_TYPE
        ).LEASE_CONTRACT_TYPE_OUTPUT;

        return {LEASE_CONTRACT_TYPE:filteredData.map(function(i) { return {key : i.KEY, text : i.TEXT};})};
    } catch (e) {
        logger.error("LEASE_CONTRACT_FACET_FILTER_FAILED",
            logger.Parameter.String(0, JSON.stringify(params)),
            logger.Parameter.Exception(1, e)
        );
    }
}



planningLeaseInformationService.facetFilter = function(params) {
    try {
        var filterProc = new proc.procedure(
            SCHEMA,
            [PACKAGE, 'sp_planning_cockpit_lease_facet_filter'].join('::')
        );
        var filteredData = filterProc(
            params.obj.search,
            params.obj.HIRE_TYPE,
            params.obj.LOCATION,
            params.obj.DATE,
            params.obj.RESOURCE_TYPE,
            params.obj.DEMAND_QUANTITY,
            params.obj.SCENARIO_ID,
            params.obj.LESSOR_LIST_INPUT,
            params.obj.LEASE_CONTRACT_TYPE_LIST_INPUT
        ).FILTERED_OUTPUT;

        var lessorList = filteredData.map(function(row){
            return {
                key: row.LESSOR,
                text: row.LESSOR
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());

        var leaseContractTypeList = filteredData.map(function(row){
            return {
                key: row.LEASE_CONTRACT_TYPE,
                text: row.LEASE_CONTRACT_TYPE
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());

        logger.success("LEASE_CONTRACT_FACET_FILTER", logger.Parameter.String(0, JSON.stringify(params)));

        return {
            LESSOR: lessorList,
            LEASE_CONTRACT_TYPE:leaseContractTypeList
        };
    } catch (e) {
        logger.error("LEASE_CONTRACT_FACET_FILTER_FAILED",
            logger.Parameter.String(0, JSON.stringify(params)),
            logger.Parameter.Exception(1, e)
        );
    }
};

planningLeaseInformationService.setFilters({
    filter: function() {
        var priv="sap.tm.trp.service::LeasePlanner";
        if (!$.session.hasAppPrivilege(priv)) {
            throw new lib.NotAuthorizedError(priv);
        }
        return true;
}});
planningLeaseInformationService.setRoutes([
{
    method: $.net.http.POST,
    scope: 'collection',
    action: 'facetFilter'
},{
    method: $.net.http.POST,
    scope: 'collection',
    action: 'queryFacetFilter'
}
]);

try {
    planningLeaseInformationService.handle();
} finally {
    logger.close();
}
