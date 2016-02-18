import aws from 'aws-sdk';
import moment from 'moment';
import Bluebird from 'bluebird';

import { SlackNotification } from '../notification';

function getStats(cloudWatch, service) {
  const endTime = moment().toDate();
  const startTime = moment().subtract(6, 'hours').toDate();
  const Dimensions = [
    { Name: 'Currency', Value: 'USD' }
  ];

  if(service) {
    Dimensions.push({ Name: 'ServiceName', Value: service });
  }

  return cloudWatch.getMetricStatisticsAsync({
    EndTime: endTime,
    MetricName: 'EstimatedCharges',
    Namespace: 'AWS/Billing',
    Period: 60,
    StartTime: startTime,
    Statistics: [
      'Sum'
    ],
    Dimensions
  })
    .get('Datapoints')
    .then(points => points.sort((a, b) => b.Timestamp.getTime() - a.Timestamp.getTime())[0])
    .then(p => p ? p.Sum : 0)
    .then(sum => ({ service, sum }));
}

class EstimatedCharge {
  run() {
    const region = aws.config.region;

    const cloudWatch = new aws.CloudWatch({ apiVersion: '2010-08-01' });
    Bluebird.promisifyAll(Object.getPrototypeOf(cloudWatch));

    const notification = new SlackNotification(process.env.SLACK_WEBHOOK_URL);
    const services = ['AWSDataTransfer', 'AmazonEC2', 'AmazonRDS', 'AmazonS3', 'AWSSupportBusiness']

    const fieldsPromise = Bluebird.resolve(services)
      .map(s => getStats(cloudWatch, s))
      .map(s => ({ title: s.service, value: s.sum, short: true }))
      .filter(f => f.value > 0);

    const totalPromise = getStats(cloudWatch)
      .get('sum')

    return Bluebird.join(totalPromise, fieldsPromise, (total, fields) => {
      return notification.warning(null, `Estimated charges are *${total}*`, { fields })
    });
  }
}

export default EstimatedCharge;
