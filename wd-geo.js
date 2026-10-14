/* ============================================================
   WAR DESK — wd-geo.js v1.0
   Centrale geo-helpers. Vervangt alle lokale kopieën van
   pointInRing / pointInGeometry / featureContainsPoint /
   getCentroid / getBBoxCenter.
   ============================================================ */

(function(){
  "use strict";

  var VERSION = "v1.0";

  function pointInRing(x, y, ring){
    var inside = false, len = ring.length;
    for (var i = 0, j = len - 1; i < len; j = i++){
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      var intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInGeometry(x, y, geometry){
    if (!geometry) return false;

    if (geometry.type === "Polygon"){
      var rings = geometry.coordinates;
      if (!rings || !rings.length) return false;
      if (!pointInRing(x, y, rings[0])) return false;
      for (var h = 1; h < rings.length; h++){
        if (pointInRing(x, y, rings[h])) return false;
      }
      return true;
    }
    if (geometry.type === "MultiPolygon"){
      var polys = geometry.coordinates;
      for (var p = 0; p < polys.length; p++){
        var r = polys[p];
        if (!r || !r.length) continue;
        if (!pointInRing(x, y, r[0])) continue;
        var inHole = false;
        for (var h2 = 1; h2 < r.length; h2++){
          if (pointInRing(x, y, r[h2])){ inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  function featureContainsPoint(feature, x, y){
    if (!feature || !feature.geometry) return false;
    return pointInGeometry(x, y, feature.geometry);
  }

  function getBBoxCenter(ring){
    var minX = ring[0][0], maxX = ring[0][0];
    var minY = ring[0][1], maxY = ring[0][1];
    for (var i = 1; i < ring.length; i++){
      if (ring[i][0] < minX) minX = ring[i][0];
      if (ring[i][0] > maxX) maxX = ring[i][0];
      if (ring[i][1] < minY) minY = ring[i][1];
      if (ring[i][1] > maxY) maxY = ring[i][1];
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  function getCentroid(feature){
    if (!feature || !feature.geometry) return null;

    /* Cache in properties */
    if (feature.properties && feature.properties._centroid){
      return feature.properties._centroid;
    }

    var geom = feature.geometry, outerRing = null;

    if (geom.type === "Polygon"){
      outerRing = geom.coordinates[0];
    } else if (geom.type === "MultiPolygon"){
      var largest = null, largestSize = 0;
      for (var i = 0; i < geom.coordinates.length; i++){
        var ring = geom.coordinates[i][0];
        if (ring && ring.length > largestSize){
          largestSize = ring.length;
          largest = ring;
        }
      }
      outerRing = largest;
    }

    if (!outerRing || outerRing.length < 3) return null;

    var area = 0, cx = 0, cy = 0;
    for (var j = 0; j < outerRing.length - 1; j++){
      var x0 = outerRing[j][0], y0 = outerRing[j][1];
      var x1 = outerRing[j+1][0], y1 = outerRing[j+1][1];
      var cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    area = area / 2;

    var result;
    if (Math.abs(area) < 1e-12){
      result = getBBoxCenter(outerRing);
    } else {
      cx = cx / (6 * area);
      cy = cy / (6 * area);
      if (!pointInRing(cx, cy, outerRing)) result = getBBoxCenter(outerRing);
      else result = [cx, cy];
    }

    if (feature.properties){
      feature.properties._centroid = result;
    }
    return result;
  }

  window.WDGeo = {
    version: VERSION,
    pointInRing: pointInRing,
    pointInGeometry: pointInGeometry,
    featureContainsPoint: featureContainsPoint,
    getCentroid: getCentroid,
    getBBoxCenter: getBBoxCenter
  };

  try { wdLog.info("[WD-Geo] " + VERSION + " geladen"); } catch(e){}

})();