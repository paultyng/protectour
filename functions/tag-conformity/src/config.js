const permanentTagKey = process.env.PERMANENT_TAG_KEY || "permanent";
const ttlHoursTagKey = process.env.TTL_HOURS_TAG_KEY || "ttl-hours";

const requiredTags = {
  "environment": /^(production|staging|development|integration|shared)$/,
  "product": /^(b2c|b2b|shared)$/,
  "role": /^.+$/,
  "team": /^.+$/
}

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

if(slackWebhookUrl == null) {
  throw new Error('SLACK_WEBHOOK_URL not set.');
}

export { requiredTags, slackWebhookUrl, permanentTagKey, ttlHoursTagKey };
