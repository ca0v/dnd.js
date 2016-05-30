/** DND Version 1.0
Developed by: André H. Oliva
Copyright 2014
*/

interface IPoint {
	x?: number;
	y?: number;
}

interface IConfig extends IPoint {
	onStart: Function;
	onDrag: Function;
	onDrop: Function;
	parent: HTMLElement;
	centralize: boolean;
	clone: boolean;
	revert: number;
	originalCoords: IPoint;
	originalElement: HTMLElement;
	dragElement: HTMLElement;
	dropTarget: HTMLElement;
	grabPoint: IPoint;
	off: Array<Function>;
}

function on(element: Document | HTMLElement, event: string, cb: (ev: UIEvent) => any) {
	element.addEventListener(event, cb);
	return () => element.removeEventListener(event, cb);
}

export default class Dnd {
	public currentData: IConfig;
	public scale = 1;
	public configs: Array<IConfig> = [];
	public dndCount = 0;
	public length: number;
	private off: Array<Function>;

	constructor(els) {
		for (var i = 0; i < els.length; i++) {
			this[i] = els[i];
		}
		this.length = els.length;
	}

	map(callback) {
		var results = [], i = 0;
		for (; i < this.length; i++) {
			results.push(callback.call(this, this[i], i));
		}
		return results;
	}

	forEach(callback) {
		this.map(callback);
		return this;
	}

	initDraggable(params) {
		params = params || {};
		return this.map(el => {
			let config = this.configs[this.dndCount] = {
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

			if (params.onCreate) params.onCreate();

			el.setAttribute('data-drag-id', this.dndCount);
			var list = el.getElementsByTagName('*');
			for (var i = 0; i < list.length; i++) {
				list[i].setAttribute('data-drag-child', true);
			}

			config.off = [
				on(el, 'mousedown', (params.clone) ? e => this.CreateClone(e) : e => this.Grab(e)),
				on(document.body, 'touchstart', e => this.CheckTouchTarget(e)),
				on(document.body, 'touchend', e => this.Drop(e))
			];

			this.dndCount++;
		});
	}

	removeDraggable() {
		return this.map(el => {
			let index = <number>el.getAttribute('data-drag-id');
			let config = this.configs[index];
			config.off.map(off => off());
			delete this.configs[index];
			el.removeAttribute('data-drag-id');
		});
	};

	option(key, val) {
		this.map(el => {
			var id = el.getAttribute('data-drag-id');
			this.configs[id][key] = val;
		})
		return this;
	};

	destroyElement() {
		return this.map(el => {
			var id = el.getAttribute('data-drag-id');
			if (id !== null) {
				var data = this.configs[id];
				delete this.configs[id];

				if (data.dragElement !== data.originalElement && data.dragElement !== null) {
					if (data.originalElement.parentNode) data.originalElement.parentNode.removeChild(data.originalElement);
					if (data.dragElement.parentNode) data.dragElement.parentNode.removeChild(data.dragElement);
				} else {
					if (data.originalElement.parentNode) data.originalElement.parentNode.removeChild(data.originalElement);
				}
			} else {
				el.parentNode.removeChild(el);
			}
		});
	}

	CheckTouchTarget(e) {
		var tgt = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
		if ((tgt.hasAttribute('data-drag-id') || tgt.hasAttribute('data-drag-child')) && tgt.className.search('cloned-piece') == -1) {
			e.preventDefault();
			tgt = (tgt.getAttribute('data-drag-id') === null) ? this.findDraggableParent(tgt) : tgt;
			(this.configs[tgt.getAttribute('data-drag-id')].clone) ? this.CreateClone(e) : this.Grab(e);
		}
	}

	CreateClone(e) {
		e.preventDefault();
		if (e.type == 'touchstart') e = e.touches[0];
		if (e.target.tagName == 'BUTTON') return true;

		var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? this.findDraggableParent(e.target) : e.target;
		if (eval(evtTarget.getAttribute('data-drag-disabled'))) return false;

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

			centerX = - pos.left + ((e.clientX / this.scale) - centerX);
			centerY = - pos.top + ((e.clientY / this.scale) - centerY);
			this.setCSSTransform(clone, 'translate(' + centerX + 'px,' + centerY + 'px)');
		}

		clone.style.top = pos.top + 'px';
		clone.style.left = pos.left + 'px';
		clone.style.margin = '0px';

		evtTarget.style.opacity = 0;
		this.Grab(e, clone);
	}

