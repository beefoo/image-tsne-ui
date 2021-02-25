'use strict';

var PanZoom = (function() {

  var viewer, tracker, opt;
  var imageW, imageH, cellW, cellH, ncellW, ncellH;
  var filterCtx, filterImData, filterData, minYear, maxYear, queryText;
  var filterTexture, filterSprite, spriteW, spriteH;
  var lastWebPoint, isAnimating, animateTimeout, isTouch;
  var metadata, currentDataIndex;
  var $highlight, $title, $metadata, $metadataContent, $debug;
  var $overlay, pixiApp;

  function PanZoom(config) {
    var defaults = {
      tileSources: "img/tiles.dzi",
      prefixUrl: "img/openseadragon/",
      debug: false,
      tileSize: 128,
      highlightDelay: 10,
      defaultZoomLevel: 3
    };
    opt = $.extend({}, defaults, config);
    this.init();
  }

  function getViewportDetails(){
    var webPoint = lastWebPoint || new OpenSeadragon.Point(0,0);
    var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
    var imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
    var imageOffset = viewer.viewport.viewportToImageCoordinates(viewer.viewport.pointFromPixel(new OpenSeadragon.Point(0,0), true)).negate();
    var zoom = viewer.viewport.getZoom(true);
    var imageZoom = viewer.viewport.viewportToImageZoom(zoom);
    var viewportSize = viewer.viewport.getContainerSize();

    return {
      "webPoint": webPoint,
      "viewportSize": viewportSize,
      "viewportPoint": viewportPoint,
      "imagePoint": imagePoint,
      "imageOffset": imageOffset,
      "imageZoom": imageZoom
    }
  }

  PanZoom.prototype.init = function(){

    viewer = OpenSeadragon({
        id: "panzoom",
        prefixUrl: opt.prefixUrl,
        tileSources: opt.tileSources,
        homeFillsViewer: true,
        minZoomImageRatio: 0.45
        // animationTime: 0
    });

    isTouch = isTouchDevice();

    queryText = '';

    if (opt.debug) this.loadDebug();
  };

  PanZoom.prototype.loadDebug = function(){
    $debug = $("#debug");
    $debug.addClass("active");
  };

  // https://openseadragon.github.io/examples/viewport-coordinates/
  PanZoom.prototype.loadListeners = function(){
    var _this = this;

    viewer.addHandler('open', function() {
      tracker = new OpenSeadragon.MouseTracker({
          element: viewer.container,
          moveHandler: function(e) {
            lastWebPoint = e.position;
            _this.onMouseMove();
          }
      });

      var imageSize = viewer.world.getItemAt(0).getContentSize();
      imageW = imageSize.x;
      imageH = imageSize.y;
      console.log("Image size: "+imageSize.toString());

      ncellW = 1.0 / opt.cols;
      ncellH = 1.0 / opt.rows;
      cellW = 1.0 * imageW / opt.cols;
      cellH = 1.0 * imageH / opt.rows;

      $(".openseadragon-canvas").append($('<a href="#" id="highlight" class="highlight"><h2 id="highlight-title" class="title"></h2></a>'));
      $highlight = $("#highlight");
      $title = $("#highlight-title");
      $metadata = $("#metadata");
      $metadataContent = $("#metadata-content");

      $highlight.css({
        width: opt.tileSize,
        height: opt.tileSize
      });

      $(".close-link").on("click", function(){
        $metadata.removeClass("active");
      });

      if (isTouch) {
        viewer.addHandler('canvas-click', function(e){
          e.preventDefaultAction = true;
          lastWebPoint = e.position;
          _this.onMouseMove();
          _this.renderMetadata();
        });
      } else {
        viewer.addHandler('canvas-click', function(e){
          e.preventDefaultAction = true;
        });
        $highlight.on("click", function(e){
          _this.renderMetadata();
        });
      }

      _this.loadOverlay();

      tracker.setTracking(true);

      viewer.addHandler('animation', function(){
        _this.onAnimation();
      });
    });


    $(document).on("search.submit", function(e, text) {
      // console.log(index);
      _this.onSearchSubmit(text);
    });
  };

  PanZoom.prototype.loadOverlay = function(){
    var $el = $("#panzoom");
    var w = $el.width();
    var h = $el.height();
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    pixiApp = new PIXI.Application({width: w, height: h, transparent: true});

    // create a canvas to hold grid data
    var canvas = document.createElement('canvas');
    canvas.width = opt.cols;
    canvas.height = opt.rows;
    filterCtx = canvas.getContext('2d');
    filterImData = filterCtx.createImageData(opt.cols, opt.rows);
    filterData = filterImData.data;

    this.onFilter();
    filterTexture = new PIXI.Texture.from(canvas);
    filterSprite = new PIXI.Sprite.from(filterTexture);
    spriteW = filterSprite.width;
    spriteH = filterSprite.height;
    // filterSprite.width = w;
    // filterSprite.height = h;

    pixiApp.stage.addChild(filterSprite);
    $overlay = $(pixiApp.view);
    $overlay.css({
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
      "z-index": 0
    })
    $(".openseadragon-canvas").append($overlay);
    this.transformOverlay();
  };

  PanZoom.prototype.onAnimation = function(e){
    isAnimating = true;
    $highlight.removeClass("active");

    if (animateTimeout) clearTimeout(animateTimeout);
    animateTimeout = setTimeout(function(){
      isAnimating = false;
    }, opt.highlightDelay);

    this.transformOverlay();
    this.onMouseMove();
  };

  PanZoom.prototype.onFilter = function(fdata){
    if (filterData===undefined) return;

    var isSearch = queryText.length > 0;

    for (var row=0; row<opt.rows; row++) {
      for (var col=0; col<opt.cols; col++) {
        var i = row * opt.cols + col;
        var r=0, g=0, b=0, a=0;
        if (isSearch) {
          if (!metadata[i].searchText.includes(queryText)) {
            a = 200;
          }
        }
        filterData[i*4] = r;
        filterData[i*4+1] = g;
        filterData[i*4+2] = b;
        filterData[i*4+3] = a;
      }
    }
    filterCtx.putImageData(filterImData, 0, 0);
    filterTexture && filterTexture.update();
  };

  PanZoom.prototype.onMouseMove = function(){
    var vp = getViewportDetails();
    if (!vp) return false;

    this.renderDebug(vp);
    if (!isAnimating) this.renderHighlight(vp);

  };

  PanZoom.prototype.onResize = function(){
    var $el = $("#panzoom");
    var w = $el.width();
    var h = $el.height();
    pixiApp.renderer.resize(w, h);
    this.transformOverlay();
  };

  PanZoom.prototype.onSearchSubmit = function(text){
    queryText = text.trim().toLowerCase();
    this.onFilter();

  };

  PanZoom.prototype.renderDebug = function(details){
    if (!opt.debug) return false;

    details = details || getViewportDetails();
    if (!details) return false;

    var html = '<strong>Web:</strong> ' + details.webPoint.toString();
    html += '<br /><strong>Viewport:</strong> ' + details.viewportPoint.toString();
    html += '<br /><strong>Image:</strong> ' + details.imagePoint.toString();
    html += '<br /><strong>Offset:</strong> ' + details.imageOffset.toString();
    html += '<br /><strong>Image Zoom:</strong> ' + (Math.round(details.imageZoom * 100) / 100);

    $debug.html(html);
  };

  PanZoom.prototype.renderHighlight = function(details){
    details = details || getViewportDetails();
    if (!details) return false;

    // first check if mouse is within the image
    if (details.imagePoint.x < 0 || details.imagePoint.y < 0 ||
        details.imagePoint.x > imageW || details.imagePoint.y > imageH) {
      $highlight.removeClass("active");
      return false;
    }

    var cellX = floorToNearest(details.imagePoint.x, cellW);
    var cellY = floorToNearest(details.imagePoint.y, cellH);

    // normalize image point and offset
    var nImageX = cellX / imageW;
    var nImageY = cellY / imageH;

    var nOffsetX = details.imageOffset.x / imageW;
    var nOffsetY = details.imageOffset.y / imageH;

    // get the perceived/scaled width/height
    var scale = details.imageZoom;
    var sImageW = imageW * scale;
    var sImageH = imageH * scale;
    var sCellW = cellW * scale;
    var sCellH = cellH * scale;

    // get the position within the viewport
    var vpX = nImageX * sImageW + nOffsetX * sImageW;
    var vpY = nImageY * sImageH + nOffsetY * sImageH;

    // check to see if cell is within viewport
    if ((vpX+sCellW) < 0 || (vpY+sCellH) < 0 ||
        vpX > details.viewportSize.x || vpY > details.viewportSize.y) {
      $highlight.removeClass("active");
      return false;
    }

    // transform and activate
    $highlight.css({
      "transform": "translate3d("+vpX+"px, "+vpY+"px, 0) scale3d("+scale+","+scale+","+scale+")"
    });
    $highlight.addClass("active");
    $title.css({
      "transform": "scale3d("+(1.0/scale)+","+(1.0/scale)+","+(1.0/scale)+")"
    });

    var col = parseInt(nImageX * opt.cols);
    var row = parseInt(nImageY * opt.rows);
    var dataIndex = parseInt(row * opt.cols + col);
    currentDataIndex = dataIndex;
    this.renderTitle(dataIndex);

    // if ($metadata.hasClass("active")) this.renderMetadata(dataIndex);
  };

  PanZoom.prototype.renderMetadata = function(dataIndex){
    if (metadata===undefined) return;

    dataIndex = dataIndex || currentDataIndex;
    var title = metadata[dataIndex].title;

    // hide title and metadata if it doesn't exist
    if (title===undefined || title.length <= 0) {
      $metadata.removeClass('active');
      return;
    }
    var url = metadata[dataIndex].url;

    var html = '<h2>' + title + '</h2>';
    // html += '<div class="metadata-image" style="background-image: url('+imageUrl+');"></div>';
    html += '<a href="'+url+'" class="button" target="_blank">View on full record</a>';
    $metadataContent.html(html)
    $metadata.addClass('active');
  };

  PanZoom.prototype.renderTitle = function(dataIndex){
    if (metadata===undefined) return;

    dataIndex = dataIndex || currentDataIndex;
    var title = metadata[dataIndex].title;

    // hide title and metadata if it doesn't exist
    if (title===undefined || title.length <= 0) {
      $title.removeClass("active");
      return;
    }

    $title.text(title).addClass("active");
  };

  PanZoom.prototype.setMetadata = function(data){
    metadata = data;
  };

  PanZoom.prototype.transformOverlay = function(){
    var vp = getViewportDetails();
    if (!vp) return false;

    // get the perceived/scaled width/height
    var scale = vp.imageZoom;
    var sImageW = imageW * scale;
    var sImageH = imageH * scale;

    var spriteScaleX = sImageW / spriteW;
    var spriteScaleY = sImageH / spriteH;

    var offset = vp.imageOffset;

    filterSprite.scale.x = spriteScaleX;
    filterSprite.scale.y = spriteScaleY;
    filterSprite.position.x = offset.x * scale;
    filterSprite.position.y = offset.y * scale;
  };

  return PanZoom;

})();
