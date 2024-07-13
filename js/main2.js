"use strict";

var vertexShaderSource = `#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;

out vec3 v_normal;
out vec3 v_surfaceToView;
out vec4 v_color;

void main() {
  vec4 worldPosition = u_world * a_position;
  gl_Position = u_projection * u_view * worldPosition;
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
  v_normal = mat3(u_world) * a_normal;
  v_color = a_color;
}
`;

var fragmentShaderSource = `#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_surfaceToView;
in vec4 v_color;

uniform vec3 diffuse;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;

out vec4 outColor;

void main () {
  vec3 normal = normalize(v_normal);

  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);

  vec3 effectiveDiffuse = diffuse.rgb * v_color.rgb;
  float effectiveOpacity = v_color.a * opacity;

  outColor = vec4(
      emissive +
      ambient * u_ambientLight +
      effectiveDiffuse * fakeLight +
      specular * pow(specularLight, shininess),
      effectiveOpacity);
}
`;

let density = 100;

async function main() {
  var randButton = document.getElementById("generateButton");
  var seedInput = document.getElementById("newSeed");
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  
  if (!gl) {
    return;
  }

  twgl.setAttributePrefix("a_");

  // function to generate random numbers based on a seed
  // Taken from: https://stackoverflow.com/a/47593316/128511
  function sfc32(a, b, c, d) {
    return function() {
      a |= 0; b |= 0; c |= 0; d |= 0;
      let t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
  }
  
  var seed = Math.floor(Math.random() * 10000000) ;
  var rand = sfc32(seed, seed, seed, seed);
  var positions_x = new Float32Array(density);
  var positions_z = new Float32Array(density);
  for (var ii = 0; ii < density; ++ii) {
    positions_x[ii] = rand();
    positions_z[ii] = rand();
  }

  randButton.onclick = function() {
    seed = Math.floor(Math.random() * 10000000);
    rand = sfc32(seed, seed, seed, seed);
    for (var ii = 0; ii < density; ++ii) {
      positions_x[ii] = rand();
      positions_z[ii] = rand();
    }
    console.log("seed: " + seed);
    drawScene();
  }

  seedInput.onclick = function() {
    seed = parseInt(document.getElementById("seed").value);
    rand = sfc32(seed, seed, seed, seed);
    for (var ii = 0; ii < density; ++ii) {
      positions_x[ii] = rand();
      positions_z[ii] = rand();
    }
    console.log("seed: " + seed);
    drawScene();
  }

  const meshProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);
  //var program = webglUtils.createProgramFromSources(gl,[vertexShaderSource, fragmentShaderSource]);

  const objHref = 'textures/low_poly_tree.obj';  
  const response = await fetch(objHref);
  const text = await response.text();
  const obj = parseOBJ(text);
  
  // Atualize o caminho para os arquivos MTL locais
  const matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    const matHref = `textures/low_poly_tree.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const materials = parseMTL(matTexts.join('\n'));

  const parts = obj.geometries.map(({material, data}) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: materials[material],
      bufferInfo,
      vao,
    };
  });

  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

  function getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }
  
  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  let objOffset = [0, -15, 0];

  const cameraTarget = [0, 0, 0];
  const radius = 30;
  const cameraPosition = m4.addVectors(cameraTarget, [
    0,
    0,
    radius,
  ]);
  const zNear = radius / 100;
  const zFar = radius * 3;

  // function radToDeg(r) {
  //   return r * 180 / Math.PI;
  // }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var fieldOfViewRadians = degToRad(120);
  var cameraAngleRadians = degToRad(0);

  //requestAnimationFrame(drawScene);
  // drawScene();

  // webglLessonsUI.setupSlider("#cameraAngle", {value: radToDeg(cameraAngleRadians), slide: updateCameraAngle, min: -360, max: 360});

  // document.getElementById("density").addEventListener("input", function() {
  //   density = parseInt(document.getElementById("density").value);
  //   drawScene();
  // });

  // function updateCameraAngle(event, ui) {
  //   cameraAngleRadians = degToRad(ui.value);
  //   drawScene();
  // }  

  function render(time) { 
    time *= 0.001;

    objOffset = [positions_x[0], -15, positions_z[ii]];
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = degToRad(120);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    let u_world = m4.yRotation(0);


    for ( ii = 0 ; ii < 5 ; ii++ ) {
        objOffset = [positions_x[ii] * 500 - 80, -15, positions_z[ii] * 500 - 80];
        u_world = m4.translate(u_world, ...objOffset);
        for (const {bufferInfo, vao, material} of parts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
            u_world,
            }, material);
            twgl.drawBufferInfo(gl, bufferInfo);
        }
    }

    requestAnimationFrame(render);

  }

  // function drawScene(time) {
  //   time *= 0.001;  // convert to seconds

  //   webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  //   gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  //   gl.clearColor(0, 0, 0, 0);
  //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //   gl.enable(gl.DEPTH_TEST);

  //   gl.enable(gl.CULL_FACE);

  //   gl.useProgram(program);

  //   gl.bindVertexArray(vao);

  //   var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  //   var zNear = 1;
  //   var zFar = 2000;
  //   var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

  //   var centerPosition = [0, 0, 0];
  //   var up = [0, 1, 0];
  //   var cameraMatrix = m4.yRotation(cameraAngleRadians);
  //   cameraMatrix = m4.translate(cameraMatrix, 500, 200, 0);

  //   var cameraPosition = [
  //     cameraMatrix[12],
  //     cameraMatrix[13],
  //     cameraMatrix[14],
  //   ];
    
  //   var cameraMatrix = m4.lookAt(cameraPosition, centerPosition, up);

  //   var viewMatrix = m4.inverse(cameraMatrix);

  //   var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  //   for (var ii = 0; ii < density; ++ii) {
  //     var x = positions_x[ii] * 500 - 80;
  //     var z = positions_z[ii] * 500 - 80;
  //     var matrix = m4.translate(viewProjectionMatrix, x, 0, z);

  //     gl.uniformMatrix4fv(matrixLocation, false, matrix);

  //     var primitiveType = gl.TRIANGLES;
  //     var offset = 0;
  //     var count = 16 * 6;
  //     gl.drawArrays(primitiveType, offset, count);
  //   }
    
  // }
  
  requestAnimationFrame(render);
}


function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];
  const objColors = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
    objColors,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
    [],   // colors
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      const color = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
        color,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
          color,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
      // if this is the position index (index 0) and we parsed
      // vertex colors then copy the vertex colors to the webgl vertex color data
      if (i === 0 && objColors.length > 1) {
        geometry.data.color.push(...objColors[index]);
      }
    });
  }

  const keywords = {
    v(parts) {
      // if there are more than 3 values here they are vertex colors
      if (parts.length > 3) {
        objPositions.push(parts.slice(0, 3).map(parseFloat));
        objColors.push(parts.slice(3).map(parseFloat));
      } else {
        objPositions.push(parts.map(parseFloat));
      }
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

function parseMapArgs(unparsedArgs) {
  // TODO: handle options
  return unparsedArgs;
}

function parseMTL(text) {
  const materials = {};
  let material;

  const keywords = {
    newmtl(parts, unparsedArgs) {
      material = {};
      materials[unparsedArgs] = material;
    },
    /* eslint brace-style:0 */
    Ns(parts)     { material.shininess      = parseFloat(parts[0]); },
    Ka(parts)     { material.ambient        = parts.map(parseFloat); },
    Kd(parts)     { material.diffuse        = parts.map(parseFloat); },
    Ks(parts)     { material.specular       = parts.map(parseFloat); },
    Ke(parts)     { material.emissive       = parts.map(parseFloat); },
    Ni(parts)     { material.opticalDensity = parseFloat(parts[0]); },
    d(parts)      { material.opacity        = parseFloat(parts[0]); },
    illum(parts)  { material.illum          = parseInt(parts[0]); },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return materials;
}

main();