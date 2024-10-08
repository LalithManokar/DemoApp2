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

function RecurrenceRule(year, month, day, hour, minute, second) {
	this.recurs = true;
	this.year = (year === null) ? null : year;
	this.month = (month === null) ? null : month;
	this.day = (day === null) ? null : day;
	this.hour = (hour === null) ? null : hour;
	this.minute = (minute === null) ? null : minute;
	this.second = (second === null) ? 0 : second;
} 

RecurrenceRule.prototype.nextInvocationDate = function(base){
	var addDateConvenienceMethods = function(date) {
		if (typeof date.addOneYear !== 'function') {
			date.addOneYear = function() {
				this.setFullYear(this.getFullYear() + 1);
			};

			date.addOneMonth = function() {
				this.setMonth(this.getMonth() + 1);
			};

			date.addOneDay = function() {
				this.setDate(this.getDate() + 1);
			};

			date.addOneHour = function() {
				this.setTime(this.getTime() + (60 * 60 * 1000));
			};

			date.addOneMinute = function() {
				this.setTime(this.getTime() + (60 * 1000));
			};

			date.addOneSecond = function() {
				this.setTime(this.getTime() + 1000);
			};
		}
	};

	base = (base instanceof Date) ? new Date(base.getTime()) : (new Date());
	addDateConvenienceMethods(base); 
	if (!this.recurs) {
		return null;
	}

	var now = new Date();
	addDateConvenienceMethods(now);
	if (this.year !== null && (typeof this.year == 'number') && this.year < now.getFullYear()) {
		return null;
	}

	var next = new Date(base.getTime());
	addDateConvenienceMethods(next);
	next.addOneSecond();

	while (true) {
		if (this.year !== null && (this.year--) > 0) {
			next.addOneYear();
			next.setMonth(0);
			next.setDate(0);
			next.setHours(0);
			next.setMinutes(0);
			next.setSeconds(0);
			continue;
		}
		if (this.month != null && (this.month--) > 0) {
			next.setDate(1);
			next.setHours(0);
			next.setMinutes(0);
			next.setSeconds(0);
			next.addOneMonth();
			continue;
		}
		if (this.day != null && (this.day--) > 0) {
			next.addOneDay();
			continue;
		}
		if (this.hour != null && (this.hour--) > 0) {
			next.addOneHour();
			continue;
		}
		if (this.minute != null && (this.minute--) > 0) {
			next.addOneMinute();
			continue;
		}
		if (this.second != null && (this.second--) > 0) {
			next.addOneSecond();
			continue;
		}
		break;
	}
	return next;
};

