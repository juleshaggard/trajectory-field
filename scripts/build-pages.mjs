import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve("dist-pages");
const indexPath = resolve(outputDirectory, "index.html");
const routes = [
  "airspace",
  "archive",
  "atlas",
  "blank",
  "compass",
  "drum",
  "map",
  "plotter",
  "pulse",
  "radar",
  "terrain",
  "traffic",
];

await Promise.all(routes.map(async (route) => {
  const routeDirectory = resolve(outputDirectory, route);
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(indexPath, resolve(routeDirectory, "index.html"));
}));

await copyFile(indexPath, resolve(outputDirectory, "404.html"));
await writeFile(resolve(outputDirectory, ".nojekyll"), "");
