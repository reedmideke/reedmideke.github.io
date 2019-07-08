/*
Copyright 2019, Reed Mideke
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
import {Map, View} from 'ol';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {Vector as VectorSource, OSM as OSMSource} from 'ol/source';
import {fromLonLat} from 'ol/proj';
import {Fill, Stroke, Style, Circle as CircleStyle} from 'ol/style';
import Feature from 'ol/Feature';
import {Circle, Point} from 'ol/geom';

var EQPlay={
  init:function() {
    this.timer=null;
    this.mscale=1000;
    this.clear_data();
    this.style_cache={};

    this.vsource = new VectorSource();
    var vlayer = new VectorLayer({
      source:this.vsource
    });
    this.map = new Map({
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
    $(document).ready($.proxy(this.onready,this));
  },
  infomsg:function(msg) {
    $('#status').append('<div class="info-msg">'+msg+'</div>');
  },
  get_data:function() {
    this.stop_animation();
    var dataurl=$('#sel_src').val();
    // this should probably just use openlayers native stuff
    var req=$.ajax({
      url:dataurl,
      datatype:'json'
    })
      .done($.proxy(function(data,txtstatus,xhr) {
        //console.log('whoopie!',data);
        this.infomsg('Loaded '+data.features.length+' earthquakes from ' +dataurl);
        var days;
        var metaurl=data.metadata.url;
        // TODO hacky
        if(metaurl.match(/_week\.geojson$/)) {
          days=7;
        } else if(metaurl.match(/_day\.geojson$/)) {
          days=1;
        } else if(metaurl.match(/_month\.geojson$/)) {
          days=30;
        } else {
          this.infomsg('failed to detect time range');
          this.clear_data();
          return;
        }
        this.eqdata=data;
        this.t_end = new Date(this.eqdata.metadata.generated);
        this.t_start = new Date(this.eqdata.metadata.generated-(days*24*60*60*1000));
        this.infomsg('Date range '+this.t_start.toLocaleString()+' - ' +this.t_end.toLocaleString());
      },this))
      .fail($.proxy(function(data,txtstatus,err) {
        console.log('whoopsie!',txtstatus,err);
        infomsg('Failed to load '+dataurl+' error '+err);
        this.clear_data();
      }),this);
  },
  clear_data:function() {
    this.eqdata=null;
    this.t_end=null;
    this.t_start=null;
    this.ts_cur=0; // all will be in the future
    if(this.vsource) {
      this.vsource.clear(true);
    }
  },
  get_eq_style:function(eq,t) {
    var r = eq.properties.mag*2; // pixels? mags seem to be 2 decimal places
    // TODO two level cache by fade
    var style=this.style_cache[r];
    // shamelessly stolen from
    // https://openlayers.org/en/latest/examples/kml-earthquakes.html
    if(!style) {
      style = new Style({
        image: new CircleStyle({
          radius: r,
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.4)'
          }),
          stroke: new Stroke({
            color: 'rgba(255, 128, 0, 0.2)',
            width: 1
          })
        })
      });
      this.style_cache[r] = style;
    }
    return style;
  },
  update_features_for_time:function(t) {
    var eq;
    var i;
    var f;
    var style;
    var to_add=[];
    for(i=0;i<this.eqdata.features.length;i++) {
      eq=this.eqdata.features[i];
      f=this.vsource.getFeatureById(i);
      if(eq.properties.time > t) {
        if(f) {
          this.vsource.removeFeature(f)
        }
        continue;
      }
      if(eq.properties.time <= t) {
        style = this.get_eq_style(eq,t);
        if(!f) {
          f=new Feature(new Point(fromLonLat([eq.geometry.coordinates[0],eq.geometry.coordinates[1]])));
          f.setId(i); // use index rather than remote ID, for easier crossref
          f.setStyle(style);
          to_add.push(f);
        }
      }
    }
    this.vsource.addFeatures(to_add);
  },
  stop_animation:function() {
      if(this.timer) {
        clearInterval(this.timer);
        console.log('stop');
        this.timer=null;
      }
  },
  reset_animation:function() {
    this.stop_animation();
    this.ts_cur = 0;
  },
  start_animation:function() {
      if(this.eqdata === null) {
        this.infomsg('no data loaded');
        return;
      }
      this.vsource.clear(true);
      if(this.ts_cur == 0 || this.ts_cur >= this.t_end.getTime()) {
        this.ts_cur = this.t_start.getTime();
      }
      var duration_ms = (this.t_end.getTime() - this.ts_cur);
      var fps=10;
      var total_frames = fps*duration_ms/(60*1000*$('#time_scale').val());
      var ts_step = duration_ms/total_frames;
      var frame=0;
      this.timer=setInterval($.proxy(function() {
        if(frame == 0) {
          console.log('start: step',ts_step,'frames',total_frames,'duration (s)',duration_ms/1000,'scale',$('#time_scale').val());
        }
        var d=new Date(this.ts_cur);
        if(frame%fps == 0) {
          $('#cur_time').html(d.toLocaleString());
        }
        this.update_features_for_time(this.ts_cur);
        this.ts_cur += ts_step;
        if(this.ts_cur > this.t_end.getTime()) {
          this.stop_animation();
        }
        frame++;
      },this),100);
  },
  update_animation_values() {
    console.log('update_anim');
    if(this.timer) {
      console.log('update_anim:running');
      this.stop_animation();
      this.start_animation();
    }
  },
  change_source:function() {
    this.stop_animation();
    this.clear_data();
    this.get_data();
  },
  onready:function() {
    $('#btn_play').click($.proxy(this.start_animation,this));
    $('#btn_pause').click($.proxy(this.stop_animation,this));
    $('#btn_stop').click($.proxy(this.reset_animation,this));
    $('#sel_src').change($.proxy(this.change_source,this));
    $('#time_scale').change($.proxy(this.update_animation_values,this));
    this.get_data();
  }
};
EQPlay.init();

