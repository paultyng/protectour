import Bluebird from 'bluebird';
// FIXME: assign this globally for axios
global.Promise = Bluebird;

import axios from 'axios';

function sendSlackMessage(webhookUrl, resource, message, color, options = {}) {
  const { fields } = options;
  resource = resource || {};

  const payload = {
    username: 'AWS Monitoring',
    mrkdwn: true,
    attachments: [
      {
        mrkdwn_in: ['pretext', 'text'],
        title: resource.title || options.title,
        title_link: resource.link || options.title_link,
        fields: [].concat(fields),
        color,
        text: message,
        fallback: message,
      },
    ]
  }

  return axios.post(webhookUrl, payload);
}

class SlackNotification {
  constructor(webhookUrl) {
    this._webhookUrl = webhookUrl;
  }

  error(resource, message, options = {}) {
    return sendSlackMessage(this._webhookUrl, resource, message, 'danger', options);
  }

  warning(resource, message, options = {}) {
    return sendSlackMessage(this._webhookUrl, resource, message, 'warning', options);
  }
}

export {
  SlackNotification
};
