'use strict';



/* DEPENDENCIES
 * ========================================================================== */


// Base
const browsersync  = require('browser-sync');
const buffer       = require('vinyl-buffer');
const chokidar     = require('chokidar');
const del          = require('del');
const fs           = require('fs-extra');
const glob         = require('glob');
const path         = require('path');
const source       = require('vinyl-source-stream');
const through      = require('through2');

// Gulp
const gulp         = require('gulp');

// Utilities
const gutil        = require('gulp-util');
const rename       = require('gulp-rename');
const runSequence  = require('run-sequence');

// CSS
const autoprefixer = require('gulp-autoprefixer');
const sass         = require('gulp-sass');
const sourcemaps   = require('gulp-sourcemaps');
const stylelint    = require('gulp-stylelint');

// JavaScript
const babel        = require('gulp-babel');
const babelify     = require('babelify');
const browserify   = require('browserify');
const envify       = require('envify/custom');
const eslint       = require('gulp-eslint');
const uglify       = require('gulp-uglify');

// HTML
const fm           = require('front-matter');
const hb           = require('gulp-hb');

// Images
const imagemin     = require('gulp-imagemin');
const svgSprite    = require('gulp-svg-sprite');

// Front End Styleguide
const frontEndStyleguideInit = require('front-end-styleguide-init');

// CWD
const cwd = gutil.env.dir;
const moduleCWD = process.cwd();

// Switch CWD to actual working directory
process.cwd(cwd);



/* CONFIGURATION
 * ========================================================================== */

let config = frontEndStyleguideInit.configFile;
let configPath = `${cwd}/` + (gutil.env.config || 'config/config.json');

try {
  config = Object.assign(config, require(configPath));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    console.log(error.code);
  } else {
    console.error(`
${gutil.colors.black.bgYellow(' WARN ')} The configuration file ${gutil.colors.magenta(configPath)} is missing.
       Fall back to default configuration.
`);
  }
}


let paths = frontEndStyleguideInit.pathsFile;
let pathsPath = `${cwd}/` + (gutil.env.paths  || 'config/paths.json');

try {
  paths = Object.assign(paths, require(pathsPath));
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    console.log(error.code);
  } else {
    console.error(`
${gutil.colors.black.bgYellow(' WARN ')} The paths configuration file ${gutil.colors.magenta(pathsPath)} is missing.
       Fall back to default paths configuration.
`);
  }
}


// Adjust paths with CWD

paths.src  = `${cwd}/${paths.src}`;
paths.dev  = `${cwd}/${paths.dev}`;
paths.prev = `${cwd}/${paths.prev}`;
paths.dist = `${cwd}/${paths.dist}`;



/* CLEAN
 * Delete directories
 * ========================================================================== */


// Clean Development
gulp.task('clean-dev', () => {
  return del(paths.dev, {force: true});
});


// Clean Preview
gulp.task('clean-prev', () => {
  return del(paths.prev, {force: true});
});


// Clean Distribution
gulp.task('clean-dist', () => {
  return del(paths.dist, {force: true});
});


// Clean Dev Images
gulp.task('clean-img-dev', () => {
  return del(`${paths.dev}/${paths.img.base}/**`, {force: true});
});




/* CSS
 * Compile Sass into CSS
 * ========================================================================== */


// CSS Lint
gulp.task('css-lint', () => {
  process.chdir(cwd);

  return gulp.src(`${paths.src}/${paths.css.base}/**/*.scss`)
    .pipe(stylelint({
      failAfterError: false,
      reporters: [{
        formatter: 'string',
        console: true
      }]
    }));
});


// CSS Lint Break
gulp.task('css-lint-break', () => {
  process.chdir(cwd);

  return gulp.src(`${paths.src}/${paths.css.base}/**/*.scss`)
    .pipe(stylelint({
      failAfterError: true,
      reporters: [{
        formatter: 'string',
        console: true
      }]
    }));
});


// CSS Development
gulp.task('css-dev', () => {
  return gulp.src(`${paths.src}/${paths.css.base}/**/*.scss`)
    .pipe(sourcemaps.init())
      .pipe(sass(config.css.dev).on('error', sass.logError))
      .pipe(autoprefixer(config.css.autoprefixer))
      .pipe(rename(paths.css.output))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(`${paths.dev}/${paths.css.base}`))
    .pipe(browsersync.stream({match: '**/*.css'}));
});


