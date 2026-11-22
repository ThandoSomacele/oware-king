// Small fill-ins so the game runs on the old browser engines inside TVs from 2018 on.
(function () {
  if (!String.prototype.padStart) {
    String.prototype.padStart = function (len, fill) {
      var s = String(this), f = fill === undefined ? ' ' : String(fill);
      while (s.length < len) s = f + s;
      return s.slice(-Math.max(len, s.length));
    };
  }
  if (!Element.prototype.replaceChildren) {
    Element.prototype.replaceChildren = function () {
      while (this.firstChild) this.removeChild(this.firstChild);
      for (var i = 0; i < arguments.length; i++) this.appendChild(arguments[i]);
    };
  }
  // Old engines lack many newer layout features. The "old" class switches on simpler CSS for them.
  if (!(window.CSS && CSS.supports && CSS.supports('aspect-ratio', '1'))) document.documentElement.className += ' old';
})();
