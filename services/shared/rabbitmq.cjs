const amqp = require("amqplib");

const EXCHANGE = process.env.RABBITMQ_EXCHANGE || "coliving.events";

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
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      await channel.assertQueue(queueName, { durable: true });
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
          channel.nack(message, false, true);
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

module.exports = { EXCHANGE, createPublisher, startConsumer };
