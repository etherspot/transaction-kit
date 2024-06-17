import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import dotenv from 'dotenv';
import replace from '@rollup/plugin-replace';

dotenv.config();

const packageJson = require('./package.json');

const external = [
  'etherspot',
  '@etherspot/prime-sdk',
  '@etherspot/modular-sdk',
  'ethers',
  'react',
  'buffer',
  'lodash',
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['./example/**', './src/test/**']
      }),
      replace({
        __ETHERSPOT_DATA_API_KEY__: process.env.ETHERSPOT_DATA_API_KEY ?? '',
        __ETHERSPOT_BUNDLER_API_KEY__: process.env.ETHERSPOT_BUNDLER_API_KEY ?? '',
        preventAssignment: true,
      }),
    ],
    external,
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
  },
  {
    input: 'dist/esm/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external,
    watch: {
      clearScreen: false,
      include: 'src/**',
    },
  },
];
