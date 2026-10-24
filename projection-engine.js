
/*
  DraftMate Projection Engine
  Version 2.0.0

  Coordinate convention:
    X = horizontal
    Y = depth (positive toward the viewer in TV)
    Z = height

  Front View: X-Z
  Top View:   X-Y
  Side View:  Y-Z

  This engine calculates orthographic projection coordinates.
  It does not yet classify visible/hidden edges or solve
  engineering construction sequences automatically.
*/

(function (global) {
  "use strict";

  function validateModel(model) {
    if (
      !model ||
      !Array.isArray(model.vertices) ||
      !Array.isArray(model.edges)
    ) {
      throw new Error(
        "Invalid model: vertices and edges are required."
      );
    }

    model.vertices.forEach(function (p, index) {
      if (
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !Number.isFinite(p.z)
      ) {
        throw new Error(
          "Invalid 3D vertex at index " + index + "."
        );
      }
    });

    model.edges.forEach(function (edge) {
      if (
        !Array.isArray(edge) ||
        edge.length !== 2 ||
        !Number.isInteger(edge[0]) ||
        !Number.isInteger(edge[1]) ||
        edge[0] < 0 ||
        edge[1] < 0 ||
        edge[0] >= model.vertices.length ||
        edge[1] >= model.vertices.length ||
        edge[0] === edge[1]
      ) {
        throw new Error("Invalid edge in model.");
      }
    });
  }

  function validateView(view) {
    if (
      !view ||
      !Array.isArray(view.points) ||
      !Array.isArray(view.edges)
    ) {
      throw new Error(
        "Invalid projection view: points and edges are required."
      );
    }

    view.points.forEach(function (p, index) {
      if (
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y)
      ) {
        throw new Error(
          "Invalid 2D projection point at index " + index + "."
        );
      }
    });
  }

  function bounds(points) {
    if (!points.length) {
      return {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        width: 0,
        height: 0
      };
    }

    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    points.forEach(function (p) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    return {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  function projectPoints(model, axes) {
    return model.vertices.map(function (p) {
      return {
        x: p[axes[0]],
        y: p[axes[1]]
      };
    });
  }

  function projectEdges(model, points) {
    return model.edges.map(function (edge) {
      return {
        fromIndex: edge[0],
        toIndex: edge[1],
        from: points[edge[0]],
        to: points[edge[1]]
      };
    });
  }

  function makeView(name, model, axes) {
    var points = projectPoints(model, axes);

    return {
      name: name,
      points: points,
      edges: projectEdges(model, points),
      bounds: bounds(points)
    };
  }

  function createProjection(model) {
    validateModel(model);

    return {
      front: makeView(
        "Front View (FV)",
        model,
        ["x", "z"]
      ),

      top: makeView(
        "Top View (TV)",
        model,
        ["x", "y"]
      ),

      side: makeView(
        "Side View",
        model,
        ["y", "z"]
      )
    };
  }

  /*
    Fit a projection into a 2D canvas.

    The returned y-coordinates are screen coordinates,
    so increasing screen y goes downward.

    Optional padding defaults to 24.
  */
  function fitToCanvas(view, width, height, padding) {
    validateView(view);

    width = width === undefined ? 320 : width;
    height = height === undefined ? 220 : height;
    padding = padding === undefined ? 24 : padding;

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(padding) ||
      width <= 0 ||
      height <= 0 ||
      padding < 0 ||
      width <= padding * 2 ||
      height <= padding * 2
    ) {
      throw new Error("Invalid canvas dimensions or padding.");
    }

    var b = bounds(view.points);
    var usableWidth = width - padding * 2;
    var usableHeight = height - padding * 2;

    /*
      Handle a point, a horizontal line, and a vertical line
      without producing Infinity or NaN.
    */
    var scaleX = b.width > 0
      ? usableWidth / b.width
      : Infinity;

    var scaleY = b.height > 0
      ? usableHeight / b.height
      : Infinity;

    var scale = Math.min(scaleX, scaleY);

    if (!Number.isFinite(scale)) {
      scale = Number.isFinite(scaleX)
        ? scaleX
        : Number.isFinite(scaleY)
          ? scaleY
          : 1;
    }

    var drawnWidth = b.width * scale;
    var drawnHeight = b.height * scale;

    var offsetX = (width - drawnWidth) / 2;
    var offsetY = (height - drawnHeight) / 2;

    var points = view.points.map(function (p) {
      return {
        x: offsetX + (p.x - b.minX) * scale,
        y: height - offsetY - (p.y - b.minY) * scale
      };
    });

    return {
      name: view.name,
      width: width,
      height: height,
      scale: scale,
      points: points,
      edges: projectEdges(
        {
          edges: view.edges.map(function (edge) {
            return [edge.fromIndex, edge.toIndex];
          })
        },
        points
      ),
      bounds: bounds(points)
    };
  }

  /*
    Translate a 3D model without changing its shape.
    Positive X, Y and Z move along their named axes.
  */
  function translate(model, offset) {
    validateModel(model);

    offset = offset || {};

    var dx = offset.x === undefined ? 0 : offset.x;
    var dy = offset.y === undefined ? 0 : offset.y;
    var dz = offset.z === undefined ? 0 : offset.z;

    if (
      !Number.isFinite(dx) ||
      !Number.isFinite(dy) ||
      !Number.isFinite(dz)
    ) {
      throw new Error("Translation values must be finite numbers.");
    }

    return {
      vertices: model.vertices.map(function (p) {
        return {
          x: p.x + dx,
          y: p.y + dy,
          z: p.z + dz
        };
      }),
      edges: model.edges.map(function (edge) {
        return edge.slice();
      })
    };
  }

  /*
    Rotate a model about the global origin.

    Angles are in degrees. Rotation order: X, then Y, then Z.
    This is a general geometric transform, NOT a complete
    engineering-graphics resting-edge inclination algorithm.
  */
  function rotate(model, angles) {
    validateModel(model);

    angles = angles || {};

    var ax = angles.x === undefined ? 0 : angles.x;
    var ay = angles.y === undefined ? 0 : angles.y;
    var az = angles.z === undefined ? 0 : angles.z;

    if (
      !Number.isFinite(ax) ||
      !Number.isFinite(ay) ||
      !Number.isFinite(az)
    ) {
      throw new Error("Rotation angles must be finite numbers.");
    }

    var rx = ax * Math.PI / 180;
    var ry = ay * Math.PI / 180;
    var rz = az * Math.PI / 180;

    var cx = Math.cos(rx);
    var sx = Math.sin(rx);
    var cy = Math.cos(ry);
    var sy = Math.sin(ry);
    var cz = Math.cos(rz);
    var sz = Math.sin(rz);

    var vertices = model.vertices.map(function (p) {
      // Rotate around X.
      var y1 = p.y * cx - p.z * sx;
      var z1 = p.y * sx + p.z * cx;
      var x1 = p.x;

      // Rotate around Y.
      var x2 = x1 * cy + z1 * sy;
      var z2 = -x1 * sy + z1 * cy;
      var y2 = y1;

      // Rotate around Z.
      var x3 = x2 * cz - y2 * sz;
      var y3 = x2 * sz + y2 * cz;

      return {
        x: x3,
        y: y3,
        z: z2
      };
    });

    return {
      vertices: vertices,
      edges: model.edges.map(function (edge) {
        return edge.slice();
      })
    };
  }

  global.DraftMateProjection = {
    version: "2.0.0",
    createProjection: createProjection,
    fitToCanvas: fitToCanvas,
    bounds: bounds,
    translate: translate,
    rotate: rotate
  };

})(window);
