import 'babel-polyfill';
import λ from 'apex.js'
import EstimatedCharge from './rules/estimated_charge';

export default λ(() => {
  const job = new EstimatedCharge(process.env.SLACK_WEBHOOK_URL);

  return job
    .run()
    .then(() => console.log('Successfully notified of estimated charges.'));
});
