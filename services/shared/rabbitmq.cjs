const amqp = require("amqplib");

const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "coliving.events";
const DEAD_LETTER_EXCHANGE = process.env.RABBITMQ_DEAD_LETTER_EXCHANGE || `${EXCHANGE}.dlx`;

function retryCount(message) {
  return Number(message?.properties?.headers?.["x-retry-count"] || 0);
}

function messageProperties(message, headers = {}) {
  return {
    persistent: true,
    contentType: message.properties.contentType || "application/json",
    messageId: message.properties.messageId,
    timestamp: Date.now(),
    type: message.properties.type,
    appId: message.properties.appId,
    headers: { ...(message.properties.headers || {}), ...headers },
  };
}

function rabbitUrl() {
  return String(process.env.RABBITMQ_URL || "").trim();
}

function createPublisher(serviceName) {
  let connection = null;
  let channel = null;

  async function ensureChannel() {
    if (channel) return channel;
    const url = rabbitUrl();
    if (!url) throw new Error("RABBITMQ_URL is not configured");
    connection = await amqp.connect(url, { clientProperties: { connection_name: serviceName } });
    connection.on("close", () => {
      connection = null;
      channel = null;
    });
    connection.on("error", () => {});
    channel = await connection.createConfirmChannel();
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    return channel;
  }

  return {
    async publish(event) {
      const activeChannel = await ensureChannel();
      activeChannel.publish(
        EXCHANGE,
        event.eventType,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          contentType: "application/json",
          messageId: event.id,
          timestamp: Date.now(),
          type: event.eventType,
          appId: serviceName,
        },
      );
      await activeChannel.waitForConfirms();
    },
    async close() {
      if (channel) await channel.close().catch(() => {});
      if (connection) await connection.close().catch(() => {});
      channel = null;
      connection = null;
    },
  };
}

function startConsumer({ serviceName, queueName, bindings, handler }) {
  let stopped = false;
  let connection = null;
  let reconnectTimer = null;

  async function connect() {
    if (stopped) return;
    const url = rabbitUrl();
    if (!url) {
      console.warn(`[${serviceName}] RABBITMQ_URL is not configured; event consumer is disabled.`);
      return;
    }
    try {
      connection = await amqp.connect(url, { clientProperties: { connection_name: serviceName } });
      const channel = await connection.createConfirmChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      await channel.assertExchange(DEAD_LETTER_EXCHANGE, "topic", { durable: true });
      await channel.assertQueue(queueName, { durable: true });
      const deadLetterQueue = `${queueName}.dlq`;
      await channel.assertQueue(deadLetterQueue, { durable: true });
      await channel.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, queueName);
      for (const binding of bindings) await channel.bindQueue(queueName, EXCHANGE, binding);
      await channel.prefetch(10);
      await channel.consume(queueName, async (message) => {
        if (!message) return;
        try {
          const event = JSON.parse(message.content.toString("utf8"));
          await handler(event);
          channel.ack(message);
        } catch (error) {
          console.error(`[${serviceName}] Event handling failed`, error);
          const retries = retryCount(message);
          const maxRetries = Number(process.env.EVENT_CONSUMER_MAX_RETRIES || 5);
          if (retries < maxRetries) {
            let routingKey = message.fields.routingKey;
            try {
              routingKey = JSON.parse(message.content.toString("utf8")).eventType || routingKey;
            } catch {}
            channel.publish(
              EXCHANGE,
              routingKey,
              message.content,
              messageProperties(message, { "x-retry-count": retries + 1 }),
            );
          } else {
            channel.publish(
              DEAD_LETTER_EXCHANGE,
              queueName,
              message.content,
              messageProperties(message, {
                "x-retry-count": retries,
                "x-dead-reason": String(error.message || error).slice(0, 1000),
                "x-original-routing-key": message.fields.routingKey,
              }),
            );
          }
          await channel.waitForConfirms();
          channel.ack(message);
        }
      });
      connection.on("error", () => {});
      connection.on("close", () => {
        connection = null;
        if (!stopped) reconnectTimer = setTimeout(connect, 5000);
      });
      console.log(`[${serviceName}] consuming ${queueName}`);
    } catch (error) {
      console.error(`[${serviceName}] RabbitMQ connection failed: ${error.message}`);
      if (!stopped) reconnectTimer = setTimeout(connect, 5000);
    }
  }

  void connect();
  return async function stop() {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (connection) await connection.close().catch(() => {});
  };
}

module.exports = {
  DEAD_LETTER_EXCHANGE,
  EXCHANGE,
  messageProperties,
  retryCount,
  createPublisher,
  startConsumer,
};
