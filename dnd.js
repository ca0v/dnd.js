/** DND Version 1.0
Developed by: André H. Oliva
Copyright 2014
*/
define(["require", "exports"], function (require, exports) {
    "use strict";
    function on(element, event, cb) {
        element.addEventListener(event, cb);
        return function () { return element.removeEventListener(event, cb); };
    }
    var Dnd = (function () {
        function Dnd(els) {
            this.scale = 1;
            this.configs = [];
            this.dndCount = 0;
            for (var i = 0; i < els.length; i++) {
                this[i] = els[i];
            }
            this.length = els.length;
        }
        Dnd.prototype.map = function (callback) {
            var results = [], i = 0;
            for (; i < this.length; i++) {
                results.push(callback.call(this, this[i], i));
            }
            return results;
        };
        Dnd.prototype.forEach = function (callback) {
            this.map(callback);
            return this;
        };
        Dnd.prototype.initDraggable = function (params) {
            var _this = this;
            params = params || {};
            return this.map(function (el) {
                var config = _this.configs[_this.dndCount] = {
                    onStart: (typeof (params.onStart) !== 'undefined') ? params.onStart : null,
                    onDrag: (typeof (params.onDrag) !== 'undefined') ? params.onDrag : null,
                    onDrop: (typeof (params.onDrop) !== 'undefined') ? params.onDrop : null,
                    parent: (typeof (params.parent) !== 'undefined') ? params.parent : document.body,
                    centralize: (typeof (params.centralize) !== 'undefined') ? params.centralize : false,
                    clone: (typeof (params.clone) !== 'undefined') ? params.clone : false,
                    revert: (typeof (params.revert) !== 'undefined') ? params.revert : -1,
                    originalElement: el,
                    originalCoords: {},
                    grabPoint: {},
                    dragElement: null,
                    dropTarget: null
                };
                if (params.onCreate)
                    params.onCreate();
                el.setAttribute('data-drag-id', _this.dndCount);
                var list = el.getElementsByTagName('*');
                for (var i = 0; i < list.length; i++) {
                    list[i].setAttribute('data-drag-child', true);
                }
                config.off = [
                    on(el, 'mousedown', (params.clone) ? function (e) { return _this.CreateClone(e); } : function (e) { return _this.Grab(e); }),
                    on(document.body, 'touchstart', function (e) { return _this.CheckTouchTarget(e); }),
                    on(document.body, 'touchend', function (e) { return _this.Drop(e); })
                ];
                _this.dndCount++;
            });
        };
        Dnd.prototype.removeDraggable = function () {
            var _this = this;
            return this.map(function (el) {
                var index = el.getAttribute('data-drag-id');
                var config = _this.configs[index];
                config.off.map(function (off) { return off(); });
                delete _this.configs[index];
                el.removeAttribute('data-drag-id');
            });
        };
        ;
        Dnd.prototype.option = function (key, val) {
            var _this = this;
            this.map(function (el) {
                var id = el.getAttribute('data-drag-id');
                _this.configs[id][key] = val;
            });
            return this;
        };
        ;
        Dnd.prototype.destroyElement = function () {
            var _this = this;
            return this.map(function (el) {
                var id = el.getAttribute('data-drag-id');
                if (id !== null) {
                    var data = _this.configs[id];
                    delete _this.configs[id];
                    if (data.dragElement !== data.originalElement && data.dragElement !== null) {
                        if (data.originalElement.parentNode)
                            data.originalElement.parentNode.removeChild(data.originalElement);
                        if (data.dragElement.parentNode)
                            data.dragElement.parentNode.removeChild(data.dragElement);
                    }
                    else {
                        if (data.originalElement.parentNode)
                            data.originalElement.parentNode.removeChild(data.originalElement);
                    }
                }
                else {
                    el.parentNode.removeChild(el);
                }
            });
        };
        Dnd.prototype.CheckTouchTarget = function (e) {
            var tgt = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            if ((tgt.hasAttribute('data-drag-id') || tgt.hasAttribute('data-drag-child')) && tgt.className.search('cloned-piece') == -1) {
                e.preventDefault();
                tgt = (tgt.getAttribute('data-drag-id') === null) ? this.findDraggableParent(tgt) : tgt;
                (this.configs[tgt.getAttribute('data-drag-id')].clone) ? this.CreateClone(e) : this.Grab(e);
            }
        };
        Dnd.prototype.CreateClone = function (e) {
            e.preventDefault();
            if (e.type == 'touchstart')
                e = e.touches[0];
            if (e.target.tagName == 'BUTTON')
                return true;
            var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? this.findDraggableParent(e.target) : e.target;
            if (eval(evtTarget.getAttribute('data-drag-disabled')))
                return false;
            this.currentData = this.configs[evtTarget.getAttribute('data-drag-id')];
            this.currentData.originalElement = evtTarget;
            this.currentData.originalElement.setAttribute('data-drag-disabled', "1");
            var clone = evtTarget.cloneNode(true);
            clone.className += (clone.className) ? " cloned-piece" : "cloned-piece";
            clone.style.position = 'absolute';
            this.currentData.parent.appendChild(clone);
            this.currentData.dragElement = clone;
            if (this.currentData.onStart) {
                this.currentData.onStart(e);
            }
            var bcr = evtTarget.getBoundingClientRect();
            var pos = { top: bcr.top / this.scale, left: bcr.left / this.scale };
            bcr = this.currentData.parent.getBoundingClientRect();
            pos.top -= bcr.top / this.scale;
            pos.left -= bcr.left / this.scale;
            if (this.currentData.centralize) {
                var cs = window.getComputedStyle(this.currentData.dragElement);
                var centerX = parseInt(cs.width) / 2;
                var centerY = parseInt(cs.height) / 2;
                this.currentData.grabPoint.x = pos.left + centerX;
                this.currentData.grabPoint.y = pos.top + centerY;
                centerX = -pos.left + ((e.clientX / this.scale) - centerX);
                centerY = -pos.top + ((e.clientY / this.scale) - centerY);
                this.setCSSTransform(clone, 'translate(' + centerX + 'px,' + centerY + 'px)');
            }
            clone.style.top = pos.top + 'px';
            clone.style.left = pos.left + 'px';
            clone.style.margin = '0px';
            evtTarget.style.opacity = 0;
            this.Grab(e, clone);
        };
        Dnd.prototype.Grab = function (e, target) {
            var _this = this;
            e.preventDefault();
            if (e.type == 'touchstart')
                e = e.touches[0];
            if (e.target.tagName == 'BUTTON')
                return true;
            var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? this.findDraggableParent(e.target) : e.target;
            var currentData = this.currentData = this.configs[evtTarget.getAttribute('data-drag-id')];
            currentData.originalCoords = { x: evtTarget.getBoundingClientRect().left, y: evtTarget.getBoundingClientRect().top };
            currentData.dragElement = target || evtTarget;
            currentData.dragElement.style.zIndex = "10000000";
            currentData.x = currentData.y = 0;
            if (!currentData.clone && currentData.onStart) {
                currentData.onStart(e);
            }
            currentData.grabPoint.x = currentData.grabPoint.x || e.clientX / this.scale;
            currentData.grabPoint.y = currentData.grabPoint.y || e.clientY / this.scale;
            this.off = [
                on(document, 'mouseup', function (e) { return _this.Drop(e); }),
                on(document, 'mousemove', function (e) { return _this.Drag(e); }),
                on(document.body, 'touchmove', function (e) { return _this.Drag(e); })
            ];
        };
        Dnd.prototype.Drag = function (e) {
            e.preventDefault();
            if (e.type == 'touchmove')
                e = e.changedTouches[0];
            var currentData = this.currentData;
            currentData.x = (e.clientX / this.scale) - currentData.grabPoint.x;
            currentData.y = (e.clientY / this.scale) - currentData.grabPoint.y;
            currentData.y += (currentData.y == 0) ? 0.001 : 0;
            this.setCSSTransform(currentData.dragElement, 'translate(' + currentData.x + 'px,' + currentData.y + 'px)');
            if (currentData.onDrag) {
                currentData.onDrag(e);
            }
        };
        Dnd.prototype.Drop = function (e) {
            var currentData = this.currentData;
            if (!currentData || !currentData.dragElement)
                return false;
            e.preventDefault();
            if (e.type == 'touchend')
                e = e.changedTouches[0];
            this.off.forEach(function (off) { return off(); });
            currentData.dragElement.style.display = 'none';
            currentData.dropTarget = document.elementFromPoint(e.clientX, e.clientY);
            currentData.dragElement.style.display = 'block';
            currentData.grabPoint = {};
            if (currentData.dropTarget == currentData.originalElement)
                currentData.dropTarget = currentData.originalElement.parentNode;
            if (currentData.onDrop) {
                if (currentData.onDrop(e)) {
                    currentData = null;
                    return;
                }
            }
            if (currentData.revert >= 0)
                this.RevertDrag(currentData);
            else
                this.PlaceDrag(currentData);
            currentData = null;
        };
        Dnd.prototype.RevertDrag = function (d, callback) {
            var _this = this;
            if (!d.dragElement || d.reverting)
                return false;
            d.reverting = true;
            d.revertCallback = callback;
            var time = d.revert / 20;
            var m = d.y / d.x;
            var tx = d.x / time;
            d.revertInterval = setInterval(function () {
                if (time <= 0) {
                    _this.setCSSTransform(d.dragElement, 'translate(0px,0px)');
                    clearInterval(d.revertInterval);
                    _this.TransitionEnd(d);
                    return;
                }
                time--;
                var cx = tx * time;
                var cy = cx * m;
                _this.setCSSTransform(d.dragElement, 'translate(' + cx + 'px, ' + cy + 'px)');
            }, 10);
        };
        Dnd.prototype.TransitionEnd = function (d) {
            if (d.clone) {
                d.dragElement.parentNode.removeChild(d.dragElement);
                d.dragElement = null;
                d.originalElement.style.opacity = 1;
                d.originalElement.removeAttribute('data-drag-disabled');
            }
            else {
                d.originalElement.style.removeProperty('z-index');
            }
            if (d.revertCallback)
                d.revertCallback();
            delete d.reverting;
        };
        ;
        Dnd.prototype.PlaceDrag = function (d, callback) {
            var _this = this;
            var newCoords = {
                x: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[0]) * this.scale : 0,
                y: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[1]) * this.scale : 0
            };
            var st = window.getComputedStyle(d.dropTarget, null);
            var stScale = st.getPropertyValue("-webkit-transform") ||
                st.getPropertyValue("-moz-transform") ||
                st.getPropertyValue("-ms-transform") ||
                st.getPropertyValue("-o-transform") ||
                st.getPropertyValue("transform");
            if (st.getPropertyValue('position') == 'static') {
                d.dropTarget.style.position = 'relative';
            }
            ;
            var tScale = (!stScale || stScale === 'none') ? 1 : parseFloat(stScale.split('(')[1].split(',')[0]);
            this.setCSSTransform(d.dragElement, 'translate(0px,0px)');
            d.dragElement.style.position = 'absolute';
            d.dragElement.style.margin = '0';
            d.dragElement.style.top = (((d.originalCoords.y + newCoords.y) - d.dropTarget.getBoundingClientRect().top) / tScale) / this.scale + 'px';
            d.dragElement.style.left = (((d.originalCoords.x + newCoords.x) - d.dropTarget.getBoundingClientRect().left) / tScale) / this.scale + 'px';
            d.dropTarget.appendChild(d.dragElement);
            if (d.clone) {
                on(d.dragElement, 'mousedown', function (e) { return _this.CreateClone(e); });
                d.dragElement.className = d.originalElement.className;
                d.originalElement.parentNode.removeChild(d.originalElement);
            }
            if (callback)
                callback();
        };
        ;
        Dnd.prototype.findDraggableParent = function (el) {
            while (el.getAttribute('data-drag-id') == null) {
                el = el.parentNode;
            }
            return el;
        };
        Dnd.prototype.setCSSTransform = function (el, val) {
            if (!el)
                return false;
            el.style.transform = val;
            el.style.webkitTransform = val;
            el.style.mozTransform = val;
            el.style.msTransform = val;
            el.style.oTransform = val;
        };
        Dnd.get = function (selector) {
            var els;
            if (typeof selector === 'string')
                els = document.querySelectorAll(selector);
            else if (selector.length)
                els = selector;
            else
                els = [selector];
            return new Dnd(els);
        };
        Dnd.prototype.setScale = function (val) {
            this.scale = val;
        };
        Dnd.prototype.revertDrag = function (data, cb) {
            this.RevertDrag(data, cb);
        };
        Dnd.prototype.placeDrag = function (data, cb) {
            this.PlaceDrag(data, cb);
        };
        Dnd.prototype.getParentScale = function (el) {
            var st = window.getComputedStyle(el.parentNode, null);
            var tr = st.getPropertyValue("-webkit-transform") ||
                st.getPropertyValue("-moz-transform") ||
                st.getPropertyValue("-ms-transform") ||
                st.getPropertyValue("-o-transform") ||
                st.getPropertyValue("transform") ||
                'none';
            return (tr == 'none') ? 1 : parseFloat(tr.split('(')[1].split(',')[0]);
        };
        return Dnd;
    }());
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Dnd;
});
