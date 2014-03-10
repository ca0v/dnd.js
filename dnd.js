/** DND Version 1.0
Developed by: André H. Oliva
Copyright 2014
*/

window.dnd = (function () {		
	var currentData;
	var scale = 1;
	var configs = {};
	var dndCount = 0;
	
	//----------------------------------------------------------------------------DND library constructor
    function DND (els) {
        for(var i = 0; i < els.length; i++ ) {
            this[i] = els[i];
        }
        this.length = els.length;
    };
	
	//----------------------------------------------------------------------------Calls callback to all selected elements
	DND.prototype.map = function (callback) {
		var results = [], i = 0;
		for ( ; i < this.length; i++) {
			results.push(callback.call(this, this[i], i));
		}
		return results;
	};
	
	DND.prototype.forEach = function(callback) {
		this.map(callback);
		return this;
	};
    
	//----------------------------------------------------------------------------DND methods
	DND.prototype.initDraggable = function(params) {
		params = params || {};
		return this.map(function(el){
			configs[dndCount] = {
				onStart: 			(typeof(params.onStart) !== 'undefined') ? params.onStart : null,
				onDrag: 			(typeof(params.onDrag) !== 'undefined') ? params.onDrag : null,
				onDrop: 			(typeof(params.onDrop) !== 'undefined') ? params.onDrop : null,
				parent: 			(typeof(params.parent) !== 'undefined') ? params.parent : document.body,
				centralize: 		(typeof(params.centralize) !== 'undefined') ? params.centralize : false,
				clone: 				(typeof(params.clone) !== 'undefined') ? params.clone : false,
				revert: 			(typeof(params.revert) !== 'undefined') ? params.revert : -1,		
				originalElement:	el,
				originalCoords: 	{ x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().top },
				grabPoint: 			{ x: 0, y: 0 },
				dragElement: 		null,
				dropTarget: 		null
			};
			
			if(params.onCreate) params.onCreate();
			
			el.setAttribute('data-drag-id', dndCount);
			el.addEventListener('mousedown', (params.clone) ? CreateClone : Grab);
			el.addEventListener('touchstart', (params.clone) ? CreateClone : Grab);
			el.addEventListener('touchend', Drop);
			
			dndCount++;
		});		
	};
	
	DND.prototype.removeDraggable = function() {
		return this.map(function(el){
			el.removeEventListener('mousedown', CreateClone);
			el.removeEventListener('touchstart', CreateClone);
			el.removeEventListener('mousedown', Grab);
			el.removeEventListener('touchstart', Grab);
			el.removeEventListener('touchend', Drop);
			delete configs[el.getAttribute('data-drag-id')];
			el.removeAttribute('data-drag-id');
		});
	};
	
	DND.prototype.option = function(key, val) {
		this.map(function(el){
			var id = el.getAttribute('data-drag-id');
			configs[id][key] = val;
		})
		return this;
	};
	
	DND.prototype.destroyElement = function() {
		return this.map(function(el){
			var id = el.getAttribute('data-drag-id');
			if (id !== null){
				var data = configs[id];
				delete configs[id];
				
				if (data.dragElement !== data.originalElement && data.dragElement !== null){
					if(data.originalElement.parentNode) data.originalElement.parentNode.removeChild(data.originalElement);
					if(data.dragElement.parentNode) data.dragElement.parentNode.removeChild(data.dragElement);
				} else {
					if(data.originalElement.parentNode) data.originalElement.parentNode.removeChild(data.originalElement);		
				}
			} else {
				el.parentNode.removeChild(el);
			}
		});
	}
	
	//----------------------------------------------------------------------------Drag'n'drop control functions
	function CreateClone(e){
		e.preventDefault();
		if (e.type == 'touchstart') e = e.touches[0];
		
		currentData = configs[e.target.getAttribute('data-drag-id')];
		currentData.originalElement = e.target;
		
		var pos = (currentData.centralize) ? 
			{ top: (e.clientY/scale) - (parseInt(window.getComputedStyle(e.target).height)/2), left: (e.clientX/scale) - (parseInt(window.getComputedStyle(e.target).width)/2) } : 
			{ top: e.target.getBoundingClientRect().top, left: e.target.getBoundingClientRect().left } ;
		
		var clone = e.target.cloneNode(true);	
		clone.className += (clone.className) ? " cloned-piece" : "cloned-piece";
		clone.style.position = 'absolute';
		clone.style.top = pos.top + 'px';
		clone.style.left = pos.left + 'px';
		clone.style.margin = '0px';
		setCSSTransform(clone, 'translate(0px,0px)');
		
		currentData.parent.appendChild(clone);		
		e.target.style.opacity = 0;		
		
		Grab(e, clone);
	};
	
	function Grab(e, target){
		if (e.type == 'touchstart'){
			e.preventDefault();
			e = e.touches[0];
		}		
		currentData = configs[e.target.getAttribute('data-drag-id')];		
		currentData.originalCoords = { x: e.target.getBoundingClientRect().left, y: e.target.getBoundingClientRect().top };
		currentData.dragElement = target || e.target;
		
		if(currentData.onStart) {
			currentData.onStart(e);
		}
		
		currentData.grabPoint.x = e.clientX / scale;
		currentData.grabPoint.y = e.clientY / scale;		
		
		document.addEventListener('mouseup', Drop);
		document.addEventListener('mousemove', Drag);
		document.addEventListener('touchmove', Drag);
	};
	
	function Drag(e){
		e.preventDefault();
		if (e.type == 'touchmove') e = e.changedTouches[0];
		
		var newX = (e.clientX / scale) - currentData.grabPoint.x;
		var newY = (e.clientY / scale) - currentData.grabPoint.y;
		setCSSTransform(currentData.dragElement, 'translate(' + newX + 'px,' + newY + 'px)');	
		
		if(currentData.onDrag) {
			currentData.onDrag(e);
		}
	};
	
	function Drop(e){
		e.preventDefault();
		if (e.type == 'touchend') e = e.changedTouches[0];
		
		document.removeEventListener('mousemove', Drag);
		document.removeEventListener('touchmove', Drag);
		document.removeEventListener('mouseup', Drop);
		currentData.originalElement.removeEventListener('touchend', Drop);
		
		currentData.dragElement.style.display = 'none';
		currentData.dropTarget = document.elementFromPoint(e.clientX, e.clientY);
		currentData.dragElement.style.display = 'block';
		currentData.grabPoint = { x : 0, y : 0 };
		
		if (currentData.dropTarget == currentData.originalElement)
			currentData.dropTarget = currentData.originalElement.parentNode;
		
		if(currentData.onDrop){
			if(currentData.onDrop(e)) return;
		}	
		
		if (currentData.revert >= 0) RevertDrag(currentData);
		else PlaceDrag(currentData);
	};
	
	//----------------------------------------------------------------------------Revert draggable to initial point
	function RevertDrag(d, callback){
		d.dragElement.style.top = d.originalCoords.y / scale + 'px';
		d.dragElement.style.left = d.originalCoords.x / scale + 'px';
		
		if (d.revert > 0){
			var str = (d.revert/1000) + "s";
			setCSSTransition(d.dragElement, str);		
			setTimeout(function(){setCSSTransform(d.dragElement, 'translate(0px,0px)')}, 1);
			
			d.revertCallback = callback;
			d.dragElement.addEventListener('transitionend', TransitionEnd);
			d.dragElement.addEventListener('webkitTransitionEnd', TransitionEnd);
			d.dragElement.addEventListener('oTransitionEnd', TransitionEnd);
		} else {		
			setCSSTransform(d.dragElement, 'translate(0px,0px)');
			TransitionEnd({target: d.dragElement});
		}
	};	
	function TransitionEnd(e){
		e.target.removeEventListener('transitionend', TransitionEnd);
		e.target.removeEventListener('webkitTransitionEnd', TransitionEnd);
		e.target.removeEventListener('oTransitionEnd', TransitionEnd);
		
		var d = configs[e.target.getAttribute('data-drag-id')];			
		if (d.clone){
			d.originalElement.style.opacity = 1;
			d.dragElement.parentNode.removeChild(d.dragElement);
		} else {
			setCSSTransition(d.dragElement, 'none');	
		}
		
		if(d.revertCallback) d.revertCallback();
		d.dragElement = null;
	};
	
	//-------------------------------------------------------------------------Place draggable at the drop point
	function PlaceDrag(d, callback){
		var newCoords = {		
			x: parseInt(d.dragElement.style.transform.split('(').pop().split(',')[0]) * scale,
			y: parseInt(d.dragElement.style.transform.split('(').pop().split(',')[1]) * scale
		}
		
		var st = window.getComputedStyle(d.dropTarget, null);
		var tScale = st.getPropertyValue("-webkit-transform") ||
				st.getPropertyValue("-moz-transform") ||
				st.getPropertyValue("-ms-transform") ||
				st.getPropertyValue("-o-transform") ||
				st.getPropertyValue("transform") ||
				1;
		
		if(st.getPropertyValue('position') == 'static'){
			d.dropTarget.style.position = 'relative';
		};
		
		if(tScale == 'none') tScale = 1;
		else tScale = parseFloat(tScale.split('(')[1].split(',')[0]);
		
		setCSSTransform(d.dragElement, 'translate(0px,0px)');
		d.dragElement.style.position = 'absolute';
		d.dragElement.style.margin = '0';		
		d.dragElement.style.top = (( (d.originalCoords.y + newCoords.y) - d.dropTarget.getBoundingClientRect().top) / tScale) / scale + 'px';
		d.dragElement.style.left = (( (d.originalCoords.x + newCoords.x) - d.dropTarget.getBoundingClientRect().left) / tScale) / scale + 'px';
		
		d.dropTarget.appendChild(d.dragElement);
		
		if(d.clone){
			d.dragElement.addEventListener('mousedown', CreateClone);
			d.dragElement.addEventListener('touchstart', CreateClone);
			d.dragElement.addEventListener('touchend', Drop);
			d.dragElement.className = d.originalElement.className;
			d.originalElement.parentNode.removeChild(d.originalElement);
		}
		
		if(callback) callback();
	};
	
	//----------------------------------------------------------------------------Style setting helpers
	function setCSSTransform(el, val) {
		el.style.transform = val;
		el.style.webkitTransform = val;
		el.style.mozTransform = val;
		el.style.msTransform = val;
		el.style.oTransform = val;
	};	
	function setCSSTransition(el, val) {
		el.style.transition = val;
		el.style.webkitTransition = val;
		el.style.mozTransition = val;
		el.style.msTransition = val;
		el.style.oTransition = val;
	};
	
	//----------------------------------------------------------------------------Library object
    var dnd = {
		get: function (selector) {
			var els;
			if (typeof selector === 'string') els = document.querySelectorAll(selector);
			else if (selector.length) els = selector;
			else els = [selector];			
			return new DND(els);
		},
		setScale: function(val) {
			scale = val;
		},
		revertDrag: function(data, cb) {
			RevertDrag(data, cb);
		},
		placeDrag: function(data, cb) {
			PlaceDrag(data, cb);
		},
		getParentScale: function(el) {
			var st = window.getComputedStyle(el.parentNode, null);
			var tr = st.getPropertyValue("-webkit-transform") ||
					st.getPropertyValue("-moz-transform") ||
					st.getPropertyValue("-ms-transform") ||
					st.getPropertyValue("-o-transform") ||
					st.getPropertyValue("transform") ||
					'none';
			return (tr == 'none') ? 1 : parseFloat(tr.split('(')[1].split(',')[0]);
		}
	};
    return dnd;
}());