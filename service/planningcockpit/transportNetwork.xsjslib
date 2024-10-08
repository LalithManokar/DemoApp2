var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var remote = new($.import("sap.tm.trp.service.xslib", "remote").RemoteClient)();

/**
 * Get network model from TM
 * @locations array of location id
 * @options options with following fields
 * {
 *     FROM_TIME: new Date('2014/12/20 07:00:00 +0000'),
 *     TO_TIME: new Date('2014/12/27 07:00:00 +0000'),
 *     SCHED_MTR: ["0002"],
 *     LANE_MTR: ["0001"]
 * }
 */

function getNetworkModel(locations, options) {

    try {
        var serviceRequest = {
            REQUEST: {
                LOCATIONS: locations,
                OPTIONS: options
            }
        };

        var result;

        remote.request({
            url: '/sap/bc/rest_trp/network',
            data: serviceRequest,
            method: $.net.http.POST,
            success: function(data) {
                if (data) {
                    result = data.RESULT.NETWORK_MODEL;
                }
            },
            error: function(data) {
                throw new lib.InternalError(messages.MSG_ERROR_GET_TRANSPORT_NETWORK, data.RESULT.MESSAGES);
            }
        });
        return result;
    } catch (e) {
        //throw new lib.InternalError(messages.MSG_ERROR_GET_TRANSPORT_NETWORK, e);
    throw new lib.InternalError(e.message, e.cause);
    }
}

/**
 * Get network model and save them into global temporary table
 * @conn connection used to save the data
 * @locations array of location ids
 * @options refer to getNetworkModel(locations, options)
 *
 **/

function buildTimeSpaceGraph(conn, networkModel) {

    if (!networkModel.LANES || networkModel.LANES.length === 0) {
        return;
    }

    var p2pConnection = [];
    var graphConnection = [];

    var sql, ps;

    networkModel.LANES.forEach(function(lane) {
        // Lanes without voyage ID is point to point connection
        if (!lane.VOYAGE_ID) {
            p2pConnection.push(lane);
        } else {
            graphConnection.push(lane);
        }
    });

    if (p2pConnection.length > 0) {
        sql = 'INSERT INTO "sap.tm.trp.db.planningcockpit.reposition::t_transportation_time_temp"' +
            '("FROM_LOCATION","TO_LOCATION","MTR","MOT","DURATION","CARRIER_ID","OPEN_CAPA","OPEN_CAPA_UOM") ' +
            'VALUES(?, ?, ?, ?, ?, ?, ?, ?)';

        ps = conn.prepareStatement(sql);
        ps.setBatchSize(p2pConnection.length);

        p2pConnection.forEach(function(lane) {
            ps.setString(1, lane.LOC_FROM);
            ps.setString(2, lane.LOC_TO);
            ps.setString(3, lane.MTR);
            ps.setString(4, lane.MOT);
            ps.setInteger(5, lane.DURATION);
            ps.setString(6, lane.TSP_ID);
            ps.setInteger(7, lane.OPEN_CAPA);
            ps.setString(8, lane.OPEN_CAPA_UOM);

            ps.addBatch();
        });

        ps.executeUpdate();
        ps.close();
    }

    if (graphConnection.length > 0) {

        // Sort the graph connection by voyage ID and departure time
        graphConnection.sort(function(a, b) {
            if (a.VOYAGE_ID < b.VOYAGE_ID) {
                return -1;
            } else if (a.VOYAGE_ID === b.VOYAGE_ID) {
                if (a.DEPARTURE_TIME < b.DEPARTURE_TIME) {
                    return -1;
                } else {
                    return 1;
                }
            } else {
                return 1;
            }
        });

        var index = 0;
        var currentVoyageID;
        var locationSequence = [];

        var location;
        graphConnection.forEach(function(lane) {

            // Restart index and reset prelane for every voyage
            if (currentVoyageID !== lane.VOYAGE_ID) {
                currentVoyageID = lane.VOYAGE_ID;
                index = 0;

                // Save from location for the first  lane
                location = {};

                location.VOYAGE_ID = lane.VOYAGE_ID.trim();
                location.TSP_ID = lane.TSPID;
                location.MOT = lane.MOT;
                location.MTR = lane.MTR;
                location.LOC_SEQ = index;
                location.LOC_ID = lane.LOC_FROM;
                location.DEPARTURE_TIME = lane.DEPARTURE_TIME;
                location.OPEN_CAPA = -1;
                location.OPEN_CAPA_UOM = '';

                locationSequence.push(location);
                index = 1;
            } else {
                // Update departure time of location added last time
                location.DEPARTURE_TIME = lane.DEPARTURE_TIME;
            }

            // Save to location for every lane
            // Departure time is updated by the next lane except the last location
            location = {};

            location.VOYAGE_ID = lane.VOYAGE_ID.trim();
            location.TSP_ID = lane.TSPID;
            location.MOT = lane.MOT;
            location.MTR = lane.MTR;
            location.LOC_SEQ = index;
            location.LOC_ID = lane.LOC_TO;
            location.ARRIVAL_TIME = lane.ARRIVAL_TIME;

            // The capacity is saved with destination of every lane
            location.OPEN_CAPA = lane.OPEN_CAPA;
            location.OPEN_CAPA_UOM = lane.OPEN_CAPA_UOM;


            locationSequence.push(location);
            index = index + 1;
        });

        sql = 'INSERT INTO "sap.tm.trp.db.planningcockpit.reposition::t_time_space_grid_temp"' +
            '("VESSEL_ID","CARRIER_ID","MOT", "MTR","SEQUENCE","LOCATION", "ARRIVAL_TIME","DEPARTURE_TIME", "OPEN_CAPA", "OPEN_CAPA_UOM")' +
            ' VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        ps = conn.prepareStatement(sql);

        ps.setBatchSize(locationSequence.length);
        locationSequence.forEach(function(location) {
            ps.setString(1, location.VOYAGE_ID);
            ps.setString(2, location.TSP_ID);
            ps.setString(3, location.MOT);
            ps.setString(4, location.MTR);
            ps.setInteger(5, location.LOC_SEQ);
            ps.setString(6, location.LOC_ID);

            if (location.ARRIVAL_TIME) {
                ps.setTimestamp(7, new Date(location.ARRIVAL_TIME));
            } else {
                ps.setNull(7);
            }

            if (location.DEPARTURE_TIME) {
                ps.setTimestamp(8, new Date(location.DEPARTURE_TIME));
            } else {
                ps.setNull(8);
            }

            ps.setInteger(9, location.OPEN_CAPA);
            ps.setString(10, location.OPEN_CAPA_UOM);

            ps.addBatch();
        });

        ps.executeUpdate();
        ps.close();
    }
}