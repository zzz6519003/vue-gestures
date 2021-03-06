/*
 * Tap directive
 *
 * Acts like a click event, except it removes the 300ms delay on touch
 * browsers (see http://blogs.telerik.com/appbuilder/posts/13-11-21/what-exactly-is.....-the-300ms-click-delay ).
 *
 */
var utils = require('../utils');
var addEvent = utils.addEvent;
var canTouch = utils.canTouch();

var IDENTIFIER_UNIQUENESS_LIMIT = 20;

module.exports = function(Vue, options) {

  var vUtils = Vue.require('utils');

  options = utils.extend({
    prefix: '',

    // TODO: implement tapDuration
    tapDuration: 750, // Shorter than 750ms is a tap, longer is a taphold or drag.
    moveTolerance: 12 // 12px seems to work in most mobile browsers.
  }, options);

  var prefix = options.prefix? options.prefix + '-' : '';

  Vue.directive(prefix + 'tap', {
    isFn: true,

    update: function(handler) {
      var self = this;

      if (typeof handler !== 'function') {
        return vUtils.warn('Directive "tap" expects a function value.');
      }

      this.reset();

      this.handler = function(e) {
        e.el = e.currentTarget;
        e.targetVM = self.vm;
        handler.call(self.vm, e);
      };

      if (typeof window.ontouchstart === 'undefined') {
        this.stopClick = addEvent(this.el, 'click', this.handler);
        return;
      }

      // Prevents an iOS bug
      // …but adds a "shadow click" (focus effect): disabled for now.
      // this.stopClick = addEvent(this.el, 'click', function(e) {
      //   e.preventDefault();
      // });

      var lastTouchStart = null;

      this.stopTouchstart = addEvent(this.el, 'touchstart', function(e) {

        // iOS (6, 7.0, 7.1) triggers another touchstart with the same identifier
        // after an alert(), but the Touch identifier stays the same between
        // these two touchstart events, so we can use it to prevent another
        // triggering of the action.
        // On iOS, this identifier is a number that changes on every new Touch
        // event, except for this particular case.
        // On Android, this identifier starts with 0, and is incremented for
        // every Touch object, so we can have the same identifier for two
        // different events, which means that we have to detect the uniqueness
        // of the identifier before relying on it: if the identifier is greater
        // than IDENTIFIER_UNIQUENESS_LIMIT, it means that the number is unique.
        var identifier = e.touches[0].identifier;
        if (lastTouchStart === identifier &&
            identifier > IDENTIFIER_UNIQUENESS_LIMIT) return;
        lastTouchStart = identifier;

        self.initX = self.endX = e.touches[0].clientX;
        self.initY = self.endY = e.touches[0].clientY;
        self.stopTouchend = addEvent(self.el, 'touchend',
                                     self.onTouchend.bind(self));
        self.stopTouchmove = addEvent(self.el, 'touchmove',
                                      self.onTouchmove.bind(self));
      });
      this.stopTouchcancel = addEvent(this.el, 'touchcancel', function(e) {
        self.stopTouch();
      });
    },

    unbind: function() {
      this.reset();
    },

    reset: function () {
      if (this.stopClick) this.stopClick();
      if (this.stopTouchstart) this.stopTouchstart();
      if (this.stopTouchend) this.stopTouchend();
      if (this.stopTouchmove) this.stopTouchmove();
      this.handler = null;
    },

    isOut: function() {
      return Math.abs(this.endX - this.initX) > options.moveTolerance ||
             Math.abs(this.endY - this.initY) > options.moveTolerance;
    },

    onTouchmove: function(e) {
      this.endX = e.touches[0].clientX;
      this.endY = e.touches[0].clientY;
      if (this.isOut()) this.stopTouch();
    },

    onTouchend: function(e) {
      this.stopTouch();
      if (this.isOut()) return;
      e.stopPropagation();
      this.handler(e);
    },

    stopTouch: function() {
      if (this.stopTouchend) this.stopTouchend();
      if (this.stopTouchmove) this.stopTouchmove();
    }
  });
};
