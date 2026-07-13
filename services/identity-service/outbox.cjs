const { createDomainOutbox } = require("../shared/domain-outbox.cjs");

module.exports = createDomainOutbox({
  delegateName: "identityOutboxEvent",
  serviceName: "identity-service",
});
