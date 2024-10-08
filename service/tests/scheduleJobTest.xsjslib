/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var utils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib');
var SqlExecutor = $.import('sap.hana.testtools.unit.util', 'sqlExecutor').SqlExecutor;
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = "/sap/tm/trp/service/supplydemand/executor.xsjob";
var connSqlcc = "sap.tm.trp.service.xslib::JobUser";
var jobSqlcc = "/sap/tm/trp/service/xslib/JobUser.xssqlcc";
var SCHEDULE_TYPE = "PLAN";
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var planId;
var type;
var interval;
var startTime;
var expireTime;
var jobId = -1;


var checkPlanScheduleTable;
var checkPlanScheduleJobLogTable;
var checkJobLogTable;
var checkExecuteNowResultSchedule;
var checkExecuteNowResultLog;

var manageSchedule;
var manageJob;

//this function cannot be accessed, so move this function here in order to test it
    var getScheduleFirstTime = function(type, startTime, expireTime, recurrence) {
        var now = new Date(), tempTime2, firstTime = -1, tempTime = new Date(now.getTime());
        switch (type) {
            case 'MONTH':
                //if this month does not have recurrence.DAY, the job will run at the last day of this month
                if (startTime.getTime() > now.getTime()) {
                    if (startTime.getDate() >= recurrence.DAY) {
                        tempTime.setMonth(startTime.getMonth() + recurrence.INTERVAL);
                        tempTime2 = new Date(tempTime.getFullYear(), tempTime.getMonth(), recurrence.DAY, 0 ,0 ,0);
                        if (tempTime.getMonth() !== tempTime2.getMonth()) {
                            tempTime2 = new Date(tempTime2.getFullYear(), tempTime2.getMonth() + 1, 0, 0 ,0 ,0)
                        }
                        if (tempTime2 <= expireTime){
                            firstTime = new Date(tempTime2.getTime());
                        }
                    } else {
                        tempTime = new Date(startTime.getFullYear(), startTime.getMonth(), recurrence.DAY, 0 ,0 ,0);
                        if (tempTime.getMonth() !== startTime.getMonth()) {
                            tempTime = new Date(startTime.getFullYear(), startTime.getMonth() + 1, 0, 0 ,0 ,0);
                        }
                        if (tempTime.getTime() <= expireTime.getTime()){
                            firstTime = new Date(tempTime.getTime());
                        }
                    }
                } else if (startTime.getTime() < now.getTime() && now.getTime() < expireTime.getTime()) {
                    var times = Math.ceil((now.getMonth() - startTime.getMonth())/recurrence.INTERVAL);
                    tempTime.setMonth(startTime.getMonth() + recurrence.INTERVAL * times);
                    tempTime2 = new Date(tempTime.getFullYear(), tempTime.getMonth(), recurrence.DAY, 0 ,0 ,0);
                    if (tempTime2.getMonth() !== tempTime.getMonth()) {
                        tempTime2= new Date(tempTime.getFullYear(), tempTime.getMonth() + 1, 0, 0 ,0 ,0);
                    }
                    if (tempTime2.getTime() <= expireTime.getTime()){
                        firstTime = new Date(tempTime2.getTime());
                    }
                }
                break;
            case 'WEEK':
                var startTimeDay = ((startTime.getDay()== 0)? 7: startTime.getDay()), day = ((now.getDay() == 0)? 7: now.getDay());
                recurrence.DAY == 0? 7: recurrence.DAY;
                if (startTime.getTime() > now.getTime()) {
                    tempTime = new Date(startTime.getTime());
                    if (startTimeDay >= recurrence.DAY) {
                        tempTime.setDate(startTime.getDate() + 7 - startTimeDay + recurrence.DAY);
                    } else {
                        tempTime.setDate(startTime.getDate() - startTimeDay + recurrence.DAY);
                    }
                    tempTime = new Date(tempTime.getFullYear(), tempTime.getMonth(), tempTime.getDate(), 0, 0, 0);
                } else if (startTime.getTime() < now.getTime() && now.getTime() < expireTime.getTime()) {
                    tempTime = new Date(now.getTime());
                    if (day >= recurrence.DAY) {
                        tempTime.setDate(now.getDate() + 7 - day + recurrence.DAY);
                    } else {
                        tempTime.setDate(now.getDate() - day + recurrence.DAY);
                    }
                    tempTime = new Date(tempTime.getFullYear(), tempTime.getMonth(), tempTime.getDate(), 0, 0, 0);
                }
                if (tempTime.getTime() <= expireTime.getTime()) {
                    firstTime = new Date(tempTime.getTime());
                }
                break;
            default:
                if (startTime.getTime() > now.getTime()) {
                    firstTime = new Date(startTime.getTime());
                } else if (startTime.getTime() < now.getTime() && now.getTime() < expireTime.getTime()) {
                    firstTime = new Date(new Date().getTime() + 10000);
                }
        }
        logger.info("GET_SCHEDULE_FIRST_TIME", firstTime, scheduleType, modelId, startTime, expireTime, recurrence);
        return firstTime;
    };


