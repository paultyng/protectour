import Bluebird from 'bluebird';
// FIXME: assign this globally for axios
global.Promise = Bluebird;

import axios from 'axios';

class Notification {
  error(resource, message) {
    const data = `${resource.title}: ${message}`;
    console.error(data);
    return Bluebird.resolve();
  }
}

export default Notification;

class SlackNotification {
  constructor(webhook_url) {
    this._webhook_url = webhook_url;
  }

  error(resource, message) {
    message = {
      username: 'AWS Monitoring',
      mrkdwn: true,
      attachments: [
        {
          mrkdwn_in: ['pretext', 'text'],
          title: resource.title,
          title_link: resource.link,
          fields: [],
          color: 'danger',
          text: message,
          fallback: message,
        },
      ]
    }

    return axios.post(this._webhook_url, message);
  }
}

export {
  SlackNotification
};
