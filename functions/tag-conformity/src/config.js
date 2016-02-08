const permanentTagKey = process.env.PERMANENT_TAG_KEY || "ua:permanent";
const ttlHoursTagKey = process.env.TTL_HOURS_TAG_KEY || "ua:ttl-hours";

const requiredTags = {
  "ua:environment": /^(production|staging|development|integration)$/,
  "ua:product": /^(b2c|b2b|shared)$/,
  "ua:role": /^.+$/,
  "ua:team": /^.+$/
}

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

if(slackWebhookUrl == null) {
  throw new Error('SLACK_WEBHOOK_URL not set.');
}

export { requiredTags, slackWebhookUrl, permanentTagKey, ttlHoursTagKey };
