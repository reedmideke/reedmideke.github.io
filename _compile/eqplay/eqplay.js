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
    this.ts_step=0;
    this.target_fps=10;
    this.fade_seconds=0;
    this.info_update_frames=2; // update html info every Nth frame
    this.time_line_scale=1; // initial safe value before DOM ready
    this.timer=null;
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
        this.t_total_ms = this.t_end.getTime() - this.t_start.getTime();
        this.ts_cur = this.t_start.getTime();
        this.infomsg('Date range '+this.fmt_date(this.t_start)+' - ' +this.fmt_date(this.t_end));
        this.update_data_info();
        this.update_cur_time_display();
      },this))
      .fail($.proxy(function(data,txtstatus,err) {
        console.log('whoopsie!',txtstatus,err);
        this.infomsg('Failed to load '+dataurl+' error '+err);
        this.clear_data();
      }),this);
  },
  clear_data:function() {
    this.eqdata=null;
    this.t_end=null;
    this.t_start=null;
    this.t_total_ms = 0;
    this.ts_cur=0; // all will be in the future
    if(this.vsource) {
      this.vsource.clear(true);
    }
    this.update_data_info();
  },
  fmt_date:function(d) {
    if(!d) {
      return '-';
    }
    if($('#sel_tz').val() == 'browser') {
      return d.toLocaleString();
    }
    return d.toLocaleString('default',{timeZone:'UTC',hour12:false});
  },
  update_data_info:function() {
    if(!this.eqdata) {
      $('#data_start_date').html('-');
      $('#data_end_date').html('-');
      $('#data_quake_count').html('-');
      return;
    }
    $('#data_start_date').html(this.fmt_date(this.t_start));
    $('#data_end_date').html(this.fmt_date(this.t_end));
    $('#data_quake_count').html(this.eqdata.features.length);
  },
  get_eq_fade:function(eq,t) {
    var fd = this.get_fade_duration();
    if(fd == 0) {
      return 1; // no fade
    }
    var age = t - eq.properties.time;
    var alpha;
    if(age >= fd) {
      alpha=0;
    } else {
      alpha = (fd-age)/fd;
    }
    // limit distinct alpha values
    alpha = Math.round(alpha*32)/32;
    return alpha;
  },
  get_eq_style:function(eq,alpha) {
    // butchered from
    // https://openlayers.org/en/latest/examples/kml-earthquakes.html
    var r = eq.properties.mag*2; // pixels? mags seem to be 2 decimal places
    var style_key = r + '_' + alpha;
    var style=this.style_cache[style_key];
    if(!style) {
      style = new Style({
        image: new CircleStyle({
          radius: r,
          fill: new Fill({
            color: 'rgba(255, 0, 0, '+alpha+')'
          }),
          stroke: new Stroke({
            color: 'rgba(255, 128, 0, '+(alpha*0.8)+')',
            width: 1
          })
        })
      });
      this.style_cache[style_key] = style;
    }
    return style;
  },
  update_features_for_time:function(t) {
    var eq;
    var i;
    var f;
    var style;
    var to_add=[];
    var alpha;
    for(i=0;i<this.eqdata.features.length;i++) {
      eq=this.eqdata.features[i];
      f=this.vsource.getFeatureById(i);
      alpha=this.get_eq_fade(eq,t);
      if(alpha == 0 || eq.properties.time > t) {
        eq.last_alpha = 0;
        if(f) {
          this.vsource.removeFeature(f)
        }
        continue;
      }
      if(eq.properties.time <= t) {
        style = this.get_eq_style(eq,alpha);
        if(!f) {
          f=new Feature(new Point(fromLonLat([eq.geometry.coordinates[0],eq.geometry.coordinates[1]])));
          f.setId(i); // use index rather than remote ID, for easier crossref
          f.setStyle(style);
          eq.last_alpha = alpha;
          to_add.push(f);
        } else {
          if(alpha != eq.last_alpha) {
            f.setStyle(style);
            eq.last_alpha = alpha;
          }
        }
      }
    }
    this.vsource.addFeatures(to_add);
  },
  stop_animation:function() {
      if(this.timer) {
        clearInterval(this.timer);
        this.timer=null;
      }
  },
  reset_animation:function() {
    this.stop_animation();
    if(this.eqdata) {
      this.ts_cur = this.t_start.getTime();
      this.update_cur_time_display();
      this.update_features_for_time(this.ts_cur);
    }

  },
  start_animation:function() {
      if(this.eqdata === null) {
        this.infomsg('no data loaded');
        return;
      }
      this.vsource.clear(true);
      if(!this.ts_cur || this.ts_cur < this.t_start.getTime() || this.ts_cur >= this.t_end.getTime()) {
        this.ts_cur = this.t_start.getTime();
      }
      var frame=0;
      this.timer=setInterval($.proxy(function() {
        if(frame == 0) {
          this.infomsg('start');
        }
        if(frame%this.info_update_frames == 0) {
          this.update_cur_time_display();
        }
        this.update_features_for_time(this.ts_cur);
        this.ts_cur += this.ts_step;
        if(this.ts_cur > this.t_end.getTime()) {
          this.infomsg('done');
          this.stop_animation();
        }
        frame++;
      },this),1000/this.target_fps);
  },
  update_animation_values:function() {
    if(this.timer !== null) {
      this.stop_animation();
      this.start_animation();
    }
  },
  get_fade_duration:function() {
    return this.ts_step * this.target_fps * this.fade_seconds;
  },
  cur_time_frac:function() {
    if(!this.t_total_ms || !this.ts_cur) {
      return 0;
    }
    return (this.ts_cur - this.t_start.getTime()) / this.t_total_ms;
  },
  update_cur_time_display:function() {
    if(this.ts_cur) {
      $('#cur_time').html(this.fmt_date(new Date(this.ts_cur)));
    } else if(this.t_start) {
      $('#cur_time').html(this.fmt_date(this.t_start));
    } else {
      $('#cur_time').html('-');
    }
    $('#time_line').val(this.cur_time_frac()*this.time_line_scale);
  },
  update_time_scale:function() {
    this.update_animation_values();
    this.ts_step = $('#time_scale').val() * 1000 / this.target_fps;
    $('#time_scale_display').html($('#time_scale').val());
  },
  multiply_time_scale(factor) {
      var v=$('#time_scale').val()*factor;
      if(v > $('#time_scale').attr('max')) {
        v = $('#time_scale').attr('max');
      } else if(v < $('#time_scale').attr('min')) {
        v = $('#time_scale').attr('min');
      }
      $('#time_scale').val(v);
      this.update_time_scale();
  },
  update_fade_time:function() {
    this.fade_seconds = $('#fade_time').val();
    if(this.fade_seconds > 0) {
      $('#fade_time_display').html(this.fade_seconds + 's');
    } else {
      $('#fade_time_display').html('off');
    }
  },
  update_tz_info:function() {
    this.update_data_info();
    this.update_cur_time_display();
  },
  change_source:function() {
    this.stop_animation();
    this.clear_data();
    this.get_data();
  },
  frac_to_ts:function(frac) {
    if(!this.t_start) {
      return 0;
    }
    return this.t_start.getTime() + (this.t_total_ms * frac);
  },
  time_warp:function() {
    if(!this.eqdata) {
      $('#time_line').val(0);
      return;
    }
    var was_playing;
    if(this.timer) {
      was_playing=true;
    }
    this.stop_animation();
    this.ts_cur = this.frac_to_ts($('#time_line').val()/this.time_line_scale);
    if(was_playing) {
      this.start_animation();
    } else {
      this.update_cur_time_display();
      this.update_features_for_time(this.ts_cur);
    }
  },
  onready:function() {
    $('#btn_play').click($.proxy(this.start_animation,this));
    $('#btn_pause').click($.proxy(this.stop_animation,this));
    $('#btn_stop').click($.proxy(this.reset_animation,this));
    $('#sel_src').change($.proxy(this.change_source,this));
    $('#time_scale').change($.proxy(this.update_time_scale,this));
    $('#time_scale_x10').click($.proxy(function() {
      this.multiply_time_scale(10);
    },this));
    $('#time_scale_x2').click($.proxy(function() {
      this.multiply_time_scale(2);
    },this));
    $('#time_scale_x01').click($.proxy(function() {
      this.multiply_time_scale(0.1);
    },this));
    $('#time_scale_x05').click($.proxy(function() {
      this.multiply_time_scale(0.5);
    },this));
    $('#fade_time').change($.proxy(this.update_fade_time,this));
    $('#sel_tz').change($.proxy(this.update_tz_info,this));
    $('#time_line').change($.proxy(this.time_warp,this));
    this.time_line_scale=$('#time_line').attr('max');
    this.update_time_scale();
    this.update_fade_time();
    this.get_data();
  }
};
EQPlay.init();

