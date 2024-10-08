var lib = $.import('/sap/tm/trp/service/model/planLib.xsjslib');

var Plans = new lib.Plans();

Plans.locationInit = lib.locationInit;

Plans.kpiTableInit = lib.kpiTableInit;

Plans.kpiChartInit = lib.kpiChartInit;

Plans.mapInit = lib.mapInit;

lib.Plans.prototype.afterInitialize.push({
    method: 'locationInit',
    on: ['locations']
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
