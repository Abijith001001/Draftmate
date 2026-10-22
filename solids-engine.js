
/*
  DraftMate Solids Engine
  Version 1.0 — Geometry foundation

  This file is separate from index.html.
  It does not change the live website.

  Supported geometry:
  - Regular prisms
  - Regular pyramids
  - Cylinders
  - Cones

  Next stages will add engineering projections,
  inclination sequences, and construction drawings.
*/

(function (global) {
  "use strict";

  const DEG = Math.PI / 180;

  function point(x, y, z) {
    return { x, y, z };
  }

  function rotatePoint(p, angles) {
    const ax = (angles.x || 0) * DEG;
    const ay = (angles.y || 0) * DEG;
    const az = (angles.z || 0) * DEG;

    // Rotate around X
    let y = p.y * Math.cos(ax) - p.z * Math.sin(ax);
    let z = p.y * Math.sin(ax) + p.z * Math.cos(ax);
    let x = p.x;

    // Rotate around Y
    const x2 = x * Math.cos(ay) + z * Math.sin(ay);
    const z2 = -x * Math.sin(ay) + z * Math.cos(ay);
    x = x2;
    z = z2;

    // Rotate around Z
    const x3 = x * Math.cos(az) - y * Math.sin(az);
    const y3 = x * Math.sin(az) + y * Math.cos(az);

    return point(x3, y3, z);
  }

  function validateNumber(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(name + " must be a positive number.");
    }
  }

  function regularPolygon(sides, radius, z) {
    const vertices = [];

    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides;

      vertices.push(
        point(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          z
        )
      );
    }

    return vertices;
  }

  function buildPrism(options) {
    const sides = options.sides || 6;
    const radius = options.radius;
    const height = options.height;

    validateNumber(radius, "Radius");
    validateNumber(height, "Height");

    if (!Number.isInteger(sides) || sides < 3) {
      throw new Error("A prism needs at least 3 sides.");
    }

    const bottom = regularPolygon(sides, radius, 0);
    const top = regularPolygon(sides, radius, height);

    const vertices = bottom.concat(top);
    const edges = [];

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;

      edges.push([i, next]);
      edges.push([i + sides, next + sides]);
      edges.push([i, i + sides]);
    }

    return { vertices, edges };
  }

  function buildPyramid(options) {
    const sides = options.sides || 4;
    const radius = options.radius;
    const height = options.height;

    validateNumber(radius, "Radius");
    validateNumber(height, "Height");

    if (!Number.isInteger(sides) || sides < 3) {
      throw new Error("A pyramid needs at least 3 base sides.");
    }

    const base = regularPolygon(sides, radius, 0);
    const vertices = base.concat([
      point(0, 0, height)
    ]);
    const edges = [];

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;

      edges.push([i, next]);
      edges.push([i, sides]);
    }

    return { vertices, edges };
  }

  function buildCylinder(options) {
    const radius = options.radius;
    const height = options.height;
    const segments = options.segments || 32;

    validateNumber(radius, "Radius");
    validateNumber(height, "Height");

    if (!Number.isInteger(segments) || segments < 8) {
      throw new Error("Cylinder segments must be an integer of 8 or more.");
    }

    const bottom = [];
    const top = [];
    const edges = [];

    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;

      bottom.push(point(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0
      ));

      top.push(point(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        height
      ));
    }

    const vertices = bottom.concat(top);

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;

      edges.push([i, next]);
      edges.push([i + segments, next + segments]);

      // Use selected generators to keep the wireframe readable.
      if (i % Math.max(1, Math.floor(segments / 8)) === 0) {
        edges.push([i, i + segments]);
      }
    }

    return { vertices, edges };
  }

  function buildCone(options) {
    const radius = options.radius;
    const height = options.height;
    const segments = options.segments || 32;

    validateNumber(radius, "Radius");
    validateNumber(height, "Height");

    if (!Number.isInteger(segments) || segments < 8) {
      throw new Error("Cone segments must be an integer of 8 or more.");
    }

    const vertices = [];
    const edges = [];

    for (let i = 0; i < segments; i++) {
      const angle = (2 * Math.PI * i) / segments;

      vertices.push(point(
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        0
      ));
    }

    const apexIndex = vertices.length;
    vertices.push(point(0, 0, height));

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;

      edges.push([i, next]);

      if (i % Math.max(1, Math.floor(segments / 8)) === 0) {
        edges.push([i, apexIndex]);
      }
    }

    return { vertices, edges };
  }

  function transform(model, angles) {
    return {
      vertices: model.vertices.map(function (p) {
        return rotatePoint(p, angles || {});
      }),
      edges: model.edges.map(function (edge) {
        return edge.slice();
      })
    };
  }

  function createSolid(type, options) {
    options = options || {};

    let model;

    switch (String(type).toLowerCase()) {
      case "prism":
        model = buildPrism(options);
        break;

      case "pyramid":
        model = buildPyramid(options);
        break;

      case "cylinder":
        model = buildCylinder(options);
        break;

      case "cone":
        model = buildCone(options);
        break;

      default:
        throw new Error(
          "Unsupported solid type: " + type
        );
    }

    return {
      type: String(type).toLowerCase(),
      vertices: model.vertices,
      edges: model.edges,
      vertexCount: model.vertices.length,
      edgeCount: model.edges.length
    };
  }

  global.DraftMateSolids = {
    version: "1.0.0",
    createSolid: createSolid,
    transform: transform
  };

})(window);
