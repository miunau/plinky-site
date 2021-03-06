import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import config from 'sapper/config/rollup.js';
import glob from 'rollup-plugin-glob'
import json from '@rollup/plugin-json';
import markdown from './src/utils/markdown.js'
import { mdsvex } from 'mdsvex';
import path from 'path';
import pkg from './package.json';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';
import url from '@rollup/plugin-url';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const legacy = !!process.env.SAPPER_LEGACY_BUILD;

const onwarn = (warning, onwarn) =>
	(warning.code === 'MISSING_EXPORT' && /'preload'/.test(warning.message)) ||
	(warning.code === 'CIRCULAR_DEPENDENCY' && /[/\\]@sapper[/\\]/.test(warning.message)) ||
	(warning.code === 'THIS_IS_UNDEFINED') ||
	onwarn(warning);


const extensions = [".svelte", ".svx"];

const mdsvexconfig = {
}

export default {
	client: {
		input: config.client.input().replace(/\.js$/, '.ts'),
		output: config.client.output(),
		plugins: [
			json(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			svelte({
				preprocess: [
					sveltePreprocess(),
					mdsvex(mdsvexconfig),
				],
				extensions,
				compilerOptions: {
					dev,
					hydratable: true
				}
			}),
			url({
				sourceDir: path.resolve(__dirname, 'src/node_modules/images'),
				publicPath: '/client/'
			}),
			resolve({
				browser: true,
				dedupe: ['svelte']
			}),
			commonjs(),
			typescript({ sourceMap: dev }),
      markdown(),
      glob(),

			legacy && babel({
				extensions: ['.js', '.mjs', '.html', '.svelte'],
				babelHelpers: 'runtime',
				exclude: ['node_modules/@babel/**'],
				presets: [
					['@babel/preset-env', {
						targets: '> 0.25%, not dead'
					}]
				],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					['@babel/plugin-transform-runtime', {
						useESModules: true
					}]
				]
			}),

			!dev && terser({
				module: true
			})
		],

		preserveEntrySignatures: false,
		onwarn,
	},

	server: {
		input: { server: config.server.input().server.replace(/\.js$/, ".ts") },
		output: config.server.output(),
		plugins: [
			json(),
			replace({
				'process.browser': false,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			svelte({
				preprocess: [
					sveltePreprocess(),
					mdsvex(mdsvexconfig),
				],
				compilerOptions: {
					dev,
					generate: 'ssr',
					hydratable: true
				},
				extensions,
				emitCss: false
			}),
			url({
				sourceDir: path.resolve(__dirname, 'src/node_modules/images'),
				publicPath: '/client/',
				emitFiles: false // already emitted by client build
			}),
			resolve({
				dedupe: ['svelte']
			}),
			commonjs(),
			typescript({ sourceMap: dev }),
      markdown(),
      glob(),
		],
		external: Object.keys(pkg.dependencies).concat(require('module').builtinModules),

		preserveEntrySignatures: 'strict',
		onwarn,
	},

	serviceworker: {
		input: config.serviceworker.input().replace(/\.js$/, '.ts'),
		output: config.serviceworker.output(),
		plugins: [
			json(),
			resolve(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			commonjs(),
			typescript({ sourceMap: dev }),
			!dev && terser()
		],

		preserveEntrySignatures: false,
		onwarn,
	}
};
