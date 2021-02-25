'use strict';

var Search = (function() {

  function Search(config) {
    var defaults = {};
    this.opt = $.extend({}, defaults, config);
    this.init();
  }

  Search.prototype.init = function(){
    this.loadListeners();
  };

  Search.prototype.loadListeners = function(){
    $('.search-form').on('submit', function(e){
      e.preventDefault();
      $(document).trigger("search.submit", [$('#query').val()]);
    });

    $('.reset-search').on('click', function(e){
      e.preventDefault();
      $('#query').val('');
      $(document).trigger("search.submit", ['']);
    });
  };

  return Search;

})();

$(function() {
  var search = new Search({});
});
