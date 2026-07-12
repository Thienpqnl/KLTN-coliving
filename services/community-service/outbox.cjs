const { createDomainOutbox } = require("../shared/domain-outbox.cjs");

module.exports = createDomainOutbox({
  delegateName: "communityOutboxEvent",
  serviceName: "community-service",
});
