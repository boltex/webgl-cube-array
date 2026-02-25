import { vertexShaderSource, fragmentShaderSource } from "./shaders.js";

const GRID_SIZE = 16;
const CUBE_SIZE = 9;
const GAP = 1;
const ORBIT_SPEED = 0.12;
const ORBIT_TILT_AMPLITUDE = 8;

const canvas = document.getElementById("gl-canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    throw new Error("WebGL is not supported by this browser.");
}

function createShader(glContext, type, source) {
    const shader = glContext.createShader(type);
    glContext.shaderSource(shader, source);
    glContext.compileShader(shader);

    if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        const message = glContext.getShaderInfoLog(shader);
        glContext.deleteShader(shader);
        throw new Error(`Shader compile error: ${message}`);
    }

    return shader;
}

function createProgram(glContext, vertexSource, fragmentSource) {
    const vertexShader = createShader(glContext, glContext.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);

    const program = glContext.createProgram();
    glContext.attachShader(program, vertexShader);
    glContext.attachShader(program, fragmentShader);
    glContext.linkProgram(program);

    glContext.deleteShader(vertexShader);
    glContext.deleteShader(fragmentShader);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
        const message = glContext.getProgramInfoLog(program);
        glContext.deleteProgram(program);
        throw new Error(`Program link error: ${message}`);
    }

    return program;
}

function createIdentity() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
}

function perspective(out, fovRadians, aspect, near, far) {
    const f = 1 / Math.tan(fovRadians / 2);
    const nf = 1 / (near - far);

    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;

    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
}

function lookAt(out, eye, target, up) {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];

    let len = Math.hypot(zx, zy, zz);
    if (len === 0) {
        zz = 1;
        len = 1;
    }

    zx /= len;
    zy /= len;
    zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;

    len = Math.hypot(xx, xy, xz);
    if (len === 0) {
        xx = 1;
        len = 1;
    }

    xx /= len;
    xy /= len;
    xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx;
    out[1] = yx;
    out[2] = zx;
    out[3] = 0;

    out[4] = xy;
    out[5] = yy;
    out[6] = zy;
    out[7] = 0;

    out[8] = xz;
    out[9] = yz;
    out[10] = zz;
    out[11] = 0;

    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
}

function makeTranslationScale(out, tx, ty, tz, scale) {
    out[0] = scale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = scale;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = scale;
    out[11] = 0;

    out[12] = tx;
    out[13] = ty;
    out[14] = tz;
    out[15] = 1;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
gl.useProgram(program);

const attributes = {
    position: gl.getAttribLocation(program, "aPosition"),
    normal: gl.getAttribLocation(program, "aNormal"),
};

const uniforms = {
    model: gl.getUniformLocation(program, "uModel"),
    view: gl.getUniformLocation(program, "uView"),
    projection: gl.getUniformLocation(program, "uProjection"),
    normalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),
    color: gl.getUniformLocation(program, "uColor"),
    fogColor: gl.getUniformLocation(program, "uFogColor"),
    fogNear: gl.getUniformLocation(program, "uFogNear"),
    fogFar: gl.getUniformLocation(program, "uFogFar"),
    cameraPosition: gl.getUniformLocation(program, "uCameraPosition"),
    lightPositions: gl.getUniformLocation(program, "uLightPositions"),
    lightColors: gl.getUniformLocation(program, "uLightColors"),
    ambientStrength: gl.getUniformLocation(program, "uAmbientStrength"),
    specularStrength: gl.getUniformLocation(program, "uSpecularStrength"),
    shininess: gl.getUniformLocation(program, "uShininess"),
};

const half = 0.5;
const cubeVertices = new Float32Array([
    -half, -half, half,
    half, -half, half,
    half, half, half,
    -half, half, half,

    -half, -half, -half,
    -half, half, -half,
    half, half, -half,
    half, -half, -half,

    -half, half, -half,
    -half, half, half,
    half, half, half,
    half, half, -half,

    -half, -half, -half,
    half, -half, -half,
    half, -half, half,
    -half, -half, half,

    half, -half, -half,
    half, half, -half,
    half, half, half,
    half, -half, half,

    -half, -half, -half,
    -half, -half, half,
    -half, half, half,
    -half, half, -half,
]);

const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
]);

const cubeNormals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,

    0, 0, -1,
    0, 0, -1,
    0, 0, -1,
    0, 0, -1,

    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,

    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,

    1, 0, 0,
    1, 0, 0,
    1, 0, 0,
    1, 0, 0,

    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
    -1, 0, 0,
]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(attributes.position);
gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);

const normalBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

gl.enableVertexAttribArray(attributes.normal);
gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

const cubes = [];
const stride = CUBE_SIZE + GAP;
const span = (GRID_SIZE - 1) * stride;
const halfSpan = span * 0.5;

for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
        const x = column * stride - halfSpan;
        const y = row * stride - halfSpan;
        cubes.push({
            position: [x, y, 0],
            color: [0.2 + Math.random() * 0.8, 0.2 + Math.random() * 0.8, 0.2 + Math.random() * 0.8],
        });
    }
}

const projection = createIdentity();
const view = createIdentity();
const model = createIdentity();
const normalMatrix = new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
]);

const target = [0, 0, 0];
const up = [0, 1, 0];
const fogColor = [1, 1, 1];
const lightPositions = new Float32Array([
    span * 0.85, span * 0.65, span * 0.95,
    -span * 0.75, -span * 0.45, -span * 0.95,
]);
const lightColors = new Float32Array([
    1.0, 1.0, 1.0,
    1.0, 0.98, 0.96,
]);

const orbitRadius = span * 0.95;
const baseHeight = span * 0.35;

function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
}

function render(milliseconds) {
    const time = milliseconds * 0.001;

    resizeCanvasToDisplaySize();

    const aspect = canvas.width / canvas.height;
    perspective(projection, Math.PI / 3, aspect, 1, 2000);

    const angle = time * ORBIT_SPEED;
    const eye = [
        Math.cos(angle) * orbitRadius,
        baseHeight + Math.sin(angle * 0.7) * ORBIT_TILT_AMPLITUDE,
        Math.sin(angle) * orbitRadius,
    ];

    lookAt(view, eye, target, up);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(uniforms.view, false, view);
    gl.uniformMatrix4fv(uniforms.projection, false, projection);
    gl.uniformMatrix3fv(uniforms.normalMatrix, false, normalMatrix);
    gl.uniform3fv(uniforms.fogColor, fogColor);
    gl.uniform1f(uniforms.fogNear, orbitRadius * 0.5);
    gl.uniform1f(uniforms.fogFar, orbitRadius * 1.45);
    gl.uniform3fv(uniforms.cameraPosition, eye);
    gl.uniform3fv(uniforms.lightPositions, lightPositions);
    gl.uniform3fv(uniforms.lightColors, lightColors);
    gl.uniform1f(uniforms.ambientStrength, 0.35);
    gl.uniform1f(uniforms.specularStrength, 0.45);
    gl.uniform1f(uniforms.shininess, 28.0);

    for (const cube of cubes) {
        makeTranslationScale(model, cube.position[0], cube.position[1], cube.position[2], CUBE_SIZE);
        gl.uniformMatrix4fv(uniforms.model, false, model);
        gl.uniform3fv(uniforms.color, cube.color);
        gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
}

window.addEventListener("resize", resizeCanvasToDisplaySize);
requestAnimationFrame(render);
