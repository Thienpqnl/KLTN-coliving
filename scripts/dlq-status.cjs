require("dotenv").config();

const amqp = require("amqplib");

const DEFAULT_QUEUES = [
  "identity-service.audit-events",
  "property-service.events",
  "ai-service.projections",
];

async function main() {
  const rabbitUrl = String(process.env.RABBITMQ_URL || "").trim();
  if (!rabbitUrl) throw new Error("RABBITMQ_URL is not configured");
  const requested = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  const queues = requested.length > 0 ? requested : DEFAULT_QUEUES;
  const connection = await amqp.connect(rabbitUrl, {
    clientProperties: { connection_name: "dlq-status-tool" },
  });
  const channel = await connection.createChannel();
  let total = 0;
  for (const queue of queues) {
    const deadLetterQueue = `${queue}.dlq`;
    const status = await channel.checkQueue(deadLetterQueue).catch(() => null);
    const count = status?.messageCount || 0;
    total += count;
    console.log(`${deadLetterQueue}: ${count} message(s)`);
  }
  console.log(`Total dead-letter messages: ${total}`);
  await channel.close();
  await connection.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
