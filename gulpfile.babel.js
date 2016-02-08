'use strict';

import gulp from 'gulp';
import { argv } from 'yargs';
import fs from 'fs';
import path from 'path';
import aws from 'aws-sdk';

const region = 'us-east-1';

aws.config.update({ region });

gulp.task('run-function', (cb) => {
  const func = require(`./functions/${argv.function}/src`).default;

  const ctx = {
    succeed(v) {
      cb();
    },
    fail(err) {
      cb(err);
    }
  }

  func({}, ctx);
});