// CSS Watch
gulp.task('css-watch', ['css-lint', 'css-dev']);


// CSS Styleguide
gulp.task('css-sg', () => {
  return gulp.src(`${moduleCWD}/docs/sg.scss`)
    .pipe(sass(config.css.dist))
    .pipe(autoprefixer(config.css.autoprefixer))
    .pipe(gulp.dest(`${paths.dev}/${paths.css.base}`));
});


// CSS Preview
gulp.task('css-prev', () => {
  return gulp.src(`${paths.src}/${paths.css.base}/**/*.scss`)
    .pipe(sass(config.css.dist))
    .pipe(autoprefixer(config.css.autoprefixer))
    .pipe(rename(paths.css.output))
    .pipe(gulp.dest(`${paths.prev}/${paths.css.base}`));
});

// CSS Production
gulp.task('css-dist', () => {
  return gulp.src(`${paths.src}/${paths.css.base}/**/*.scss`)
    .pipe(sass(config.css.dist))
    .pipe(autoprefixer(config.css.autoprefixer))
    .pipe(rename(paths.css.output))
    .pipe(gulp.dest(`${paths.dist}/${paths.css.base}`));
});




/* JAVASCRIPT
 * Lint, bundle and transpile JavaScript
 * ========================================================================== */


// Handle Browserify and Babel errors
let browserifyError = function(error) {
  if (error.filename) {
    // Babel error
    error.filename = error.filename.replace(/\\/g, '/');
    error.message  = error.message.split(': ');

    console.log(`
${gutil.colors.underline(error.filename)}
  ${error.loc.line}:${error.loc.column}  ${gutil.colors.red(`error`)}  ${error.message[1]}

${error.codeFrame}
    `);
  } else {
    // Browserify error
    console.log(`
${gutil.colors.red('Browserify error')}
${error.message}
    `);
  }
  this.emit('end');
};


// JavaScript Lint
gulp.task('js-lint', () => {
  process.chdir(cwd);

  return gulp.src(`${paths.src}/${paths.js.base}/**/*.js`)
    .pipe(eslint())
    .pipe(eslint.format());
});


// JavaScript Lint Break
gulp.task('js-lint-break', () => {
  process.chdir(cwd);

  return gulp.src(`${paths.src}/${paths.js.base}/**/*.js`)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


// JavaScript Dev
gulp.task('js-dev', () => {
  const b = browserify({
    entries: `${paths.src}/${paths.js.base}/${paths.js.entry}`,
    debug: true,
    transform: [babelify]
  });

  b.transform(envify({
    _: 'purge',
    NODE_ENV: 'development'
  }), {
    global: true
  });

  return b.bundle().on('error', browserifyError)
    .pipe(source(paths.js.output))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(`${paths.dev}/${paths.js.base}`))
    .pipe(browsersync.stream({match: '**/*.js'}));
});


// JavaScript Watch
gulp.task('js-watch', ['js-lint', 'js-dev']);


// JavaScript Styleguide
gulp.task('js-sg', () => {
  return gulp.src(`${moduleCWD}/docs/sg.js`)
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(uglify())
    .pipe(gulp.dest(`${paths.dev}/${paths.js.base}`));
});


// JavaScript Preview
gulp.task('js-prev', () => {
    const b = browserify({
      entries: `${paths.src}/${paths.js.base}/${paths.js.entry}`,
      debug: true,
      transform: [babelify]
    });

    b.transform(envify({
      _: 'purge',
      NODE_ENV: 'development'
    }), {
      global: true
    });

    return b.bundle()
      .pipe(source(paths.js.output))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest(`${paths.prev}/${paths.js.base}`));
});


// JavaScript Production
gulp.task('js-dist', () => {
  const b = browserify({
    entries: `${paths.src}/${paths.js.base}/${paths.js.entry}`,
    debug: true,
    transform: [babelify]
  });

  b.transform(envify({
    _: 'purge',
    NODE_ENV: 'production'
  }), {
    global: true
  });

  return b.bundle()
    .pipe(source(paths.js.output))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(`${paths.dist}/${paths.js.base}`));
});




