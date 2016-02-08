import 'babel-polyfill';
import aws from 'aws-sdk';
import λ from 'apex.js'
import moment from 'moment';
import Bluebird from 'bluebird';
import axios from 'axios';
import { requiredTags, slackWebhookUrl, permanentTagKey, ttlHoursTagKey } from './config';

//update global promise implementation
global.Promise = Bluebird;

const region = aws.config.region;

const ec2 = new aws.EC2({ apiVersion: '2014-10-01' });
Bluebird.promisifyAll(Object.getPrototypeOf(ec2));

const cloudTrail = new aws.CloudTrail({ apiVersion: '2013-11-01' });
Bluebird.promisifyAll(Object.getPrototypeOf(cloudTrail));

function instanceTagMap(instance) {
  return instance.Tags.reduce((map, tag) => {
    map.set(tag.Key, tag.Value);
    return map;
  }, new Map());
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

function slackInstance(instance) {
  const tagMap = instanceTagMap(instance);
  const name = tagMap.get('Name');

  return ;
}

export default λ((e, ctx) => {
  //context.succeed(Object result);
  //context.fail(Error error);
  //context.done(Error error, Object result);
  //context.getRemainingTimeInMillis();
  //context.functionName
  //context.functionVersion
  //context.invokedFunctionArn
  //context.memoryLimitInMB
  //context.awsRequestId
  //context.logGroupName
  //context.logStreamname
  //context.identity (Object)
  //context.clientContext (Object)

  return ec2.describeInstancesAsync({
    Filters: [
      { Name: 'instance-state-name', Values: ['running'] }
    ]
  })
    .get('Reservations')
    .reduce((acc, res) => acc.concat(res.Instances), [])
    .map(instance => {
      const tagMap = instanceTagMap(instance);
      const errors = validateTagMap(tagMap);
      const warnings = [];

      let stop = true;

      // Check TTL
      if(tagMap.has(permanentTagKey)) {
        stop = false;
      }
      else if(tagMap.has(ttlHoursTagKey)) {
        const value = parseFloat(tagMap.get(ttlHoursTagKey));

        if(Number.isNaN(value)) {
          errors.push(`'${value}' is an invalid TTL.`);
        }
        else {
          const ttl = moment.duration(tagMap.get(ttlHoursTagKey), 'hours');
          const upTime = new Date().getTime() - instance.LaunchTime.getTime();

          if (upTime < ttl.asMilliseconds()) {
            ttl.subtract(uptime);
            warnings.push(`${ttl.humanize()} remaining on TTL.`)
            stop = false;
          }
        }
      }
      else {
        errors.push(`no TTL.`);
      }

      return { id: instance.InstanceId, instance, warnings, errors, stop };
    })
    .then(instances => {
      const attachments = [];

      instances.forEach(({ id, instance, warnings, errors, stop }) => {
        const name = instanceTagMap(instance).get('Name');

        const fields = []

        const title = `:ec2: Instance ${id}` + (name ? ` (${name})` : '');
        const title_link = `https://console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:instanceId=${id}`;
        const mrkdwn_in = ['pretext', 'text'];

        if(warnings.length > 0) {
          let text = warnings.join('\n');

          attachments.push({
            fields,
            title,
            title_link,
            mrkdwn_in,
            fallback: text,
            text,
            color: 'warning',
          });
        }

        if(errors.length > 0) {
          let text = errors.join('\n');

          attachments.push({
            fields,
            title,
            title_link,
            mrkdwn_in,
            fallback: text,
            text,
            color: 'danger',
          });
        }

        // #TODO: handle instance stopping
        /*
        if(stop) {
          attachments.push({
            fields,
            title,
            title_link,
            text: `Stopping Instance (TTL exhausted or absent)`,
            color: 'danger',
          });
        }
        */
      });

      return axios
        .post(slackWebhookUrl, { username: 'AWS Monitoring', mrkdwn: true, text: `Successfully reviewed tags of all running instances in *${region}*.`, attachments });
    })
    .then(() => console.log('Successfully reviewd tags of all instances.'));
});
