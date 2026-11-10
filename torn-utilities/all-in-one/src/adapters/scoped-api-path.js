// Paths used by the integrated War Organizer; reject traversal, query credentials and new scopes.
export function isScopedTornRead(path,kind='faction') {
 if(typeof path!=='string')return false;
 const faction=/^\/v2\/faction\/(?:[1-9][0-9]{0,11}\/members|snapshot)$/.test(path);
 return faction || kind==='who' && /^\/v2\/user\/[1-9][0-9]{0,11}\/profile$/.test(path);
}