	Grab(e, target?: HTMLElement) {
		e.preventDefault();
		if (e.type == 'touchstart') e = e.touches[0];
		if (e.target.tagName == 'BUTTON') return true;

		var evtTarget = (e.target.getAttribute('data-drag-id') == null) ? this.findDraggableParent(e.target) : e.target;

		let currentData = this.currentData = this.configs[evtTarget.getAttribute('data-drag-id')];
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
			on(document, 'mouseup', e => this.Drop(e)),
			on(document, 'mousemove', e => this.Drag(e)),
			on(document.body, 'touchmove', e => this.Drag(e))
		];
	}

	Drag(e) {
		e.preventDefault();
		if (e.type == 'touchmove') e = e.changedTouches[0];

		let currentData = this.currentData;
		currentData.x = (e.clientX / this.scale) - currentData.grabPoint.x;
		currentData.y = (e.clientY / this.scale) - currentData.grabPoint.y;
		currentData.y += (currentData.y == 0) ? 0.001 : 0;

		this.setCSSTransform(currentData.dragElement, 'translate(' + currentData.x + 'px,' + currentData.y + 'px)');

		if (currentData.onDrag) {
			currentData.onDrag(e);
		}
	}

	Drop(e) {
		let currentData = this.currentData;

		if (!currentData || !currentData.dragElement) return false;
		e.preventDefault();
		if (e.type == 'touchend') e = e.changedTouches[0];

		this.off.forEach(off => off());

		currentData.dragElement.style.display = 'none';
		currentData.dropTarget = <HTMLElement>document.elementFromPoint(e.clientX, e.clientY);
		currentData.dragElement.style.display = 'block';
		currentData.grabPoint = {};

		if (currentData.dropTarget == currentData.originalElement)
			currentData.dropTarget = <HTMLElement>currentData.originalElement.parentNode;

		if (currentData.onDrop) {
			if (currentData.onDrop(e)) {
				currentData = null;
				return;
			}
		}

		if (currentData.revert >= 0) this.RevertDrag(currentData);
		else this.PlaceDrag(currentData);

		currentData = null;
	}

	RevertDrag(d, callback?) {
		if (!d.dragElement || d.reverting) return false
		d.reverting = true;
		d.revertCallback = callback;

		var time = d.revert / 20;
		var m = d.y / d.x;
		var tx = d.x / time;

		d.revertInterval = setInterval(() => {
			if (time <= 0) {
				this.setCSSTransform(d.dragElement, 'translate(0px,0px)');
				clearInterval(d.revertInterval);
				this.TransitionEnd(d);
				return
			}

			time--;
			var cx = tx * time;
			var cy = cx * m;
			this.setCSSTransform(d.dragElement, 'translate(' + cx + 'px, ' + cy + 'px)');
		}, 10);
	}

	TransitionEnd(d) {
		if (d.clone) {
			d.dragElement.parentNode.removeChild(d.dragElement);
			d.dragElement = null;
			d.originalElement.style.opacity = 1;
			d.originalElement.removeAttribute('data-drag-disabled');
		} else {
			d.originalElement.style.removeProperty('z-index');
		}
		if (d.revertCallback) d.revertCallback();
		delete d.reverting
	};

	PlaceDrag(d, callback?) {
		var newCoords = {
			x: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[0]) * this.scale : 0,
			y: (d.dragElement.style.transform) ? parseInt(d.dragElement.style.transform.split('(').pop().split(',')[1]) * this.scale : 0
		}

		var st = window.getComputedStyle(d.dropTarget, null);
		let stScale = st.getPropertyValue("-webkit-transform") ||
			st.getPropertyValue("-moz-transform") ||
			st.getPropertyValue("-ms-transform") ||
			st.getPropertyValue("-o-transform") ||
			st.getPropertyValue("transform");

		if (st.getPropertyValue('position') == 'static') {
			d.dropTarget.style.position = 'relative';
		};

		let tScale = (!stScale || stScale === 'none') ? 1 : parseFloat(stScale.split('(')[1].split(',')[0]);

		this.setCSSTransform(d.dragElement, 'translate(0px,0px)');
		d.dragElement.style.position = 'absolute';
		d.dragElement.style.margin = '0';
		d.dragElement.style.top = (((d.originalCoords.y + newCoords.y) - d.dropTarget.getBoundingClientRect().top) / tScale) / this.scale + 'px';
		d.dragElement.style.left = (((d.originalCoords.x + newCoords.x) - d.dropTarget.getBoundingClientRect().left) / tScale) / this.scale + 'px';

		d.dropTarget.appendChild(d.dragElement);

		if (d.clone) {
			on(d.dragElement, 'mousedown', (e) => this.CreateClone(e));
			d.dragElement.className = d.originalElement.className;
			d.originalElement.parentNode.removeChild(d.originalElement);
		}

		if (callback) callback();
	};

	findDraggableParent(el) {
		while (el.getAttribute('data-drag-id') == null) {
			el = el.parentNode;
		}
		return el
	}

	setCSSTransform(el, val) {
		if (!el) return false;
		el.style.transform = val;
		el.style.webkitTransform = val;
		el.style.mozTransform = val;
		el.style.msTransform = val;
		el.style.oTransform = val;
	}

	static get(selector: string) {
		var els;
		if (typeof selector === 'string') els = document.querySelectorAll(selector);
		else if (selector.length) els = selector;
		else els = [selector];
		return new Dnd(els);
	}

	setScale(val) {
		this.scale = val;
	}

	revertDrag(data, cb) {
		this.RevertDrag(data, cb);
	}

	placeDrag(data, cb) {
		this.PlaceDrag(data, cb);
	}

	getParentScale(el) {
		var st = window.getComputedStyle(el.parentNode, null);
		var tr = st.getPropertyValue("-webkit-transform") ||
			st.getPropertyValue("-moz-transform") ||
			st.getPropertyValue("-ms-transform") ||
			st.getPropertyValue("-o-transform") ||
			st.getPropertyValue("transform") ||
			'none';
		return (tr == 'none') ? 1 : parseFloat(tr.split('(')[1].split(',')[0]);
	}
}
