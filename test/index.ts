import Dnd from "../dnd";

Dnd.get('.drag-starters').initDraggable({
				clone: true,
				centralize: true,
				revert: 500,
				onCreate: function () { },
				onStart: function (evt) { },
				onDrag: function (evt) { },
				onDrop: function (evt) { }
});
