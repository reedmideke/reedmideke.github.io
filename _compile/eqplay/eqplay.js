import {Map, View} from 'ol';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource, OSM as OSMSource} from 'ol/source';
import {fromLonLat} from 'ol/proj';
import {Fill, Stroke, Style} from 'ol/style';
import Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';

var vsource = new VectorSource();
var vlayer = new VectorLayer({
  source:vsource
});
var map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSMSource()
    }),
    vlayer
  ],
  view: new View({
    center: fromLonLat([-117.6, 35.77]),
    zoom: 8
  })
});


var mscale=1000;
var eqdata=null;
var features=[];
var t_end=null;
var t_start=null;
function infomsg(msg) {
  $('#status').append('<div class="info-msg">'+msg+'<\/div>');
}
function load_eq_data() {
  var dataurl=$('#sel_src').val();
  var req=$.ajax({
    url:dataurl,
    datatype:'json'
  })
    .done(function(data,txtstatus,xhr) {
      //console.log('whoopie!',data);
      infomsg('Loaded '+data.features.length+' earthquakes from ' +dataurl);
      eqdata=data;
      t_end = new Date(eqdata.metadata.generated)
      var days
      // TODO hacky
      if(eqdata.metadata.url.match(/_week\.geojson$/)) {
        days=7;
      } else if(eqdata.metadata.url.match(/_day\.geojson$/)) {
        days=1;
      }
      t_start = new Date(eqdata.metadata.generated-(days*24*60*60*1000));
      infomsg('Date range '+t_start.toLocaleString()+' - ' +t_end.toLocaleString());
    })
    .fail(function(data,txtstatus,err) {
      console.log('whoopsie!',txtstatus,err);
      infomsg('Failed to load '+dataurl+' error '+err);
      eqdata=null;
      t_end=null;
      t_start=null;
    });
}
function update_features_for_time(t) {
  var eq;
  var i;
  for(i=0;i<eqdata.features.length;i++) {
    eq=eqdata.features[i];
    if(eq.properties.time > t && eq.visible) {
      features[i].setStyle( new Style({
        fill:new Fill({color:[255,0,0,0]}),
        stroke:new Stroke({color:[255,255,0,0],width:3})
      })
      );
      eq.visible=false;
      continue;
    }
    if(eq.properties.time < t && !eq.visible) {
      features[i].setStyle( new Style({
         fill:new Fill({color:[0,255,0,0.5]}),
         stroke:new Stroke({color:[255,255,0,0.8],width:3})
       })
      );
      eq.visible=true;
    }
  }
}

$(document).ready(function() {
  $('#btn_play').click(function() {
    if(eqdata === null) {
      infomsg('no data loaded');
      return;
    }
    var i;
    features=[];
    var f=features;
    var eq;
    for(i=0;i<eqdata.features.length;i++) {
      eq=eqdata.features[i];
      eq.visible=false;
      f[i]=new Feature({
        id:eqdata.features[i].id,
        // TODO radius is in meters? or something should scale with view
        geometry:new Circle(
          fromLonLat([eq.geometry.coordinates[0],eq.geometry.coordinates[1]]),
          eq.properties.mag*mscale)
      });
      f[i].setStyle( new Style({
          fill:new Fill({color:[255,0,0,0]}),
          stroke:new Stroke({color:[255,255,0,0],width:3})
        })
      );
    }
    vsource.clear(true);
    vsource.addFeatures(f);
    var ts_cur = t_start.getTime();
    var ts_duration = (t_end.getTime() - ts_cur);
    var fps=10;
    var frames = fps*ts_duration/(60*1000*$('#time_scale').val());
    var ts_step = ts_duration/frames;
    console.log('frames',frames,'duration',ts_duration,'step',ts_step);
    var timer=setInterval(function() {
      if(ts_cur == t_start.getTime()) {
        console.log('start');
      }
      update_features_for_time(ts_cur);
      var d=new Date(ts_cur);
      $('#cur_time').html(d.toLocaleString());
      ts_cur += ts_step;
      if(ts_cur > t_end.getTime()) {
        clearInterval(timer);
        console.log('done');
      }
    },100);
  });

  $('#sel_src').change(function() {
    load_eq_data();
  });

  load_eq_data();
});

