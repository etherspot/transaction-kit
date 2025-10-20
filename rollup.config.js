import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import dotenv from 'dotenv';
import dts from 'rollup-plugin-dts';

dotenv.config();

const packageJson = require('./package.json');

const external = [
  'etherspot',
  '@etherspot/modular-sdk',
  'buffer',
  'lodash',
  'viem',
  '@etherspot/eip1271-verification-util',
  'viem/chains',
  'viem/account-abstraction',
  '@zerodev/sdk',
];

export default [
  {
    input: 'lib/index.ts',
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
      },
    ],
    plugins: [
      typescript({
        tsconfig: 'tsconfig.json',
        exclude: ['example/**', 'lib/test/**'],
      }),
      replace({
        preventAssignment: true,
        values: {
          __ETHERSPOT_DATA_API_KEY__: process.env.ETHERSPOT_DATA_API_KEY ?? '',
          __ETHERSPOT_BUNDLER_API_KEY__:
            process.env.ETHERSPOT_BUNDLER_API_KEY ?? '',
        },
      }),
    ],
    external,
    watch: {
      clearScreen: false,
      include: 'lib/**',
    },
  },
  {
    input: 'dist/esm/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts.default()],
    external,
    watch: {
      clearScreen: false,
      include: 'lib/**',
    },
  },
];
