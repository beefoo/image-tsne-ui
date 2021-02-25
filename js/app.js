'use strict';

_.templateSettings = {
  interpolate: /\{(.+?)\}/g
};

function floorToNearest(value, nearest) {
  return Math.floor(value / nearest) * nearest;
}

// https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
function isTouchDevice() {
  var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
  var mq = function(query) {
    return window.matchMedia(query).matches;
  }

  if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
    return true;
  }

  // include the 'heartz' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
  return mq(query);
}

function lerp(a, b, percent) {
  return (1.0*b - a) * percent + a;
}

function norm(value, a, b){
  var denom = (b - a);
  if (denom > 0 || denom < 0) {
    return (1.0 * value - a) / denom;
  } else {
    return 0;
  }
}

var App = (function() {

  function App(config) {
    var defaults = {
      metadataUrl: "data/metadata.json"
    };
    this.opt = $.extend({}, defaults, config);
    this.init();
  }

  function loadJSONData(url){
    var deferred = $.Deferred();
    $.getJSON(url, function(data) {
      console.log("Loaded data.");
      deferred.resolve(data);
    });
    return deferred.promise();
  }

  App.prototype.init = function(){
    this.loadData();

    if (this.opt.debug) this.loadDebug();
  };

  App.prototype.loadData = function(){
    var _this = this;
    var dataPromise = loadJSONData(this.opt.metadataUrl);
    $.when(dataPromise).done(function(results){
      _this.onDataLoad(results);
    });
  };

  App.prototype.loadDebug = function(){
    var $debug = $("#debug");
    $debug.addClass("active");
  };

  App.prototype.loadListeners = function(){
    var _this = this;

    this.panzoom.loadListeners();

    $(".toggle-link").on("click", function(){
      $(this).parent().toggleClass("active");
    });

    $(window).on("resize", function(){
      _this.panzoom.onResize();
    });
  };

  App.prototype.onDataLoad = function(results){
    var urlTemplate = false;
    if (results.urlPattern) {
      urlTemplate = _.template(results.urlPattern);
    }
    var fields = results.fields;

    var metadata = _.map(results.values, function(row, i){
      return _.map(row, function(col, j){
        if (col===0) {
          return { title: '', url: '' };
        }
        var item = _.object(fields, col);
        if (urlTemplate !== false) {
          item.url = urlTemplate(item);
        }
        return item;
      });
    });
    metadata = _.flatten(metadata, 1);

    this.panzoom = new PanZoom({
      cols: results.cols,
      rows: results.rows,
      tileSize: results.tileSize
    });
    this.panzoom.setMetadata(metadata);
    this.loadListeners();
  };

  return App;

})();

$(function() {
  var app = new App({});
});
