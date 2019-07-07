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
import {Fill, Stroke, Style} from 'ol/style';
import Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';

var EQPlay={
  init:function() {
    this.mscale=1000;
    this.eqdata=null;
    this.features=[];
    this.t_end=null;
    this.t_start=null;

    this.vsource = new VectorSource();
    var vlayer = new VectorLayer({
      source:this.vsource
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
    $(document).ready($.proxy(this.onready,this));
  },
  infomsg:function(msg) {
    $('#status').append('<div class="info-msg">'+msg+'</div>');
  },
  get_data:function() {
    var dataurl=$('#sel_src').val();
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
  },
  update_features_for_time:function(t) {
    var eq;
    var i;
    for(i=0;i<this.eqdata.features.length;i++) {
      eq=this.eqdata.features[i];
      if(eq.properties.time > t && eq.visible) {
        this.features[i].setStyle( new Style({
          fill:new Fill({color:[255,0,0,0]}),
          stroke:new Stroke({color:[255,255,0,0],width:3})
        })
        );
        eq.visible=false;
        continue;
      }
      if(eq.properties.time < t && !eq.visible) {
        this.features[i].setStyle( new Style({
           fill:new Fill({color:[0,255,0,0.5]}),
           stroke:new Stroke({color:[255,255,0,0.8],width:3})
         })
        );
        eq.visible=true;
      }
    }
  },
  onready:function() {
    $('#btn_play').click($.proxy(function() {
      if(this.eqdata === null) {
        this.infomsg('no data loaded');
        return;
      }
      var i;
      this.features=[];
      var f=this.features;
      var eq;
      for(i=0;i<this.eqdata.features.length;i++) {
        eq=this.eqdata.features[i];
        eq.visible=false;
        f[i]=new Feature({
          id:eq.id,
          // TODO radius is in meters? or something should scale with view
          geometry:new Circle(
            fromLonLat([eq.geometry.coordinates[0],eq.geometry.coordinates[1]]),
            eq.properties.mag*this.mscale)
        });
        f[i].setStyle( new Style({
            fill:new Fill({color:[255,0,0,0]}),
            stroke:new Stroke({color:[255,255,0,0],width:3})
          })
        );
      }
      this.vsource.clear(true);
      this.vsource.addFeatures(f);
      var ts_cur = this.t_start.getTime();
      var ts_duration = (this.t_end.getTime() - ts_cur);
      var fps=10;
      var frames = fps*ts_duration/(60*1000*$('#time_scale').val());
      var ts_step = ts_duration/frames;
      console.log('frames',frames,'duration',ts_duration,'step',ts_step);
      var timer=setInterval($.proxy(function() {
        if(ts_cur == this.t_start.getTime()) {
          console.log('start');
        }
        this.update_features_for_time(ts_cur);
        var d=new Date(ts_cur);
        $('#cur_time').html(d.toLocaleString());
        ts_cur += ts_step;
        if(ts_cur > this.t_end.getTime()) {
          clearInterval(timer);
          console.log('done');
        }
      },this),100);
    },this));

    $('#sel_src').change($.proxy(function() {
      this.get_data();
    },this));

    this.get_data();
  }
};
EQPlay.init();

