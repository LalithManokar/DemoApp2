var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');

var STATUS={
	SCHEDULED :1,
	RUNNING: 2,
	SUCCESS:3,
	ERROR:4
};

function addSchedule(threadId){
	var id = null;
	var xsCronInstantaneous = "* * * * * * */1";
	var thread = new $.jobs.Job({uri:"/sap/tm/trp/service/common/job/JobSchedule.xsjob"});
	id = thread.schedules.add({ description: "adding schedule  for thread Id : "+threadId, 
		xscron: xsCronInstantaneous,
		parameter:
		{ 
			"threadId": threadId
		}
	});
	return id;
}


function sleep(milliseconds) {
    
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

/*
 * @desc deletes schedule for given scheduleId
 * 
 * @param scheduleId - Schedule Id of the schedule to be deleted.
 */
function deleteSchedule(scheduleId){
	var thread = new $.jobs.Job({uri:"/sap/tm/trp/service/common/job/JobSchedule.xsjob"});
	thread.schedules.delete({id: scheduleId});

}


function getScheduleId(threadId)
{
	var scheduleId= -1;
	var conn = null;
	try{
		conn = $.db.getConnection();
		var sql = "select SCHEDULE_ID from \"sap.tm.trp.db.common.job::t_jobs_metadata\"   WHERE ID = ?";
		var pstmt = conn.prepareStatement(sql);
		pstmt.setBigInt(1, threadId);
		var rs = pstmt.executeQuery();
		while (rs.next()) {
			scheduleId =rs.getInteger(1);
		}
		pstmt.close();
		conn.commit();
	}catch(e)
	{
		throw new lib.InternalError("Unable to retrieve the schedule Id",e);
	}finally{
		conn.close();
	}
	return parseInt(scheduleId,10);

}

function getThreadMetaData(id)
{

	var conn = null;
	var result = {};
	try{
			conn = $.db.getConnection();
			var sql = "select ID,SCHEDULE_ID,NAME,CREATED_BY,PKG,LIB,FUNCTION,PARAMS,STATUS from \"sap.tm.trp.db.common.job::t_jobs_metadata\"   WHERE ID = ?";
			var pstmt = conn.prepareStatement(sql);
			pstmt.setBigInt(1, id);
			var rs = pstmt.executeQuery();
			while (rs.next()) {
				result.ID =rs.getInteger(1);
				result.SCHEDULE_ID =rs.getInteger(2);
				result.NAME = rs.getString(3);
				result.CREATED_BY = rs.getString(4);
				result.PKG = rs.getString(5);
				result.LIB = rs.getString(6);
				result.FUNCTION = rs.getString(7);
				result.PARAMS =JSON.parse( rs.getString(8));
				result.STATUS =rs.getInteger(9);
			}
			pstmt.close();
	}catch(e)
	{
		throw new lib.InternalError("Unable to retrieve the job metadata",e);
	}finally{
		conn.close();
	}
	return result;

}

function setStatus(id,status)
{
	var conn = null
	try{
	    conn = $.db.getConnection();
		var sql = "update \"sap.tm.trp.db.common.job::t_jobs_metadata\" set STATUS=?  WHERE ID = ?";
		var pstmt = conn.prepareStatement(sql);
		pstmt.setInteger(1,status);
		pstmt.setBigInt(2, id);
		pstmt.executeUpdate();
		pstmt.close();
		conn.commit();
	}catch(e)
	{
		throw new lib.InternalError("Unable to update the status of the job",e);
		
	}finally
	{
		conn.close();
	}
	
}

function getNextNumber(sequence) {
	var number = -1;
	var q = "select " + sequence + ".NEXTVAL from \"SYS\".\"DUMMY\"";
	var dbcon = $.db.getConnection();
	var selectPstmt = dbcon.prepareStatement(q);
	var rs = selectPstmt.executeQuery();
	if (rs.next()) {
		number = rs.getInteger(1);
	}
	rs.close();
	selectPstmt.close();
	dbcon.close();
	return number;
}

function updateScheduleId(threadId,scheduleId)
{
	var dbcon = $.db.getConnection();
	var pstmt =null;
	try {
		var statementString = "update \"sap.tm.trp.db.common.job::t_jobs_metadata\" set SCHEDULE_ID=? where ID=?";
		pstmt =  dbcon.prepareStatement(statementString);
		pstmt.setBigInt(1, scheduleId);
		pstmt.setBigInt(2, threadId);
		pstmt.executeUpdate();
	} catch (error) {
		throw new lib.InternalError("Unable to update the schedule id",e);
	}finally{
		pstmt.close();
		dbcon.commit();
		dbcon.close();
	}

}

function addMetaData(name, pkg, lib, func, params)
{
	
	var threadId = getNextNumber("\"sap.tm.trp.db.common.job::s_jobs_metadata\"");
	var dbcon = $.db.getConnection();
	var pstmt =null;
	try {
		var statementString = "insert into \"sap.tm.trp.db.common.job::t_jobs_metadata\" (ID,NAME,CREATED_BY,PKG,LIB,FUNCTION,PARAMS,STATUS) values (?,?,?,?,?,?,?,?)";
		pstmt =  dbcon.prepareStatement(statementString);
		pstmt.setBigInt(1, threadId);
		pstmt.setString(2, name);
		pstmt.setString(3, $.session.getUsername() );
		pstmt.setString(4, pkg);
		pstmt.setString(5, lib);
		pstmt.setString(6, func);
		pstmt.setString(7, JSON.stringify(params) );
		pstmt.setInteger(8,STATUS.SCHEDULED);
		pstmt.executeUpdate();
		pstmt.close();
		dbcon.commit();
	} catch (error) {
		throw new lib.InternalError("Unable to add the job metadata",e);
	}finally{
		dbcon.close();
	}
	return threadId;

}
