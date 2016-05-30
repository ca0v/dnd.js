define(["require", "exports", "../dnd"], function (require, exports, dnd_1) {
    "use strict";
    dnd_1.default.get('.drag-starters').initDraggable({
        clone: true,
        centralize: true,
        revert: 500,
        onCreate: function () { },
        onStart: function (evt) { },
        onDrag: function (evt) { },
        onDrop: function (evt) { }
    });
});
