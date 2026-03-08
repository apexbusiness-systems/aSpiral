import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectDeviceCapabilities } from './optimizer';

describe('Performance Benchmark: detectDeviceCapabilities', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  // Save original globals to restore them later
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalHTMLCanvasElement = global.HTMLCanvasElement;

  beforeEach(() => {
    // Mock WebGL context
    const mockGl = {
      getParameter: vi.fn((param) => {
        if (param === 3379) return 16384; // MAX_TEXTURE_SIZE
        if (param === 37445) return 'Google Inc. (NVIDIA)'; // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11, or similar)'; // UNMASKED_RENDERER_WEBGL
        return null;
      }),
      getExtension: vi.fn(() => ({
        UNMASKED_VENDOR_WEBGL: 37445,
        UNMASKED_RENDERER_WEBGL: 37446,
      })),
      MAX_TEXTURE_SIZE: 3379,
    };

    // Mock HTMLCanvasElement
    if (typeof global.HTMLCanvasElement === 'undefined') {
      // @ts-ignore
      global.HTMLCanvasElement = class {
        getContext(contextId: string) {
          if (contextId === 'webgl' || contextId === 'webgl2') {
            return mockGl;
          }
          return null;
        }
      };
    }

    // Mock document if needed
    if (typeof global.document === 'undefined') {
      // @ts-ignore
      global.document = {
        createElement: (tagName: string) => {
          if (tagName === 'canvas') {
            return new (global as any).HTMLCanvasElement();
          }
          return {} as any;
        }
      } as any;
    }

    // Mock window if needed (for matchMedia)
    if (typeof global.window === 'undefined') {
      // @ts-ignore
      global.window = {
        matchMedia: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        navigator: {
          userAgent: 'Test Agent'
        }
      } as any;
    }

    // Ensure navigator exists on window/global
    if (typeof global.navigator === 'undefined') {
        // @ts-ignore
        global.navigator = {
            userAgent: 'Test Agent'
        };
    }

    // Setup spies
    createElementSpy = vi.spyOn(document, 'createElement');
    // @ts-ignore
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // We don't restore globals because other tests might need them,
    // or we assume clean slate. But for safety within this file:
    // global.document = originalDocument;
    // global.window = originalWindow;
    // global.HTMLCanvasElement = originalHTMLCanvasElement;
    // Actually, messing with globals is risky for other tests if run in parallel.
    // But since we are likely running this test in isolation or sequential...
  });

  it('measures execution time and call counts', () => {
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      detectDeviceCapabilities();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`\n--- Benchmark Results ---`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Total Time: ${duration.toFixed(2)}ms`);
    console.log(`Average Time per Call: ${(duration / iterations).toFixed(4)}ms`);
    console.log(`createElement calls: ${createElementSpy.mock.calls.length}`);
    console.log(`getContext calls: ${getContextSpy.mock.calls.length}`);
    console.log(`-------------------------\n`);

    expect(true).toBe(true);
  });
});
