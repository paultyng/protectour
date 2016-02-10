import aws from 'aws-sdk';
import moment from 'moment';
import Bluebird from 'bluebird';

import { Ec2Instance, Vpc, RdsDbCluster } from '../resource';
import { createTagMap } from '../tags';
import { SlackNotification } from '../notification';

const requiredTags = {
  "env": /^(production|staging|development|integration|shared)$/,
  "product": /^(b2c|b2b|shared)$/,
  "role": /^.+$/,
  "owner": /^.+$/
}

function validateTagMap(tagMap) {
  const messages = []

  // Check all required tags for existence and pattern match
  for(let [key, pattern] of Object.entries(requiredTags)) {
    if(!tagMap.has(key)) {
      messages.push(`missing tag *${key}*`);
    }
    else if(!pattern.test(tagMap.get(key))) {
      messages.push(`malformed tag *${key}* _${pattern}_`);
    }
  }

  return messages;
}

function loadEc2Instances(region, ec2) {
  return ec2.describeInstancesAsync({
    Filters: [
      { Name: 'instance-state-name', Values: ['running'] }
    ]
  })
    .get('Reservations')
    .reduce((acc, res) => acc.concat(res.Instances), [])
    .map(instance => new Ec2Instance(region, instance.InstanceId, createTagMap(instance.Tags)));
}

function loadVpcs(region, ec2) {
  return ec2.describeVpcsAsync()
    .get('Vpcs')
    .map(vpc => new Vpc(region, vpc.VpcId, createTagMap(vpc.Tags)));
}

class TagConformity {
  run() {
    const region = aws.config.region;

    const ec2 = new aws.EC2({ apiVersion: '2014-10-01' });
    Bluebird.promisifyAll(Object.getPrototypeOf(ec2));

    const notification = new SlackNotification(process.env.SLACK_WEBHOOK_URL);

    return Bluebird.join(
        loadEc2Instances(region, ec2),
        loadVpcs(region, ec2)
      )
      .reduce((a, b) => a.concat(b), [])
      .map(resource => ({ resource, messages: validateTagMap(resource.tagMap) }))
      .filter(({ resource, messages }) => messages.length > 0)
      .map(({ resource, messages }) => notification.error(resource, messages.join('\n')));
  }
}

export default TagConformity;
