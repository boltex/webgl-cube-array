export const vertexShaderSource = `
attribute vec3 aPosition;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

varying float vFogDepth;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vec4 viewPos = uView * worldPos;
  gl_Position = uProjection * viewPos;
  vFogDepth = -viewPos.z;
}
`;

export const fragmentShaderSource = `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying float vFogDepth;

void main() {
  float fogRange = max(uFogFar - uFogNear, 0.0001);
  float fogFactor = clamp((uFogFar - vFogDepth) / fogRange, 0.0, 1.0);
  vec3 shadedColor = uColor;
  vec3 foggedColor = mix(uFogColor, shadedColor, fogFactor);
  gl_FragColor = vec4(foggedColor, 1.0);
}
`;
