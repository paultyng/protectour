import 'babel-polyfill';
import λ from 'apex.js'
import TrustedAdvisor from './rules/trusted_advisor';

export default λ(() => {
  const job = new TrustedAdvisor(process.env.SLACK_WEBHOOK_URL);

  return job
    .run()
    .then(() => console.log('Successfully reviewed trusted advisor findings.'));
});
