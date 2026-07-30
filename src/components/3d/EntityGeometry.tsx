export function EntityGeometry({
  type,
  size
}: {
  readonly type: "sphere" | "cube" | "octahedron" | "torus" | "cone";
  readonly size: number;
}) {
  switch (type) {
    case "cube":
      return <boxGeometry args={[size, size, size]} />;
    case "octahedron":
      return <octahedronGeometry args={[size, 0]} />;
    case "torus":
      return <torusGeometry args={[size * 0.6, size * 0.2, 16, 32]} />;
    case "cone":
      return <coneGeometry args={[size * 0.6, size, 16]} />;
    case "sphere":
    default:
      return <sphereGeometry args={[size, 32, 32]} />;
  }
}
