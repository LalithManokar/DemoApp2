var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var virtualKpiPlan;
var kpiPlansModel;
var virtualKpiPlans;
var planLib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");

describe(
        "Virtual Kpi Plan Unit Test",
        function() {
            var sqlExecutor;
            var connection;
            var lib;

            beforeOnce(function() {
                lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
                lib.SimpleRest.prototype.handle = function() {
                };
                virtualKpiPlans = $
                        .import('/sap/tm/trp/service/plan/virtualKpiPlan.xsjslib');
                virtualKpiPlan = virtualKpiPlans.plan;
            });

            beforeEach(function() {
                spyOn(virtualKpiPlans.lib.logger, 'success').and
                        .callFake(function() {

                        });
                spyOn(virtualKpiPlans.lib.logger, 'error').and
                        .callFake(function() {

                        });
                connection = $.db.getConnection();
                sqlExecutor = new SqlExecutor(connection);
            });

            afterEach(function() {
                connection.close();
            });

            function randomName() {
                var name = "Plan_" + new Date().getTime();
                return name;
            }
            it("should create virtual kpi plan", function() {
                // create the virtual plan first
                var params = {};
                params.obj = {
                    NAME : randomName(),
                    DESC : "create virtual kpi plan to test",
                    PLAN_TYPE_ID : "5",
                    VISIBILITY : 1,
                    VISIBILITY_FLAG : 'G',
                    RESOURCE_FILTER_ID : "135",
                    LOCATION_FILTER_ID : "109",
                    TIME_FILTER_NAME : "SMOKE_TF_PAST1MONTH",
                    CALCULATION_MODEL_ID : null,
                    ALERT_RULE_GROUP_ID : null,
                    ATTRIBUTE_GROUP_ID : -1,
                    RESOURCE_CATEGORY : "CN",
                    SUB_PLANS : [ {
                        ID : "16",
                        NAME : "IDLE_RATE_CN"
                    } ]
                };

                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            PLAN_MODEL_ID : 1
                        };
                    };
                });

                var result = virtualKpiPlan.create(params);
                expect(result.ID).toBeDefined();
                expect(result.ID).toBe(1);
            });

            it("should update virtual kpi plan", function() {
                // create the virtual plan first
                var params = {};
                params.obj = {
                    NAME : randomName(),
                    DESC : "create virtual kpi plan to test",
                    PLAN_TYPE_ID : "5",
                    VISIBILITY : 1,
                    VISIBILITY_FLAG : 'G',
                    RESOURCE_FILTER_ID : "135",
                    LOCATION_FILTER_ID : "109",
                    TIME_FILTER_NAME : "SMOKE_TF_PAST1MONTH",
                    CALCULATION_MODEL_ID : null,
                    ALERT_RULE_GROUP_ID : null,
                    ATTRIBUTE_GROUP_ID : -1,
                    RESOURCE_CATEGORY : "CN",
                    SUB_PLANS : [ {
                        ID : "16",
                        NAME : "IDLE_RATE_CN"
                    } ]
                };

                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            PLAN_MODEL_ID : 1
                        };
                    };
                });

                var result = virtualKpiPlan.update(params);
                expect(result).toBeUndefined();
            });

            it("should destroy virtual plan", function() {
                var params = {
                    id : 1
                };

                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {

                    };
                });
                var result = virtualKpiPlan.destroy(params);
                expect(result).toBeUndefined();
            });

            it('should exec virtual plan', function() {
                var params = {
                    id : 1
                };
                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {
                        return {
                            VAR_OUT : [ {

                            }, {

                            } ]
                        };
                    };
                });
                spyOn($.response, 'followUp');
                var result = virtualKpiPlan.exec(params);
                expect(result.TIME).toBeDefined();
                expect(result.SUB_PLANS_COUNT).toBe(2);
            });

            it(
                    "should list available sub plans for a virtual plan",
                    function() {
                        var params = {
                            PLAN_TYPE_ID : 5,
                            LOCATION_FILTER_ID : 109,
                            RESOURCE_FILTER_ID : 135,
                            RESOURCE_CATEGORY : 'CN'
                        };
                        params.obj = {};

                        var object = {
                            VAR_OUT : [
                                    {
                                        PLAN_MODEL_ID : 1,
                                        LOCATION_TYPE : planLib.constants.LOCATION_FILTER
                                    }, {
                                        PLAN_MODEL_ID : 2
                                    } ]
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return object;
                            };
                        });
                        var result = virtualKpiPlan.availablePlans(params);
                        expect(result).toEqual(object);
                    });

            it("should check new assigned sub plans for a virtual plan",
                    function() {

                        var params = {};
                        params.obj = {
                            "PLAN_TYPE_ID" : "3",
                            "FULL_CHECK" : false,
                            "SUB_PLANS" : [ {
                                "ID" : 55,
                                "LOCATION_FILTER_ID" : 568
                            }, {
                                "ID" : 56,
                                "LOCATION_FILTER_ID" : 568
                            } ],
                            "COMPARE_SUB_PLANS" : [ {
                                "ID" : 64,
                                "LOCATION_FILTER_ID" : 108
                            } ]
                        };
                        var object = {
                            INTERSECTION_PLAN_INFO : [ {
                                PLAN_MODEL_ID1 : 1,
                                NAME1 : 'name1',
                                PLAN_MODEL_ID2 : 2,
                                NAME2 : 'name2'
                            }, {
                                PLAN_MODEL_ID1 : 3,
                                NAME1 : 'name3',
                                PLAN_MODEL_ID2 : 4,
                                NAME2 : 'name4'
                            } ]
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return object;
                            };
                        });

                        var result = virtualKpiPlan.checkSubPlan(params);
                        expect(result).toEqual(object);

                    });

            it('should get virtual plan info ', function() {
                var params = {
                    id : 1,
                    obj : {}
                };
                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {
                        return {
                            OUT_VP_LOCATION_INFO : [ {
                                LOCATION_ID : 1,
                                LOCATION_NAME : 'NAME1',
                                LOCATION_TYPE : 'CN',
                                HAS_OUTPUT_DATASET_FLAG : true,
                                LEVEL : 3
                            }, {
                                LOCATION_ID : 2,
                                LOCATION_NAME : 'NAME2',
                                LOCATION_TYPE : 'CN',
                                HAS_OUTPUT_DATASET_FLAG : true,
                                LEVEL : 4
                            } ],
                            OUT_VP_HIERARCHY : [ {
                                LOCATION_ID : 3,
                                LOCATION_TYPE : 'CN',
                                LOCATION_CHILD_ID : 13,
                                LOCATION_CHILD_TYPE : 'CN'
                            } ],
                            OUT_VIRTUAL_PLAN_NODE_NAME : [ {

                            } ]
                        };
                    };
                });
                var result = virtualKpiPlan.virtualPlanInfo(params);
                expect(result.locations).toEqual([ {
                    ID : 1,
                    NAME : 'NAME1',
                    TYPE : 'CN',
                    HAS_OUTPUT_DATASET_FLAG : true,
                    LEVEL : 3
                }, {
                    ID : 2,
                    NAME : 'NAME2',
                    TYPE : 'CN',
                    HAS_OUTPUT_DATASET_FLAG : true,
                    LEVEL : 4
                } ]);
                expect(result.locationRelationships).toEqual([ {
                    PARENT_ID : 3,
                    PARENT_TYPE : 'CN',
                    CHILD_ID : 13,
                    CHILD_TYPE : 'CN'
                } ]);
                expect(result.calculationModelNodes).toEqual([]);
                expect(result.resources).toEqual([ {
                    "EQUIP_CODE": "10HC",
                    "EQUIP_NAME": "10HC",
                    "EQUIP_FILTER_TYPE": 1
                  } ]);
            });

            it("should get virtual  KPI plan table result by location ",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    OUTPUT : [ {
                                        OUTPUT_VALUE : "1",
                                        ALERT_STATUS : 2,
                                        OUT_NODE_NAME : "NAME1",
                                        OUTPUT_KEY : "KEY1"
                                    }, {
                                        OUTPUT_VALUE : "3",
                                        ALERT_STATUS : 4,
                                        OUT_NODE_NAME : "NAME2",
                                        OUTPUT_KEY : "KEY2"
                                    } ],
                                    PLAN_STATUS : "DONE"
                                };
                            };
                        });
                        var result = virtualKpiPlan.kpiByLocation(params);
                        expect(result.results).toEqual([ {
                            DATA : {
                                VALUE : 1,
                                ALERT : 2
                            },
                            OUTPUT_NODE_NAME : "NAME1",
                            OUTPUT_NODE_TYPE : "KEY1",
                            ALERT_STATUS : 2

                        }, {
                            DATA : {
                                VALUE : 3,
                                ALERT : 4
                            },
                            OUTPUT_NODE_NAME : "NAME2",
                            OUTPUT_NODE_TYPE : "KEY2",
                            ALERT_STATUS : 4

                        } ]);
                        expect(result.status).toEqual('DONE');

                    });

            it("should get virtual KPI plan table result by resource",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    OUTPUT : [ {
                                        OUTPUT_VALUE : "1",
                                        ALERT_STATUS : 2,
                                        OUT_NODE_NAME : "NAME1",
                                        OUTPUT_KEY : "KEY1"
                                    }, {
                                        OUTPUT_VALUE : "3",
                                        ALERT_STATUS : 4,
                                        OUT_NODE_NAME : "NAME2",
                                        OUTPUT_KEY : "KEY2"
                                    } ],
                                    PLAN_STATUS : "DONE"
                                };
                            };
                        });
                        var result = virtualKpiPlan.kpiByResource(params);
                        expect(result.results).toEqual([ {
                            DATA : {
                                VALUE : 1,
                                ALERT : 2
                            },
                            OUTPUT_NODE_NAME : "NAME1",
                            OUTPUT_NODE_TYPE : "KEY1",
                            ALERT_STATUS : 2

                        }, {
                            DATA : {
                                VALUE : 3,
                                ALERT : 4
                            },
                            OUTPUT_NODE_NAME : "NAME2",
                            OUTPUT_NODE_TYPE : "KEY2",
                            ALERT_STATUS : 4

                        } ]);
                        expect(result.status).toEqual('DONE');
                    });

            it(
                    "should get virtual KPI plan table result by plan id & location id",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    OUTPUT : [ {
                                        OUTPUT_VALUE : "1",
                                        ALERT_STATUS : 2,
                                        OUT_NODE_NAME : "NAME1",
                                        OUTPUT_KEY : "KEY1"
                                    }, {
                                        OUTPUT_VALUE : "3",
                                        ALERT_STATUS : 4,
                                        OUT_NODE_NAME : "NAME2",
                                        OUTPUT_KEY : "KEY2"
                                    } ],
                                    PLAN_STATUS : "DONE"
                                };
                            };
                        });
                        var result = virtualKpiPlan.locationKpi(params);
                        expect(result.results).toEqual([ {
                            DATA : {
                                VALUE : 1,
                                ALERT : 2
                            },
                            OUTPUT_NODE_NAME : "NAME1",
                            OUTPUT_NODE_TYPE : "KEY1",
                            ALERT_STATUS : 2

                        }, {
                            DATA : {
                                VALUE : 3,
                                ALERT : 4
                            },
                            OUTPUT_NODE_NAME : "NAME2",
                            OUTPUT_NODE_TYPE : "KEY2",
                            ALERT_STATUS : 4

                        } ]);
                        expect(result.status).toEqual('DONE');
                    });

            it("should get virtual KPI plan chart result by loaction",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    LOCATION_OUTPUT : [ {
                                        OUTPUT_VALUE : "1",
                                        ALERT : 2,
                                        OUTPUT_KEY : "KEY1"
                                    } ],
                                    RESOURCE_OUTPUT : [ {
                                        OUTPUT_VALUE : "3",
                                        ALERT : 4,
                                        OUTPUT_KEY : "KEY2"
                                    } ],
                                    PLAN_STATUS : "DONE"
                                };
                            };
                        });
                        var result = virtualKpiPlan.kpiChartByLocation(params);
                        expect(result.OVERVIEW).toEqual([ {
                            DATA : {
                                VALUE : 1,
                                ALERT : 2
                            },
                            OUTPUT_NODE_TYPE : "KEY1",
                            ALERT : 2

                        } ]);
                        expect(result.DETAILS).toEqual([ {
                            DATA : {
                                VALUE : 3,
                                ALERT : 4
                            },
                            OUTPUT_NODE_TYPE : "KEY2",
                            ALERT : 4

                        } ]);
                        expect(result.STATUS).toEqual('DONE');
                    });

            it("should get virtual KPI plan chart result by resource",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };
                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    RESOURCE_AGG_OUTPUT : [ {
                                        OUTPUT_VALUE : "1",
                                        ALERT : 2,
                                        OUTPUT_KEY : "KEY1"
                                    } ],
                                    RESOURCE_OUTPUT : [ {
                                        OUTPUT_VALUE : "3",
                                        ALERT : 4,
                                        OUTPUT_KEY : "KEY2"
                                    } ],
                                    PLAN_STATUS : "DONE"
                                };
                            };
                        });
                        var result = virtualKpiPlan.kpiChartByResource(params);
                        expect(result.OVERVIEW).toEqual([ {
                            DATA : {
                                VALUE : 1,
                                ALERT : 2
                            },
                            OUTPUT_NODE_TYPE : "KEY1",
                            ALERT : 2

                        } ]);
                        expect(result.DETAILS).toEqual([ {
                            DATA : {
                                VALUE : 3,
                                ALERT : 4
                            },
                            OUTPUT_NODE_TYPE : "KEY2",
                            ALERT : 4

                        } ]);
                        expect(result.STATUS).toEqual('DONE');
                    });

            it("should get alert on map for virtual plan", function() {
                var params = {
                    id : 1,
                    obj : {}
                };
                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            OUT_ALERT_ON_MAP : [ {}, {}, {} ],
                            GIS_TYPE : "TYPE",
                            OUT_PLAN_STATUS : "DONE"
                        };
                    };
                });
                var result = virtualKpiPlan.alertsOnMap(params);
                expect(result.ALERTS).toEqual([ {}, {}, {} ]);
                expect(result.FIELD).toEqual('TYPE');
                expect(result.STATUS).toEqual('DONE');
            });

            it("should get bubble on map for virtual plan", function() {
                var params = {
                    id : 1,
                    obj : {}
                };
                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            OUT_BUBBLE_ON_MAP : [ {
                                OUTPUT_KEY : 1
                            }, {
                                OUTPUT_KEY : 2
                            }, {
                                OUTPUT_KEY : 3
                            } ],
                            GIS_TYPE : "TYPE",
                            OUT_PLAN_STATUS : "DONE"
                        };
                    };
                });
                var result = virtualKpiPlan.bubbleOnMap(params);
                expect(result.RESULTS).toEqual([ {
                    OUTPUT_NODE_TYPE : 1,
                    OUTPUT_KEY : 1
                }, {
                    OUTPUT_NODE_TYPE : 2,
                    OUTPUT_KEY : 2
                }, {
                    OUTPUT_NODE_TYPE : 3,
                    OUTPUT_KEY : 3
                } ]);
                expect(result.FIELD).toEqual('TYPE');
                expect(result.STATUS).toEqual('DONE');
            });

            it("should get pie on map for virtual plan", function() {
                var params = {
                    id : 1,
                    obj : {}
                };
                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            OUT_PIE_ON_MAP : [ {
                                OUTPUT_KEY : 1
                            }, {
                                OUTPUT_KEY : 2
                            }, {
                                OUTPUT_KEY : 3
                            } ],
                            GIS_TYPE : "TYPE",
                            OUT_PLAN_STATUS : "DONE"
                        };
                    };
                });
                var result = virtualKpiPlan.pieOnMap(params);
                expect(result.RESULTS).toEqual([ {
                    OUTPUT_NODE_TYPE : 1,
                    OUTPUT_KEY : 1
                }, {
                    OUTPUT_NODE_TYPE : 2,
                    OUTPUT_KEY : 2
                }, {
                    OUTPUT_NODE_TYPE : 3,
                    OUTPUT_KEY : 3
                } ]);
                expect(result.FIELD).toEqual('TYPE');
                expect(result.STATUS).toEqual('DONE');
            });

            it("should get list of virtual plan from OData", function() {
                var headers = {
                    "Accept" : "application/json",
                    "Accept-Language" : "en-US"
                };
                var response = jasmine.callHTTPService(
                        "/sap/tm/trp/service/odata.xsodata/Plans",
                        $.net.http.GET, null, headers);
                expect(response.status).toBe($.net.http.OK);

                var body = JSON.parse(response.body.asString());

                expect(body.d.results).toBeDefined();
                expect(body.d.results.length).toBeGreaterThan(0);
                expect(body.d.results[0].PLAN_TYPE_ID).toBeDefined();
            });

            it(
                    "should get a single virtual plan from OData",
                    function() {
                        // create the virtual plan first

                        var params = {};
                        params.obj = {
                            NAME : randomName(),
                            DESC : "create virtual kpi plan to test",
                            PLAN_TYPE_ID : "5",
                            VISIBILITY : 1,
                            VISIBILITY_FLAG : 'G',
                            RESOURCE_FILTER_ID : "135",
                            LOCATION_FILTER_ID : "109",
                            TIME_FILTER_NAME : "SMOKE_TF_PAST1MONTH",
                            CALCULATION_MODEL_ID : null,
                            ALERT_RULE_GROUP_ID : null,
                            ATTRIBUTE_GROUP_ID : -1,
                            RESOURCE_CATEGORY : "CN",
                            SUB_PLANS : [ {
                                ID : "16",
                                NAME : "IDLE_RATE_CN"
                            } ]
                        };

                        var result = virtualKpiPlan.create(params);
                        expect(result.ID).toBeDefined();

                        var planId = result.ID;

                        var headers = {
                            "Accept" : "application/json",
                            "Accept-Language" : "en-US"
                        };
                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/odata.xsodata/Plans("
                                        + planId + ")", $.net.http.GET, null,
                                headers);
                        expect(response.status).toBe($.net.http.OK);

                        var body = JSON.parse(response.body.asString());

                        expect(body.d).toBeDefined();
                        expect(body.d.PLAN_TYPE_ID).toBe(5);

                        // delete the record
                        params.id = planId;
                        virtualKpiPlan.destroy(params);

                        // check the database
                        var groupItemTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_plan_model" WHERE ID = '
                                        + planId);
                        expect(groupItemTable.getRowCount()).toBe(0);

                        var groupNodeTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_virtual_plan_persisted_plan" WHERE VIRTUAL_PLAN_MODEL_ID = '
                                        + planId);
                        expect(groupNodeTable.getRowCount()).toBe(0);

                    });

            it(
                    "should get all virtual plan from a virtual plan from OData",
                    function() {
                        // create the virtual plan first
                        var params = {};
                        params.obj = {
                            NAME : randomName(),
                            DESC : "create virtual kpi plan to test",
                            PLAN_TYPE_ID : "5",
                            VISIBILITY : 1,
                            VISIBILITY_FLAG : 'G',
                            RESOURCE_FILTER_ID : "135",
                            LOCATION_FILTER_ID : "109",
                            TIME_FILTER_NAME : "SMOKE_TF_PAST1MONTH",
                            CALCULATION_MODEL_ID : null,
                            ALERT_RULE_GROUP_ID : null,
                            ATTRIBUTE_GROUP_ID : -1,
                            RESOURCE_CATEGORY : "CN",
                            SUB_PLANS : [ {
                                ID : "16",
                                NAME : "IDLE_RATE_CN"
                            } ]
                        };

                        var result = virtualKpiPlan.create(params);
                        expect(result.ID).toBeDefined();

                        var planId = result.ID;

                        var headers = {
                            "Accept" : "application/json",
                            "Accept-Language" : "en-US"
                        };
                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/odata.xsodata/Plans("
                                        + planId + ")/SubPlans",
                                $.net.http.GET, null, headers);
                        expect(response.status).toBe($.net.http.OK);

                        var body = JSON.parse(response.body.asString());

                        expect(body.d.results).toBeDefined();
                        expect(body.d.results.length).toBeGreaterThan(0);
                        expect(body.d.results[0]).toBeDefined();

                        // delete the record
                        params.id = planId;
                        virtualKpiPlan.destroy(params);

                        // check the database
                        var groupItemTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_plan_model" WHERE ID = '
                                        + planId);
                        expect(groupItemTable.getRowCount()).toBe(0);

                        var groupNodeTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_virtual_plan_persisted_plan" WHERE VIRTUAL_PLAN_MODEL_ID = '
                                        + planId);
                        expect(groupNodeTable.getRowCount()).toBe(0);
                    });

            it(
                    "should get a list virtual by a plan type id from OData",
                    function() {
                        var headers = {
                            "Accept" : "application/json",
                            "Accept-Language" : "en-US"
                        };
                        var response = jasmine
                                .callHTTPService(
                                        "/sap/tm/trp/service/odata.xsodata/Plans?$filter=PLAN_TYPE_ID%20eq%203",
                                        $.net.http.GET, null, headers);
                        expect(response.status).toBe($.net.http.OK);
                        var body = JSON.parse(response.body.asString());

                        expect(body.d.results).toBeDefined();
                        expect(body.d.results.length).toBeGreaterThan(0);
                    });
        });