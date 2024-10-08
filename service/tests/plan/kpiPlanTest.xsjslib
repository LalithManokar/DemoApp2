/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, kpiPlansLib, planLib, xslib, plan, executor, logger;

describe('kpiPlans unit test', function() {
    // disable the handle method
    beforeOnce(function() {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() {
        };
        // lib to test
        kpiPlansLib = $.import('/sap/tm/trp/service/plan/kpiPlan.xsjslib');
        plan = kpiPlansLib.plan;
        // lib containing functions used by all plans
        planLib = kpiPlansLib.lib;

        // libs needed to be mocked
        xslib = kpiPlansLib.xslib;
        executor = kpiPlansLib.executor;
        logger = planLib.logger;
    });

    beforeEach(function() {
        // stub logger
        spyOn(logger, 'error');
        spyOn(logger, 'success');
        // stub job.schedule
        spyOn(planLib.jobManager, 'Job').and.callFake(function() {
            return {
                schedule : function() {
                    return {
                        create : function() {
                        },
                        update : function() {
                        },
                        cancel : function() {
                        }
                    };
                }
            };
        });
    });

    describe('create a new plan', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function(schemaName,
                    procName) {
                if (procName.indexOf('p_kpi_plan_create') > -1) {
                    return function(name) {
                        if (name === 'successTest') {
                            return {
                                PLAN_MODEL_ID : 1,
                                MESSAGE : 'MSG_SUCCESS_STATUS'
                            };
                        } else if (name === 'errorTest') {
                            return {
                                MESSAGE : 'MSG_ERROR_COST_MODEL_NOT_COVERED'
                            };
                        }
                    };
                } else {
                    return function(modelId) {
                        if (modelId) {
                            return 'success';
                        }
                    };
                }
            });
        });
        it('should create a new plan', function() {
            var params = {
                obj : {
                    NAME : 'successTest',
                    SCHEDULE : {
                        'RECURRENCE_TYPE' : '',
                        'RECURRENCE_INTERVAL' : '',
                        'START_TIME' : '',
                        'EXPIRY_TIME' : ''
                    },
                    RESOURCE_CATEGORY : ''
                }
            };

            expect(plan.create(params)).toEqual({
                ID : 1
            });
            expect(logger.success).toHaveBeenCalled();
        });

        it('should throw an InternalError', function() {
            var params = {
                obj : {
                    NAME : 'errorTest',
                    SCHEDULE : {
                        'RECURRENCE_TYPE' : '',
                        'RECURRENCE_INTERVAL' : '',
                        'START_TIME' : '',
                        'EXPIRY_TIME' : ''
                    },
                    RESOURCE_CATEGORY : ''
                }
            };
            expect(function() {
                plan.create(params);
            }).toThrowError(xslib.InternalError);
        });
    });

    describe('update a plan', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function(schemaName,
                    procName) {
                if (procName.indexOf('p_kpi_plan_update') > -1) {
                    return function(id, name) {
                        if (name === 'successTest') {
                            return {
                                MESSAGE : 'MSG_SUCCESS_STATUS'
                            };
                        } else {
                            return {
                                MESSAGE : 'MSG_ERROR_COST_MODEL_NOT_COVERED'
                            };
                        }
                    };
                } else {
                    return function() {
                    };
                }
            });
        });

        it('should update a plan', function() {
            var params = {
                id : 1,
                obj : {
                    NAME : 'successTest',
                    SCHEDULE : {
                        START_TIME : '',
                        EXPIRY_TIME : '',
                        RECURRENCE_TYPE : '',
                        RECURRENCE_INTERVAL : '',
                        RECURRENCE_DAY : ''
                    }
                }
            };

            plan.update(params);
            expect(logger.success).toHaveBeenCalled();
        });
    });

    describe('delete a plan', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function(id) {
                    if (id === 2) {
                        throw new Error('wrong id');
                    }
                };
            });
        });
        it('should delete a plan', function() {
            var params = {
                id : 1
            };
            plan.destroy(params);
            expect(logger.success).toHaveBeenCalled();
        });
        it('should throw an error', function() {
            var params = {
                id : 2
            };
            expect(function() {
                plan.destroy(params);
            }).toThrowError(xslib.InternalError);
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('kpi by location', function() {
        beforeEach(function() {
            spyOn(planLib, 'getSupplyDemandExecutionResultByLocation').and
                    .returnValue([ {
                        OUTPUT_VALUE : 1,
                        ALERT_STATUS : 0,
                        OUT_NODE_NAME : 'test1',
                        OUTPUT_KEY : 1,
                        PLAN_STATUS : 1
                    }, {
                        OUTPUT_VALUE : 1,
                        ALERT_STATUS : 0,
                        OUT_NODE_NAME : 'test2',
                        OUTPUT_KEY : 1,
                        PLAN_STATUS : 0
                    } ]);
        });

        it('should get kpi by location', function() {
            var params = {
                obj : {
                    execId : 1,
                    nodeId : 0
                }
            };

            expect(plan.kpiByLocation(params)).toEqual({
                results : [ {
                    ALERT_STATUS : 0,
                    PLAN_STATUS : 1,
                    DATA : {
                        VALUE : 1,
                        ALERT : 0
                    },
                    OUTPUT_NODE_NAME : 'test1',
                    OUTPUT_NODE_TYPE : 1
                }, {
                    ALERT_STATUS : 0,
                    PLAN_STATUS : 0,
                    DATA : {
                        VALUE : 1,
                        ALERT : 0
                    },
                    OUTPUT_NODE_NAME : 'test2',
                    OUTPUT_NODE_TYPE : 1
                } ],
                status : 0
            });
        });
    });

    describe('get kpi by resource', function() {
        var params;
        beforeEach(function() {
            params = {
                obj : {
                    execId : 1,
                    nodeId : 0
                }
            };
        });

        it('should get kpi', function() {
            spyOn(planLib, 'getSupplyDemandExecutionResultByResource').and
                    .returnValue([ {
                        OUTPUT_VALUE : 1,
                        ALERT_STATUS : 0,
                        OUT_NODE_NAME : 'test1',
                        OUTPUT_KEY : 1,
                        PLAN_STATUS : 1
                    }, {
                        OUTPUT_VALUE : 1,
                        ALERT_STATUS : 0,
                        OUT_NODE_NAME : 'test2',
                        OUTPUT_KEY : 1,
                        PLAN_STATUS : 0
                    } ]);

            expect(plan.kpiByResource(params)).toEqual({
                results : [ {
                    ALERT_STATUS : 0,
                    PLAN_STATUS : 1,
                    DATA : {
                        VALUE : 1,
                        ALERT : 0
                    },
                    OUTPUT_NODE_NAME : 'test1',
                    OUTPUT_NODE_TYPE : 1
                }, {
                    ALERT_STATUS : 0,
                    PLAN_STATUS : 0,
                    DATA : {
                        VALUE : 1,
                        ALERT : 0
                    },
                    OUTPUT_NODE_NAME : 'test2',
                    OUTPUT_NODE_TYPE : 1
                } ],
                status : 0
            });
        });

        it('should throw an WebApplicationError', function() {
            spyOn(planLib, 'getSupplyDemandExecutionResultByResource').and
                    .throwError(new xslib.WebApplicationError());

            expect(function() {
                plan.kpiByResource(params);
            }).toThrowError(xslib.WebApplicationError);
        });

        it('should throw an InternalError', function() {
            spyOn(planLib, 'getSupplyDemandExecutionResultByResource').and
                    .throwError(new Error('another error'));

            expect(function() {
                plan.kpiByResource(params);
            }).toThrowError(xslib.InternalError);
        });
    });

    describe('test locationKpi', function() {
        beforeEach(function() {
            spyOn(planLib, 'getLocationSupplyDemandExecutionResult').and
                    .callFake(function(geoId, execId, nodeId) {
                        switch (geoId) {
                        case 1:
                            return [ {
                                OUTPUT_VALUE : execId,
                                ALERT_STATUS : 0,
                                OUT_NODE_NAME : 0,
                                OUTPUT_KEY : nodeId,
                                PLAN_STATUS : 1
                            } ];
                        case 2:
                            throw new xslib.WebApplicationError();
                        default:
                            throw new Error('another error');
                        }
                    });
        });

        it('should get result', function() {
            var params = {
                obj : {
                    geoId : 1,
                    execId : 0,
                    nodeId : 1
                }
            };

            expect(plan.locationKpi(params)).toEqual({
                results : [ {
                    ALERT_STATUS : 0,
                    PLAN_STATUS : 1,
                    DATA : {
                        VALUE : params.obj.execId,
                        ALERT : 0
                    },
                    OUTPUT_NODE_NAME : 0,
                    OUTPUT_NODE_TYPE : params.obj.nodeId
                } ],
                status : 1
            });
        });

        it('should throw WebApplicationError', function() {
            var params = {
                obj : {
                    geoId : 2,
                    execId : 0,
                    nodeId : 1
                }
            };
            expect(function() {
                plan.locationKpi(params);
            }).toThrowError(xslib.WebApplicationError);
        });

        it('should throw InternalError', function() {
            var params = {
                obj : {
                    geoId : 3,
                    execId : 0,
                    nodeId : 1
                }
            };
            expect(function() {
                plan.locationKpi(params);
            }).toThrowError(xslib.InternalError);
        });
    });

    describe('test get kpi plan chart by location', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function(execId) {
                    switch (execId) {
                    case 0:
                        return {
                            LOCATION_OUTPUT : [ {
                                OUTPUT_VALUE : 0,
                                ALERT : 0,
                                OUTPUT_KEY : 0
                            }, {
                                OUTPUT_VALUE : 1,
                                ALERT : 1,
                                OUTPUT_KEY : 1
                            } ],
                            RESOURCE_OUTPUT : [ {
                                OUTPUT_VALUE : 0,
                                ALERT : 0,
                                OUTPUT_KEY : 0
                            } ],
                            PLAN_STATUS : 1
                        };
                    case 1:
                        throw new xslib.WebApplicationError();
                    default:
                        throw new Error('another error');
                    }
                };
            });
        });
        it('should get chart', function() {
            var params = {
                obj : {
                    execId : 0,
                    nodeId : 0
                }
            };

            expect(plan.kpiChartByLocation(params)).toEqual({
                OVERVIEW : [ {
                    ALERT : 0,
                    DATA : {
                        VALUE : 0,
                        ALERT : 0
                    },
                    OUTPUT_NODE_TYPE : 0
                }, {
                    ALERT : 1,
                    DATA : {
                        VALUE : 1,
                        ALERT : 1
                    },
                    OUTPUT_NODE_TYPE : 1
                } ],
                DETAILS : [ {
                    ALERT : 0,
                    DATA : {
                        VALUE : 0,
                        ALERT : 0
                    },
                    OUTPUT_NODE_TYPE : 0
                } ],
                STATUS : 1
            });
        });

        it('should throw WebApplicationError', function() {
            var params = {
                obj : {
                    execId : 1
                }
            };
            expect(function() {
                plan.kpiChartByLocation(params);
            }).toThrowError(xslib.WebApplicationError);
        });

        it('should throw InternalError', function() {
            var params = {
                obj : {
                    execId : 3
                }
            };
            expect(function() {
                plan.kpiChartByLocation(params);
            }).toThrowError(xslib.InternalError);
        });
    });

    describe('get locations on map', function() {
        it('should get locations', function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function() {
                    return {
                        GEOS : 'geo',
                        TIME_INTERVALS : 'time',
                        EQUIPS : 'EQUIPS'
                    };
                };
            });
            var params = {
                obj : {
                    execId : 0,
                    nodeId : 0
                }
            };
            expect(plan.locations(params)).toEqual({
                LOCATIONS : 'geo',
                TIME_INTERVALS : 'time',
                RESOURCES : 'EQUIPS'
            });
        });

        it('should throw an error', function() {
            var params = {};
            expect(function() {
                plan.locations(params);
            }).toThrowError(xslib.InternalError);
        });
    });

    describe('get alerts on map', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function(execId) {
                    switch (execId) {
                    case 0:
                        return {
                            TOO_MUCH_LOCATION_FLAG : 1
                        };
                    default:
                        return {
                            TOO_MUCH_LOCATION_FLAG : 0,
                            OUT_ALERT_ON_MAP : 'alerts',
                            GIS_TYPE : 0,
                            OUT_PLAN_STATUS : 0
                        };
                    }
                };
            });
        });
        it('should get alerts on map', function() {
            var params = {
                obj : {
                    execId : 1
                }
            };
            expect(plan.alertsOnMap(params)).toEqual({
                ALERTS : 'alerts',
                FIELD : 0,
                STATUS : 0
            });
        });

        it('too much location flag', function() {
            var params = {
                obj : {
                    execId : 0
                }
            };
            expect(plan.alertsOnMap(params)).toEqual({
                TOO_MUCH_LOCATION_FLAG : 1
            });
        });
    });

    describe('bubble on map', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function(execId) {
                    switch (execId) {
                    case 0:
                        return {
                            TOO_MUCH_LOCATION_FLAG : 1
                        };
                    default:
                        return {
                            OUT_BUBBLE_ON_MAP : [ {
                                OUTPUT_KEY : 0
                            } ],
                            GIS_TYPE : 0,
                            OUT_PLAN_STATUS : 1
                        };
                    }
                };
            });
        });

        it('should get bubble on map', function() {
            var params = {
                obj : {
                    execId : 1
                }
            };

            expect(plan.bubbleOnMap(params)).toEqual({
                RESULTS : [ {
                    OUTPUT_NODE_TYPE : 0
                } ],
                FIELD : 0,
                STATUS : 1
            });
        });

        it('too much location flag', function() {
            var params = {
                obj : {
                    execId : 0
                }
            };

            expect(plan.bubbleOnMap(params)).toEqual({
                TOO_MUCH_LOCATION_FLAG : 1
            });
        });
    });

    describe('pie on map', function() {
        beforeEach(function() {
            spyOn(planLib, 'Procedure').and.callFake(function() {
                return function(execId) {
                    switch (execId) {
                    case 0:
                        return {
                            TOO_MUCH_LOCATION_FLAG : 1
                        };
                    default:
                        return {
                            OUT_PIE_ON_MAP : [ {
                                OUTPUT_KEY : 0
                            } ],
                            GIS_TYPE : 0,
                            OUT_PLAN_STATUS : 1
                        };
                    }
                };
            });
        });

        it('should get pie on map', function() {
            var params = {
                obj : {
                    execId : 1
                }
            };
            expect(plan.pieOnMap(params)).toEqual({
                RESULTS : [ {
                    OUTPUT_NODE_TYPE : 0
                } ],
                FIELD : 0,
                STATUS : 1
            });
        });

        it('too much location flag', function() {
            var params = {
                obj : {
                    execId : 0
                }
            };
            expect(plan.pieOnMap(params)).toEqual({
                TOO_MUCH_LOCATION_FLAG : 1
            });
        });
    });

    it('should set routes', function() {
        plan.setRoutes();
    });
});
