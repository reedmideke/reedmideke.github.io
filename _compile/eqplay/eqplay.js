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
import {defaults as defaultControls, ScaleLine} from 'ol/control.js';
import {getBottomLeft, getTopRight, containsCoordinate, boundingExtent,buffer as extentBuffer} from 'ol/extent.js';
import {fromLonLat,toLonLat} from 'ol/proj';
import {Fill, Stroke, Style, Circle as CircleStyle} from 'ol/style';
import Feature from 'ol/Feature';
import {Circle, Point} from 'ol/geom';
var EQPlay={
  view_presets:{
    lomaprieta:{
      lonlat:[-121.87,37.16],
      zoom:10
    },
    california:{
      lonlat:[-118.76,37.20],
      zoom:5
    },
    ridgecrest:{
      lonlat:[-117.6, 35.77],
      zoom:8
    }
  },
  sources:[
    {
      // https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=1989-10-17T23:00:00.000Z&endtime=1989-10-18T23:00:00.000Z&minmagnitude=0&minlongitude=-122.88145170896698&maxlatitude=37.94924512645133&maxlongitude=-120.84898100584198&minlatitude=36.353470144072276&limit=20000&orderby=time
      id:'loma-1d-all',
      title:'All Loma Prieta, 24h from Oct 17 1989, 4PM',
      url:'/assets/json/lomaprieta-19891017-1600-all_day.geojson.json',
      t_start:new Date('1989-10-17T23:00:00.000Z'),
      t_end:new Date('1989-10-18T23:00:00.000Z'),
      view:'lomaprieta'
    },
    {
      // https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?starttime=1989-10-17T07:00:00.000Z&endtime=1989-10-24T06:59:00.000Z&minmagnitude=1&minlongitude=-122.73932857975363&maxlatitude=37.844735061571996&maxlongitude=-120.70685787662863&minlatitude=36.246733656962874&limit=20000&orderby=time
      id:'loma-1w-10',
      title:'M1.0+ Loma Prieta, Week from Oct 17 1989',
      url:'/assets/json/lomaprieta-19891017-1.0_week.geojson.json',
      t_start:new Date('1989-10-17T07:00:00.000Z'),
      t_end:new Date('1989-10-24T06:59:00.000Z'),
      view:'lomaprieta'
    },
    {
      id:'ridgecrest-7d-25',
      title:'M2.5+ Ridgecrest Week from July 4',
      url:'/assets/json/20190711-0000-2.5_week.geojson.json',
      view:'ridgecrest'
    },
    {
      id:'ridgecrest-7d-45',
      title:'M4.5+ Ridgecrest Week from July 4',
      url:'/assets/json/20190711-0000-4.5_week.geojson.json',
      view:'ridgecrest'
    },
    {
      id:'ridgecrest-7d-10',
      title:'M1.0+ Ridgecrest Week from July 4',
      url:'/assets/json/20190711-0000-1.0_week.geojson.json',
      view:'ridgecrest'
    },
    {
      id:'usgs-feed-1d-45',
      title:'M4.5+ Earthquakes Past Day',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
    },
    {
      id:'usgs-feed-1d-25',
      title:'M2.5+ Earthquakes Past Day',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
    },
    {
      id:'usgs-feed-1d-10',
      title:'M1.0+ Earthquakes Past Day',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson'
    },
    {
      id:'usgs-feed-1w-45',
      title:'M4.5+ Earthquakes Past Week',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'
    },
    {
      is_default:true,
      id:'usgs-feed-1w-25',
      title:'M2.5+ Earthquakes Past Week',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson'
    },
    {
      id:'usgs-feed-1w-10',
      title:'M1.0+ Earthquakes Past Week',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_week.geojson'
    },
    {
      id:'usgs-feed-1m-45',
      title:'M4.5+ Earthquakes Past Month',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson'
    },
    {
      id:'usgs-feed-1m-25',
      title:'M2.5+ Earthquakes Past Month',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson'
    },
    {
      id:'usgs-feed-1m-10',
      title:'M1.0+ Earthquakes Past Month',
      url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_month.geojson'
    },
    {
      id:'usgs-query',
      title:'USGS catalog custom query',
      url:'https://earthquake.usgs.gov/fdsnws/event/1/query.geojson?'
    },
    {
      id:'emsc-query',
      title:'EMSC SeismicPortal query',
      url:'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&nodata=404&'
    },
    {
      id:'user-url',
      title:'User specified URL'
    },
    {
      id:'user-file',
      title:'User local file'
    }
  ],
  sources_map:{},
  hash_params:{},
  init:function() {
    this.ts_step=0;
    this.target_fps=10;
    this.fade_seconds=0;
    this.fade_duration=0;
    this.info_update_frames=2; // update html info every Nth frame
    this.time_line_scale=1; // initial safe value before DOM ready
    this.timer=null;
    this.clear_data();
    this.style_cache={};
    this.scale_line_active=false;
    this.src=null;
    this.scroll_to_map=false; // for permalinks using hash, want to show map

    this.init_hash_params();
    this.init_source=this.sources[0];

    var i;
    for(i=0;i<this.sources.length;i++) {
      this.sources_map[this.sources[i].id]=this.sources[i];
      if(this.sources[i].is_default) {
        this.init_source=this.sources[i];
      }
    }
    if(typeof(this.sources_map[this.hash_params['src']]) != 'undefined') {
      this.init_source=this.sources_map[this.hash_params['src']];
    }
    if(typeof(this.init_source.view) != 'undefined') {
      this.init_view=this.view_presets[this.init_source.view];
    } else {
      this.init_view=this.view_presets['california'];
    }

    this.scale_line = new ScaleLine();
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
        center: fromLonLat(this.init_view.lonlat),
        zoom: this.init_view.zoom,
        minZoom: 1
      })
    });
    this.map.on('moveend',$.proxy(this.on_map_moveend,this));
    $(document).ready($.proxy(this.onready,this));
  },
  init_hash_params:function() {
    var hash=window.location.hash;
    if(hash.substr(0,4) !== '#v1,') {
      return;
    }
    var params=hash.substr(4).split(',')
    var p;
    var i;
    for(i=0;i<params.length;i++) {
      p=params[i].split(':')
      if(p.length == 1) {
        this.hash_params[p[0]] = true;
      } else {
        this.hash_params[p[0]] = p[1];
      }
    }
    this.scroll_to_map=true;
    //console.log(this.hash_params);
  },
  // based on https://openlayers.org/en/latest/examples/moveend.html
  wrap_lon:function(value) {
    var worlds = Math.floor((value + 180) / 360);
    return value - (worlds * 360);
  },
  on_map_moveend:function() {
    var view=this.map.getView();
    var center=toLonLat(view.getCenter());
    this.map_extent = view.calculateExtent(this.map.getSize());
    // slightly larger partially on-screen markers will show
    this.do_extent_cull = false; // TODO still broken
    this.map_extent_marker_buffer = extentBuffer(this.map_extent,250*view.getResolution());
    // extent coords keep growing if you scroll through repeats, give up
    /*
    if(this.map_extent[0] < -40000000 || this.map_extent[2] > 40000000) {
      this.do_extent_cull = false;
    } else {
      this.do_extent_cull = true;
    }
    */

    var bottomLeft = toLonLat(getBottomLeft(this.map_extent));
    // values appear to already be wrapped, but was in example
    bottomLeft[0]=this.wrap_lon(bottomLeft[0]);
    var topRight = toLonLat(getTopRight(this.map_extent));
    topRight[0]=this.wrap_lon(topRight[0]);

    this.mappos={
      n_lat:topRight[1],
      e_lng:topRight[0],
      s_lat:bottomLeft[1],
      w_lng:bottomLeft[0],
      c_lat:center[1],
      c_lng:center[0]
    };
    // if not running animation, ensure features are added/removed
    if(!this.timer) {
      this.update_features_for_time();
    }
    $('.map-box-disp').html('(' + this.mappos.s_lat.toFixed(2) +
                              ',' + this.mappos.e_lng.toFixed(2) +
                              ') (' + this.mappos.n_lat.toFixed(2) +
                              ',' + this.mappos.w_lng.toFixed(2) + ')');
    $('.map-center-disp').html('(' + this.mappos.c_lat.toFixed(2) +
                              ',' + this.mappos.c_lng.toFixed(2)+')');
    // hack to avoid ambiguity in bounds when map is repeated
    if(this.mappos.n_lat - this.mappos.s_lat > 110) {
      $('#cust_bounds_map_box').prop('disabled',true);
      if($('#cust_bounds_map_box:checked').length) {
        $('#cust_bounds_map_rad_deg').prop('checked',true);
      }
    } else {
      $('#cust_bounds_map_box').prop('disabled',false);
    }
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
      if(opts.type == 'usgs-query' || opts.type == 'emsc-query') {
        this.errmsg('query returned 0 earthquakes');
      } else {
        this.errmsg('data contains 0 earthquakes');
      }
      return false;
    }
    if(data.type !== 'FeatureCollection') {
      this.warnmsg('data.type not FeatureCollection');
    }
    if(opts.type == 'emsc-query') {
      data.metadata.count = data.metadata.totalCount;
      data.metadata.url = opts.dataurl;
    }
    if(data.metadata.count != data.features.length) {
      this.warnmsg('metadata.count != features.length');
    }
    var features=data.features;

    var i;
    var i_first = 0;
    var i_last = 0;
    var i_mag_min = 0;
    var i_mag_max = 0;
    var eq;
    for(i=0;i<features.length;i++) {
      eq=features[i];
      // unlike USGS, EMSC gives the time as a string like "2019-07-14T07:26:35.0Z"
      if(opts.type == 'emsc-query') {
        eq.properties.orig_time = eq.properties.time;
        eq.properties.time = (new Date(eq.properties.time)).getTime();
      }
      // initialize display state
      eq.eqplay={
        style_key:null,
        style_key_prev:null,
        coords:fromLonLat([eq.geometry.coordinates[0],eq.geometry.coordinates[1]]),
      };
      eq.eqplay.point=new Point(eq.eqplay.coords)
      if(features[i_first].properties.time > eq.properties.time) {
        i_first=i;
      }
      if(features[i_last].properties.time < eq.properties.time) {
        i_last=i;
      }
      if(features[i_mag_min].properties.mag > eq.properties.mag) {
        i_mag_min=i;
      }
      if(features[i_mag_max].properties.mag < eq.properties.mag) {
        i_mag_max=i;
      }
    }
    this.i_first = i_first;
    this.i_last = i_last;
    this.i_mag_min = i_mag_min;
    this.i_mag_max = i_mag_max;
    var eq_first = features[i_first];
    var eq_last = features[i_last];

    this.infomsg('Loaded '+data.features.length
              +' quakes from ' +opts.dataurl
              +' M '+features[i_mag_min].properties.mag
              +' - '+features[i_mag_max].properties.mag);
    var days;
    var metaurl=data.metadata.url;
    if(opts.type == 'usgs-query' || opts.type == 'emsc-query') {
      this.t_start=opts.t_start;
      this.t_end=opts.t_end;
      if(data.features.length == opts.limit_count) {
        this.warnmsg('Max results limit hit');
      }
    } else if(opts.type == 'feed-url') {
      // allow sources to define timespan
      if(typeof(this.src.t_start) != 'undefined' && typeof(this.src.t_end) != 'undefined') {
        this.t_start = this.src.t_start;
        this.t_end = this.src.t_end;
      } else {
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
    }
    if(this.t_start === null) {
      if(opts.type != 'user-url' && opts.type != 'user-file') {
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
    this.infomsg('Date range '+this.fmt_date(this.t_start)+' - ' +this.fmt_date(this.t_end));
    this.update_data_info();
    this.time_warp_to(this.t_end.getTime());// jump to end, showing all loaded EQ
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
      .fail($.proxy(function(jqxhr,txtstatus,err) {
        // emsc generates "bad request" or 404 with text status for null result
        if(opts.type == 'emsc-query' && jqxhr.status == 404 && jqxhr.responseText.indexOf('no result found') >= 0) {
          this.errmsg('query returned 0 earthquakes');
        } else {
          console.log('whoopsie!',txtstatus);
          this.infomsg('Failed to load '+opts.dataurl+' error '+err);
        }
        this.clear_data();
      },this));
  },
  clear_data:function() {
    this.eqdata=null;
    this.t_end=null;
    this.t_start=null;
    this.i_first=null;
    this.i_last=null;
    this.i_mag_min=null;
    this.i_mag_max=null;
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
  fmt_date_ymd:function(d) {
    if(this.tz == 'browser') {
      return d.getFullYear() + '-' + this.fmt_int_pad_0(d.getMonth()+1) + '-' + this.fmt_int_pad_0(d.getDate());
    } else {
      return d.getUTCFullYear() + '-' + this.fmt_int_pad_0(d.getUTCMonth()+1) + '-' + this.fmt_int_pad_0(d.getUTCDate());
    }
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
  fmt_int_pad_0:function(n,len) {
    if(typeof len == 'undefined') {
      len=2;
    }
    // will break on very large / small 11eblah. Meh
    var s=n.toFixed();
    var n_len = s.length;
    var i;
    for(i=0;i<(len - n_len);i++) {
      s='0'+s;
    }
    return s;
  },
  update_data_info:function() {
    this.update_cur_time_display();
    if(!this.eqdata) {
      $('.data-start-date-disp').html('-');
      $('.data-end-date-disp').html('-');
      $('.data-quake-count-disp').html('-');
      $('.data-mag-min-disp').html('-');
      $('.data-mag-max-disp').html('-');
      return;
    }
    $('.data-start-date-disp').html(this.fmt_date(this.t_start));
    $('.data-end-date-disp').html(this.fmt_date(this.t_end));
    $('.data-quake-count-disp').html(this.eqdata.features.length);
    $('.data-mag-min-disp').html(this.eqdata.features[this.i_mag_min].properties.mag);
    $('.data-mag-max-disp').html(this.eqdata.features[this.i_mag_max].properties.mag);
  },
  update_eq_for_time:function(eq) {
    var info=eq.eqplay;
    info.style_key_prev = info.style_key;
    info.fade_alpha = this.get_eq_fade(eq);

    if(info.fade_alpha === 0
      || eq.properties.time > this.ts_cur
      || eq.properties.mag < this.disp_mag_min
      || eq.properties.mag > this.disp_mag_max
      || (this.do_extent_cull && !info.point.intersectsExtent(this.map_extent_marker_buffer))
      ) {
      info.style_key=null;
      return;
    }
    var r=this.marker_base_rad;
    if(this.marker_scale_mag >=1) {
      if(eq.properties.mag > 1) {
        r = r*Math.round(Math.pow(eq.properties.mag,this.marker_scale_mag)*10)/10; // limit unique values
      }
    }
    info.radius=r;
    info.stroke_width=this.marker_stroke_width;
    info.style_key = (r + this.marker_stroke_width) + '_' + info.fade_alpha;
  },
  get_eq_fade:function(eq) {
    var fd = this.fade_duration;
    if(fd == 0) {
      return 1; // no fade
    }
    var age = this.ts_cur - eq.properties.time;
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
  get_eq_style:function(eq) {
    // butchered from
    // https://openlayers.org/en/latest/examples/kml-earthquakes.html
    var style=this.style_cache[eq.eqplay.style_key];
    var fill_color;
    var stroke_color;

    if(!style) {
      // clone the arrays before setting colors
      fill_color=this.marker_fill_color.slice(0);
      stroke_color=this.marker_stroke_color.slice(0);
      stroke_color[3]*=eq.eqplay.fade_alpha;
      fill_color[3]*=eq.eqplay.fade_alpha;
      style = new Style({
        image: new CircleStyle({
          radius: eq.eqplay.radius,
          fill: new Fill({
            color: fill_color
          }),
          stroke: new Stroke({
            color: stroke_color,
            width: eq.eqplay.stroke_width
          })
        })
      });
      this.style_cache[eq.eqplay.style_key] = style;
    }
    return style;
  },
  update_features_for_time:function() {
    var eq;
    var i;
    var f;
    var to_add=[];
    var t=this.ts_cur;
    if(!this.eqdata) {
      return;
    }
    for(i=0;i<this.eqdata.features.length;i++) {
      eq=this.eqdata.features[i];
      this.update_eq_for_time(eq);
      f=this.vsource.getFeatureById(i);
      if(eq.eqplay.style_key === null) {
        eq.eqplay.style_key=null;
        if(f) {
          this.vsource.removeFeature(f)
        }
        continue;
      }
      if(eq.properties.time <= t) {
        if(!f) {
          f=new Feature(eq.eqplay.point);
          f.setId(i); // use index rather than remote ID, for easier crossref
          f.setStyle(this.get_eq_style(eq));
          to_add.push(f);
        } else {
          if(eq.eqplay.style_key !== eq.eqplay.style_key_prev) {
            f.setStyle(this.get_eq_style(eq));
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
      if(frame == 0) {
        this.update_features_full();
      } else {
        this.update_features_for_time();
      }
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
  anim_ms_to_duration:function(ms) {
    return this.ts_step * this.target_fps * ms/1000;
  },
  cur_time_frac:function() {
    if(!this.t_total_ms || !this.ts_cur) {
      return 0;
    }
    return (this.ts_cur - this.t_start.getTime()) / this.t_total_ms;
  },
  update_cur_time_display:function() {
    if(this.ts_cur) {
      $('.cur-time-disp').html(this.fmt_date(new Date(this.ts_cur)));
    } else if(this.t_start) {
      $('.cur-time-disp').html(this.fmt_date(this.t_start));
    } else {
      $('.cur-time-disp').html('-');
    }
    $('#time_line').val(this.cur_time_frac()*this.time_line_scale);
  },
  update_time_scale:function() {
    this.update_animation_values();
    this.ts_step = $('#time_scale').val() * 1000 / this.target_fps;
    this.update_fade_time();
    $('.time-scale-x-disp').html($('#time_scale').val());
    $('.time-scale-t-disp').html(this.fmt_ms_hhmmss(this.ts_step*this.target_fps));
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
    this.fade_seconds = parseInt($('#fade_time').val(),10);
    this.fade_duration = this.anim_ms_to_duration(this.fade_seconds*1000);
    if(this.fade_seconds > 0) {
      $('.fade-time-disp').html('animation ' + this.fade_seconds + 's' + ' real ' + this.fmt_ms_hhmmss(this.fade_duration));
    } else {
      $('.fade-time-disp').html('off');
    }
    this.update_features_for_time();
  },
  update_disp_mag:function() {
    this.disp_mag_min = parseFloat($('#disp_mag_min').val());
    if(this.disp_mag_min > parseFloat($('#disp_mag_min').attr('min'))) {
      $('.disp-mag-min-disp').html(this.disp_mag_min);
    } else {
      $('.disp-mag-min-disp').html('off');
      this.disp_mag_min = -999;
    }
    this.disp_mag_max = parseFloat($('#disp_mag_max').val());
    if(this.disp_mag_max < parseFloat($('#disp_mag_max').attr('max'))) {
      $('.disp-mag-max-disp').html(this.disp_mag_max);
    } else {
      $('.disp-mag-max-disp').html('off');
      this.disp_mag_max = 999;
    }
    this.update_features_for_time();
  },
  update_tz_info:function() {
    this.tz = $('#sel_tz').val();
    if(this.tz == 'browser') {
      $('.tz-disp').html('Browser timezone');
    } else {
      $('.tz-disp').html('UTC');
    }
    this.update_data_info();
    this.update_cur_time_display();
  },
  change_source:function() {
    var src_id=$('#sel_src').val();
    if(typeof(this.sources_map[src_id]) == 'undefined') {
      this.errmsg('unknown source '+src_id);
      return;
    }
    this.src = this.sources_map[src_id];

    // emsc doesn't support km radius
    if(src_id == 'emsc-query') {
      if($('#cust_bounds_map_rad_km:checked').length) {
        $('#cust_bounds_map_rad_deg').prop('checked',true);
      }
      $('#cust_bounds_map_rad_km').prop('disabled',true);
    } else {
      $('#cust_bounds_map_rad_km').prop('disabled',false);
    }
    if(src_id === 'usgs-query' || src_id === 'emsc-query') {
      $('.cust-src-settings').not('#usgs_query_inputs').hide();
      if($('#cust_start_date').val() == '') {
        $('#cust_start_date').val(this.fmt_date_ymd(new Date()))
      }
      $('#usgs_query_inputs').show();
    } else if(src_id === 'user-url') {
      $('.cust-src-settings').not('#user_url_inputs').hide();
      $('#user_url_inputs').show();
    } else if(src_id === 'user-file') {
      $('.cust-src-settings').not('#user_file_inputs').hide();
      $('#user_file_inputs').show();
    } else {
      $('.cust-src-settings').hide();
      this.get_data({dataurl:this.src.url,type:'feed-url'});
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
      this.errmsg('failed to parse date ' + datestr);
      return null;
    }

    var hstr=$('#'+opts.id+'_h').val();
    if(hstr === '' && typeof opts.def_h != 'undefined') {
      hstr=opts.def_h;
    }
    var h=parseInt(hstr,10);
    if(isNaN(h)) {
      this.errmsg('failed to parse hour ' + hstr);
      return null;
    }
    if(h < 0 || h > 23) {
      this.errmsg('invalid hour ' + h);
      return null;
    }
    var mstr=$('#'+opts.id+'_m').val();
    if(mstr === '' && typeof opts.def_h != 'undefined') {
      mstr=opts.def_m;
    }
    var m=parseInt(mstr,10);
    if(isNaN(m)) {
      this.errmsg('failed to parse minute ' + mstr);
      return null;
    }

    if(m < 0 || m > 59) {
      this.errmsg('invalid minute ' + mstr);
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
      this.errmsg('failed to create date ' + err);
      return null;
    }
    return d;
  },
  get_cust_data:function() {
    // API documentation at https://earthquake.usgs.gov/fdsnws/event/1/
    var url=this.src.url;
    var t_start=this.get_date_input({id:'cust_start',def_h:0,def_m:0});
    if(!t_start) {
      this.errmsg('invalid start date/time');
      return;
    }
    url += 'starttime='+t_start.toISOString();

    var t_end=this.get_date_input({id:'cust_end',def_date:new Date(),def_h:23,def_m:59});

    url += '&endtime='+t_end.toISOString();
    var m_min=$('#cust_mag_min').val();
    if(m_min < -2 || m_min > 10) {
      this.errmsg('invalid min mag '+m_min);
      return;
    }
    url += '&minmagnitude='+m_min;
    var m_max=$('#cust_mag_max').val();
    // optional
    if(m_max !== '') {
      if(m_max < m_min) {
        this.errmsg('invalid max mag '+m_max+' < min '+m_min);
        return;
      }
      url += '&maxmagnitude='+m_max;
    }
    var bounds_mode=$('input[name="cust_bounds_radio"]:checked').val();
    if(bounds_mode == 'map-box') {
      var min_lng = this.mappos.w_lng;
      if(min_lng > this.mappos.e_lng) {
        min_lng -= 360;
        //console.log('180!','w',this.mappos.w_lng.toFixed(2),'->',min_lng.toFixed(2),'e',this.mappos.e_lng.toFixed(2));
      }
      url += '&minlongitude=' + min_lng +
        '&maxlatitude=' + this.mappos.n_lat +
        '&maxlongitude=' + this.mappos.e_lng +
        '&minlatitude=' + this.mappos.s_lat;
    } else if (bounds_mode == 'map-rad-km') {
      url += '&latitude=' + this.mappos.c_lat +
        '&longitude=' + this.mappos.c_lng +
        '&maxradiuskm=' + $('#cust_bounds_map_rad_km_val').val();
    } else if (bounds_mode == 'map-rad-deg') {
      url += '&latitude=' + this.mappos.c_lat +
        '&longitude=' + this.mappos.c_lng +
        '&maxradius=' + $('#cust_bounds_map_rad_deg_val').val();
    }

    var limit_count = $('#cust_limit_count').val();
    if(limit_count < 1 || limit_count > 20000) {
      this.errmsg('invalid limit count '+limit_count);
      return;
    }
    url += '&limit='+limit_count;
    url += '&orderby='+$('#cust_order_by').val();
    this.infomsg('custom query url: '+url);
    this.get_data({dataurl:url,type:this.src.id,t_start:t_start,t_end:t_end,limit_count:limit_count});
  },
  get_user_url_data:function() {
    var url=$('#user_data_url').val();
    if(url==='') {
      this.errmsg('URL not set');
      return;
    }
    this.get_data({dataurl:url,type:'user-url'});
  },
  get_user_file_data:function() {
    var el=$('#user_data_file')[0];
    if(el.files.length == 0) {
      this.errmsg('no files selected');
      return;
    }
    var f = el.files[0]
    var reader = new FileReader();
    reader.onload=$.proxy(function() {
      var data;
      try {
        data=JSON.parse(reader.result);
      } catch (err) {
        this.errmsg('JSON.parse failed ' + err);
        return;
      }
      this.init_data(data,{dataurl:f.name,type:'user-file'});
    },this);
    this.stop_animation();
    this.clear_data();
    reader.readAsBinaryString(f);
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
    this.marker_fill_color[3] = parseFloat($('#marker_fill_alpha').val());
    $('.marker-fill-alpha-disp').html(this.marker_fill_color[3]);
    this.marker_stroke_color=this.color_to_rgb($('#marker_stroke_color').val());
    this.marker_stroke_color[3] = parseFloat($('#marker_stroke_alpha').val());
    $('.marker-stroke-alpha-disp').html(this.marker_stroke_color[3]);
    this.update_features_full();
  },
  update_marker_scale:function() {
    this.marker_base_rad = parseFloat($('#marker_base_rad').val());
    $('.marker-base-rad-disp').html(this.marker_base_rad*2);
    this.marker_stroke_width = parseInt($('#marker_stroke_width').val(),10);
    $('.marker-stroke-width-disp').html(this.marker_stroke_width);
    this.marker_scale_mag = parseFloat($('#marker_scale_mag').val());
    if(this.marker_scale_mag >=1) {
      $('.marker-scale-mag-disp').html(this.marker_scale_mag);
    } else {
      $('.marker-scale-mag-disp').html('off');
    }
    this.update_features_full();
  },
  update_scale_line:function() {
    var scale_line_mode=$('input[name="scale_line"]:checked').val();
    if(scale_line_mode === '') {
      this.map.removeControl(this.scale_line);
      this.scale_line_active=false;
    } else {
      this.scale_line.setUnits(scale_line_mode);
      if(!this.scale_live_acive) {
        this.map.addControl(this.scale_line);
      }
    }
  },
  init_sources_menu:function() {
    var i
    var selected;
    for(i=0;i<this.sources.length;i++) {
      if(this.sources[i] == this.init_source) {
        selected=' selected="selected"';
      } else {
        selected='';
      }
      $('#sel_src').append('<option value="'+this.sources[i].id+'"'+selected+'>'+this.sources[i].title+'</option>');
    }
  },
  onready:function() {
    this.init_sources_menu();
    $('#btn_play').click($.proxy(function() {
      if(this.timer) {
        this.stop_animation();
      } else {
        this.start_animation();
      }
    },this));
    if(this.scroll_to_map) {
      $(window).scrollTop($('#map').offset().top);
    }
    $('#btn_stop').click($.proxy(this.reset_animation,this));
    $('#sel_src').change($.proxy(this.change_source,this));
    $('#btn_cust_get').click($.proxy(this.get_cust_data,this));
    $('#btn_user_url_get').click($.proxy(this.get_user_url_data,this));
    $('#user_data_file').change($.proxy(this.get_user_file_data,this));
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
    $('#disp_mag_min, #disp_mag_max').change($.proxy(this.update_disp_mag,this));
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
    $('#marker_fill_color, #marker_stroke_color, #marker_fill_alpha, #marker_stroke_alpha').change($.proxy(this.update_marker_colors,this));
    $('#marker_scale_mag').change($.proxy(this.update_marker_scale,this));
    $('#marker_base_rad, #marker_stroke_width').change($.proxy(this.update_marker_scale,this));
    $('input[name="scale_line"]').change($.proxy(this.update_scale_line,this));
    this.time_line_scale=parseFloat($('#time_line').attr('max'));
    // these inits may try to clear / re-render, do BEFORE first get_data()
    this.update_time_scale();
    this.update_fade_time();
    this.update_disp_mag();
    this.update_marker_colors();
    this.update_marker_scale();
    this.update_scale_line();
    this.update_tz_info();
    this.change_source();
  }
};
EQPlay.init();
// for easy console access
//window.EQPlay = EQPlay;
