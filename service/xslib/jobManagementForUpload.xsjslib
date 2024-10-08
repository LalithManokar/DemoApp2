var xslib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;

Date.prototype.toXscronString = function() {
	return [this.getUTCFullYear(), this.getUTCMonth() + 1, this.getUTCDate(),
        "*", this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()]
		.join(" ");
}

function Job(paramsArray) {

	if (paramsArray.length <= 0) {
		return;
	}
	var that = this;
	this.scheduleParamsArray = paramsArray;
	this.conn = $.hdb.getConnection({
		"sqlcc": paramsArray[0].connSqlcc,
		"pool": true
	});
	this.conn.setAutoCommit(false);
	// create the xsjsJob
	this.job = new $.jobs.Job({
		uri: paramsArray[0].xsJob,
		sqlcc: paramsArray[0].jobSqlcc
	});

	var deleteLastSchedule = function(lastScheduleId) {
		if (lastScheduleId !== -1) {
			that.job.schedules.delete({
				id: lastScheduleId
			});
		}
	};

	var deleteSchedules = function(array) {
		for (var i = 0; i < array.length; i++) {
			var entity = array[i];
			deleteLastSchedule(entity.NEW_SCHEDULE_ID);
		}
	};

	this.upsertAndDeleteSchedules = function() {
		var scheduleParamsArray = this.scheduleParamsArray;
		var array = [],
			schedule, lastScheduleId, row_value;

		try {
			for (var i = 0; i < scheduleParamsArray.length; i++) {
				var entity = {};
				var params = scheduleParamsArray[i];
				entity.IF_UPDATE = params.ifUpdate;
				entity.SCHEDULE_TYPE = params.scheduleType;
				entity.MODEL_ID = params.modelId;
				if (entity.IF_UPDATE === 0 || entity.IF_UPDATE === 1) {
					schedule = new this.schedule(params);
					entity.NEW_SCHEDULE_ID = schedule.create();
					if (entity.NEW_SCHEDULE_ID > -1) {
						array.push(entity);
					} else {
						entity.NEW_SCHEDULE_ID = null;
						entity.IF_UPDATE = 2;
						array.push(entity);
					}
				} else {
					entity.NEW_SCHEDULE_ID = null;
					array.push(entity);
				}
			}

			var upsertAndDeleteProc = that.conn.loadProcedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.massupload::p_job_schedule_upsert_delete');
			var resultSet = upsertAndDeleteProc(array).ALL_DEL_SCHEDULE_IDS;
			var iterator = resultSet.getIterator();
			if (iterator) {
				while (iterator.next()) {
					row_value = iterator.value();
					lastScheduleId = Number(row_value['SCHEDULE_ID'].toString());
					if (lastScheduleId > -1) {
						deleteLastSchedule(lastScheduleId);
					}
				}
			}

			that.conn.commit();
		} catch (e) {
			logger.error("CREATE_SCHEDULE_FAILED");
			that.conn.rollback();
			deleteSchedules(array);
			throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
		}
	};

	this.upsertSchedules = function() {
		var scheduleParamsArray = this.scheduleParamsArray;
		var array = [],
			upsertJobSchedule, schedule;
		try {
			for (var i = 0; i < scheduleParamsArray.length; i++) {
				var entity = {};
				var params = scheduleParamsArray[i];
				entity.IF_UPDATE = params.ifUpdate;
				entity.MODEL_ID = params.modelId;
				entity.SCHEDULE_TYPE = params.scheduleType;
				schedule = new this.schedule(params);
				entity.NEW_SCHEDULE_ID = schedule.create();
				if (entity.NEW_SCHEDULE_ID > -1) {
					array.push(entity);
				} else {
					entity.IF_UPDATE = 2;
					entity.NEW_SCHEDULE_ID = null;
					array.push(entity);
				}
			}

			upsertJobSchedule = that.conn.loadProcedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.massupload::p_plan_schedule_upsert');
			var result = upsertJobSchedule(array).SCHEDULE_IDS;
			var iterator = result.getIterator();
			if (iterator) {
				while (iterator.next()) {
					var lastScheduleId = iterator.value().SCHEDULE_ID;
					if (lastScheduleId > -1) {
						deleteLastSchedule(lastScheduleId);
					}
				}
			}
			that.conn.commit();
		} catch (e) {
			logger.error("CREATE_SCHEDULE_FAILED");
			that.conn.rollback();
			deleteSchedules(array);
			throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
		}
	};

	this.schedule = function(params) {
		if(params.startworkhour && params.startworkhour.length===7){
		    params.startworkhour="0"+params.startworkhour;
		}
		if(params.endworkhour && params.endworkhour.length===7){
		    params.endworkhour="0"+params.endworkhour;
		}
		this.scheduleType = params.scheduleType;
		this.startTime = new Date(params.startTime) || null;
		this.expireTime = new Date(params.expiryTime) || null;
		this.recurrence = params.recurrence || 0;
		this.modelId = params.modelId;
		this.connSqlcc = params.connSqlcc;
		this.jobSqlcc = params.jobSqlcc;
		this.resourceCategory = params.resourceCategory || null;
		this.execWorkHour = params.execworkhour || 0;
		this.startWorkHour = params.startworkhour || null;
		this.endWorkHour = params.endworkhour || null;
		this.timezone = params.timezone|| null;
		var that2 = this;

		var getScheduleFirstTime = function() {
			var now = new Date(),
				tempTime2, firstTime = -1,
				tempTime = new Date(now.getTime()),
				startHour = that2.startTime.getHours(),
				startMinute = that2.startTime.getMinutes();
			switch (that2.recurrence.TYPE) {
				case 'MONTH':
					// if that2 month does not have that2.recurrence.DAY, the job will
					// run at the last day of that2 month
					if (that2.startTime.getTime() > now.getTime()) {
						if (that2.startTime.getDate() > that2.recurrence.DAY) {
							tempTime.setMonth(that2.startTime.getMonth() + that2.recurrence.INTERVAL);
							tempTime2 = new Date(tempTime.getFullYear(), tempTime.getMonth(), that2.recurrence.DAY, startHour, startMinute, 0);
							if (tempTime.getMonth() !== tempTime2.getMonth()) {
								tempTime2 = new Date(tempTime2.getFullYear(), tempTime2.getMonth() + 1, 0, startHour, startMinute, 0)
							}
							if (tempTime2 <= that2.expireTime) {
								firstTime = new Date(tempTime2.getTime());
							}
						} else if (that2.startTime.getDate() === that2.recurrence.DAY) {
							firstTime = that2.startTime;
						} else {
							tempTime = new Date(that2.startTime.getFullYear(), that2.startTime.getMonth(), that2.recurrence.DAY, startHour, startMinute, 0);
							if (tempTime.getMonth() !== that2.startTime.getMonth()) {
								tempTime = new Date(that2.startTime.getFullYear(), that2.startTime.getMonth() + 1, 0, startHour, startMinute, 0);
							}
							if (tempTime.getTime() <= that2.expireTime.getTime()) {
								firstTime = new Date(tempTime.getTime());
							}
						}
					} else if (that2.startTime.getTime() < now.getTime() && now.getTime() < that2.expireTime.getTime()) {
						var times = Math.ceil((now.getMonth() - that2.startTime.getMonth()) / that2.recurrence.INTERVAL);
						tempTime.setMonth(that2.startTime.getMonth() + that2.recurrence.INTERVAL * times);
						tempTime2 = new Date(tempTime.getFullYear(), tempTime.getMonth(), that2.recurrence.DAY, startHour, startMinute, 0);
						if (tempTime2.getMonth() !== tempTime.getMonth()) {
							tempTime2 = new Date(tempTime.getFullYear(), tempTime.getMonth() + 1, 0, startHour, startMinute, 0);
						}

						if (tempTime2.getTime() < now.getTime()) {
							tempTime2 = new Date(tempTime2.getFullYear(), tempTime2.getMonth() + 1, that2.recurrence.DAY, startHour, startMinute, 0);
						}

						if (tempTime2.getTime() <= that2.expireTime.getTime()) {
							firstTime = new Date(tempTime2.getTime());
						}
					}
					break;
				case 'WEEK':
					var startTimeDay = ((that2.startTime.getDay() == 0) ? 7 : that2.startTime.getDay()),
						day = ((now.getDay() == 0) ? 7 : now.getDay());
					that2.recurrence.DAY == 0 ? 7 : that2.recurrence.DAY;
					if (that2.startTime.getTime() > now.getTime()) {
						tempTime = new Date(that2.startTime.getTime());
						if (startTimeDay > that2.recurrence.DAY) {
							tempTime.setDate(that2.startTime.getDate() + 7 - startTimeDay + that2.recurrence.DAY);
						} else if (startTimeDay < that2.recurrence.DAY) {
							tempTime.setDate(that2.startTime.getDate() - startTimeDay + that2.recurrence.DAY);
						}
						tempTime = new Date(tempTime.getFullYear(), tempTime.getMonth(), tempTime.getDate(), startHour, startMinute, 0);
					} else if (that2.startTime.getTime() < now.getTime() && now.getTime() < that2.expireTime.getTime()) {
						tempTime = new Date(now.getTime());
						if (day >= that2.recurrence.DAY) {
							tempTime.setDate(now.getDate() + 7 - day + that2.recurrence.DAY);
						} else {
							tempTime.setDate(now.getDate() - day + that2.recurrence.DAY);
						}
						tempTime = new Date(tempTime.getFullYear(), tempTime.getMonth(), tempTime.getDate(), startHour, startMinute, 0);
					}
					if (tempTime.getTime() <= that2.expireTime.getTime()) {
						firstTime = new Date(tempTime.getTime());
					}
					break;
				case 'DAY':
					if (that2.startTime.getTime() > now.getTime()) {
						firstTime = new Date(that2.startTime.getTime());
					} else if (that2.startTime.getTime() < now.getTime() && now.getTime() < that2.expireTime.getTime()) {
						var millisecondRecurrence = that2.recurrence.INTERVAL * 24 * 60 * 60 * 1000;
						var times = Math.ceil((now.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
						firstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
					}
					break;
				case 'HOUR':
					if (that2.startTime.getTime() > now.getTime()) {
						firstTime = new Date(that2.startTime.getTime());
					} else if (that2.startTime.getTime() < now.getTime() && now.getTime() < that2.expireTime.getTime()) {
						var millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 60 * 1000;
						var times = Math.ceil((now.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
						firstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
					}
					break;
				case 'MINUTE':
					if (that2.startTime.getTime() > now.getTime()) {
						firstTime = new Date(that2.startTime.getTime());
					} else if (that2.startTime.getTime() < now.getTime() && now.getTime() < that2.expireTime.getTime()) {
						var millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 1000;
						var times = Math.ceil((now.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
						firstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
					}
					break;
			}
			logger.info("GET_SCHEDULE_FIRST_TIME", firstTime, that2.scheduleType, that2.modelId, that2.startTime, that2.expireTime, that2.recurrence);
			if (firstTime !== -1) {
				firstTime.setSeconds(0);
			}
			return firstTime;
		};

		var getDescription = function() {
			// scheduleType will be PLAN, LOCATION_RULE and so on
			return ["ScheduleType: " + that2.scheduleType, "ModelId: " + that2.modelId, "RunTime: " + that2.runTime, "StartTIme: " + that2.startTime, "ExpireTime: " + that2.expireTime,
                "Recurrence: " + that2.recurrence.INTERVAL + " " + that2.recurrence.TYPE].join(", ");
		};

		var createSchedule = function() {
			var firstTime, firstLocalTime, description, newJob, xscron, newId = -1,
				procName, createJobSchedule, scheduleFlag = 1;
			firstTime = getScheduleFirstTime(that2.startTime, that2.expireTime);

			if (firstTime > -1) {
			    if(that2.execWorkHour){
                     firstTime = calculateExecTimeToWorkingHourTime(firstTime);
                     if (firstTime.getTime() > that2.expireTime.getTime()){
                          return newId;
                     }
                }

				firstLocalTime = new Date(firstTime.getTime());
				that2.runTime = new Date(firstLocalTime.getTime());
				xscron = firstLocalTime.toXscronString();
				newId = that.job.schedules.add({
					description: getDescription(),
					xscron: xscron,
					parameter: {
						CONN_SQLCC: that2.connSqlcc,
						JOB_SQLCC: that2.jobSqlcc,
						MODEL_ID: that2.modelId,
						START_TIME: that2.startTime,
						EXPIRE_TIME: that2.expireTime,
						RECURRENCE: that2.recurrence,
						SCHEDULE_TYPE: that2.scheduleType, // PLAN,LOCAITON_RULE
						RESOURCE_CATEGORY: that2.resourceCategory, // and so on,
						EXECWORKHOUR: that2.execWorkHour,
                        STARTWORKHOUR: that2.startWorkHour,
                        ENDWORKHOUR: that2.endWorkHour,
                        TIMEZONE : that2.timezone
					}
				});
			}
			return newId;
		};

//--->
    var convertToLocalDatetime = function(datetime) {
            var localTimestamp = utils.utcToLocalByHana(datetime,that2.timezone);
            var aDATE= timeFormatHelper.dateUTCFormat('yyyy-MM-dd',localTimestamp);
            var aTIME= timeFormatHelper.dateUTCFormat('HH:mm:ss',localTimestamp);
            return {
                DATETIME:localTimestamp,
                DATE:aDATE,
                TIME:aTIME,
                addOneDay : function() {
                   // var adate = new Date(this.DATE);
                  //  var adate1 = new Date(new Date(this.DATE+'T00:00:00.000Z').getTime()+1*24*60*60*1000);

                    var adate2 = new Date(new Date(this.DATE+'T00:00:00.000Z').getTime()+1*24*60*60*1000).toISOString().substr(0,10)
                  //  adate1.setDate(adate1.getDate()+1);
                    this.DATE=adate2;
                },
                toString:function() {
                    return this.DATE+ " "+this.TIME;
                }
            };
        }

        var convertToUTCDatetime = function(datetime) {
            var utcTimestamp = localToUtcByHana(datetime,that2.timezone);
            return utcTimestamp;
        }

        var calculateExecTimeToWorkingHourTime = function(execDateTime) {
            var execSettingLocalTime, newExecDateTime;
            try {
                if (execDateTime > -1) {

                    //covert execute datetime to user setting local datetime
                    execSettingLocalTime = convertToLocalDatetime(execDateTime);

                    if (that2.startWorkHour > that2.endWorkHour){  //PM to AM scenario
                        if(execSettingLocalTime.TIME >= that2.startWorkHour){ // in PM to AM scenario, it is PM now and within schedule working hour
                            newExecDateTime = execDateTime;    //schedule now
                        }else if (execSettingLocalTime.TIME <= that2.endWorkHour){  //in PM to AM scenario it is AM now and within schedule working hour
                            newExecDateTime = execDateTime;    //schedule now
                        } else {
                            newExecDateTime = calculateIntoWorkingHourTime(execSettingLocalTime, that2.startWorkHour, that2.endWorkHour)    //PM to AM scenario - schedule for working hour start time. The first
                        }
                    } else { //AM to PM scenario
                        if (execSettingLocalTime.TIME >= that2.startWorkHour && execSettingLocalTime.TIME <= that2.endWorkHour) { //schedule now
                            newExecDateTime = execDateTime;    //schedule now
                        } else {
                            // if working hour not yet started - first funtion of calculateWokringHourTime will be executed
                           // if working hour has ended - second funtion of calculateWokringHourTime will be executed
                            newExecDateTime = calculateIntoWorkingHourTime(execSettingLocalTime, that2.startWorkHour, that2.endWorkHour);
                        }
                    }

                    return newExecDateTime;

                }
            }catch (e) {
                // logger.error("CREATE_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
                throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
            }
        };

        var calculateIntoWorkingHourTime = function(execLocalTime, startWorkHour, endWorkHour){
            var newLocalTime, newUtcTime, millisecondRecurrence, times, nextfirstTime ;

            // get next exectue time within work hour
            newLocalTime = execLocalTime;
            if (startWorkHour > endWorkHour){  //PM to AM scenario
                if(execLocalTime.TIME > endWorkHour && execLocalTime.TIME <startWorkHour){
                    //next exeute time: sameday startWorkHour
                    newLocalTime.TIME=startWorkHour;
                }
            } else if(startWorkHour < endWorkHour) { //AM to PM scenario
                if (execLocalTime.TIME <startWorkHour) {
                    //next exeute time: sameday startWorkHour
                    newLocalTime.TIME=startWorkHour;

                } else if (execLocalTime.TIME >endWorkHour) {
                    //next exeute time: day+1 startWorkHour
                    newLocalTime.addOneDay();
                    newLocalTime.TIME=startWorkHour;
                }
            }

            newUtcTime = convertToUTCDatetime(newLocalTime.toString());

            switch (that2.recurrence.TYPE){
                case 'HOUR':
                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 60 * 1000;
                    times = Math.ceil((newUtcTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
                    break;
                case 'MINUTE':
                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 1000;
                    times = Math.ceil((newUtcTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
                    break;
            }

            return nextfirstTime;
        };

        var localToUtcByHana = function(localTime,timezone) {
            var conn, rs, result, utcTimestamp, sql;
             try {

                conn = $.hdb.getConnection();
                sql= "select LOCALTOUTC(?, ?,'platform') UTC_TIMESTAMP FROM DUMMY";
                rs = conn.executeQuery(sql,localTime,timezone);
                if(rs.length>0){
                    utcTimestamp = rs[0].UTC_TIMESTAMP;
                    utcTimestamp = new Date(timeFormatHelper.dateFormat('yyyy-MM-ddTHH:mm:ss',utcTimestamp)+'.000Z');
                }

            /*
            var timeConvert;
            var proc_name = 'sap.tm.trp.db.common::p_local_to_utc_by_timezone';
            timeConvert = that.conn.loadProcedure(constants.SCHEMA_NAME, proc_name);

            utcTimestamp = timeConvert(localTime, timezone).EXT_UTC_TIME;
            */
            } catch (e) {
                throw new Error("Unable to convert time to local by hana", e);
            } finally {
                conn.close();
            }

            return utcTimestamp;
        };
//<--
		var calculateWokringHourTime = function(execTime, startTime) {
			var newTime, jobSchedule = true,
				xscron, result = {}, millisecondRecurrence, times, nextfirstTime ;
			var nextfirstTimeCheck, expireTimeCheck;

			if (execTime.toLocaleTimeString() < startTime.toLocaleTimeString()) {
				newTime = execTime;
				newTime.setHours(startTime.getHours());
				newTime.setMinutes(startTime.getMinutes());
				newTime.setSeconds(0,0);

				switch (that2.recurrence.TYPE){
                	case 'HOUR':
	                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 60 * 1000;
	                    times = Math.ceil((newTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
	                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
	                    break;
                	case 'MINUTE':
	                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 1000;
	                    times = Math.ceil((newTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
	                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
	                    break;
                }

				xscron = nextfirstTime.toXscronString();

				nextfirstTimeCheck = new Date(nextfirstTime);
			    expireTimeCheck = new Date(that2.expireTime);

			    nextfirstTimeCheck.setHours(0,0,0,0);
			    expireTimeCheck.setHours(0,0,0,0);

				if (nextfirstTimeCheck.getTime() === expireTimeCheck.getTime()) {
					if (nextfirstTime.toLocaleTimeString() > that2.expireTime.toLocaleTimeString()) {
						jobSchedule = false;
					}
				}
			} else {
				newTime = execTime;
				newTime.setHours(startTime.getHours());
				newTime.setMinutes(startTime.getMinutes());
				newTime.setSeconds(0,0);

				nextfirstTimeCheck = new Date(execTime);
			    expireTimeCheck = new Date(that2.expireTime);

			    nextfirstTimeCheck.setHours(0,0,0,0);
			    expireTimeCheck.setHours(0,0,0,0);

			    nextfirstTimeCheck.setDate(nextfirstTimeCheck.getDate() + 1);

				if (nextfirstTimeCheck.getTime() > expireTimeCheck.getTime()) {
					jobSchedule = false;
				} else {
					newTime.setDate(execTime.getDate() + 1);

					switch (that2.recurrence.TYPE){
		                case 'HOUR':
		                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 60 * 1000;
		                    times = Math.ceil((newTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
		                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
		                    break;
		                case 'MINUTE':
		                    millisecondRecurrence = that2.recurrence.INTERVAL * 60 * 1000;
		                    times = Math.ceil((newTime.getTime() - that2.startTime.getTime()) / millisecondRecurrence);
		                    nextfirstTime = new Date(that2.startTime.getTime() + times * millisecondRecurrence);
		                    break;
					}

					xscron = nextfirstTime.toXscronString();
				}
			}

			result.jobSchedule = jobSchedule;
			result.xscron = xscron;

			return result;
		};

		var createWorkHourSchedule = function() {
			var firstTime, firstLocalTime, description, newJob, xscron, newId = -1,
				procName, createJobSchedule, jobSchedule = true, result,
				scheduleFlag = 1,
				startDateTime, endDateTime, startWorkHourLocalTime, endWorkHourLocalTime;

			firstTime = getScheduleFirstTime(that2.startTime, that2.expireTime);
			if (firstTime > -1) {
			    firstTime = calculateExecTimeToWorkingHourTime(firstTime);
				firstLocalTime = new Date(firstTime.getTime());
				that2.runTime = new Date(firstLocalTime.getTime());

				startDateTime = new Date(that2.startworkhour);
				endDateTime = new Date(that2.endworkhour);
				startWorkHourLocalTime = new Date(startDateTime.getTime());
				endWorkHourLocalTime = new Date(endDateTime.getTime());

				if (startWorkHourLocalTime.toLocaleTimeString() > endWorkHourLocalTime.toLocaleTimeString()){  //PM to AM scenario
				    if(firstLocalTime.toLocaleTimeString() >= startWorkHourLocalTime.toLocaleTimeString()){ // in PM to AM scenario, it is PM now and within schedule working hour
				        xscron = firstLocalTime.toXscronString();    //schedule now
				    }else if (firstLocalTime.toLocaleTimeString() <= endWorkHourLocalTime.toLocaleTimeString()){  //in PM to AM scenario it is AM now and within schedule working hour
				        xscron = firstLocalTime.toXscronString();  //schedule now
				    } else {
				        result = calculateWokringHourTime(firstLocalTime, startWorkHourLocalTime)    //PM to AM scenario - schedule for working hour start time. The first function of calculateWokringHourTime will be executed
				        if(result.jobSchedule){
				            xscron = result.xscron;
				        }
				        else{
				            jobSchedule = false;
				        }
				    }
				} else { //AM to PM scenario
				    if (firstLocalTime.toLocaleTimeString() >= startWorkHourLocalTime.toLocaleTimeString() && firstLocalTime.toLocaleTimeString() <= endWorkHourLocalTime.toLocaleTimeString()) { //schedule now
				        xscron = firstLocalTime.toXscronString();    //schedule now
				    } else {
				        // if working hour not yet started - first funtion of calculateWokringHourTime will be executed
				       // if working hour has ended - second funtion of calculateWokringHourTime will be executed
				        result = calculateWokringHourTime(firstLocalTime, startWorkHourLocalTime);
    					if(result.jobSchedule){
				            xscron = result.xscron;
				        }
				        else{
				            jobSchedule = false;
				        }
				    }
				}

				if (jobSchedule) {
					newId = that.job.schedules.add({
						description: getDescription(),
						xscron: xscron,
						parameter: {
							CONN_SQLCC: that2.connSqlcc,
							JOB_SQLCC: that2.jobSqlcc,
							MODEL_ID: that2.modelId,
							START_TIME: that2.startTime,
							EXPIRE_TIME: that2.expireTime,
							RECURRENCE: that2.recurrence,
							SCHEDULE_TYPE: that2.scheduleType, // PLAN,LOCAITON_RULE
							RESOURCE_CATEGORY: that2.resourceCategory,
							EXECWORKHOUR: that2.execworkhour,
							STARTWORKHOUR: that2.startworkhour,
							ENDWORKHOUR: that2.endworkhour, // and so on
							TIMEZONE : that2.timezone
						}
					});
				}
			}
			return newId;
		};

		this.create = function() {
			return createSchedule(); // create
		};
	};
}