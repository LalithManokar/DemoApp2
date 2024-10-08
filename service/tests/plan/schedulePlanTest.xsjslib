var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var planLib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var lib;
var scheduledPlans;
var scheduledPlan;
describe(
        "Schedule Plan Unit Test",
        function() {
            var sqlExecutor;
            var connection;

            beforeOnce(function() {
                lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
                lib.SimpleRest.prototype.handle = function() {
                };
                scheduledPlans = $
                        .import('/sap/tm/trp/service/plan/scheduledPlan.xsjslib');
                scheduledPlan = scheduledPlans.plan;
            });

            beforeEach(function() {
                connection = $.db.getConnection();
                sqlExecutor = new SqlExecutor(connection);
                spyOn(scheduledPlans.lib.logger, 'success');
                spyOn(scheduledPlans.lib.logger, 'error');
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
                spyOn($.db, "getConnection").and.callFake(function() {
                    return {
                        commit : function() {
                        },
                        close : function() {
                        },
                        rollback : function() {
                        }
                    };
                });

                spyOn(planLib.reviseSDArraylib, 'reviseArraySD').and
                        .callFake(function(input) {
                            return input;
                        });
                spyOn(planLib.reviseSDArraylib, 'reviseArrayPieResults').and
                        .callFake(function(input) {
                            return input;
                        });
                spyOn(planLib.reviseSDArraylib, 'reviseArraySDForTrackingData').and
                        .callFake(function(input) {
                            return input;
                        });

                spyOn(planLib.reviseSDArraylib, 'reviseArrayDetail').and
                        .callFake(function(input) {
                            return input;
                        });
                spyOn(scheduledPlans, 'getTrkSupplyDemandByExecId').and
                        .callFake(function() {
                            return {
                                SD_LOC : "SD_LOC",
                                SD_LOC_EQUIP : "SD_LOC_EQUIP",
                                SD_EQUIP : "SD_EQUIP"
                            };
                        });
            });

            afterEach(function() {
                connection.close();
            });

            function randomName() {
                var name = "Plan_" + new Date().getTime();
                return name;
            }

            it("should create schedule plan", function() {
                // create the virtual plan first
                var params = {};
                params.obj = {
                    "NAME" : randomName(),
                    "DESC" : "create a plan to test",
                    "PLAN_TYPE_ID" : "1",
                    "VISIBILITY" : "G",
                    "RESOURCE_FILTER_ID" : 1047,
                    "LOCATION_FILTER_ID" : 673,
                    "TIME_FILTER_ID" : 18,
                    "CALCULATION_MODEL_ID" : 168,
                    "ALERT_RULE_GROUP_ID" : 1,
                    "ATTRIBUTE_GROUP_ID" : 36,
                    "SCHEDULE" : {
                        "RECURRENCE_DAY" : null,
                        "RECURRENCE_TYPE" : "HOUR",
                        "EXECUTE_INTERVAL" : 1,
                        "START_TIME" : "2016-06-15T18:30:00Z",
                        "EXPIRY_TIME" : "2016-06-15T23:59:00Z"
                    },
                    RESOURCE_CATEGORY : 'CN'
                };

                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {
                        return {
                            PLAN_MODEL_ID : 1
                        };
                    };
                });

                var result = scheduledPlan.create(params);

                expect(result.ID).toBe(1);
            });

            it("should update schedule plan", function() {
                var params = {};
                params.obj = {
                    "NAME" : randomName(),
                    "DESC" : "create a plan to test",
                    "PLAN_TYPE_ID" : "1",
                    "VISIBILITY" : "G",
                    "RESOURCE_FILTER_ID" : 1047,
                    "LOCATION_FILTER_ID" : 673,
                    "TIME_FILTER_ID" : 18,
                    "CALCULATION_MODEL_ID" : 168,
                    "ALERT_RULE_GROUP_ID" : 1,
                    "ATTRIBUTE_GROUP_ID" : 36,
                    "SCHEDULE" : {
                        "RECURRENCE_DAY" : null,
                        "RECURRENCE_TYPE" : "HOUR",
                        "EXECUTE_INTERVAL" : 1,
                        "START_TIME" : "2016-06-15T18:30:00Z",
                        "EXPIRY_TIME" : "2016-06-15T23:59:00Z"
                    },
                    RESOURCE_CATEGORY : 'CN'
                };

                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {
                        return {
                            MESSAGE : "MSG_SUCCESS_STATUS"
                        };
                    };
                });

                var result = scheduledPlan.update(params);

                expect(result).toBeUndefined();
            });

            it("should destroy schedule plan", function() {
                var params = {};
                params.obj = {
                    "NAME" : randomName(),
                    "DESC" : "create a plan to test",
                    "PLAN_TYPE_ID" : "1",
                    "VISIBILITY" : "G",
                    "RESOURCE_FILTER_ID" : 1047,
                    "LOCATION_FILTER_ID" : 673,
                    "TIME_FILTER_ID" : 18,
                    "CALCULATION_MODEL_ID" : 168,
                    "ALERT_RULE_GROUP_ID" : 1,
                    "ATTRIBUTE_GROUP_ID" : 36,
                    "SCHEDULE" : {
                        "RECURRENCE_DAY" : null,
                        "RECURRENCE_TYPE" : "HOUR",
                        "EXECUTE_INTERVAL" : 1,
                        "START_TIME" : "2016-06-15T18:30:00Z",
                        "EXPIRY_TIME" : "2016-06-15T23:59:00Z"
                    },
                    RESOURCE_CATEGORY : 'CN'
                };
                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {

                    };
                });

                var result = scheduledPlan.destroy(params);

                expect(result).toBeUndefined();

            });

            it('should schedule plan to template plan', function() {
                var params = {};
                params.obj = {
                    "NAME" : randomName(),
                    "DESC" : "create a plan to test",
                    "PLAN_TYPE_ID" : "1",
                    "VISIBILITY" : "G",
                    "RESOURCE_FILTER_ID" : 1047,
                    "LOCATION_FILTER_ID" : 673,
                    "TIME_FILTER_ID" : 18,
                    "CALCULATION_MODEL_ID" : 168,
                    "ALERT_RULE_GROUP_ID" : 1,
                    "ATTRIBUTE_GROUP_ID" : 36,
                    "SCHEDULE" : {
                        "RECURRENCE_DAY" : null,
                        "RECURRENCE_TYPE" : "HOUR",
                        "EXECUTE_INTERVAL" : 1,
                        "START_TIME" : "2016-06-15T18:30:00Z",
                        "EXPIRY_TIME" : "2016-06-15T23:59:00Z"
                    },
                    RESOURCE_CATEGORY : 'CN'
                };
                spyOn(planLib, 'Procedure').and.callFake(function() {
                    return function() {

                    };
                });

                var result = scheduledPlan.toTemplate(params);

                expect(result).toBeUndefined();

            });

            it("should execute a schedule plan", function() {
                var params = {};
                params.obj = {
                    "NAME" : randomName(),
                    "DESC" : "create a plan to test",
                    "PLAN_TYPE_ID" : "1",
                    "VISIBILITY" : "G",
                    "RESOURCE_FILTER_ID" : 1047,
                    "LOCATION_FILTER_ID" : 673,
                    "TIME_FILTER_ID" : 18,
                    "CALCULATION_MODEL_ID" : 168,
                    "ALERT_RULE_GROUP_ID" : 1,
                    "ATTRIBUTE_GROUP_ID" : 36,
                    "SCHEDULE" : {
                        "RECURRENCE_DAY" : null,
                        "RECURRENCE_TYPE" : "HOUR",
                        "EXECUTE_INTERVAL" : 1,
                        "START_TIME" : "2016-06-15T18:30:00Z",
                        "EXPIRY_TIME" : "2016-06-15T23:59:00Z"
                    },
                    RESOURCE_CATEGORY : 'CN'
                };
                spyOn(planLib.executor, 'execute').and.callFake(function() {
                    return {};
                });

                var result = scheduledPlan.exec(params);

                expect(result).toEqual({});
            });

            it("should supply Demand By Location", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getSupplyDemandExecutionResultByLocation').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.supplyDemandByLocation(params);

                expect(result).toEqual({});
            });

            it("should supply Demand By Resource", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getSupplyDemandExecutionResultByResource').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.supplyDemandByResource(params);

                expect(result).toEqual({});
            });

            it("should get trkSupply Demand", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getSupplyDemandExecutionResultByResource').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.trkSupplyDemand(params);

                expect(result).toEqual({
                    SD_LOC : "SD_LOC",
                    SD_LOC_EQUIP : "SD_LOC_EQUIP",
                    SD_EQUIP : "SD_EQUIP"
                });
            });

            it("should get location Supply Demand", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getLocationSupplyDemandExecutionResult').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.locationSupplyDemand(params);

                expect(result).toEqual({});
            });

            it(
                    "should get location Supply Demand by plan id",
                    function() {
                        var params = {
                            id : 3,
                            obj : {}
                        };
                        spyOn(planLib, 'getLocationSupplyDemandResultByPlanId').and
                                .callFake(function() {
                                    return {};
                                });

                        var result = scheduledPlan
                                .locationSupplyDemandByPlanId(params);

                        expect(result).toEqual({});
                    });

            it(
                    "should get Resource Supply Demand Execution Result",
                    function() {
                        var params = {
                            id : 3,
                            obj : {}
                        };
                        spyOn(planLib, 'getResourceSupplyDemandExecutionResult').and
                                .callFake(function() {
                                    return {};
                                });

                        var result = scheduledPlan.resourceSupplyDemand(params);

                        expect(result).toEqual({});
                    });

            it("should get location Result", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getFilters').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.locations(params);

                expect(result).toEqual({});
            });

            it(
                    "should get Execution Supply Demand Details By Location",
                    function() {
                        var params = {
                            id : 3,
                            obj : {}
                        };
                        spyOn(planLib,
                                'getExecutionSupplyDemandDetailsByLocation').and
                                .callFake(function() {
                                    return {};
                                });

                        var result = scheduledPlan.detailsByLocation(params);

                        expect(result).toEqual({});
                    });

            it(
                    "should get Execution Supply Demand Details By Resource",
                    function() {
                        var params = {
                            id : 3,
                            obj : {}
                        };
                        spyOn(planLib,
                                'getExecutionSupplyDemandDetailsByResource').and
                                .callFake(function() {
                                    return {};
                                });

                        var result = scheduledPlan.detailsByResource(params);

                        expect(result).toEqual({});
                    });

            it("should alert on map", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getAlertOnMapByExecId').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.alertsOnMap(params);

                expect(result).toEqual({});
            });

            it("should bubble on map", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getBubbleOnMapByExecId').and
                        .callFake(function() {
                            return {};
                        });

                var result = scheduledPlan.bubbleOnMap(params);

                expect(result).toEqual({});
            });

            it("should pie on map", function() {
                var params = {
                    id : 3,
                    obj : {}
                };
                spyOn(planLib, 'getPieOnMapByExecId').and.callFake(function() {
                    return {};
                });

                var result = scheduledPlan.pieOnMap(params);

                expect(result).toEqual({});
            });

            xit("should get list of schedule plan from OData", function() {
                var headers = {
                    "Accept" : "application/json"
                };
                var response = jasmine.callHTTPService(
                        "/sap/tm/trp/service/user/odata.xsodata/Plans",
                        $.net.http.GET, null, headers);
                expect(response.status).toBe($.net.http.OK);

                var body = JSON.parse(response.body.asString());

                expect(body.d.results).toBeDefined();
                expect(body.d.results.length).toBeGreaterThan(0);
                expect(body.d.results[0].PLAN_TYPE_ID).toBeDefined();
            });

            xit(
                    "should get a single schedule plan from OData",
                    function() {
                        // create the schedule plan first
                        var name = randomName();
                        var requestBody = '{\
                    "NAME": '
                                + name
                                + ',\
                    "DESC": "description",\
                    "PLAN_TYPE_ID": "1",\
                    "VISIBILITY": "G",\
                    "EQUIPMENT_FILTER_ID": 1047,\
                    "LOCATION_FILTER_ID": 673,\
                    "TIME_FILTER_ID": 18,\
                    "CALCULATION_MODEL_ID": 168,\
                    "ALERT_RULE_GROUP_ID":1,\
                    "ATTRIBUTE_GROUP_ID":36,\
                    "SCHEDULE": {\
                        "RECURRENCE_DAY": null,\
                        "RECURRENCE_TYPE": "HOUR",\
                        "EXECUTE_INTERVAL": 1,\
                        "START_TIME": "2015-09-15T18:30:00Z",\
                        "EXPIRY_TIME": "2015-09-15T23:59:00Z"\
                     }\
                }';
                        var headers = {
                            "Content-Type" : "application/json"
                        };
                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/plan/scheduledPlans.json",
                                $.net.http.POST, requestBody, headers);
                        expect(response.status).toBe($.net.http.CREATED); // make sure it's
                                                            // created

                        var body = JSON.parse(response.body.asString());
                        var planId = parseInt(body.data.ID, 10);

                        headers = {
                            "Accept" : "application/json"
                        };

                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/user/odata.xsodata/Plans("
                                        + planId + ")", $.net.http.GET, null,
                                headers);
                        expect(response.status).toBe($.net.http.OK);

                        var body = JSON.parse(response.body.asString());

                        expect(body.d).toBeDefined();
                        expect(body.d.PLAN_TYPE_ID).toBe(1);

                        // delete schedule plan
                        response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/plan/scheduledPlans.json/"
                                        + planId, $.net.http.DEL);
                        expect(response.status).toBe($.net.http.NO_CONTENT);

                        // check the database
                        var groupItemTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_plan_model" WHERE ID = '
                                        + planId);
                        expect(groupItemTable.getRowCount()).toBe(0);

                        var groupNodeTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.alert.alert_rule_group::t_alert_rule_group_assign_plan_model" WHERE PLAN_MODEL_ID = '
                                        + planId);
                        expect(groupNodeTable.getRowCount()).toBe(0);
                    });

            xit(
                    "should get all persisted plan from a virtual plan from OData",
                    function() {
                        // create the schedule plan first
                        var name = randomName();
                        var requestBody = '{\
                    "NAME": '
                                + name
                                + ',\
                    "DESC": "description",\
                    "PLAN_TYPE_ID": "1",\
                    "VISIBILITY": "G",\
                    "EQUIPMENT_FILTER_ID": 1047,\
                    "LOCATION_FILTER_ID": 673,\
                    "TIME_FILTER_ID": 18,\
                    "CALCULATION_MODEL_ID": 168,\
                    "ALERT_RULE_GROUP_ID":1,\
                    "ATTRIBUTE_GROUP_ID":36,\
                    "SCHEDULE": {\
                    "RECURRENCE_DAY": null,\
                    "RECURRENCE_TYPE": "HOUR",\
                    "EXECUTE_INTERVAL": 1,\
                    "START_TIME": "2015-09-15T18:30:00Z",\
                    "EXPIRY_TIME": "2015-09-15T23:59:00Z"\
                 }\
                }';

                        var headers = {
                            "Content-Type" : "application/json"
                        };
                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/plan/scheduledPlans.json",
                                $.net.http.POST, requestBody, headers);
                        expect(response.status).toBe($.net.http.CREATED); // make sure it's
                                                            // created

                        var body = JSON.parse(response.body.asString());
                        var planId = body.data.ID;

                        headers = {
                            "Accept" : "application/json"
                        };
                        var response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/user/odata.xsodata/Plans("
                                        + planId + ")/Schedule",
                                $.net.http.GET, null, headers);
                        expect(response.status).toBe($.net.http.OK);

                        var body = JSON.parse(response.body.asString());

                        expect(body.d).toBeDefined();
                        expect(body.d.RECURRENCE_TYPE_ID).toBeDefined();
                        expect(body.d.ID).toBe(planId);

                        // delete schedule plan
                        response = jasmine.callHTTPService(
                                "/sap/tm/trp/service/plan/scheduledPlans.json/"
                                        + planId, $.net.http.DEL);
                        expect(response.status).toBe($.net.http.NO_CONTENT);

                        // check the database
                        var groupItemTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.pipeline::t_plan_model" WHERE ID = '
                                        + planId);
                        expect(groupItemTable.getRowCount()).toBe(0);

                        var groupNodeTable = sqlExecutor
                                .execQuery('SELECT * FROM "sap.tm.trp.db.alert.alert_rule_group::t_alert_rule_group_assign_plan_model" WHERE PLAN_MODEL_ID = '
                                        + planId);
                        expect(groupNodeTable.getRowCount()).toBe(0);
                    });

            xit(
                    "should get a list virtual by a plan type id from OData",
                    function() {
                        var headers = {
                            "Accept" : "application/json"
                        };
                        var response = jasmine
                                .callHTTPService(
                                        "/sap/tm/trp/service/user/odata.xsodata/Plans?$filter=PLAN_TYPE_ID%20eq%201",
                                        $.net.http.GET, null, headers);
                        expect(response.status).toBe($.net.http.OK);
                        var body = JSON.parse(response.body.asString());

                        expect(body.d.results).toBeDefined();
                        expect(body.d.results.length).toBeGreaterThan(0);
                    });
        });