/**
 *  Check application specific privilege
 *  @param      {string}    privilege 
 *              Application Privilege to be checked
 *  @returns    {boolean}
 *              authorized true or false    
 */
function hasAppPrivilege(privilege) {
    return $.session.hasAppPrivilege(privilege);
}

/**
 *  Check application specific Read privilege
 *  @returns    {boolean}
 *              authorized true or false    
 */
function hasReadPrivilege() {
    return $.session.hasAppPrivilege("sap.tm.trp.applog::Read");
}

/**
 *  Check application specific Write privilege
 *  @returns    {boolean}
 *              authorized true or false    
 */
function hasWritePrivilege() {
    return $.session.hasAppPrivilege("sap.tm.trp.applog::Write");
}