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
    $('#status').scrollTop($('#status')[0].scrollHeight);
  },
  warnmsg:function(msg) {
      this.infomsg('WARNING: '+msg);
  },
  errmsg:function(msg) {
      this.infomsg('ERROR: '+msg);
  },
  init_data:function(data,opts) {
      //console.log('whoopie!',data);
      if(!data || typeof(data) != 'object'
        || typeof(data.metadata) != 'object'
        || typeof(data.features) != 'object') {
        this.errmsg('data does not appear to be valid');
        return false;
      }
      // not exactly an error, but nothing to visualize
      // should set something in UI
      if(data.features.length == 0) {
        this.errmsg('data contains 0 earthquakes');
        return false;
      }
      if(data.type !== 'FeatureCollection') {
        this.warnmsg('data.type not FeatureCollection');
      }
      if(data.metadata.count != data.features.length) {
        this.warnmsg('metadata.count != features.length');
      }
      var features=data.features;

      var i;
      var i_first = 0;
      var i_last = 0;
      for(i=0;i<features.length;i++) {
        if(features[i_first].properties.time > features[i].properties.time) {
          i_first==i;
        }
        if(features[i_last].properties.time < features[i].properties.time) {
          i_last==i;
        }
      }
      this.i_first = i_first;
      this.i_last = i_last;
      var eq_first = features[i_first];
      var eq_last = features[i_last];

      this.infomsg('Loaded '+data.features.length+' earthquakes from ' +opts.dataurl);
      var days;
      var metaurl=data.metadata.url;
      if(opts.type == 'usgs-query') {
        this.t_start=opts.t_start;
        this.t_end=opts.t_end;
        if(data.features.length == opts.limit_count) {
          this.warnmsg('Max results limit hit');
        }
      } else if(opts.type == 'feed-url') {
        // TODO hacky - assume timespan from feed created date and
        if(metaurl.match(/_week\.geojson$/)) {
          days=7;
        } else if(metaurl.match(/_day\.geojson$/)) {
          days=1;
        } else if(metaurl.match(/_month\.geojson$/)) {
          days=30;
        }
        if(days) {
          this.t_end = new Date(data.metadata.generated);
          this.t_start = new Date(data.metadata.generated-(days*24*60*60*1000));
        }
      }
      if(this.t_start === null) {
        if(opts.type != 'user-url') {
          this.warnmsg('failed to detect start/end, using event times');
        }
        if(eq_first.properties.time == eq_last.properties.time) {
          this.t_end = new Date(eq_last.properties.time+1000); // ensure timespan is non zero
        } else {
          this.t_end = new Date(eq_last.properties.time);
        }
        this.t_start = new Date(eq_first.properties.time);
      } else {
        if(eq_first.properties.time < this.t_start.getTime()) {
          this.t_start = new Date(eq_first.properties.time);
          this.warnmsg('adjusted start to first event '+this.fmt_date(this.t_start));
        }
        if(eq_last.properties.time > this.t_end.getTime()) {
          this.t_start = new Date(eq_last.properties.time);
          this.warnmsg('adjusted end to last event '+this.fmt_date(this.t_start));
        }
      }
      this.eqdata=data;
      this.t_total_ms = this.t_end.getTime() - this.t_start.getTime();
      this.ts_cur = this.t_start.getTime();
      this.infomsg('Date range '+this.fmt_date(this.t_start)+' - ' +this.fmt_date(this.t_end));
      this.update_data_info();
      this.update_cur_time_display();
      return true;
  },
  get_data:function(opts) {
    this.stop_animation();
    this.clear_data();
    //console.log('get',dataurl);
    // this should probably just use openlayers native stuff
    var req=$.ajax({
      url:opts.dataurl,
      datatype:'json'
    })
      .done($.proxy(function(data,txtstatus,xhr) {
        if(!this.init_data(data,opts)) {
          this.clear_data();
        }
      },this))
      .fail($.proxy(function(data,txtstatus,err) {
        console.log('whoopsie!',txtstatus,err);
        this.infomsg('Failed to load '+opts.dataurl+' error '+err);
        this.clear_data();
      },this));
  },
  clear_data:function() {
    this.eqdata=null;
    this.t_end=null;
    this.t_start=null;
    this.i_first=null;
    this.i_last=null;
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
    if(this.tz == 'browser') {
      return d.toLocaleString();
    }
    return d.toLocaleString('default',{timeZone:'UTC',hour12:false});
  },
  fmt_ms_hhmmss:function(ms) {
    var s=(ms/1000)%60;
    var m=(ms/(1000*60))%60;
    var h=Math.floor(ms/(1000*60*60));
    if(s < 10) {
      s=':0'+s;
    } else {
      s=':'+s;
    }
    if(m < 10) {
      m=':0'+m;
    } else {
      m=':'+m;
    }
    var str=h+m+s;
    if(h < 10) {
      str = '0' + str;
    }
    // FP can leave decimals
    return str.replace(/\.\d+/,'');
  },
  update_data_info:function() {
    this.update_cur_time_display();
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
    var r=this.marker_base_rad;
    if(this.marker_do_scale_mag) {
      r = r*eq.properties.mag; // mags seem to be 1 decimal place so not too many unique values
    }
    var style_key = r + '_' + alpha;
    var style=this.style_cache[style_key];
    var fill_color;
    var stroke_color;

    if(!style) {
      // clone the arrays before setting colors
      fill_color=this.marker_fill_color.slice(0);
      stroke_color=this.marker_stroke_color.slice(0);
      stroke_color[3]=alpha;
      fill_color[3]=alpha*0.8;
      style = new Style({
        image: new CircleStyle({
          radius: r,
          fill: new Fill({
            color: fill_color
          }),
          stroke: new Stroke({
            color: stroke_color,
            width: 1
          })
        })
      });
      this.style_cache[style_key] = style;
    }
    return style;
  },
  update_features_for_time:function() {
    var eq;
    var i;
    var f;
    var style;
    var to_add=[];
    var alpha;
    var t=this.ts_cur;
    if(!this.eqdata) {
      return;
    }
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
  update_features_full:function() {
    if(!this.eqdata) {
      return;
    }
    this.style_cache = {};
    this.vsource.clear(true);
    this.update_features_for_time();
  },
  stop_animation:function() {
    if(this.timer) {
      clearInterval(this.timer);
      this.timer=null;
    }
    this.update_cur_time_display();
    this.update_play_pause();
  },
  reset_animation:function() {
    this.stop_animation();
    if(this.eqdata) {
      this.ts_cur = this.t_start.getTime();
      this.update_cur_time_display();
      this.update_features_for_time();
    }
  },
  start_animation:function() {
    if(this.eqdata === null) {
      this.infomsg('no data loaded');
      return;
    }
    if(this.timer) {
      this.infomsg('already playing');
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
      this.update_features_for_time();
      this.ts_cur += this.ts_step;
      if(this.ts_cur > this.t_end.getTime()) {
        this.infomsg('done');
        this.stop_animation();
        if($('#chk_loop:checked').length) {
          this.start_animation();
        }
      }
      frame++;
    },this),1000/this.target_fps);
    this.update_play_pause();
  },
  update_play_pause() {
    if(this.timer !== null) {
      $('#txt_play').hide();
      $('#txt_pause').show();
    } else {
      $('#txt_pause').hide();
      $('#txt_play').show();
    }
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
    this.update_fade_time();
    $('#time_scale_disp_x').html($('#time_scale').val());
    $('#time_scale_disp_t').html(this.fmt_ms_hhmmss(this.ts_step*this.target_fps));
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
      $('#fade_time_display').html('animation ' + this.fade_seconds + 's' + ' real ' + this.fmt_ms_hhmmss(this.get_fade_duration()));
    } else {
      $('#fade_time_display').html('off');
    }
    this.update_features_for_time();
  },
  update_tz_info:function() {
    this.tz = $('#sel_tz').val();
    if(this.tz == 'browser') {
      $('.tz_disp').html('Browser timezone');
    } else {
      $('.tz_disp').html('UTC');
    }
    this.update_data_info();
    this.update_cur_time_display();
  },
  change_source:function() {
    var sel=$('#sel_src').val();
    if(sel === 'usgs-query') {
      $('#usgs_query_inputs').show();
      $('#user_url_inputs').hide();
    } else if(sel === 'user-url') {
      $('#usgs_query_inputs').hide();
      $('#user_url_inputs').show();
    } else {
      $('#usgs_query_inputs').hide();
      $('#user_url_inputs').hide();
      this.get_data({dataurl:sel,type:'feed-url'});
    }
  },
  get_date_input:function(opts) {
    var datestr=$('#'+opts.id+'_date').val();
    if(!datestr) {
      if(opts.def_date) {
        return opts.def_date;
      }
      return null;
    }
    var dparts = datestr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(dparts.length != 4) {
      this.infomsg('failed to parse date ' + datestr);
      return null;
    }

    var hstr=$('#'+opts.id+'_h').val();
    if(hstr === '' && typeof opts.def_h != 'undefined') {
      hstr=opts.def_h;
    }
    var h=parseInt(hstr,10);
    if(isNaN(h)) {
      this.infomsg('failed to parse hour ' + hstr);
      return null;
    }
    if(h < 0 || h > 23) {
      this.infomsg('invalid hour ' + h);
      return null;
    }
    var mstr=$('#'+opts.id+'_m').val();
    if(mstr === '' && typeof opts.def_h != 'undefined') {
      mstr=opts.def_m;
    }
    var m=parseInt(mstr,10);
    if(isNaN(m)) {
      this.infomsg('failed to parse minute ' + mstr);
      return null;
    }

    if(m < 0 || m > 59) {
      this.infomsg('invalid minute ' + mstr);
      return null;
    }
    var d;
    try {
      if(this.tz == 'browser') {
        d=new Date(dparts[1],dparts[2]-1,dparts[3],h,m);
      } else {
        d=new Date(Date.UTC(dparts[1],dparts[2]-1,dparts[3],h,m));
      }
    } catch(err) {
      this.infomsg('failed to create date ' + err);
      return null;
    }
    return d;
  },
  get_cust_data:function() {
    // API documentation at https://earthquake.usgs.gov/fdsnws/event/1/
    var url='https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?';
    var t_start=this.get_date_input({id:'cust_start',def_h:0,def_m:0});
    if(!t_start) {
      this.infomsg('invalid start date/time');
      return;
    }
    url += 'starttime='+t_start.toISOString();

    var t_end=this.get_date_input({id:'cust_end',def_date:new Date(),def_h:23,def_m:59});

    url += '&endtime='+t_end.toISOString();
    var m_min=$('#cust_mag_min').val();
    if(m_min < 1 || m_min > 10) {
      this.infomsg('invalid min mag '+m_min);
      return;
    }
    url += '&minmagnitude='+m_min;
    var m_max=$('#cust_mag_max').val();
    // optional
    if(m_max !== '') {
      if(m_max < m_min) {
        this.infomsg('invalid max mag '+m_max+' < min '+m_min);
        return;
      }
      url += '&maxmagnitude='+m_max;
    }
    var limit_count = $('#cust_limit_count').val();
    if(limit_count < 1 || limit_count > 20000) {
      this.infomsg('invalid limit count '+limit_count);
      return;
    }
    url += '&limit='+limit_count;
    this.infomsg('custom query url: '+url);
    this.get_data({dataurl:url,type:'usgs-query',t_start:t_start,t_end:t_end,limit:limit_count});
  },
  get_user_url_data:function() {
    var url=$('#user_data_url').val();
    if(url==='') {
      this.infomsg('URL not set');
      return;
    }
    this.get_data({dataurl:url,type:'user-url'});
  },
  frac_to_ts:function(frac) {
    if(!this.t_start) {
      return 0;
    }
    return this.t_start.getTime() + (this.t_total_ms * frac);
  },
  time_warp_to:function(t) {
    if(!this.eqdata) {
      return;
    }
    var was_playing;
    if(this.timer) {
      was_playing=true;
    }
    this.stop_animation();
    if(t < this.t_start.getTime()) {
      t=this.t_start.getTime();
    } else if(t > this.t_end.getTime()) {
      t=this.t_end.getTime();
    }
    this.ts_cur = t;
    if(was_playing) {
      this.start_animation();
    } else {
      this.update_cur_time_display();
      this.update_features_for_time();
    }
  },
  time_warp:function() {
    if(!this.eqdata) {
      $('#time_line').val(0);
      return;
    }
    this.time_warp_to(this.frac_to_ts($('#time_line').val()/this.time_line_scale));
  },
  time_step:function(step) {
    this.time_warp_to(this.ts_cur + this.target_fps*step*this.ts_step);
  },
  color_to_rgb:function(c) {
    // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    var parts = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c);
    return parts ? [
      parseInt(parts[1], 16),
      parseInt(parts[2], 16),
      parseInt(parts[3], 16)
    ] : null;
  },
  update_marker_colors:function() {
    this.marker_fill_color=this.color_to_rgb($('#marker_fill_color').val());
    this.marker_stroke_color=this.color_to_rgb($('#marker_stroke_color').val());
    this.update_features_full();
  },
  update_marker_scale:function() {
    this.marker_base_rad = $('#marker_base_rad').val();
    $('#marker_base_rad_disp').html(this.marker_base_rad*2);
    this.marker_do_scale_mag = $('#marker_do_scale_mag:checked').length > 0;
    this.update_features_full();
  },
  onready:function() {
    $('#btn_play').click($.proxy(function() {
      if(this.timer) {
        this.stop_animation();
      } else {
        this.start_animation();
      }
    },this));
    $('#btn_stop').click($.proxy(this.reset_animation,this));
    $('#sel_src').change($.proxy(this.change_source,this));
    $('#btn_cust_get').click($.proxy(this.get_cust_data,this));
    $('#btn_user_url_get').click($.proxy(this.get_user_url_data,this));
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
    $('#btn_step_n10').click($.proxy(function() {
      this.time_step(-10);
    },this));
    $('#btn_step_n1').click($.proxy(function() {
      this.time_step(-1);
    },this));
    $('#btn_step_n01').click($.proxy(function() {
      this.time_step(-0.1);
    },this));
    $('#btn_step_01').click($.proxy(function() {
      this.time_step(0.1);
    },this));
    $('#btn_step_1').click($.proxy(function() {
      this.time_step(1);
    },this));
    $('#btn_step_10').click($.proxy(function() {
      this.time_step(10);
    },this));
    $('#marker_fill_color').change($.proxy(this.update_marker_colors,this));
    $('#marker_stroke_color').change($.proxy(this.update_marker_colors,this));
    $('#marker_do_scale_mag').change($.proxy(this.update_marker_scale,this));
    $('#marker_base_rad').change($.proxy(this.update_marker_scale,this));
    this.time_line_scale=$('#time_line').attr('max');
    // these inits may try to clear / re-render, do BEFORE first get_data()
    this.update_time_scale();
    this.update_fade_time();
    this.update_marker_colors();
    this.update_marker_scale();
    this.update_tz_info();
    this.change_source();
  }
};
EQPlay.init();

