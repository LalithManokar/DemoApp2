function Routing() {
    this.init = function(obj, getParams) {
        obj.supplyDemandCode = getParams("supply_demand_code");
        obj.fromLocation = getParams("from_location");
        obj.toLocation = getParams("to_location");
        obj.POINT_1 = getParams("POINT_1");
        obj.POINT_2 = getParams("POINT_2");
    };
}

Routing.prototype = {
    validates: [],
    afterInitialize: [{
        method: "init",
        on: ["queryRoute", "queryBasicPath", "queryCompositePath"]
    }]
};