/* HTML
 * Pre-compile Handlebars files into HTML
 * ========================================================================== */


// Handle Handlebars error
let handlebarsError = function(error) {
  console.log(
    '\n' + gutil.colors.underline(error.fileName) + '\n'
    + '  ' + gutil.colors.red('Handlebars error: ')
    + gutil.colors.blue(error.message.replace(error.fileName + ': ', '')) + '\n'
  );
  this.emit('end');
};


let handlebarsOptions = {
  bustCache: true
};


// Handlebars Function
let compileHandlebars = (task) => {
  let pageDir      = `${paths.src}/${paths.html.base}/${paths.html.pages}/**/*.hbs`;
  let componentDir = `${paths.src}/${paths.html.base}/${paths.html.pages}/components/**/*.hbs`;

  // Create gulp.src and gulp.dest variables for the
  // development and production task
  let gulpSrc  = pageDir;
  let gulpDest = `${paths[task]}`;

  if (task === 'prev') {
    gulpSrc  = [pageDir, `!${componentDir}`];
  }

  let dataMeta = {
    version: require(`${cwd}/package.json`).version,
    dev: task === 'dev',
  };


  // Create dataPages object
  let pageList = glob.sync(pageDir);
  let dataPages = [];

  /*
    Model for navigation:

    dataPages = [{
      name: 'Category name',
      pages: [{
        name: 'Page name',
        url: 'some-page.html'
      }]
    }];
  */

  for (let page of pageList) {
    let frontMatter = fm(fs.readFileSync(page, 'utf8')).attributes;
    let url         = path.relative(`${paths.src}/${paths.html.base}/${paths.html.pages}`, page).replace('.hbs', '.html').replace(/\\/g, '/');
    let name        = frontMatter.title ? frontMatter.title : url;
    let category    = frontMatter.category ? frontMatter.category : 'Undefined';

    let pageItem = {
      name,
      url
    };

    let categoryInDataPages = dataPages.find((item) => item.name === category);

    if (categoryInDataPages) {
      categoryInDataPages.pages.push(pageItem);
    } else {
      dataPages.push({
        name: category,
        pages: [pageItem]
      });
    }
  }


  // Create Handlebars Stream with partials, helpers and data
  let hbStream = hb(handlebarsOptions)
    .partials(`${paths.src}/${paths.html.base}/${paths.html.partials}/**/*.hbs`)
    .partials(`${moduleCWD}/docs/**/*.hbs`)
    .helpers(require('handlebars-helpers'))
    .helpers(require('handlebars-layouts'))
    .helpers({
      // Return page metadata
      // This includes file specific data aswell as frontmatter
      page: (key, options) => {
        let file = options.data.file.path;

        // Initialize variables
        let currentPath = path.dirname(file);
        let sourcePath  = path.resolve(`${paths.src}/${paths.html.base}/${paths.html.pages}`);
        let frontMatter = fm(fs.readFileSync(file, 'utf8')).attributes;

        // Return the file name without extension
        if (key === 'filebase') {
          return path.basename(file, '.hbs');

        // Return the whole filename including extension
      } else if (key === 'filename') {
          return `${path.basename(file, '.hbs')}.html`;

        // Return the UNIX filepath
        } else if (key === 'filepath') {
          return path.relative(`${paths.src}/${paths.html.base}/${paths.html.pages}`, file).replace('.hbs', '.html').replace(/\\/g, '/');

        // Return a relative path to the task folder root
        } else if (key === 'rel') {
          if (currentPath === sourcePath) {
            return '';
          }
          return `${path.relative(currentPath, sourcePath)}/`.replace(/\\/g, '/');

        // Return frontmatter value
        } else if (frontMatter.hasOwnProperty(key)) {
          return frontMatter[key];
        }
      }
    })
    .data({
      meta: dataMeta,
      categories: dataPages
    });


  const removeFrontmatter = through.obj(function(file, enc, callback) {
    let contents = file.contents.toString('utf8');
    file.contents = new Buffer(contents.replace(/^(---)(\r?\n|\r)[\S\s]*(---)(\r?\n|\r)/, ''), 'utf8');

    this.push(file);
    callback();
  });


  return gulp.src(gulpSrc)
    .pipe(task === 'dev' ? hbStream.on('error', handlebarsError) : hbStream)
    .pipe(removeFrontmatter)
    .pipe(rename({extname: '.html'}))
    .pipe(gulp.dest(gulpDest));
};


