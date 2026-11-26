"use client";

import { useEffect, useRef } from "react";

const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float edges;
uniform vec3 ground;
uniform vec3 foreground;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.0 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y * 1.6;
  float t = time * 0.05;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float smoke = fbm(p + 2.5 * q + vec2(t * 0.7, -t * 0.4));
  float shape = smoothstep(0.35, 0.85, smoke);
  float fade = mix(1.0, smoothstep(0.0, 0.35, uv.y) * smoothstep(1.0, 0.9, uv.y), edges);
  vec3 color = ground + foreground * shape * fade * 0.12;
  gl_FragColor = vec4(color, 1.0);
}
`;

const readColor = (element: Element, token: string) => {
  const probe = document.createElement("canvas").getContext("2d");

  if (!probe) {
    return [0, 0, 0];
  }

  probe.fillStyle = getComputedStyle(element).getPropertyValue(token);
  probe.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = probe.getImageData(0, 0, 1, 1).data;

  return [red / 255, green / 255, blue / 255];
};

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);

  if (shader) {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
  }

  return shader;
};

const startSmoke = (canvas: HTMLCanvasElement, ground: string, fadeEdges: boolean) => {
  const gl = canvas.getContext("webgl", { antialias: false });

  if (!gl) {
    return null;
  }

  const program = gl.createProgram();
  const vertexShader = compile(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragment);

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);

  gl.uniform3fv(uniform("ground"), readColor(canvas, `--${ground}`));
  gl.uniform3fv(uniform("foreground"), readColor(canvas, "--foreground"));
  gl.uniform1f(uniform("edges"), fadeEdges ? 1 : 0);

  const resize = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniform("resolution"), canvas.width, canvas.height);
  };

  const resizeObserver = new ResizeObserver(resize);

  resizeObserver.observe(canvas);
  resize();

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  let frame = 0;
  let last = 0;

  const draw = (now: number) => {
    if (!still && visible) {
      frame = requestAnimationFrame(draw);
    }

    if (now - last < 33) {
      return;
    }

    last = now;
    gl.uniform1f(uniform("time"), now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const visibility = new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry?.isIntersecting ?? false;

    if (visible && !wasVisible && !still) {
      frame = requestAnimationFrame(draw);
    }
  });

  visibility.observe(canvas);
  frame = requestAnimationFrame((now) => {
    draw(now);
    canvas.style.opacity = "1";
  });

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibility.disconnect();
  };
};

export const Smoke = ({
  ground = "background",
  fadeEdges = false,
}: {
  ground?: "background" | "muted";
  fadeEdges?: boolean;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    let stop: (() => void) | null = null;

    const delay = window.setTimeout(() => {
      if (canvas) {
        stop = startSmoke(canvas, ground, fadeEdges);
      }
    }, 300);

    return () => {
      window.clearTimeout(delay);
      stop?.();
    };
  }, [ground, fadeEdges]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-1000"
    />
  );
};
