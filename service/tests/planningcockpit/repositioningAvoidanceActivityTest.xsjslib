/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, repositioningAvoidanceActivityLib, activity, activityLib, xslib, logger, constants;

describe(
        'repositioning avoidance activity test',
        function() {
            beforeOnce(function() {
                lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
                lib.SimpleRest.prototype.handle = function() {
                };
                // lib to test
                repositioningAvoidanceActivityLib = $
                        .import('/sap/tm/trp/service/planningcockpit/repositioningAvoidanceActivity.xsjslib');
                activity = repositioningAvoidanceActivityLib.activity;
                // lib containing functions used by all activities
                activityLib = repositioningAvoidanceActivityLib.lib;

                // libs needed to be mocked
                xslib = activityLib.xslib;
                logger = activityLib.logger;
                constants = activityLib.constants;
            });

            beforeEach(function() {
                spyOn(logger, 'error');
                spyOn(logger, 'success');
            });

            describe(
                    'create an repositioningAvoidanceActivity',
                    function() {
                        beforeEach(function() {
                            spyOn(activityLib, 'Procedure').and
                                    .callFake(function() {
                                        return function(activityType,
                                                scenarioId, fromLocId, ToLocId,
                                                startTime, endTime, equipType,
                                                quantity, cost, contractNo,
                                                routeId, desc) {
                                            switch (scenarioId) {
                                            case 1:
                                                return {
                                                    ACTIVITY_ID : 1,
                                                    MESSAGE : 'MSG_SUCCESS_STATUS',
                                                    MODIFIED_BY : 'TRPADM'
                                                };
                                            case 2:
                                                return {
                                                    MESSAGE : 'MSG_ROUTE_TIME_NOT_WITHIN_ACTIVITY_TIME',
                                                    MODIFIED_BY : 'TRPADM'
                                                };
                                            default:
                                                throw new xslib.WebApplicationError();
                                            }
                                        };
                                    });
                        });

                        it(
                                'should create an repositioningAvoidanceActivity',
                                function() {
                                    var params = {
                                        obj : {
                                            START_DATE : '2016-07-19T16:00:00.000Z',
                                            END_DATE : '2016-07-20T16:00:00.000Z',
                                            scenarioId : 1,
                                            FROM_LOC_ID : 1,
                                            TO_LOC_ID : 1,
                                            EQUIP_TYPE : 1,
                                            QUANTITY : 1,
                                            COST : 1.0,
                                            CONTRACT_NO : 1,
                                            ROUTE_ID : 1,
                                            ACTIVITY_DESC : 'should be success'
                                        }
                                    };

                                    expect(activity.create(params)).toEqual({
                                        ID : 1
                                    });
                                });

                        it(
                                'should throw an InternalError',
                                function() {
                                    var params = {
                                        obj : {
                                            START_DATE : '2016-07-19T16:00:00.000Z',
                                            END_DATE : '2016-07-20T16:00:00.000Z',
                                            scenarioId : 2,
                                            FROM_LOC_ID : 1,
                                            TO_LOC_ID : 1,
                                            EQUIP_TYPE : 1,
                                            QUANTITY : 1,
                                            COST : 1.0,
                                            CONTRACT_NO : 1,
                                            ROUTE_ID : 1,
                                            ACTIVITY_DESC : 'should throw an internal error'
                                        }
                                    };

                                    expect(function() {
                                        activity.create(params);
                                    }).toThrowError(lib.InternalError);
                                });

                        it('should throw a WebApplicationError', function() {
                            var params = {
                                obj : {
                                    START_DATE : '2016-07-19T16:00:00.000Z',
                                    END_DATE : '2016-07-20T16:00:00.000Z',
                                    scenarioId : 3,
                                    FROM_LOC_ID : 1,
                                    TO_LOC_ID : 1,
                                    EQUIP_TYPE : 1,
                                    QUANTITY : 1,
                                    COST : 1.0,
                                    CONTRACT_NO : 1,
                                    ROUTE_ID : 1,
                                    ACTIVITY_DESC : 'should throw an web error'
                                }
                            };
                            expect(function() {
                                activity.create(params);
                            }).toThrowError(xslib.WebApplicationError);
                        });
                    });
        });
