import { MAP_COLOURS } from './adminActivityMap';

// Only coordinates, status, counts and locally generated marker keys enter this document.
// Activity titles, host details, credentials and moderation actions stay in native components.
export const ADMIN_MAP_HTML = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css">
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e8eee2}.count{background:transparent;border:0;box-shadow:none;color:white;font:700 12px Arial;text-align:center;padding:0;pointer-events:none}</style>
</head><body><div id="map" role="application" aria-label="Activity locations"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script>
(function () {
  function post(message) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  window.onerror = function () { post({type:'error'}); };
  if (typeof L === 'undefined') { post({type:'error'}); return; }
  var colours = ${JSON.stringify(MAP_COLOURS)};
  var map = L.map('map').setView([3.14,101.55],11);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).on('tileerror',function(){post({type:'tiles-error'});}).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var points = []; var lastLocations = '';
  window.fitActivityBounds = function () {
    if (points.length) map.fitBounds(points,{padding:[36,36],maxZoom:16});
  };
  window.setActivityMarkers = function (groups) {
    layer.clearLayers(); points = [];
    groups.forEach(function (group) {
      var marker = L.circleMarker([group.latitude,group.longitude],{
        radius:group.count > 1 ? 19 : 14, color:'#fff',weight:2,fillOpacity:1,
        fillColor:colours[group.status] || colours.mixed
      }).addTo(layer);
      marker.bindTooltip(String(group.count),{permanent:true,direction:'center',className:'count'});
      marker.on('click',function(){post({type:'select',key:group.key});});
      points.push([group.latitude,group.longitude]);
    });
    var locations = groups.map(function(group){return group.key;}).sort().join('|');
    if (locations !== lastLocations) window.fitActivityBounds();
    lastLocations = locations;
  };
  post({type:'ready'});
})();
</script></body></html>`;