function Job(params) {
	var execWorkHour, startWorkHour, endWorkHour,timezone='Asia/Shanghai';	//why hardcode asia/shanghai ???
	var that = this;
	this.xsJob = params.xsJob;
	this.scheduleType = params.scheduleType;
	this.startTime = new Date(params.startTime) || null;
	this.expireTime = new Date(params.expiryTime) || null;
	this.recurrence = params.recurrence || 0;
	this.modelId = params.modelId;
	this.connSqlcc = params.connSqlcc;
	this.jobSqlcc = params.jobSqlcc;
	this.uri = params.uri || null;
	this.functionName = params.functionName || null;
	this.resourceCategory = params.resourceCategory || null;
	this.conn = $.hdb.getConnection({
		"sqlcc": params.connSqlcc,
		"pool": true
	});
	this.conn.setAutoCommit(false);
	// create the xsjsJob
	this.job = new $.jobs.Job({
		uri: params.xsJob,
		sqlcc: params.jobSqlcc
	});

	if (params.hasOwnProperty("execWorkHour")) {
		execWorkHour = params.execWorkHour;
	}

	if (params.hasOwnProperty("startWorkHour")) {
		startWorkHour = params.startWorkHour;
	}

	if (params.hasOwnProperty("endWorkHour")) {
		endWorkHour = params.endWorkHour;
	}

	if (params.hasOwnProperty("timezone")) {
    	timezone = params.timezone;
    }

	this.execWorkHour = execWorkHour;
	this.startWorkHour = startWorkHour;
    this.endWorkHour = endWorkHour;
	this.timezone = timezone;

	var getDescription = function() {
		// scheduleType will be PLAN, LOCATION_RULE and so on
		return ["ScheduleType: " + that.scheduleType, "ModelId: " + that.modelId, "RunTime: " + that.runTime, "StartTIme: " + that.startTime, "ExpireTime: " + that.expireTime,
            "Recurrence: " + that.recurrence.INTERVAL + " " + that.recurrence.TYPE].join(", ");
	};

	var getScheduleFirstTime = function() {
		var now = new Date(),
			firstTime = -1;
			var tempLocalTime = convertToLocalDatetime(that.startTime);
		switch (that.recurrence.TYPE) {
			case 'MONTH':
				// if this month does not have that.recurrence.DAY, the job will
				// run at the last day of this month
				if (now.getTime() < that.expireTime.getTime()) {
				    if (that.startTime.getTime() > now.getTime()) {
					    if (tempLocalTime.getTimeStamp().getDate() > that.recurrence.DAY) {
						    tempLocalTime.addMonth(1);
                            tempLocalTime.setDate(that.recurrence.DAY);
					    } else {
						    tempLocalTime.setDate(that.recurrence.DAY);
					    }
				    } else if (that.startTime.getTime() < now.getTime()) {
				        var nowLocalTime = convertToLocalDatetime(now);
				        var diffMonth = (nowLocalTime.getTimeStamp().getFullYear() - tempLocalTime.getTimeStamp().getFullYear()) * 12 + nowLocalTime.getTimeStamp().getMonth() - tempLocalTime.getTimeStamp().getMonth();
					    var times = Math.ceil(diffMonth / that.recurrence.INTERVAL);
					    tempLocalTime.addMonth(that.recurrence.INTERVAL * times);
					    tempLocalTime.setDate(that.recurrence.DAY);
					    if (tempLocalTime.getTimeStamp().getTime() < now.getTime()) {
						    tempLocalTime.addMonth(1);
					    }
				    }
				    var tempUtcTime = convertToUTCDatetime(tempLocalTime.toString());
				    if (tempUtcTime.getTime() <= that.expireTime.getTime()) {
				        firstTime = new Date(tempUtcTime.getTime());
				    }
				}
				break;
			case 'WEEK':
				that.recurrence.DAY == 0 ? 7 : that.recurrence.DAY;
				if (now.getTime() < that.expireTime.getTime()) {
				    if (that.startTime.getTime() > now.getTime()) {
				        var startTimeDay = ((tempLocalTime.getTimeStamp().getDay() == 0) ? 7 : tempLocalTime.getTimeStamp().getDay());
					    if (startTimeDay > that.recurrence.DAY) {
					        tempLocalTime.addDate(that.recurrence.DAY + 7 - startTimeDay);
                        } else {
                            tempLocalTime.addDate(that.recurrence.DAY - startTimeDay);
                        }
				    } else if (that.startTime.getTime() < now.getTime()) {
				        tempLocalTime = convertToLocalDatetime(now);
				        var day = ((tempLocalTime.getTimeStamp().getDay() == 0) ? 7 : tempLocalTime.getTimeStamp().getDay());
					    if (day >= that.recurrence.DAY) {
					    	//The next execution start time should use the start time,not the current time  
					    	tempLocalTime = convertToLocalDatetime(that.startTime);
						    tempLocalTime.addDate(that.recurrence.DAY + 7 - day);
					    } else {
						    tempLocalTime.addDate(that.recurrence.DAY - day);
					    }
				    }
				    var tempUtcTime = convertToUTCDatetime(tempLocalTime.toString());
				    if (tempUtcTime.getTime() <= that.expireTime.getTime()) {
				        firstTime = new Date(tempUtcTime.getTime());
				    }
				}
				break;
			case 'DAY':
				if (that.startTime.getTime() > now.getTime()) {
					firstTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < now.getTime() && now.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL * 24 * 60 * 60 * 1000;
					var times = Math.ceil((now.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					firstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}

				break;
			case 'HOUR':
				if (that.startTime.getTime() > now.getTime()) {
					firstTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < now.getTime() && now.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
					var times = Math.ceil((now.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					firstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
				break;
			case 'MINUTE':
				if (that.startTime.getTime() > now.getTime()) {
					firstTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < now.getTime() && now.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL * 60 * 1000;
					var times = Math.ceil((now.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					firstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
				break;
		}
		if (firstTime != -1 && (firstTime.getTime() > that.expireTime.getTime())) {
			firstTime = -1;
		}
		logger.info("GET_SCHEDULE_FIRST_TIME", firstTime, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
		if (firstTime !== -1) {
			firstTime.setSeconds(0);
		}
		return firstTime;
	};

    var convertToLocalDatetime = function(datetime) {
        var localTimestamp = utils.utcToLocalByHana(datetime,that.timezone);
        var aDATE= timeFormatHelper.dateUTCFormat('yyyy-MM-dd',localTimestamp);
        var aTIME= timeFormatHelper.dateUTCFormat('HH:mm:ss',localTimestamp);
        return {
            DATETIME:localTimestamp,
            DATE:aDATE,
            TIME:aTIME,
            addOneDay : function() {
                var aDate = new Date(this.DATE);
                aDate = new Date(aDate.getTime()+1*24*60*60*1000);
                this.DATE=timeFormatHelper.dateFormat('yyyy-MM-dd',aDate);
            },
            addMonth : function(month) {
                var aDate = new Date(this.DATE);
                aDate.setMonth(aDate.getMonth() + month);
                this.DATE=timeFormatHelper.dateFormat('yyyy-MM-dd',aDate);
            },
            addDate : function(date) {
                var aDate = new Date(this.DATE);
                aDate.setDate(aDate.getDate() + date);
                this.DATE=timeFormatHelper.dateFormat('yyyy-MM-dd',aDate);
            },
            setDate: function(day) {
                 var sMonth = this.DATE.substr(0,8);
                 var sDay = day>=10 ? day : '0'+day;
                this.DATE=sMonth+sDay;
            },
            getTimeStamp: function() {
                var s = this.DATE+ 'T' +this.TIME;
                var aDate = new Date(s);
                return aDate;
            },
            toString:function() {
                return this.DATE+ 'T' +this.TIME;
            }
        };
    }

    var convertToUTCDatetime = function(datetime) {
        var utcTimestamp = localToUtcByHana(datetime,that.timezone);
        return utcTimestamp;
    }


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

        switch (that.recurrence.TYPE){
            case 'HOUR':
                millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
                times = Math.ceil((newUtcTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                break;
            case 'MINUTE':
                millisecondRecurrence = that.recurrence.INTERVAL * 60 * 1000;
                times = Math.ceil((newUtcTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                break;
        }

        return nextfirstTime;
    };

    var calculateExecTimeToWorkingHourTime = function(execDateTime) {
        var execSettingLocalTime, newExecDateTime;
        try {
            if (execDateTime > -1) {

                //covert execute datetime to user setting local datetime
                execSettingLocalTime = convertToLocalDatetime(execDateTime);

                if (that.startWorkHour > that.endWorkHour){  //PM to AM scenario
                    if(execSettingLocalTime.TIME >= that.startWorkHour){ // in PM to AM scenario, it is PM now and within schedule working hour
                        newExecDateTime = execDateTime;    //schedule now
                    }else if (execSettingLocalTime.TIME <= that.endWorkHour){  //in PM to AM scenario it is AM now and within schedule working hour
                        newExecDateTime = execDateTime;    //schedule now
                    } else {
                        newExecDateTime = calculateIntoWorkingHourTime(execSettingLocalTime, that.startWorkHour, that.endWorkHour)    //PM to AM scenario - schedule for working hour start time. The first
                    }
                } else { //AM to PM scenario
                    if (execSettingLocalTime.TIME >= that.startWorkHour && execSettingLocalTime.TIME <= that.endWorkHour) { //schedule now
                        newExecDateTime = execDateTime;    //schedule now
                    } else {
                        // if working hour not yet started - first funtion of calculateWokringHourTime will be executed
                       // if working hour has ended - second funtion of calculateWokringHourTime will be executed
                        newExecDateTime = calculateIntoWorkingHourTime(execSettingLocalTime, that.startWorkHour, that.endWorkHour);
                    }
                }

                return newExecDateTime;

            }
        }catch (e) {
            // logger.error("CREATE_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
            throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
        }
    };

	
	var calculateWokringHourTime = function(execTime, startTime){
	    var newTime, jobSchedule = true, xscron, result = {}, millisecondRecurrence, times, nextfirstTime ;
	    var nextfirstTimeCheck, expireTimeCheck;
        if (execTime.toLocaleTimeString() < startTime.toLocaleTimeString()) {
            
            newTime = execTime;
			newTime.setHours(startTime.getHours());
			newTime.setMinutes(startTime.getMinutes());
			newTime.setSeconds(0,0);
			
			switch (that.recurrence.TYPE){
                case 'HOUR':
                    millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
                    times = Math.ceil((newTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                    break;
                case 'MINUTE':
                    millisecondRecurrence = that.recurrence.INTERVAL * 60 * 1000;
                    times = Math.ceil((newTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                    break;
            }

			xscron = nextfirstTime.toXscronString();
			
			nextfirstTimeCheck = new Date(nextfirstTime);
			expireTimeCheck = new Date(that.expireTime);
			
			nextfirstTimeCheck.setHours(0,0,0,0);
			expireTimeCheck.setHours(0,0,0,0);
			  
			if (nextfirstTimeCheck.getTime() === expireTimeCheck.getTime()){   //compare the date
			    if(nextfirstTime.toLocaleTimeString() > that.expireTime.toLocaleTimeString()) {
                    jobSchedule = false;
		        }
			}
		} else {
			newTime = execTime;
			newTime.setHours(startTime.getHours());
			newTime.setMinutes(startTime.getMinutes());
			newTime.setSeconds(0,0);
			
			nextfirstTimeCheck = new Date(execTime);
			expireTimeCheck = new Date(that.expireTime);
			
			nextfirstTimeCheck.setHours(0,0,0,0);
			expireTimeCheck.setHours(0,0,0,0);
			
			nextfirstTimeCheck.setDate(nextfirstTimeCheck.getDate() + 1);
			
			if (nextfirstTimeCheck.getTime() > expireTimeCheck.getTime()) {
				jobSchedule = false;
			}  else{ 
			    
			    newTime.setDate(execTime.getDate() + 1);
			    
			    switch (that.recurrence.TYPE){
                case 'HOUR':
                    millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
                    times = Math.ceil((newTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                    break;
                case 'MINUTE':
                    millisecondRecurrence = that.recurrence.INTERVAL * 60 * 1000;
                    times = Math.ceil((newTime.getTime() - that.startTime.getTime()) / millisecondRecurrence);
                    nextfirstTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
                    break;
                }
                
                xscron = nextfirstTime.toXscronString();
                
                if (nextfirstTimeCheck.getTime() === expireTimeCheck.getTime()){
                    if(nextfirstTime.toLocaleTimeString() > that.expireTime.toLocaleTimeString()) {
                        jobSchedule = false;
		            }
                }
			}
		}
		
		result.jobSchedule = jobSchedule;
		result.xscron = xscron;
		
		return result;
    };

	var createWorkingHourScheduleNew = function() {
		var firstTime, firstLocalTime, xscron, newId = -1, createJobSchedule, scheduleFlag = 1,
			startWorkHourLocalTime, endWorkHourLocalTime, startDateTime, endDateTime, tempDateTime, result, jobSchedule = true;
		try {
			firstTime = getScheduleFirstTime(that.startTime, that.expireTime);
			if (firstTime > -1) {
				firstLocalTime = new Date(firstTime.getTime());
				that.runTime = new Date(firstLocalTime.getTime());

				startDateTime = new Date(that.startWorkHour);
				endDateTime = new Date(that.endWorkHour);
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
							CONN_SQLCC: that.connSqlcc,
							JOB_SQLCC: that.jobSqlcc,
							MODEL_ID: that.modelId,
							START_TIME: that.startTime,
							EXPIRE_TIME: that.expireTime,
							RECURRENCE: that.recurrence,
							SCHEDULE_TYPE: that.scheduleType, // PLAN,LOCAITON_RULE
							RESOURCE_CATEGORY: that.resourceCategory,
							EXECWORKHOUR: that.execWorkHour,
							STARTWORKHOUR: that.startWorkHour,
							ENDWORKHOUR: that.endWorkHour // and so on
						}
					});
					createJobSchedule = that.conn.loadProcedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.job::p_create_job_schedule');
					createJobSchedule(newId, that.modelId, scheduleFlag, that.scheduleType);
					that.conn.commit();
				}
			}
			logger.success("CREATE_SCHEDULE_SUCCESS", newId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			return newId;
		} catch (e) {
			logger.error("CREATE_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
			throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
		}
	};

	var createSchedule = function() {
		var firstTime, firstLocalTime, description, newJob, xscron, newId = -1,
			procName, createJobSchedule, scheduleFlag = 1;
		try {
			firstTime = getScheduleFirstTime(that.startTime, that.expireTime);
			if (firstTime > -1) {
                if(execWorkHour){
                    firstTime = calculateExecTimeToWorkingHourTime(firstTime);
                    if (firstTime.getTime() > that.expireTime.getTime()){
                        return newId;
                    }
                }
				firstLocalTime = new Date(firstTime.getTime());
				that.runTime = new Date(firstLocalTime.getTime());
				xscron = firstLocalTime.toXscronString();
				newId = that.job.schedules.add({
					description: getDescription(),
					xscron: xscron,
					parameter: {
						CONN_SQLCC: that.connSqlcc,
						JOB_SQLCC: that.jobSqlcc,
						MODEL_ID: that.modelId,
						START_TIME: that.startTime,
						EXPIRE_TIME: that.expireTime,
						RECURRENCE: that.recurrence,
						SCHEDULE_TYPE: that.scheduleType, // PLAN,LOCAITON_RULE
						RESOURCE_CATEGORY: that.resourceCategory, // and so on
						EXECWORKHOUR: that.execWorkHour,
                        STARTWORKHOUR: that.startWorkHour,
                        ENDWORKHOUR: that.endWorkHour,
                        TIMEZONE : that.timezone
					}
				});
				createJobSchedule = that.conn.loadProcedure(constants.SCHEMA_NAME, 'sap.tm.trp.db.job::p_create_job_schedule');
				createJobSchedule(newId, that.modelId, scheduleFlag, that.scheduleType);
				that.conn.commit();
			}
			logger.success("CREATE_SCHEDULE_SUCCESS", newId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			return newId;
		} catch (e) {
			logger.error("CREATE_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
			throw new Error(messages.MSG_ERROR_CREATE_SCHEDULE);
		}
	};

	var createNextWorkingScheduleNew = function() {
		var xscron, newId, description, procName, addJobSchedule, base, nextTime, nextLocalTime, rule, tempTime = new Date(),
			startHour = that.startTime.getHours(),
			startMinute = that.startTime.getMinutes(),
			startWorkHourLocalTime, endWorkHourLocalTime, startDateTime, endDateTime, tempDateTime, result, jobSchedule = true;
		try {
			rule = new RecurrenceRule();
			if (that.recurrence.TYPE === 'WEEK') {
				that.recurrence.TYPE = 'DAY';
				that.recurrence.INTERVAL *= 7;
			}
			rule[that.recurrence.TYPE.toLowerCase()] = that.recurrence.INTERVAL;
			base = new Date();
			// get next time
			if (that.recurrence.TYPE === 'HOUR') {
			    if (that.startTime.getTime() > base.getTime()) {
					nextTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < base.getTime() && base.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
					var times = Math.ceil((base.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					nextTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
			} else if (that.recurrence.TYPE === 'MINUTE'){
			    if (that.startTime.getTime() > base.getTime()) {
					nextTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < base.getTime() && base.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL  * 60 * 1000;
					var times = Math.ceil((base.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					nextTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
			} else {
			    nextTime = new Date(rule.nextInvocationDate(base).getTime());
			}
			
			tempTime.setTime(nextTime.getTime());
			if (that.recurrence.TYPE === 'MONTH') {
				tempTime.setDate(that.recurrence.DAY);
				if (tempTime.getMonth() !== nextTime.getMonth()) {
					nextTime = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0, startHour, startMinute, 0);
				} else {
					nextTime = new Date(tempTime.getTime());
				}
			}
			if (that.recurrence.TYPE === 'MONTH' || that.recurrence.TYPE === 'WEEK') {
				nextTime.setHours(startHour);
				nextTime.setMinutes(startMinute);
			}
			if (nextTime.getTime() > base.getTime() && nextTime.getTime() < that.expireTime.getTime()) {
				nextLocalTime = new Date(nextTime.getTime());
				nextLocalTime.setSeconds(0,0);

				startDateTime = new Date(that.startWorkHour);
				endDateTime = new Date(that.endWorkHour);
				startWorkHourLocalTime = new Date(startDateTime.getTime());
				endWorkHourLocalTime = new Date(endDateTime.getTime());

				if(startWorkHourLocalTime.toLocaleTimeString() > endWorkHourLocalTime.toLocaleTimeString()){ //PM to AM scenario
                    
				    if(nextLocalTime.toLocaleTimeString() >= startWorkHourLocalTime.toLocaleTimeString() ){
				        xscron = nextLocalTime.toXscronString();
				    } else if (nextLocalTime.toLocaleTimeString() <= endWorkHourLocalTime.toLocaleTimeString()){
				        xscron = nextLocalTime.toXscronString();
				    }
				    else{
				        result = calculateWokringHourTime(nextLocalTime, startWorkHourLocalTime);
				        if(result.jobSchedule){
				            xscron = result.xscron;
				        }
				        else{
				            jobSchedule = false;
				        }
				    }
				}else{
    			    if (nextLocalTime.toLocaleTimeString() >= startWorkHourLocalTime.toLocaleTimeString() && nextLocalTime.toLocaleTimeString() <=
    					endWorkHourLocalTime.toLocaleTimeString()) {
    					xscron = nextLocalTime.toXscronString();
    				} else {
    				    result = calculateWokringHourTime(nextLocalTime, startWorkHourLocalTime);
    					if(result.jobSchedule){
				            xscron = result.xscron;
				        }
				        else{
				            jobSchedule = false;
				        }
    				}
			    }
				//xscron = nextLocalTime.toXscronString();
				// type will be PLAN, LOCATION_RULE and so on
				if (jobSchedule) {
					description = 'Schedule ' + that.scheduleType + ' job：StartTime: ' + that.startTime + ', expireTime: ' + that.expireTime;
					newId = that.job.schedules.add({
						description: getDescription(),
						xscron: xscron,
						parameter: {
							CONN_SQLCC: that.connSqlcc,
							JOB_SQLCC: that.jobSqlcc,
							MODEL_ID: that.modelId,
							START_TIME: that.startTime,
							EXPIRE_TIME: that.expireTime,
							RECURRENCE: that.recurrence,
							SCHEDULE_TYPE: that.scheduleType,
							RESOURCE_CATEGORY: that.resourceCategory, // PLAN,LOCAITON_RULE
							EXECWORKHOUR: that.execWorkHour,
							STARTWORKHOUR: that.startWorkHour,
							ENDWORKHOUR: that.endWorkHour // and so on
						}
					});
					procName = 'sap.tm.trp.db.job::p_add_job_schedule';
					addJobSchedule = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
					addJobSchedule(that.modelId, newId, that.scheduleType);
					that.conn.commit();
					logger.success("CREATE_NEXT_SCHEDULE_SUCCESS", newId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
				}
			} else {
				cancelSchedule(that.xsJob, that.modelId, that.conn); // cancel
				logger.info("NO_NEXT_SCHEDULE", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
				logger.success("CANCEL_SCHEDULE_SUCCESS", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			}
		} catch (e) {
			logger.error("CREATE_NEXT_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
		}
	};

	var createNextSchedule = function() {
		var time, xscron, description, newId, procName, addJobSchedule, base, nextTime, nextLocalTime, rule, ruleKey, tempTime = new Date(),
			startHour = that.startTime.getHours(),
			startMinute = that.startTime.getMinutes();
		try {
			rule = new RecurrenceRule();
			if (that.recurrence.TYPE === 'WEEK') {
				that.recurrence.TYPE = 'DAY';
				that.recurrence.INTERVAL *= 7;
			}
			rule[that.recurrence.TYPE.toLowerCase()] = that.recurrence.INTERVAL;
			base = new Date();
			// get next time
			
			if (that.recurrence.TYPE === 'HOUR') {
			    if (that.startTime.getTime() > base.getTime()) {
					nextTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < base.getTime() && base.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL * 60 * 60 * 1000;
					var times = Math.ceil((base.getTime() - that.startTime.getTime()) / millisecondRecurrence);
					nextTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
			} else if (that.recurrence.TYPE === 'MINUTE'){
			    if (that.startTime.getTime() > base.getTime()) {
					nextTime = new Date(that.startTime.getTime());
				} else if (that.startTime.getTime() < base.getTime() && base.getTime() < that.expireTime.getTime()) {
					var millisecondRecurrence = that.recurrence.INTERVAL  * 60 * 1000;
					var times = Math.ceil((base.getTime() + 10000 - that.startTime.getTime()) / millisecondRecurrence);
					nextTime = new Date(that.startTime.getTime() + times * millisecondRecurrence);
				}
			} else {
			    nextTime = new Date(rule.nextInvocationDate(base).getTime());
			}
		
			tempTime.setTime(nextTime.getTime());
			if (that.recurrence.TYPE === 'MONTH') {
				tempTime.setDate(that.recurrence.DAY);
				if (tempTime.getMonth() !== nextTime.getMonth()) {
					nextTime = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0, startHour, startMinute, 0);
				} else {
					nextTime = new Date(tempTime.getTime());
				}
			}
			if (that.recurrence.TYPE === 'MONTH' || that.recurrence.TYPE === 'WEEK') {
				nextTime.setHours(startHour);
				nextTime.setMinutes(startMinute);
			}
            if(execWorkHour){
                nextTime = calculateExecTimeToWorkingHourTime(nextTime);
            }
			if (nextTime.getTime() > base.getTime() && nextTime.getTime() < that.expireTime.getTime()) {
				nextLocalTime = new Date(nextTime.getTime());
				nextLocalTime.setSeconds(0);
				xscron = nextLocalTime.toXscronString();
				// type will be PLAN, LOCATION_RULE and so on
				description = 'Schedule ' + that.scheduleType + ' job：StartTime: ' + that.startTime + ', expireTime: ' + that.expireTime;
				newId = that.job.schedules.add({
					description: getDescription(),
					xscron: xscron,
					parameter: {
						CONN_SQLCC: that.connSqlcc,
						JOB_SQLCC: that.jobSqlcc,
						MODEL_ID: that.modelId,
						START_TIME: that.startTime,
						EXPIRE_TIME: that.expireTime,
						RECURRENCE: that.recurrence,
						SCHEDULE_TYPE: that.scheduleType,
						RESOURCE_CATEGORY: that.resourceCategory, // PLAN,LOCAITON_RULE
						EXECWORKHOUR: that.execWorkHour,
                        STARTWORKHOUR: that.startWorkHour,
                        ENDWORKHOUR: that.endWorkHour,
                        TIMEZONE : that.timezone
					}
				});
				procName = 'sap.tm.trp.db.job::p_add_job_schedule';
				addJobSchedule = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
				addJobSchedule(that.modelId, newId, that.scheduleType);
				that.conn.commit();
				logger.success("CREATE_NEXT_SCHEDULE_SUCCESS", newId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			} else {
				cancelSchedule(that.xsJob, that.modelId, that.conn); // cancel
				logger.info("NO_NEXT_SCHEDULE", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
				logger.success("CANCEL_SCHEDULE_SUCCESS", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			}
		} catch (e) {
			logger.error("CREATE_NEXT_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
		}
	};

	var deletePreviousSchedule = function() {
		var procName;
		var getPreviousScheduleId;
		var previousScheduleId;
		var result;
		try {
			// delete last job
			procName = 'sap.tm.trp.db.job::p_get_previous_schedule_id';
			getPreviousScheduleId = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
			result = getPreviousScheduleId(that.modelId, that.scheduleType);
			previousScheduleId = Number(result.PREVIOUS_SCHEDULE_ID.toString());
			if (previousScheduleId !== -1) {
				that.job.schedules.delete({
					id: previousScheduleId
				});
				logger.success("DELETE_SCHEDULE_SUCCESS", previousScheduleId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			}
			that.conn.commit();
			logger.success("DELETE_PREVIOUS_SCHEDULE_SUCCESS", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
		} catch (e) {
			logger.error("DELETE_PREVIOUS_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
		}
	};

	var deleteLastSchedule = function() {
		var procName;
		var getLastScheduleId;
		var lastScheduleId;
		var result;
		try {
			// delete last job
			procName = 'sap.tm.trp.db.job::p_get_last_schedule_id';
			getLastScheduleId = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
			result = getLastScheduleId(that.modelId, that.scheduleType);
			lastScheduleId = Number(result.PREVIOUS_SCHEDULE_ID.toString());
			if (lastScheduleId !== -1) {
				that.job.schedules.delete({
					id: lastScheduleId
				});
				logger.success("DELETE_SCHEDULE_SUCCESS", lastScheduleId, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			}
			that.conn.commit();
			logger.success("DELETE_LAST_SCHEDULE_SUCCESS", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
		} catch (e) {
			logger.error("DELETE_LAST_SCHEDULE_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			that.conn.rollback();
		}
	};

	var deleteAllActiveSchedule = function() {
		var procName, cancelJobSchedule, scheduleIds;
		try {
			procName = 'sap.tm.trp.db.job::p_cancel_job_schedule';
			cancelJobSchedule = new Procedure(constants.SCHEMA_NAME, procName);
			scheduleIds = cancelJobSchedule(that.modelId, that.scheduleType).SCHEDULE_IDS;
			if (scheduleIds.length > 0) {
				$.response.followUp({
					uri: that.uri,
					functionName: that.functionName,
					parameter: {
						SCHEDULELIST: scheduleIds,
						JOB: that.job
					}
				});
			}
		} catch (e) {
			throw new xslib.ValidationError(messages.MSG_ERROR_DELETE_ALL_ACTIVE_SCHEDULES, e);
		}
	};

	var getScheduleFlag = function() {
		var procName;
		var getScheduleFlag;
		var flag;
		var result = false;
		try {
			procName = 'sap.tm.trp.db.job::p_get_schedule_flag';
			getScheduleFlag = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
			// flag is SCHEDULE_FLAG, SCHEDULE_FLAG == 0 means no next schedule,
			// or SCHEDULE_FLAG == 1 has next schedule
			flag = getScheduleFlag(that.modelId, that.scheduleType).SCHEDULE_FLAG;
			if (flag === 1) {
				result = true;
			}
			logger.success("GET_SCHEDULE_FLAG_SUCCESS", that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
			return result;
		} catch (e) {
			logger.error("GET_SCHEDULE_FLAG_FAILED", e, that.scheduleType, that.modelId, that.startTime, that.expireTime, that.recurrence);
		}
	};

	var localToUtcByHana = function(localTime,timezone) {
        var conn, rs, result, utcTimestamp, sql;
         try {

            conn = $.hdb.getConnection();
            sql= "select LOCALTOUTC(?, ?,'platform') UTC_TIMESTAMP FROM DUMMY";
            rs = conn.executeQuery(sql,localTime,timezone);
            if(rs.length>0){
                utcTimestamp = rs[0].UTC_TIMESTAMP;
                //utcTimestamp.setHours(utcTimestamp.getHours() + 1);  //Make up the 1 hour gap
                utcTimestamp = new Date(timeFormatHelper.dateFormat('yyyy-MM-ddTHH:mm:ss',utcTimestamp)+'.000Z'); //Make up the 1 hour gap
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


	this.schedule = function() {
		this.create = function() {
			return createSchedule(); // create
		};

		this.update = function() {
			deleteLastSchedule(); // delete the last one
			createSchedule(); // create
		};

		this.cancel = function() {
			deleteLastSchedule(); // delete the last one
			deleteAllActiveSchedule(); // avoid pending
		};

		this.next = function() {
			if (getScheduleFlag()) {
			    createNextSchedule(); // create the next schedule
				deletePreviousSchedule(); // delete the previous one
			}
		};
		
		this.currentScheduleId = function() {
		    var procName, getCurrentScheduleId, result = {};
		    procName = 'sap.tm.trp.db.job::p_get_current_schedule_id';
			getCurrentScheduleId = that.conn.loadProcedure(constants.SCHEMA_NAME, procName);
			result = getCurrentScheduleId(that.modelId, that.scheduleType);
			return result.CURRENT_SCHEDULE_ID.toString();
		};
	};
}
