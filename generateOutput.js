import fs from 'fs';
import path from 'path';
import OutputStationaryTopLevel from './src/hardware.js';

const topLevel = new OutputStationaryTopLevel(2, 3, 3, 2, 2, 2);
const simulationResult = topLevel.simulate(null);

const outputPath = path.resolve('./output.json');

fs.writeFileSync(outputPath, JSON.stringify(simulationResult, null, 2));
console.log('Simulation result written to output.json');