import { cli } from './cli/index.js';

const args = process.argv.slice(2);
cli.runExit(args);
