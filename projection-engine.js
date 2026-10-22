
/*
  DraftMate Projection Engine
  Version 1.0

  Front View: X-Z projection
  Top View:   X-Y projection

  This module calculates orthographic projection
  coordinates. Hidden-line classification and
  engineering construction stages will be added later.
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
          "Invalid 3D vertex at index " + index
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
        edge[1] >= model.vertices.length
      ) {
        throw new Error("Invalid edge in model.");
      }
    });
  }

  function projectFront(model) {
    return model.vertices.map(function (p) {
      return {
        x: p.x,
        y: p.z
      };
    });
  }

  function projectTop(model) {
    return model.vertices.map(function (p) {
      return {
        x: p.x,
        y: p.y
      };
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

    const xs = points.map(function (p) {
      return p.x;
    });

    const ys = points.map(function (p) {
      return p.y;
    });

    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);

    return {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
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

  function createProjection(model) {
    validateModel(model);

    const frontPoints = projectFront(model);
    const topPoints = projectTop(model);

    return {
      front: {
        name: "Front View (FV)",
        points: frontPoints,
        edges: projectEdges(model, frontPoints),
        bounds: bounds(frontPoints)
      },

      top: {
        name: "Top View (TV)",
        points: topPoints,
        edges: projectEdges(model, topPoints),
        bounds: bounds(topPoints)
      }
    };
  }

  function fitToCanvas(view, width, height, padding) {
    width = width || 320;
    height = height || 220;
    padding = padding === undefined ? 24 : padding;

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(padding) ||
      width <= padding * 2 ||
      height <= padding * 2
    ) {
      throw new Error("Invalid canvas dimensions.");
    }

    const b = view.bounds;

    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const scaleX = b.width > 0
      ? usableWidth / b.width
      : Infinity;

    const scaleY = b.height > 0
      ? usableHeight / b.height
      : Infinity;

    let scale = Math.min(scaleX, scaleY);

    if (!Number.isFinite(scale)) {
      scale = Number.isFinite(scaleX)
        ? scaleX
        : Number.isFinite(scaleY)
          ? scaleY
          : 1;
    }

    const drawnWidth = b.width * scale;
    const drawnHeight = b.height * scale;

    const offsetX = (width - drawnWidth) / 2;
    const offsetY = (height - drawnHeight) / 2;

    const points = view.points.map(function (p) {
      return {
        x: offsetX + (p.x - b.minX) * scale,
        y: height - offsetY - (p.y - b.minY) * scale
      };
    });

    return {
      width: width,
      height: height,
      scale: scale,
      points: points,
      edges: projectEdges(
        { edges: view.edges.map(function (e) {
          return [e.fromIndex, e.toIndex];
        }) },
        points
      )
    };
  }

  global.DraftMateProjection = {
    version: "1.0.0",
    createProjection: createProjection,
    fitToCanvas: fitToCanvas
  };

})(window);