// HTML Development
gulp.task('html-dev', () => {
  return compileHandlebars('dev');
});


// HTML Watch
gulp.task('html-watch', ['html-dev'], browsersync.reload);


// HTML Preview
gulp.task('html-prev', () => {
  return compileHandlebars('prev');
});




/* Images
 * Copy images and use a lossless compressor
 * ========================================================================== */

let imgSource = [
  `${paths.src}/${paths.img.base}/**`,
  `!${paths.src}/${paths.img.base}/${paths.img.icons}`,
  `!${paths.src}/${paths.img.base}/${paths.img.icons}/**`
];

let iconSource = `${paths.src}/${paths.img.base}/${paths.img.icons}/*.svg`;

let imageminConfig = [
  imagemin.jpegtran(config.img.imagemin.jpg),
  imagemin.optipng(config.img.imagemin.png),
  imagemin.svgo(config.img.imagemin.svg)
];



// Images Dev Copy
gulp.task('img-dev-copy', ['clean-img-dev'], () => {
  return gulp.src(imgSource)
    .pipe(gulp.dest(`${paths.dev}/${paths.img.base}`));
});


// Images Dev Icons
gulp.task('img-dev-icons', ['clean-img-dev'], () => {
  return gulp.src(iconSource)
    .pipe(svgSprite(config.img.svgSpriteDev).on('error', (error) => { console.log(error); }))
    .pipe(gulp.dest(`${paths.dev}/${paths.img.base}`));
});


// Images Dev
gulp.task('img-dev', ['img-dev-copy', 'img-dev-icons']);


// Images Watch
gulp.task('img-watch', ['img-dev'], browsersync.reload);



// Images Preview Copy
gulp.task('img-prev-copy', () => {
  return gulp.src(imgSource)
    .pipe(imagemin(imageminConfig))
    .pipe(gulp.dest(`${paths.prev}/${paths.img.base}`));
});


// Images Preview Icons
gulp.task('img-prev-icons', () => {
  return gulp.src(iconSource)
    .pipe(svgSprite(config.img.svgSpriteDist))
    .pipe(gulp.dest(`${paths.prev}/${paths.img.base}`));
});


// Images Preview
gulp.task('img-prev', ['img-prev-copy', 'img-prev-icons']);



// Images Production Copy
gulp.task('img-dist-copy', () => {
  return gulp.src(imgSource)
    .pipe(imagemin(imageminConfig))
    .pipe(gulp.dest(`${paths.dist}/${paths.img.base}`));
});


// Images Production Icons
gulp.task('img-dist-icons', () => {
  return gulp.src(iconSource)
    .pipe(svgSprite(config.img.svgSpriteDist))
    .pipe(gulp.dest(`${paths.dist}/${paths.img.base}`));
});


// Images Production
gulp.task('img-dist', ['img-dist-copy', 'img-dist-icons']);




/* SIMPLE COPY
 * Copy files from one location to another – very simple
 * ========================================================================== */

let simpleCopyMessage = (from, to) => {
  console.log(`${gutil.colors.underline(from)} => ${gutil.colors.underline(to)}`);
};

let simpleCopy = (task) => {
  let copyConfig = `${paths.src}/copy.js`;
  let destination = paths[task];
  let copyList = null;

  try {
    delete require.cache[require.resolve(copyConfig)];
    copyList = require(copyConfig);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      console.log(error.code);
    } else {
      console.error(`
${gutil.colors.black.bgYellow(' WARN ')} The copy file ${gutil.colors.magenta(copyConfig)} is missing.
       No Files will be copied.
  `);
    }
  }

  if (Array.isArray(copyList) && copyList.length > 0) {
    for (let item of copyList) {
      let exclude = false;

      if (Array.isArray(item.exclude)) {
        exclude = item.exclude.indexOf(task) !== -1;
      } else if (task === item.exclude) {
        exclude = true;
      }

      if (!exclude) {
        glob(`${cwd}/${item.folder}/${item.files}`, {nodir: true}, function(globError, files) {
          files.forEach(function(fileSrc) {

            let fileDest = `${destination}/${item.dest}/${path.relative(cwd + '/' + item.folder, fileSrc)}`;

            try {
              fs.copySync(fileSrc, fileDest);
              simpleCopyMessage(path.relative(cwd, fileSrc), path.relative(cwd, fileDest));
            } catch (fsError) {
              console.error(fsError);
            }
          });
        });
      }
    }

    browsersync.reload();
  }
};

