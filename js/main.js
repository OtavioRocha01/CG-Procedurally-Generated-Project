"use strict";

var vertexShaderSource = `#version 300 es

in vec4 a_position;
in vec4 a_color;

uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;

  v_color = a_color;
}
`;

var fragmentShaderSource = `#version 300 es

precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
  outColor = v_color;
}
`;

const max_density = 100;
let density = 100;
const offSet = 40;

async function main() {
  var randButton = document.getElementById("generateButton");
  var seedInput = document.getElementById("newSeed");
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");

  
  if (!gl) {
    return;
  }

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
  for (var ii = 0; ii < max_density; ++ii) {
    var value_x = rand() * 600 - 200;
    var value_z = rand() * 600 - 80; 
    for (var jj = 0; jj < ii; ++jj) {
      if (Math.abs(value_x - positions_x[jj]) < offSet && Math.abs(value_z - positions_z[jj]) < offSet) {
        value_x = rand() * 600 - 200;
        value_z = rand() * 600 - 80;
        jj = 0;
      }
    }
    positions_x[ii] = value_x;
    positions_z[ii] = value_z;
  }
  

  randButton.onclick = function() {
    seed = Math.floor(Math.random() * 10000000);
    rand = sfc32(seed, seed, seed, seed);
    for (var ii = 0; ii < max_density; ++ii) {
      var value_x = rand() * 600 - 200;
      var value_z = rand() * 600 - 80; 
      for (var jj = 0; jj < ii; ++jj) {
        if (Math.abs(value_x - positions_x[jj]) < offSet && Math.abs(value_z - positions_z[jj]) < offSet) {
          value_x = rand() * 600 - 200;
          value_z = rand() * 600 - 80;
          jj = 0;
        }
      }
      positions_x[ii] = value_x;
      positions_z[ii] = value_z;
    }
    console.log("seed: " + seed);
    drawScene();
  }

  seedInput.onclick = function() {
    seed = parseInt(document.getElementById("seed").value);
    rand = sfc32(seed, seed, seed, seed);
    for (var ii = 0; ii < max_density; ++ii) {
      var value_x = rand() * 600 - 200;
      var value_z = rand() * 600 - 80; 
      for (var jj = 0; jj < ii; ++jj) {
        if (Math.abs(value_x - positions_x[jj]) < offSet && Math.abs(value_z - positions_z[jj]) < offSet) {
          value_x = rand() * 600 - 200;
          value_z = rand() * 600 - 80;
          jj = 0;
        }
      }
      positions_x[ii] = value_x;
      positions_z[ii] = value_z;
    }
    console.log("seed: " + seed);
    drawScene();
  }

  var program = webglUtils.createProgramFromSources(gl,
      [vertexShaderSource, fragmentShaderSource]);

  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var colorAttributeLocation = gl.getAttribLocation(program, "a_color");

  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  var positionBuffer = gl.createBuffer();

  var vao = gl.createVertexArray();

  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(positionAttributeLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  setGeometry(gl);

  var size = 3;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl);

  gl.enableVertexAttribArray(colorAttributeLocation);

  var size = 3;          // 3 components per iteration
  var type = gl.UNSIGNED_BYTE;   // the data is 8bit unsigned bytes
  var normalize = true;  // convert from 0-255 to 0.0-1.0
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      colorAttributeLocation, size, type, normalize, stride, offset);


  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var fieldOfViewRadians = degToRad(120);
  var cameraAngleRadians = degToRad(0);

  //requestAnimationFrame(drawScene);
  drawScene();

  // webglLessonsUI.setupSlider("#cameraAngle", {value: radToDeg(cameraAngleRadians), slide: updateCameraAngle, min: -360, max: 360});

  document.getElementById("density").addEventListener("input", function() {
    density = parseInt(document.getElementById("density").value);
    drawScene();
  });

  // function updateCameraAngle(event, ui) {
  //   cameraAngleRadians = degToRad(ui.value);
  //   drawScene();
  // }  

  function drawScene(time) {
    time *= 0.001;  // convert to seconds

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.CULL_FACE);

    gl.useProgram(program);

    gl.bindVertexArray(vao);

    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 2000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    var centerPosition = [0, 0, 0];
    var up = [0, 1, 0];
    var cameraMatrix = m4.yRotation(cameraAngleRadians);
    cameraMatrix = m4.translate(cameraMatrix, 500, 200, 0);

    var cameraPosition = [
      cameraMatrix[12],
      cameraMatrix[13],
      cameraMatrix[14],
    ];
    
    var cameraMatrix = m4.lookAt(cameraPosition, centerPosition, up);

    var viewMatrix = m4.inverse(cameraMatrix);

    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    for (var ii = 0; ii < density; ++ii) {
      var x = positions_x[ii];
      var z = positions_z[ii];
      var matrix = m4.translate(viewProjectionMatrix, x, 0, z);

      gl.uniformMatrix4fv(matrixLocation, false, matrix);

      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = 16 * 6;
      gl.drawArrays(primitiveType, offset, count);
    }
    
  }
}

function setGeometry(gl) {
  var positions = new Float32Array([
          // front
          0,   0,  0,
          0, 150,  0,
          30,   0,  0,
          0, 150,  0,
          30, 150,  0,
          30,   0,  0,

          // back
            0,   0,  30,
           30,   0,  30,
            0, 150,  30,
            0, 150,  30,
           30,   0,  30,
           30, 150,  30,

          // top
            0,   0,   0,
          30,   0,   0,
          30,   0,  30,
            0,   0,   0,
          30,   0,  30,
            0,   0,  30,

          // right side
          30,   0,   0,
          30,  150,  30,
          30,   0,  30,
          30,   0,   0,
          30,  150,   0,
          30,  150,  30,

          // bottom
          0,   150,   0,
          0,   150,  30,
          30,  150,  30,
          0,   150,   0,
          30,  150,  30,
          30,  150,   0,

          // left side
          0,   0,   0,
          0,   0,  30,
          0, 150,  30,
          0,   0,   0,
          0, 150,  30,
          0, 150,   0,
  ]);

  var matrix = m4.xRotation(Math.PI);
  matrix = m4.translate(matrix, -50, -75, 150);

  for (var ii = 0; ii < positions.length; ii += 3) {
    var vector = m4.transformVector(matrix, [positions[ii + 0], positions[ii + 1], positions[ii + 2], 1]);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }

  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

function setColors(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array([
          // front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

       
          // top
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,

          // right side
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,

          // bottom
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,

          // left side
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
      ]),
      gl.STATIC_DRAW);
}


main();