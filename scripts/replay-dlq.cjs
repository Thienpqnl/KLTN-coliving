require("dotenv").config();

const amqp = require("amqplib");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const positional = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  const queueName = argument("queue", positional[0]);
  const limit = Math.max(1, Number(argument("limit", positional[1] || "100")));
  if (!queueName) throw new Error("Usage: npm run events:dlq:replay -- <queue> [limit]");

  const rabbitUrl = String(process.env.RABBITMQ_URL || "").trim();
  if (!rabbitUrl) throw new Error("RABBITMQ_URL is not configured");
  const exchange = process.env.RABBITMQ_EXCHANGE || "coliving.events";
  const deadLetterExchange = process.env.RABBITMQ_DEAD_LETTER_EXCHANGE || `${exchange}.dlx`;
  const deadLetterQueue = `${queueName}.dlq`;

  const connection = await amqp.connect(rabbitUrl, {
    clientProperties: { connection_name: "dlq-replay-tool" },
  });
  const channel = await connection.createConfirmChannel();
  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertExchange(deadLetterExchange, "topic", { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.bindQueue(deadLetterQueue, deadLetterExchange, queueName);

  let replayed = 0;
  while (replayed < limit) {
    const message = await channel.get(deadLetterQueue, { noAck: false });
    if (!message) break;
    try {
      const event = JSON.parse(message.content.toString("utf8"));
      const headers = { ...(message.properties.headers || {}) };
      delete headers["x-dead-reason"];
      headers["x-retry-count"] = 0;
      headers["x-replayed-at"] = new Date().toISOString();
      channel.publish(exchange, event.eventType, message.content, {
        persistent: true,
        contentType: "application/json",
        messageId: message.properties.messageId,
        type: event.eventType,
        appId: "dlq-replay-tool",
        headers,
      });
      await channel.waitForConfirms();
      channel.ack(message);
      replayed += 1;
    } catch (error) {
      channel.nack(message, false, true);
      throw error;
    }
  }

  console.log(`Replayed ${replayed} message(s) from ${deadLetterQueue}`);
  await channel.close();
  await connection.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
