'use strict';

import 'babel-polyfill';
import gulp from 'gulp';
import fs from 'fs';
import path from 'path';
import aws from 'aws-sdk';

import TagConformity from './lib/rules/tag_conformity';

const region = 'us-east-1';

aws.config.update({ region });

gulp.task('tag-conformity', (cb) => {
  const rule = new TagConformity();
  rule.run()
    .then(() => cb())
    .error(err => cb(err));
});