// Copy dev
gulp.task('copy-dev', () => {
  return simpleCopy('dev');
});


// Copy watch
gulp.task('copy-watch', ['copy-dev']);


// Copy preview
gulp.task('copy-prev', () => {
  return simpleCopy('prev');
});

// Copy production
gulp.task('copy-dist', () => {
  return simpleCopy('dist');
});




/* DEVELOPMENT
 * ========================================================================== */


gulp.task('development', ['clean-dev', 'css-lint', 'js-lint'], () => {
  runSequence(['css-dev', 'css-sg', 'js-dev', 'js-sg', 'html-dev', 'img-dev', 'copy-dev']);
});



/* PREVIEW
 * ========================================================================== */


gulp.task('preview', ['clean-prev', 'css-lint-break', 'js-lint-break'], () => {
  runSequence(['css-prev', 'js-prev', 'html-prev', 'img-prev', 'copy-prev']);
});




/* PRODUCTION
 * ========================================================================== */


gulp.task('production', ['clean-dist', 'css-lint-break', 'js-lint-break'], () => {
  runSequence(['css-dist', 'js-dist', 'img-dist', 'copy-dist']);
});




/* DEFAULT
 * ========================================================================== */


config.html.browsersync.notify = {
  styles: [
    'position: fixed',
    'z-index: 9999',
    'box-sizing: border-box',
    'height: 2rem',
    'top: 0',
    'right: 2rem',
    'padding: 0 1rem',
    'font-size: 0.875rem',
    'font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;',
    'font-weight: 400',
    'text-transform: uppercase',
    'line-height: 2rem',
    'letter-spacing: 0.02em',
    'color: #fff',
    'background-color: rgb(0, 120, 255)'
  ]
};


gulp.task('browsersync', () => {
  // Setup Browsersync root directory
  config.html.browsersync.server = paths.dev;

  // Fire up Browsersync
  browsersync(config.html.browsersync);
});


gulp.task('watcher', () => {
  const options = {
    cwd: paths.src + '/',
    ignoreInitial: true,
    ignorePermissionErrors: true
  };

  const message = (event, filepath) => {
    console.log('\n');
    gutil.log(`${event[0].toUpperCase() + event.slice(1)} ${gutil.colors.blue(filepath)}`);
  };


  chokidar.watch(`${paths.css.base}/**/*.scss`, options)
    .on('all', (event, filepath) => {
      message(event, filepath);
      runSequence('css-watch');
    });

  chokidar.watch(`${paths.src}/${paths.js.base}/**/*.js`, options)
    .on('all', (event, filepath) => {
      message(event, filepath);
      runSequence('js-watch');
    });

  chokidar.watch(`${paths.src}/${paths.html.base}/**/*.hbs`, options)
    .on('all', (event, filepath) => {
      message(event, filepath);
      runSequence('html-watch');
    });

  chokidar.watch(`${paths.src}/${paths.img.base}/**/*`, options)
    .on('all', (event, filepath) => {
      message(event, filepath);
      runSequence('img-watch');
    });

  chokidar.watch(`${paths.src}/copy.js`, options)
    .on('all', (event, filepath) => {
      message(event, filepath);
      runSequence('copy-watch');
    });
});


gulp.task('default', ['clean-dev', 'css-lint', 'js-lint'], () => {
  // Run initial task queue
  runSequence(
    ['css-dev', 'css-sg', 'js-dev', 'js-sg', 'html-dev', 'img-dev', 'copy-dev'],
    'browsersync', 'watcher'
  );
});
