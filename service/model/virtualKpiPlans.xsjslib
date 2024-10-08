var lib = $.import('/sap/tm/trp/service/model/planLib.xsjslib');

var Plans = new lib.Plans();

Plans.availableInit = lib.availableInit;

Plans.checkInit = lib.checkInit;

Plans.infoInit = lib.infoInit;

Plans.kpiTableInit = lib.kpiTableInit;

Plans.kpiChartInit = lib.kpiChartInit;

Plans.mapInit = lib.mapInit;

lib.Plans.prototype.afterInitialize.push({
    method: 'availableInit',
    on: ['availablePlans']
}, {
    method: 'checkInit',
    on: ['checkSubPlan']
}, {
    method: 'infoInit',
    on: ['virtualPlanInfo']
}, {
    method: 'kpiTableInit',
    on: ['kpiByLocation', 'kpiByResource', "locationKpi", "resourceKpi"]
}, {
    method: 'kpiChartInit',
    on: ['kpiChartByLocation', 'kpiChartByResource']
}, {
    method: 'mapInit',
    on: ['alertsOnMap', 'bubbleOnMap', 'pieOnMap']
});
