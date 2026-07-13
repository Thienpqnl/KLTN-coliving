import json
import os
import time
import uuid

import pika


def run():
    exchange = os.getenv("RABBITMQ_EXCHANGE", "coliving.events")
    dead_letter_exchange = os.getenv("RABBITMQ_DEAD_LETTER_EXCHANGE", f"{exchange}.dlx")
    queue = os.getenv("AI_PROJECTION_QUEUE", "ai-service.projections")
    dead_letter_queue = f"{queue}.dlq"
    event_id = f"dlq-test-{uuid.uuid4()}"

    connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
    channel = connection.channel()
    channel.exchange_declare(exchange=exchange, exchange_type="topic", durable=True)
    channel.exchange_declare(exchange=dead_letter_exchange, exchange_type="topic", durable=True)
    channel.queue_declare(queue=dead_letter_queue, durable=True)
    channel.queue_bind(exchange=dead_letter_exchange, queue=dead_letter_queue, routing_key=queue)
    channel.basic_publish(
        exchange=exchange,
        routing_key="identity.user.changed",
        body=json.dumps({
            "id": event_id,
            "eventType": "identity.user.changed",
            "sourceService": "dlq-test",
            "payload": {},
        }).encode("utf-8"),
        properties=pika.BasicProperties(
            delivery_mode=2, content_type="application/json", message_id=event_id,
        ),
    )

    found_headers = None
    for _ in range(30):
        time.sleep(1)
        method, properties, body = channel.basic_get(dead_letter_queue, auto_ack=False)
        if method is None:
            continue
        payload = json.loads(body.decode("utf-8"))
        if payload.get("id") == event_id:
            found_headers = properties.headers or {}
            channel.basic_ack(method.delivery_tag)
            break
        channel.basic_nack(method.delivery_tag, requeue=True)

    connection.close()
    expected_retries = int(os.getenv("EVENT_CONSUMER_MAX_RETRIES", "5"))
    if not found_headers:
        raise RuntimeError("Test event did not reach the AI dead-letter queue")
    if int(found_headers.get("x-retry-count", -1)) != expected_retries:
        raise RuntimeError(f"Unexpected retry count: {found_headers}")
    if not found_headers.get("x-dead-reason"):
        raise RuntimeError("Dead-letter reason is missing")
    print(f"DLQ test OK: retries={expected_retries}, queue={dead_letter_queue}")


if __name__ == "__main__":
    run()