describe("schedule job unit test", function() {
    var sqlExecutor;
    var connection;
    var test;

    beforeEach(function() {
        connection = $.db.getConnection();
        sqlExecutor = new SqlExecutor(connection);
        sqlExecutor.execSingle('insert into "sap.tm.trp.db.pipeline::t_plan_model" values(-1,\'unit_test\',-1,-1,-1,CURRENT_TIMESTAMP,-1,CURRENT_TIMESTAMP,-1,-1,\'unit_test\',\'unit_test\',1, 1, CURRENT_TIMESTAMP, 1, 0, CURRENT_TIMESTAMP)');
        connection.commit();

        checkPlanScheduleTable = 'SELECT * FROM "sap.tm.trp.db.job::t_model_schedule_detail" WHERE SCHEDULE_TYPE = \'PLAN\' AND  MODEL_ID = -1';
        checkPlanScheduleJobLogTable = 'SELECT * FROM "sap.tm.trp.db.job::t_job_schedule" WHERE SCHEDULE_TYPE = \'PLAN\' AND  MODEL_ID = -1';
        checkJobLogTable = 'SELECT * FROM "_SYS_XS"."JOB_SCHEDULES" WHERE ID = ';
        checkExecuteNowResultSchedule = 'SELECT * FROM "sap.tm.trp.db.job::t_job_schedule" WHERE SCHEDULE_TYPE = \'PLAN\' AND  MODEL_ID = -1 AND SCHEDULE_FLAG = 1';
    });

    afterEach(function() {
        sqlExecutor = new SqlExecutor(connection);
        sqlExecutor.execSingle('delete from "sap.tm.trp.db.pipeline::t_plan_model" where ID = -1 ');
        connection.commit();
        connection.close();
    });

    it("should create schedule job", function() {
        planId = -1;
        type = 'HOUR';
        interval = 1;
        startTime = '2016-01-07T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var parameters = {
                        xsJob: xsJob,
                        scheduleType: SCHEDULE_TYPE,
                        startTime: startTime,
                        expiryTime: expireTime,
                        recurrence: {
                                TYPE : type,
                                INTERVAL : interval,
                                DAY : null
                        },
                        modelId: planId,
                        connSqlcc: connSqlcc,
                        jobSqlcc: jobSqlcc
                };
        var job = new jobManager.Job(parameters);
        var schedule = new job.schedule();
        var scheduleId = schedule.create();

        expect(scheduleId).toBeDefined();

        var checkPlanSchedule = sqlExecutor.execQuery(checkPlanScheduleTable); // check table t_plan_schedule
        expect(checkPlanSchedule.getRowCount()).toBe(1);
        var checkPlanScheduleJobLog = sqlExecutor.execQuery(checkPlanScheduleJobLogTable); //check table t_plan_schedule_job_log
        expect(checkPlanScheduleJobLog.getRowCount()).toBe(1);
        var checkJobLog = sqlExecutor.execQuery(checkJobLogTable + scheduleId);
        expect(checkJobLog.getRowCount()).toBe(1);

    });

    it("should update schedule job", function() {
        planId = -1;
        type = 'HOUR';
        interval = 1;
        expireTime = '2019-06-15T16:00:00.000Z';
        var newStartTime = '2016-02-07T08:11:00.000Z';
        var newParameters = {
                        xsJob: xsJob,
                        scheduleType: SCHEDULE_TYPE,
                        startTime: newStartTime,
                        expiryTime: expireTime,
                        recurrence: {
                                TYPE : type,
                                INTERVAL : interval,
                                DAY : null
                        },
                        modelId: planId,
                        connSqlcc: connSqlcc,
                        jobSqlcc: jobSqlcc
                };
        var newJob = new jobManager.Job(newParameters);
        var newSchedule = new newJob.schedule();
        newSchedule.update();

        var checkPlanSchedule = sqlExecutor.execQuery(checkPlanScheduleTable);
        expect(checkPlanSchedule.getRowCount()).toBe(1);
        var checkPlanScheduleJobLog = sqlExecutor.execQuery(checkPlanScheduleJobLogTable);
        expect(checkPlanScheduleJobLog.getRowCount()).toBe(1);
    });

    it("should execute schedule job", function() {
        var checkPlanSchedule = sqlExecutor.execQuery(checkExecuteNowResultSchedule);
        expect(checkPlanSchedule.getRowCount()).toBe(1);
    });

    it("should cancel schedule job", function() {
        planId = -1;
                var parameters = {
                        xsJob: xsJob,
                        scheduleType: SCHEDULE_TYPE,
                        modelId: planId,
                        connSqlcc: connSqlcc,
                        jobSqlcc: jobSqlcc,
                        uri: "sap.tm.trp.service.xslib:deleteSchedules.xsjs",
                        functionName: "deleteSchedule"
                };
                var job = new jobManager.Job(parameters);
                var schedule = new job.schedule();
                schedule.cancel();


        var checkExecuteNowResult = sqlExecutor.execQuery(checkExecuteNowResultSchedule); // check table t_plan_schedule
        expect(checkExecuteNowResult.getRowCount()).toBe(0);
    });

    it("get the first time to run the job accroding to the schedule: hour type", function() {
        startTime = '2017-01-07T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'HOUR',
                                INTERVAL : interval,
                                DAY : null
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual(startTime);
    });

    it("get the first time to run the job accroding to the schedule: day type", function() {
        startTime = '2017-01-07T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'DAY',
                                INTERVAL : interval,
                                DAY : null
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual(startTime);
    });

    it("get the first time to run the job accroding to the schedule: week type, this week to run the first job", function() {
        startTime = '2016-04-29T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'WEEK',
                                INTERVAL : null,
                                DAY : 6
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual('2016-04-30T00:00:00.000Z');
    });

    it("get the first time to run the job accroding to the schedule: week type, next week to run the first job", function() {
        startTime = '2016-04-29T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'WEEK',
                                INTERVAL : null,
                                DAY : 1
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual('2016-05-02T00:00:00.000Z');
    });

    it("get the first time to run the job accroding to the schedule: month type, this month to run the first job", function() {
        startTime = '2016-04-29T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'MONTH',
                                INTERVAL : 1,
                                DAY : 30
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual('2016-04-30T00:00:00.000Z');
    });

    it("get the first time to run the job accroding to the schedule: month type, next month to run the first job", function() {
        startTime = '2016-04-29T08:11:00.000Z';
        expireTime = '2019-06-15T16:00:00.000Z';
        var recurrence = {
                                TYPE : 'MONTH',
                                INTERVAL : 1,
                                DAY : 1
                        };
        var result = getScheduleFirstTime(type, startTime, expireTime, recurrence);
        expect(result).toEqual('2016-05-01T00:00:00.000Z');
    });
});
