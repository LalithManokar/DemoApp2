var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var virtualPlan;
var lib;
var planLib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var reviseSDArraylib = $
        .import("/sap/tm/trp/service/xslib/reviseSDArray.xsjslib");
var RESOURCE_FILTER_ID = '135';
var LOCATION_FILTER_ID = '109';
var SUB_ID = '16';
var virtualPlans;
describe(
        "Virtual Plan Unit Test",
        function() {
            var sqlExecutor;
            var connection;

            beforeOnce(function() {
                lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
                lib.SimpleRest.prototype.handle = function() {
                };
                virtualPlans = $
                        .import('/sap/tm/trp/service/plan/virtualPlan.xsjslib');
                virtualPlan = virtualPlans.plan;
            });

            beforeEach(function() {
                connection = $.db.getConnection();
                sqlExecutor = new SqlExecutor(connection);
                spyOn(virtualPlans.lib.logger, "error").and
                        .callFake(function() {

                        });
                spyOn(virtualPlans.lib.logger, "success").and
                        .callFake(function() {

                        });
                spyOn(reviseSDArraylib, 'reviseArraySD').and.callFake(function(
                        input) {
                    return {
                        results : input
                    };
                });
                spyOn(reviseSDArraylib, 'reviseArrayPieResults').and
                        .callFake(function(input) {
                            return input;
                        });
                spyOn(reviseSDArraylib, 'reviseArrayDetail').and
                        .callFake(function(input) {
                            return input;
                        });
            });

            afterEach(function() {
                connection.close();
            });

            function randomName() {
                var name = "Plan_" + new Date().getTime();
                return name;
            }
            it("should create virtual plan", function() {
                // create the virtual plan first
                var params = {};
                params.obj = {
                    NAME : randomName(),
                    DESC : "description",
                    PLAN_TYPE_ID : 3,
                    VISIBILITY : 1,
                    VISIBILITY_FLAG : "G",
                    RESOURCE_FILTER_ID : RESOURCE_FILTER_ID,
                    LOCATION_FILTER_ID : LOCATION_FILTER_ID,
                    TIME_FILTER_NAME : "DEMO_7DAYS_1WEEK",
                    CALCULATION_MODEL_ID : null,
                    ALERT_RULE_GROUP_ID : null,
                    ATTRIBUTE_GROUP_ID : -1,
                    RESOURCE_CATEGORY : "CN",
                    SUB_PLANS : [ {
                        ID : SUB_ID,
                        NAME : "SD_2"
                    } ]
                };

                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            PLAN_MODEL_ID : 1
                        };
                    };
                });

                var result = virtualPlan.create(params);
                expect(result.ID).toBeDefined();
                expect(result.ID).toBe(1);
            });

            it("should update virtual plan", function() {
                var params = {};
                params.obj = {
                    NAME : randomName(),
                    DESC : "description",
                    PLAN_TYPE_ID : 3,
                    VISIBILITY : 1,
                    VISIBILITY_FLAG : "G",
                    RESOURCE_FILTER_ID : RESOURCE_FILTER_ID,
                    LOCATION_FILTER_ID : LOCATION_FILTER_ID,
                    TIME_FILTER_NAME : "DEMO_7DAYS_1WEEK",
                    CALCULATION_MODEL_ID : null,
                    ALERT_RULE_GROUP_ID : null,
                    ATTRIBUTE_GROUP_ID : -1,
                    RESOURCE_CATEGORY : "CN",
                    SUB_PLANS : [ {
                        ID : SUB_ID,
                        NAME : "SD_2"
                    } ]
                };
                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                    };
                });
                var result = virtualPlan.update(params);
                expect(result).toBeUndefined();

            });

            it("should destroy virtual plan", function() {
                var params = {
                    id : 3
                };
                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                    };
                });
                var result = virtualPlan.destroy(params);
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
                var result = virtualPlan.exec(params);
                expect(result.TIME).toBeDefined();
                expect(result.SUB_PLANS_COUNT).toBe(2);
            });

            it(
                    "should list available sub plans for a virtual plan",
                    function() {
                        var params = {
                            PLAN_TYPE_ID : 3,
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
                        var result = virtualPlan.availablePlans(params);
                        expect(result).toEqual(object);
                    });

            it("should check new assigned sub plans for a virtual plan",
                    function() {

                        // post new assigned sub plan
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

                        var result = virtualPlan.checkSubPlan(params);
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
                var result = virtualPlan.virtualPlanInfo(params);
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

            it("should get virtual plan table result by plan id", function() {
                var params = {
                    id : 1,
                    obj : {}
                };

                spyOn(planLib, "Procedure").and.callFake(function() {
                    return function() {
                        return {
                            PLAN_STATUS : "DONE",
                            OUTPUT : {}
                        };
                    };
                });

                var result = virtualPlan.supplyDemandByLocation(params);
                expect(result.results).toEqual({});
                expect(result.status).toBe('DONE');
            });

            it(
                    "should get virtual plan table result resource by plan id",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    PLAN_STATUS : "DONE",
                                    OUTPUT : {}
                                };
                            };
                        });

                        var result = virtualPlan.supplyDemandByResource(params);
                        expect(result.results).toEqual({});
                        expect(result.status).toBe('DONE');
                    });

            it("should get virtual plan table result by plan id location id",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    PLAN_STATUS : "DONE",
                                    OUTPUT : {}
                                };
                            };
                        });

                        var result = virtualPlan.locationSupplyDemand(params);
                        expect(result.results).toEqual({});
                        expect(result.status).toBe('DONE');
                    });

            it(
                    "should get virtual plan table result resource by plan_id&location_id&resource",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    PLAN_STATUS : "DONE",
                                    OUTPUT : {}
                                };
                            };
                        });

                        var result = virtualPlan.resourceSupplyDemand(params);
                        expect(result.results).toEqual({});
                        expect(result.status).toBe('DONE');
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
                var result = virtualPlan.alertsOnMap(params);
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
                            OUT_BUBBLE_ON_MAP : [ {}, {}, {} ],
                            GIS_TYPE : "TYPE",
                            OUT_PLAN_STATUS : "DONE"
                        };
                    };
                });
                var result = virtualPlan.bubbleOnMap(params);
                expect(result.RESULTS).toEqual([ {}, {}, {} ]);
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
                var result = virtualPlan.pieOnMap(params);
                expect(result.RESULTS).toEqual([ {
                    OUTPUT_KEY : 1
                }, {
                    OUTPUT_KEY : 2
                }, {
                    OUTPUT_KEY : 3
                } ]);
                expect(result.FIELD).toEqual('TYPE');
                expect(result.STATUS).toEqual('DONE');
            });

            it("should get virtual plan table result drilldown details",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    OUTPUT : {}
                                };
                            };
                        });

                        var result = virtualPlan.detailsByLocation(params);
                        expect(result).toEqual({});
                    });

            it("should get virtual plan table result drilldown details",
                    function() {
                        var params = {
                            id : 1,
                            obj : {}
                        };

                        spyOn(planLib, "Procedure").and.callFake(function() {
                            return function() {
                                return {
                                    OUTPUT : {}
                                };
                            };
                        });

                        var result = virtualPlan.detailsByResource(params);
                        expect(result).toEqual({});
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
                            DESC : "description",
                            PLAN_TYPE_ID : 3,
                            VISIBILITY : 1,
                            VISIBILITY_FLAG : "G",
                            RESOURCE_FILTER_ID : RESOURCE_FILTER_ID,
                            LOCATION_FILTER_ID : LOCATION_FILTER_ID,
                            TIME_FILTER_NAME : "DEMO_7DAYS_1WEEK",
                            CALCULATION_MODEL_ID : null,
                            ALERT_RULE_GROUP_ID : null,
                            ATTRIBUTE_GROUP_ID : -1,
                            RESOURCE_CATEGORY : "CN",
                            SUB_PLANS : [ {
                                ID : SUB_ID,
                                NAME : "SD_2"
                            } ]
                        };

                        var result = virtualPlan.create(params);
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
                        expect(body.d.PLAN_TYPE_ID).toBe(3);

                        // delete the record
                        params.id = planId;
                        virtualPlan.destroy(params);

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
                            DESC : "description",
                            PLAN_TYPE_ID : 3,
                            VISIBILITY : 1,
                            VISIBILITY_FLAG : "G",
                            RESOURCE_FILTER_ID : RESOURCE_FILTER_ID,
                            LOCATION_FILTER_ID : LOCATION_FILTER_ID,
                            TIME_FILTER_NAME : "DEMO_7DAYS_1WEEK",
                            CALCULATION_MODEL_ID : null,
                            ALERT_RULE_GROUP_ID : null,
                            ATTRIBUTE_GROUP_ID : -1,
                            RESOURCE_CATEGORY : "CN",
                            SUB_PLANS : [ {
                                ID : SUB_ID,
                                NAME : "SD_2"
                            } ]
                        };

                        var result = virtualPlan.create(params);
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
                        virtualPlan.destroy(params);

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