export const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

varying float vFogDepth;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vec4 viewPos = uView * worldPos;
  gl_Position = uProjection * viewPos;
  vFogDepth = -viewPos.z;
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(uNormalMatrix * aNormal);
}
`;

export const fragmentShaderSource = `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uCameraPosition;
uniform vec3 uLightPositions[2];
uniform vec3 uLightColors[2];
uniform float uAmbientStrength;
uniform float uSpecularStrength;
uniform float uShininess;

varying float vFogDepth;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(uCameraPosition - vWorldPos);

  vec3 litColor = uColor * uAmbientStrength;

  for (int i = 0; i < 2; i++) {
    vec3 lightDir = normalize(uLightPositions[i] - vWorldPos);
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = uColor * uLightColors[i] * diff;

    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
    spec *= step(0.0, diff);
    vec3 specular = uLightColors[i] * (uSpecularStrength * spec);

    litColor += diffuse + specular;
  }

  float fogRange = max(uFogFar - uFogNear, 0.0001);
  float fogFactor = clamp((uFogFar - vFogDepth) / fogRange, 0.0, 1.0);
  vec3 foggedColor = mix(uFogColor, litColor, fogFactor);
  gl_FragColor = vec4(foggedColor, 1.0);
}
`;
