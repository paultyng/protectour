import aws from 'aws-sdk';
import Bluebird from 'bluebird';

import { Ec2Instance } from '../resource';
import { SlackNotification } from '../notification';

class TrustedAdvisor {
  run() {
    const region = aws.config.region;

    const support = new aws.Support({ apiVersion: '2013-04-15' });
    Bluebird.promisifyAll(Object.getPrototypeOf(support));

    const notification = new SlackNotification(process.env.SLACK_WEBHOOK_URL);

    return support.describeTrustedAdvisorChecksAsync({
      language: 'en'
    })
      .get('checks')
      // TODO: maybe remove this filter?
      .filter(check => check.category === 'cost_optimizing' && check.metadata.includes('Instance ID'))
      .then(checks => {
        return support.describeTrustedAdvisorCheckSummariesAsync({
          checkIds: checks.map(c => c.id)
        })
          .get('summaries')
          .filter(summary => ['warning', 'error'].includes(summary.status) && summary.hasFlaggedResources)
          .map(summary => {
            return { summary, check: checks.find(c => c.id === summary.checkId) };
          })
      })
      .map(({summary, check}) => {
        return support.describeTrustedAdvisorCheckResultAsync({
          checkId: check.id,
          language: 'en'
        })
          .get('result')
          .then(result => {
            const resources = [];

            const instanceNameIndex = check.metadata.findIndex(m => m === 'Instance Name');
            const savingsIndex = check.metadata.findIndex(m => m === 'Estimated Monthly Savings');
            const instanceIdIndex = check.metadata.findIndex(m => m === 'Instance ID');
            if(instanceIdIndex >= 0) {
              resources.push(...result.flaggedResources.map(r => {
                const tags = new Map();
                const fields = [];

                if(instanceNameIndex >= 0) {
                  tags.set('Name', r.metadata[instanceNameIndex]);
                }

                if(savingsIndex >= 0) {
                  fields.push({
                    title: 'Savings',
                    value: r.metadata[savingsIndex],
                    short: true
                  })
                }

                return { fields, resource: new Ec2Instance(r.region, r.metadata[instanceIdIndex], tags) };
              }));
            }

            return Bluebird.resolve(resources)
              .map(({ resource, fields }) => notification[summary.status](resource, check.name, { fields }));
          })
      });
  }
}

export default TrustedAdvisor;
