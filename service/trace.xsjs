var getHandler = function(selfFlag) {
    var handler;

    if (selfFlag) {
        handler = (function() {
            var conn = $.db.getConnection();
            conn.setAutoCommit(true);
            var pstmt;
            var TABLE_NAME = "TRP_PROFILE_TRACE";

            var isTableExist = function(user){
                pstmt = conn.prepareStatement("SELECT 1 FROM TABLES WHERE TABLE_NAME = ? AND SCHEMA_NAME = ?");

                pstmt.setString(1, TABLE_NAME);
                pstmt.setString(2, user);

                var rs = pstmt.executeQuery();

                return rs.next();
            };

            var createTable = function(user) {
                pstmt = conn.prepareStatement("CREATE COLUMN TABLE \"" + user + "\".\"" + TABLE_NAME + "\" (KEY CHAR(32), CONTENT TEXT, PROFILE_TIME TIMESTAMP)");

                return pstmt.executeUpdate();
            };

            var insert = function(user, key, content) {
                pstmt = conn.prepareStatement("INSERT INTO \"" + user + "\".\"" + TABLE_NAME + "\" VALUES (?, ?, CURRENT_UTCTIMESTAMP)");

                pstmt.setString(1, key);
                pstmt.setText(2, content);

                return pstmt.executeUpdate();
            };

            return function(params) {
                try {
                    if (!isTableExist(params.user)) {
                        createTable(params.user);
                    }

                    insert(params.user, params.key, JSON.stringify(params.tasks));
                } finally {
                    if (conn) {
                        conn.close();
                    }
                }
            };

        }());
    } else {
        if ($.trace.isDebugEnabled()) {
            handler = $.trace.debug;
        } else if ($.trace.isInfoEnabled()) {
            handler = $.trace.info;
        } else if ($.trace.isWarningEnabled()) {
            handler = $.trace.warning;
        } else if ($.trace.isErrorEnabled()) {
            handler = $.trace.error;
        } else if ($.trace.isFatalEnabled()) {
            handler = $.trace.fatal;
        }
    }

    return handler;
};

function profile(params) {
    var logger = getHandler(true);

    logger(params);
}