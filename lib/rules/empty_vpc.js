import aws from 'aws-sdk';
import Bluebird from 'bluebird';

import { Vpc } from '../resource';
import { createTagMap } from '../tags';
import { SlackNotification } from '../notification';

function loadEc2Instances(region, ec2, vpcId) {
  return ec2.describeInstancesAsync({
    Filters: [
      { Name: 'vpc-id', Values: [vpcId] }
    ],
    MaxResults: 5
  })
    .get('Reservations')
    .reduce((acc, res) => acc.concat(res.Instances), []);
}

function loadVpcs(region, ec2) {
  return ec2.describeVpcsAsync({
    Filters: [
      { Name: 'isDefault', Values: ['false'] }
    ]
  })
    .get('Vpcs')
    .map(vpc => new Vpc(region, vpc.VpcId, createTagMap(vpc.Tags)));
}

class EmptyVpc {
  run() {
    const region = aws.config.region;

    const ec2 = new aws.EC2({ apiVersion: '2014-10-01' });
    Bluebird.promisifyAll(Object.getPrototypeOf(ec2));

    const notification = new SlackNotification(process.env.SLACK_WEBHOOK_URL);

    return loadVpcs(region, ec2)
      .map(vpc => {
        return loadEc2Instances(region, ec2, vpc.id)
          .then(instances => {
            return { vpc, count: instances.length };
          });
      })
      .filter(({ vpc, count }) => count === 0)
      .map(({ vpc, count }) => notification.error(vpc, 'No instances present in VPC.'));
  }
}

export default EmptyVpc;
