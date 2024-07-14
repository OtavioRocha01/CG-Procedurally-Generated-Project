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



async function main() {
  var randButton = document.getElementById("generateButton");
  var seedInput = document.getElementById("newSeed");
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  
  if (!gl) {
    return;
  }

  // VARIABLES
  let density = 10000;

  let perTree1 = .2;
  let perTree2 = .2;
  let perTree3 = .2;
  let perBigRock = .2;
  let perStone = .2;

  let numTrees1 = density * perTree1;
  let numTrees2 = density * perTree2;
  let numTrees3 = density * perTree3;
  let numBigRocks = density * perBigRock;
  let numStones = density * perStone;

  var eye = [0, 50, 450]; // exemplo para mostrar o efeito da iluminação: [0, 300, 300];
  var target = [0, -0.3, -1]; // perspectiva horizontal - [0, 0, 1]; efeito da iluminação na camera

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
  
  var seed = Math.floor(Math.random() * 100000) ;
  var rand = sfc32(seed, seed, seed, seed);


  // GET TREE1s POSITIONS
  var positions_x_trees1 = new Float32Array(numTrees1);
  var positions_z_trees1 = new Float32Array(numTrees1);
  for (var ii = 0; ii < numTrees1; ++ii) {
    positions_x_trees1[ii] = rand() * 100 - 50;
    positions_z_trees1[ii] = rand() * 100 - 50;
  }
  
  // GET TREE2s POSITIONS
  var positions_x_trees2 = new Float32Array(numTrees2);
  var positions_z_trees2 = new Float32Array(numTrees2);
  for (var ii = 0; ii < numTrees2; ++ii) {
    positions_x_trees2[ii] = rand() * 100 - 50;
    positions_z_trees2[ii] = rand() * 100 - 50;
  }

  // GET TREE3s POSITIONS
  var positions_x_trees3 = new Float32Array(numTrees3);
  var positions_z_trees3 = new Float32Array(numTrees3);
  for (var ii = 0; ii < numTrees3; ++ii) {
    positions_x_trees3[ii] = rand() * 100 - 50;
    positions_z_trees3[ii] = rand() * 100 - 50;
  }

  // GET BIG ROCKS POSITIONS
  var positions_x_rocks = new Float32Array(numBigRocks);
  var positions_z_rocks = new Float32Array(numBigRocks);
  for (var ii = 0; ii < numBigRocks; ++ii) {
    positions_x_rocks[ii] = rand() * 100 - 50;
    positions_z_rocks[ii] = rand() * 100 - 50;
  }

  // GET STONES POSITIONS
  var positions_x_stones = new Float32Array(numStones);
  var positions_z_stones = new Float32Array(numStones);
  for (var ii = 0; ii < numStones; ++ii) {
    positions_x_stones[ii] = rand() * 100 - 50;
    positions_z_stones[ii] = rand() * 100 - 50;
  }

  randButton.onclick = function() {
    seed = Math.floor(Math.random() * 100000);
    rand = sfc32(seed, seed, seed, seed);
    for (var ii = 0; ii < numTrees1; ++ii) {
      positions_x_trees1[ii] = rand() * 100 - 50;
      positions_z_trees1[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numTrees2; ++ii) {
      positions_x_trees2[ii] = rand() * 100 - 50;
      positions_z_trees2[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numTrees3; ++ii) {
      positions_x_trees3[ii] = rand() * 100 - 50;
      positions_z_trees3[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numBigRocks; ++ii) {
      positions_x_rocks[ii] = rand() * 100 - 50;
      positions_z_rocks[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numStones; ++ii) {
      positions_x_stones[ii] = rand() * 100 - 50;
      positions_z_stones[ii] = rand() * 100 - 50;
    }
    console.log("seed: " + seed);
    render();
  }

  seedInput.onclick = function() {
    seed = parseInt(document.getElementById("seed").value);
    rand = sfc32(seed, seed, seed, seed);
    
    for (var ii = 0; ii < numTrees1; ++ii) {
      positions_x_trees1[ii] = rand() * 100 - 50;
      positions_z_trees1[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numTrees2; ++ii) {
      positions_x_trees2[ii] = rand() * 100 - 50;
      positions_z_trees2[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numTrees3; ++ii) {
      positions_x_trees3[ii] = rand() * 100 - 50;
      positions_z_trees3[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numBigRocks; ++ii) {
      positions_x_rocks[ii] = rand() * 100 - 50;
      positions_z_rocks[ii] = rand() * 100 - 50;
    }

    for (var ii = 0; ii < numStones; ++ii) {
      positions_x_stones[ii] = rand() * 100 - 50;
      positions_z_stones[ii] = rand() * 100 - 50;
    }
    console.log("seed: " + seed);
    render();
  }

  const meshProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

  // LOAD TREE1
  const tree1Href = 'textures/tree1.obj';  
  const tree1Response = await fetch(tree1Href);
  const tree1Text = await tree1Response.text();
  const tree1 = parseOBJ(tree1Text);
  
  const tree1MatTexts = await Promise.all(tree1.materialLibs.map(async filename => {
    const matHref = `textures/tree1.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const tree1Materials = parseMTL(tree1MatTexts.join('\n'));
  const tree1Parts = tree1.geometries.map(({material, data}) => {
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
      material: tree1Materials[material],
      bufferInfo,
      vao,
    };
  });


  // LOAD TREE2
  const tree2Href = 'textures/tree2.obj';
  const tree2Response = await fetch(tree2Href);
  const tree2Text = await tree2Response.text();
  const tree2 = parseOBJ(tree2Text);

  const tree2MatTexts = await Promise.all(tree2.materialLibs.map(async filename => {
    const matHref = `textures/tree2.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const tree2Materials = parseMTL(tree2MatTexts.join('\n'));
  const tree2Parts = tree2.geometries.map(({material, data}) => {
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
      material: tree2Materials[material],
      bufferInfo,
      vao,
    };
  });


  // LOAD TREE3
  const tree3Href = 'textures/tree3.obj';
  const tree3Response = await fetch(tree3Href);
  const tree3Text = await tree3Response.text();
  const tree3 = parseOBJ(tree3Text);

  const tree3MatTexts = await Promise.all(tree3.materialLibs.map(async filename => {
    const matHref = `textures/tree3.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const tree3Materials = parseMTL(tree3MatTexts.join('\n'));
  const tree3Parts = tree3.geometries.map(({material, data}) => {
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
      material: tree3Materials[material],
      bufferInfo,
      vao,
    };
  });


  // LOAD BIG ROCK
  const bigRockHref = 'textures/bigRock.obj';
  const bigRockResponse = await fetch(bigRockHref);
  const bigRockText = await bigRockResponse.text();
  const bigRock = parseOBJ(bigRockText);

  const bigRockMatTexts = await Promise.all(bigRock.materialLibs.map(async filename => {
    const matHref = `textures/bigRock.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const bigRockMaterials = parseMTL(bigRockMatTexts.join('\n'));
  const bigRockParts = bigRock.geometries.map(({material, data}) => {
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
      material: bigRockMaterials[material],
      bufferInfo,
      vao,
    };
  });


  // LOAD STONES
  const stoneHref = 'textures/stone.obj';
  const stoneResponse = await fetch(stoneHref);
  const stoneText = await stoneResponse.text();
  const stone = parseOBJ(stoneText);

  const stoneMatTexts = await Promise.all(stone.materialLibs.map(async filename => {
    const matHref = `textures/stone.mtl`;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const stoneMaterials = parseMTL(stoneMatTexts.join('\n'));
  const stoneParts = stone.geometries.map(({material, data}) => {
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
      material: stoneMaterials[material],
      bufferInfo,
      vao,
    };
  });


  // CAMERA
  const cameraTarget = [0, 10, 0];
  const cameraPosition = m4.addVectors(cameraTarget, [
    -30,
    60,
    180,
  ]);
  const zNear = 1;
  const zFar = 2000;

  const fieldOfViewRadians = degToRad(120);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

  const up = [0, 1, 0];
  const camera = m4.lookAt(cameraPosition, cameraTarget, up);
  const view = m4.inverse(camera);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  // SLIDER
  document.getElementById("density").addEventListener("input", function() {
    density = parseInt(document.getElementById("density").value);
    perTree1 = .2;
    perTree2 = .2;
    perTree3 = .2;
    perBigRock = .2;
    perStone = .2;
    render();
  });


  // FUNCTION TO DRAW
  function render() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
  


    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    let u_world = m4.yRotation(0);


    // OFFSETS
    let tree1Offset = [0, 0, 0];
    let tree2Offset = [0, 0, 0];
    let tree3Offset = [0, 0, 0];
    let bigRockOffset = [0, 0, 0];
    let stoneOffset = [0, 0, 0];

    // DRAW OBJECTS
    for ( ii = 0 ; ii < density/2 ; ++ii ) {
        // DRAW TREE1
        tree1Offset = [positions_x_trees1[ii], 0, positions_z_trees1[ii]];
        u_world = m4.translate(u_world, ...tree1Offset);
        for (const {bufferInfo, vao, material} of tree1Parts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
              u_world,
            }, material);

            twgl.drawBufferInfo(gl, bufferInfo);
        } 

        // DRAW TREE2
        tree2Offset = [positions_x_trees2[ii], 0, positions_z_trees2[ii]];
        u_world = m4.translate(u_world, ...tree2Offset);
        for (const {bufferInfo, vao, material} of tree2Parts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
              u_world,
            }, material);

            twgl.drawBufferInfo(gl, bufferInfo);
        }

        // DRAW TREE3
        tree3Offset = [positions_x_trees3[ii], 0, positions_z_trees3[ii]];
        u_world = m4.translate(u_world, ...tree3Offset);
        for (const {bufferInfo, vao, material} of tree3Parts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
              u_world,
            }, material);

            twgl.drawBufferInfo(gl, bufferInfo);
        }

        // DRAW BIG ROCK
        bigRockOffset = [positions_x_rocks[ii], 0, positions_z_rocks[ii]];
        u_world = m4.translate(u_world, ...bigRockOffset);
        for (const {bufferInfo, vao, material} of bigRockParts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
              u_world,
            }, material);

            twgl.drawBufferInfo(gl, bufferInfo);
        }

        // DRAW STONE
        stoneOffset = [positions_x_stones[ii], 0, positions_z_stones[ii]];
        u_world = m4.translate(u_world, ...stoneOffset);
        for (const {bufferInfo, vao, material} of stoneParts) {
            gl.bindVertexArray(vao);
            twgl.setUniforms(meshProgramInfo, {
              u_world,
            }, material);

            twgl.drawBufferInfo(gl, bufferInfo);
      }
  }
  }
  
  render();
}

main();