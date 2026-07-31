const fs = require('node:fs');

const file = 'src/lib/breakthrough/catalog.ts';
let content = fs.readFileSync(file, 'utf8');

const factoryFn = `function v(
  id: string, name: string, description: string, cls: any, intensity: any,
  colorMood: any, audioMood: string, baseDuration: number, baseParticleCount: number,
  particlePattern: string, cameraArchetype: string, curveProfile: string, tags: string[],
  lowTierSafe: boolean, isFallback: boolean,
  durationRange: [number, number], particleCountRange: [number, number], speedRange: [number, number], scaleRange: [number, number],
  baseColors: string[], cameraPath: any, effects: any
): BaseVariant {
  return {
    id, name, description, class: cls, intensity, colorMood, audioMood, baseDuration, baseParticleCount,
    particlePattern, cameraArchetype, curveProfile, tags, lowTierSafe, isFallback,
    mutationBounds: { durationRange, particleCountRange, speedRange, scaleRange },
    baseColors, cameraPath, effects
  };
}
`;

if (!content.includes('function v(')) {
  content = content.replace('export const BREAKTHROUGH_VARIANTS: BaseVariant[] = [', factoryFn + 'export const BREAKTHROUGH_VARIANTS: BaseVariant[] = [');

  // Multi-line regex to match the exact shape of a BaseVariant object
  const regex = /\{\s*id:\s*'(.*?)',\s*name:\s*'(.*?)',\s*description:\s*'(.*?)',\s*class:\s*'(.*?)',\s*intensity:\s*'(.*?)',\s*colorMood:\s*'(.*?)',\s*audioMood:\s*'(.*?)',\s*baseDuration:\s*(\d+),\s*baseParticleCount:\s*(\d+),\s*particlePattern:\s*'(.*?)',\s*cameraArchetype:\s*'(.*?)',\s*curveProfile:\s*'(.*?)',\s*tags:\s*(\[.*?\]),\s*lowTierSafe:\s*(true|false),\s*isFallback:\s*(true|false),\s*mutationBounds:\s*\{\s*durationRange:\s*(\[.*?\]),\s*particleCountRange:\s*(\[.*?\]),\s*speedRange:\s*(\[.*?\]),\s*scaleRange:\s*(\[.*?\]),?\s*\},\s*baseColors:\s*(\[.*?\]),\s*cameraPath:\s*(\{[\s\S]*?\}),\s*effects:\s*(\{[\s\S]*?\}),?\s*\}/g; // NOSONAR

  content = content.replace(regex, (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22) => { // NOSONAR
    const cleanCameraPath = p21.replace(/\s+/g, ' ');
    const cleanEffects = p22.replace(/\s+/g, ' ');
    return `v('${p1}', '${p2}', '${p3}', '${p4}', '${p5}', '${p6}', '${p7}', ${p8}, ${p9}, '${p10}', '${p11}', '${p12}', ${p13}, ${p14}, ${p15}, ${p16}, ${p17}, ${p18}, ${p19}, ${p20}, ${cleanCameraPath}, ${cleanEffects})`;
  });

  fs.writeFileSync(file, content, 'utf8');
  console.log('Refactored catalog.ts successfully.');
} else {
  console.log('Already refactored.');
}
