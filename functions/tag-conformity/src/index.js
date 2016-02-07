import 'babel-polyfill';
import aws from 'aws-sdk';
import λ from 'apex.js'
import moment from 'moment';
import Bluebird from 'bluebird';
import axios from 'axios';

//update global promise implementation
global.Promise = Bluebird;

const region = new aws.Config().region;

const ec2 = new aws.EC2({apiVersion: '2014-10-01'});
Bluebird.promisifyAll(Object.getPrototypeOf(ec2));

const defaultTimeToLive = moment.duration(4, 'hours');
const tagPrefix = "ua";
const requiredTags = {
  "environment": /^(production|staging|development|integration)$/,
  "product": /^(b2c|b2b)$/,
  "role": /^.+$/,
  "team": /^.+$/
}

function tagKey(tag) {
  return `${tagPrefix}:${tag}`;
}

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
    key = tagKey(key);

    if(!tagMap.has(key)) {
      messages.push(`missing tag *${key}*`);
    }
    else if(!pattern.test(tagMap.get(key))) {
      messages.push(`malformed tag *${key}*`);
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

  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  if(SLACK_WEBHOOK_URL == null) {
    throw new Error('SLACK_WEBHOOK_URL not set.');
  }

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
      if(tagMap.has(tagKey('permanent'))) {
        stop = false;
      }
      else if(tagMap.has(tagKey('ttl-hours'))) {
        const value = parseFloat(tagMap.get(tagKey('ttl-hours')));

        if(Number.isNaN(value)) {
          errors.push(`'${value}' is an invalid TTL.`);
        }
        else {
          const ttl = moment.duration(tagMap.get(tagKey('ttl-hours')), 'hours');
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
        const title = `Instance ${id}` + (name ? ` (${name})` : '');
        const title_link = `https://console.aws.amazon.com/ec2/v2/home?region=${region}#Instances:instanceId=${id};sort=instanceState`;
        const mrkdwn_in = ['pretext', 'text'];

        if(warnings.length > 0) {
          let text = warnings.join('\n');

          attachments.push({
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
            title,
            title_link,
            text: `Stopping Instance (TTL exhausted or absent)`,
            color: 'danger',
          });
        }
        */
      });

      return axios
        .post(SLACK_WEBHOOK_URL, { mrkdwn: true, text: `Successfully reviewed tags of all running instances in *${region}*.`, attachments });
    })
    .then(() => console.log('Successfully reviewd tags of all instances.'));
});
