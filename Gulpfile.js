const gulp = require('gulp');
const esbuild = require('gulp-esbuild');
const del = require('del');
const chalk = require('chalk');
const cp = require('child_process');

function _cleanDist() {
  return del(['dist/**/*']);
}

function _build() {
  return gulp
    .src('src/**/*.ts')
    .pipe(
      esbuild({
        sourcemap: false,
        format: 'cjs',
        target: 'node16',
        loader: {
          '.ts': 'ts'
        }
      })
    )
    .pipe(gulp.dest('dist'));
}

function _watch(cb) {
  const spawn = cp.spawn('nodemon dist/index --delay 1', { shell: true });

  spawn.stdout.on('data', (data) => {
    console.log(chalk.white(`${data}`.trim()));
  });

  spawn.stderr.on('data', (data) => {
    console.error(chalk.red(`${data}`.trim()));
  });

  spawn.on('close', () => cb());

  gulp.watch('src/**/*.ts', { delay: 500 }, gulp.series(_cleanDist, _build));
}

module.exports.build = gulp.series(_cleanDist, _build);
module.exports.watch = gulp.series(_cleanDist, _build, _watch);
