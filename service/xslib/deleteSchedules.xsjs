function deleteSchedule(params){
     for (var scheduleId in params.SCHEDULELIST){
         params.JOB.schedules.delete({id: scheduleId});
    }
}