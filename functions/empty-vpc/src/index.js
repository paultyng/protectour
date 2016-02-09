import 'babel-polyfill';
import λ from 'apex.js'
import EmptyVpc from './rules/empty_vpc';

export default λ(() => {
  const job = new EmptyVpc(process.env.SLACK_WEBHOOK_URL);

  return job
    .run()
    .then(() => console.log('Successfully reviewed VPCs.'));
});
