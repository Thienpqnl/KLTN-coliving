const { createDomainOutbox } = require("../shared/domain-outbox.cjs");

module.exports = createDomainOutbox({
  delegateName: "propertyOutboxEvent",
  serviceName: "property-service",
});
