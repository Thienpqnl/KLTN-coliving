const { createDomainOutbox } = require("../shared/domain-outbox.cjs");

module.exports = createDomainOutbox({
  delegateName: "preferenceOutboxEvent",
  serviceName: "preference-service",
});
