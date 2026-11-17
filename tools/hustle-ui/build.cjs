let esbuild;try {esbuild=require('esbuild');} catch {esbuild=require('../../output/frontend-vendor/node_modules/esbuild');}
const path=require('node:path');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const nodePaths=[path.join(__dirname,'node_modules'),path.resolve('output/frontend-vendor/node_modules')];
(async()=>{
 await esbuild.build({entryPoints:['tools/hustle-ui/rich-text.js'],nodePaths,bundle:true,minify:true,format:'iife',outfile:'app/static/hustle/vendor/rich-text.js',external:['./diagrams.js'],legalComments:'linked'});
 await esbuild.build({entryPoints:['tools/hustle-ui/diagrams.js'],nodePaths,bundle:true,minify:true,format:'esm',splitting:true,outdir:'app/static/hustle/vendor',legalComments:'linked'});
})();
