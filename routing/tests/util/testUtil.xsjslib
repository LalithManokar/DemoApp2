var RepositoryPath = $.import("sap.hana.testtools.unit.util.internal", "repositoryPath").RepositoryPath;
var Repository = $.import("sap.hana.testtools.unit.util.internal", "repository").Repository;

var testUtil = function(conn) {
	this.conn = conn;
	

	function trimSpaces(value, all) {
		if (all) {
			return value.replace(/\s+/g, "");
		} else {
			return value.replace(/^\s+/, "").replace(/\s+$/, "");
		}
	}

	this.trimPropertySpaces = function (obj) {
		var p;
		for (p in obj) {
			if (p) {
				obj[p] = trimSpaces(obj[p], true);
			}
		}
		return obj;
	};
	
	// Currently just works for simple object
	this.cloneObject = function(obj){
	    if (typeof obj !== 'object'){
	        return obj;
	    }
	    
	    var clonedObj = {};
	    for (var p in obj){
	        // To-do: handle different property type like array, object
	        // Be carefull for endless recursion
	        if (Array.isArray(obj[p])){
	            clonedObj[p] = [];
        	    for (var i = 0;i < obj[p].length;i++){
        	        clonedObj[p].push(this.cloneObject(obj[p][i]));
        	    }
	        } else {
	            // There is problem to clone bigint object
	            clonedObj[p] = obj[p];
	        }
	    }
	    
	    return clonedObj;
	};
	
	/**
	 * Copied from DateUtils of test framework. The functions defined there are not exposed
	 * 
	 */
	this.YYYYMMDD = 'YYYYMMDD'; // default
	this.YYYY_MM_DD = 'YYYY-MM-DD';
	this.YYYYMMDDhhmmss = 'YYYYMMDDhhmmss';
	this.YYYYMMDDhhmmssSSS = 'YYYYMMDDhhmmssSSS';

	function pad(number) {
		if (number < 10) {
			return '0' + number;
		}
		return number;
	}

	function applyParticle(str, particle, value) {
		return str.replace(particle, value, "g");
	}

	function applyFormat(format, YYYY, MM, DD, hh, mm, ss, SSS) {
		var dateString = format;
		dateString = applyParticle(dateString, "YYYY", YYYY);
		dateString = applyParticle(dateString, "MM", MM);
		dateString = applyParticle(dateString, "DD", DD);
		dateString = applyParticle(dateString, "hh", hh);
		dateString = applyParticle(dateString, "mm", mm);
		dateString = applyParticle(dateString, "ss", ss);
		dateString = applyParticle(dateString, "SSS", SSS);
		return dateString;
	}

	this.formatDate = function(date, format) {
		var YYYY = date.getFullYear();
		var MM = pad(date.getMonth() + 1);
		var DD = pad(date.getDate());
		var hh = pad(date.getHours());
		var mm = pad(date.getMinutes());
		var ss = pad(date.getSeconds());
		var SSS = pad(date.getMilliseconds());

		return applyFormat(format, YYYY, MM, DD, hh, mm, ss, SSS);
	};
	
	this.cleanTestProcedures = function(testPackage) {
		var storedProcedures = [
		    'p_create_global_dataset',
		    'p_update_global_dataset',
		    'p_create_local_dataset',
		    'p_update_local_dataset',
		    'p_delete_dataset',
		    'p_save_dataset',
		    'p_validate_connection',
		    'p_validate_location_list',
		    'p_validate_path',
		    'p_read_dataset',
		    'p_read_dataset_by_code',
		    'p_read_basic_path_by_id',
		    'p_create_network',
		    'p_delete_network',
		    'p_read_basic_path_by_network',
		    'p_query_composite_path',
		    'p_read_network',
		    'p_read_network_by_code',
		    'p_retrieve_route_info',
		    'p_update_network'
		];
		
		storedProcedures.forEach(function(sp){
		    var repository = new Repository(jasmine.hdbConnection); // Seems db connection does not work (isolation level not correctly set)
		    var repositoryPath = RepositoryPath.fromPackageFilenameAndSuffix(
			testPackage, sp, 'hdbprocedure');
		    repository.deleteFile(repositoryPath);
		});
	};
	
	this.transformConnection = function(connection, connectionCarrier){
	    var map = {};
	    
	    connectionCarrier.sort(function(c1, c2){
	        return c1.CONNECTION_ID < c2.CONNECTION_ID && c1.CARRIER < c2.CARRIER;
	    });
	    
	    connectionCarrier.forEach(function(c){
	        if (!map[c.CONNECTION_ID]){
	            map[c.CONNECTION_ID] = [];
	        }
	        map[c.CONNECTION_ID].push(c.CARRIER);
	    });
	    
	    return connection.map(function(c){
	        return {
	            ID: c.ID.toString(),
	            FROM_LOCATION: c.FROM_LOCATION,
				TO_LOCATION: c.TO_LOCATION,
				MTR: c.MTR,
				DISTANCE: c.DISTANCE,
				DURATION: c.DURATION,
				CARRIER: map[c.ID.toString()] || []
	        };
	    });
	};
	
	 this.prepareConnection = function(connectionList){
	    var that = this;
	    var result = {
	        connection: [],
	        connectionCarrier: []
	    };
	    connectionList.forEach(function(c){
	        var obj = that.cloneObject(c);
	        delete obj.CARRIER;
	        
	        result.connection.push(obj);
	        
	        if (c.CARRIER){
    	        c.CARRIER.forEach(function(carrier){
    	            result.connectionCarrier.push({
    	                CONNECTION_ID: c.ID,
    	                CARRIER: carrier
    	            });
    	        });
	        }
	    });
	    
	    return result;
	};
	
	this.transformPath = function(path, pathConnection){
	    var map = {};
	    
	    // Sort path connection first
	    pathConnection.sort(function(c1, c2){
	        return c1.PATH_ID < c2.PATH_ID && c1.SEQUENCE < c2.SEQUENCE;
	    });
	    
		pathConnection.forEach(function(c) {
			if (!map[c.PATH_ID.toString()]) {
				map[c.PATH_ID.toString()] = {
					CONNECTION: []
				};
			}

			map[c.PATH_ID.toString()].CONNECTION.push({
			    SEQUENCE: c.SEQUENCE,
				FROM_LOCATION: c.FROM_LOCATION,
				TO_LOCATION: c.TO_LOCATION,
				DISTANCE: c.DISTANCE,
				DURATION: c.DURATION,
				STAY_TIME: c.STAY_TIME
			});
		});
		
		return path.map(function(p){
		    var tmp = {};
		    tmp.ID = p.ID.toString();
		    tmp.FROM_LOCATION = p.FROM_LOCATION;
		    tmp.TO_LOCATION = p.TO_LOCATION;
		    tmp.MTR = p.MTR;
			tmp.CARRIER = p.CARRIER;
			tmp.CONNECTION = map[p.ID.toString()].CONNECTION;
			return tmp;
		});
	};
	
	this.preparePath = function(paths){
	    var result = { PATHS: [], PATH_CONNECTION: []};
	    
	    paths.forEach(function(p){
	        result.PATHS.push({
	            ID: p.ID,
		        FROM_LOCATION: p.FROM_LOCATION,
    		    TO_LOCATION: p.TO_LOCATION,
		        MTR: p.MTR,
			    CARRIER: p.CARRIER
	        });
	        
	        p.CONNECTION.forEach(function(c){
	            result.PATH_CONNECTION.push({
    	            PATH_ID: p.ID,
    	            SEQUENCE: c.SEQUENCE,
    		        FROM_LOCATION: c.FROM_LOCATION,
        		    TO_LOCATION: c.TO_LOCATION,
    		        DISTANCE: c.DISTANCE,
    			    DURATION: c.DURATION,
    			    STAY_TIME: c.STAY_TIME
	            });
	        });
	    });
	    
	    return result;
	};
	
	
	function insertPathConnection(connection, pathConnection){
	    var ps = connection.prepareStatement('insert into "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path_connection"' +
	    '(PATH_ID,SEQUENCE,FROM_LOCATION,TO_LOCATION,DISTANCE,DURATION,STAY_TIME, CUTOFF_OFFSET, AVAILABILITY_OFFSET) ' + 
	    'values (?, ?, ?, ?, ?, ?, ?, ?, ?)');
	    
	    try{
    	    ps.setBatchSize(pathConnection.length);
    	    
    	    pathConnection.forEach(function(c){
    	        ps.setString(1, c.PATH_ID);
    	        if (typeof c.SEQUENCE !== 'undefined') {
    	            ps.setInteger(2, c.SEQUENCE);
    	        } else {
    	            ps.setNull(2);
    	        }
    	        ps.setString(3, c.FROM_LOCATION);
    	        ps.setString(4, c.TO_LOCATION);
    	        
    	        if (typeof c.DISTANCE !== 'undefined'){
    	            ps.setDouble(5, c.DISTANCE);
    	        } else {
    	            ps.setNull(5);
    	        }
    	        if (typeof c.DURATION !== 'undefined'){
    	            ps.setInteger(6, c.DURATION);
    	        } else {
    	            ps.setNull(6);
    	        }
    	        
    	        if (typeof c.STAY_TIME !== 'undefined'){
    	            ps.setInteger(7, c.STAY_TIME);
    	        } else {
    	            ps.setNull(7);
    	        }
    	        
    	        if (typeof c.CUTOFF_OFFSET !== 'undefined'){
    	            ps.setInteger(8, c.CUTOFF_OFFSET);
    	        } else {
    	            ps.setNull(8);
    	        }
    	        
    	        if (typeof c.AVAILABILITY_OFFSET !== 'undefined'){
    	            ps.setInteger(9, c.AVAILABILITY_OFFSET);
    	        } else {
    	            ps.setNull(9);
    	        }
    	        
    	        ps.addBatch();
    	    });
    	    ps.executeUpdate();
	    } finally{
	        ps.close();
	    }
	}
	
	 this.insertPath = function(paths){
	    var ps = this.conn.prepareStatement('insert into "SAP_TM_ROUTING_TEST"."sap.tm.trp.routing.tests.db::t_path"'
	    + '(ID,NAME, TYPE,MTR,CARRIER,FROM_LOCATION,TO_LOCATION) values (?, ?, ?, ?, ?, ?, ?)');
	    var pathConnection = [];
	    var that = this;
	    try{
    	    ps.setBatchSize(paths.length);
    	    
    	    paths.forEach(function(p){
    	        ps.setString(1, p.ID);
    	        ps.setString(2, p.NAME);
    	        ps.setString(3, p.TYPE);
    	        ps.setString(4, p.MTR);
    	        ps.setString(5, p.CARRIER);
    	        ps.setString(6, p.FROM_LOCATION);
    	        ps.setString(7, p.TO_LOCATION);
    	        
    	        if (p.CONNECTION){
        	        pathConnection = pathConnection.concat(
        	            p.CONNECTION.map(function(c){
        	            var connection = that.cloneObject(c);
        	            connection.PATH_ID = p.ID;
        	            return connection; 
        	        }));
    	        }
    	        ps.addBatch();
    	    });
    	    
    	    ps.executeUpdate();
	    } catch (e){
	        throw e;
	    } finally{
	        ps.close();
	    }
	    insertPathConnection(this.conn, pathConnection);
	};
	
	this.addSeconds = function(date, seconds){
	    return new Date(date.valueOf()+seconds*1000);
	};
	

};