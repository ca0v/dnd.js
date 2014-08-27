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
				originalCoords: 	{ },
				grabPoint: 			{ },
				dragElement: 		null,
				dropTarget: 		null
			};
			
			if(params.onCreate) params.onCreate();
			
			el.setAttribute('data-drag-id', dndCount);
			el.addEventListener('mousedown', (params.clone) ? CreateClone : Grab);
			document.body.addEventListener('touchstart', CheckTouchTarget);
			document.body.addEventListener('touchend', Drop);
			
			dndCount++;
		});		
	};
	
	DND.prototype.removeDraggable = function() {
		return this.map(function(el){
			el.removeEventListener('mousedown', CreateClone);
			el.removeEventListener('mousedown', Grab);
			document.body.removeEventListener('touchstart', CheckTouchTarget);
			document.body.removeEventListener('touchend', Drop);
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

	//----------------------------------------------------------------------------Touch functions
	function CheckTouchTarget(e){
		var tgt = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
		if (tgt.hasAttribute('data-drag-id') && tgt.className.search('cloned-piece') == -1){
			e.preventDefault();			
			(configs[tgt.getAttribute('data-drag-id')].clone) ? CreateClone(e) : Grab(e);
		}
	}
	
	//----------------------------------------------------------------------------Drag'n'drop control functions
	function CreateClone(e){
		e.preventDefault();
		if (e.type == 'touchstart') e = e.touches[0];		
		var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? findDraggableParent(e.target) : e.target;			
		if (eval(evtTarget.getAttribute('data-drag-disabled'))) return false;

		currentData = configs[evtTarget.getAttribute('data-drag-id')];
		currentData.originalElement = evtTarget;
		currentData.originalElement.setAttribute('data-drag-disabled', true);
		
		var clone = evtTarget.cloneNode(true);	
		clone.className += (clone.className) ? " cloned-piece" : "cloned-piece";
		clone.style.position = 'absolute';
		currentData.parent.appendChild(clone);
		currentData.dragElement = clone;
		
		if(currentData.onStart) {
			currentData.onStart(e);
		}
		
		var bcr = evtTarget.getBoundingClientRect();
		var pos = { top: bcr.top/scale, left: bcr.left/scale };		
		bcr = currentData.parent.getBoundingClientRect();
		pos.top -= bcr.top/scale;
		pos.left -= bcr.left/scale;

		if (currentData.centralize){
			var cs = window.getComputedStyle(currentData.dragElement);
			var centerX = parseInt(cs.width)/2;
			var centerY = parseInt(cs.height)/2;

			currentData.grabPoint.x = pos.left + centerX;
			currentData.grabPoint.y = pos.top + centerY;

			centerX = - pos.left + ((e.clientX/scale) - centerX);
			centerY = - pos.top + ((e.clientY/scale) - centerY);
			setCSSTransform(clone, 'translate(' + centerX + 'px,' + centerY + 'px)');
		}

		clone.style.top = pos.top + 'px';
		clone.style.left = pos.left + 'px';
		clone.style.margin = '0px';
		clone.style.zIndex = 10000000;
		
		evtTarget.style.opacity = 0;		
		Grab(e, clone);
	};
	
	function Grab(e, target){		
		if (e.type == 'touchstart'){
			e.preventDefault();
			e = e.touches[0];
		} 
		var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? findDraggableParent(e.target) : e.target;
		
		currentData = configs[evtTarget.getAttribute('data-drag-id')];		
		currentData.originalCoords = { x: evtTarget.getBoundingClientRect().left, y: evtTarget.getBoundingClientRect().top };
		currentData.dragElement = target || evtTarget;

		currentData.x = currentData.y = 0;
				
		if(!currentData.clone && currentData.onStart) {
			currentData.onStart(e);
		}
		
		currentData.grabPoint.x = currentData.grabPoint.x || e.clientX / scale;
		currentData.grabPoint.y = currentData.grabPoint.y || e.clientY / scale;
		
		document.addEventListener('mouseup', Drop);
		document.addEventListener('mousemove', Drag);
		document.body.addEventListener('touchmove', Drag);
	};
	
	function Drag(e){
		e.preventDefault();
		if (e.type == 'touchmove') e = e.changedTouches[0];
		
		currentData.x = (e.clientX / scale) - currentData.grabPoint.x;
		currentData.y = (e.clientY / scale) - currentData.grabPoint.y;
		currentData.y += (currentData.y == 0) ? 0.001 : 0;
		
		setCSSTransform(currentData.dragElement, 'translate(' + currentData.x + 'px,' + currentData.y + 'px)');	
		
		if(currentData.onDrag) {
			currentData.onDrag(e);
		}
	};
	
	function Drop(e){
		if(!currentData || !currentData.dragElement) return false;
		e.preventDefault();
		if (e.type == 'touchend') e = e.changedTouches[0];
		
		document.removeEventListener('mousemove', Drag);
		document.removeEventListener('mouseup', Drop);
		document.body.removeEventListener('touchmove', Drag);
		
		currentData.dragElement.style.display = 'none';
		currentData.dropTarget = document.elementFromPoint(e.clientX, e.clientY);
		currentData.dragElement.style.display = 'block';
		currentData.grabPoint = { };
		
		if (currentData.dropTarget == currentData.originalElement)
			currentData.dropTarget = currentData.originalElement.parentNode;
		
		if(currentData.onDrop){
			if(currentData.onDrop(e)){
				currentData = null;
				return;
			}
		}	
		
		if (currentData.revert >= 0) RevertDrag(currentData);
		else PlaceDrag(currentData);

		currentData = null;
	};
	
	//----------------------------------------------------------------------------Revert draggable to initial point
	function RevertDrag(d, callback){
		if (!d.dragElement || d.reverting) return false
		d.reverting = true;
		d.revertCallback = callback;

		var time = d.revert / 20;
		var m = d.y / d.x;
		var tx = d.x / time;

		d.revertInterval = setInterval(function(){
			if (time == 0){
				setCSSTransform(d.dragElement, 'translate(0px,0px)');		
				clearInterval(d.revertInterval);
				TransitionEnd(d);
				return
			}

			time --;
			var cx = tx * time;
			var cy = cx * m;
			setCSSTransform(d.dragElement, 'translate('+ cx +'px, '+ cy +'px)');
		}, 10);
	};	
	function TransitionEnd(d){
		if (d.clone){
			d.dragElement.parentNode.removeChild(d.dragElement);
			d.dragElement = null;
			d.originalElement.style.opacity = 1;
			d.originalElement.removeAttribute('data-drag-disabled');
		}		
		if(d.revertCallback) d.revertCallback();
		delete d.reverting
	};
	
	//-------------------------------------------------------------------------Place draggable at the drop point
	function PlaceDrag(d, callback){
		var newCoords = {		
			x: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[0]) * scale : 0,
			y: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[1]) * scale : 0
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
			d.dragElement.className = d.originalElement.className;
			d.originalElement.parentNode.removeChild(d.originalElement);
		}
		
		if(callback) callback();
	};
	
	//----------------------------------------------------------------------------Finding closest parent who is a valid draggable
	function findDraggableParent(el) {
		while (el.getAttribute('data-drag-id') == null){
			el = el.parentNode;
		}
		return el
	}
	
	//----------------------------------------------------------------------------Style setting helpers
	function setCSSTransform(el, val) {
		if (!el) return false;
		el.style.transform = val;
		el.style.webkitTransform = val;
		el.style.mozTransform = val;
		el.style.msTransform = val;
		el.style.oTransform = val;
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