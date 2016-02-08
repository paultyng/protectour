import 'babel-polyfill';
import λ from 'apex.js'
import TagConformity from './tag_conformity';

export default λ(() => {
  const job = new TagConformity(process.env.SLACK_WEBHOOK_URL);

  return job
    .run()
    .then(() => console.log('Successfully reviewed tags.'));
});
