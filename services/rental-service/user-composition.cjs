const identityClient = require("../shared/identity-client.cjs");

async function attachBookingUsers(bookings, clients = identityClient) {
  const list = Array.isArray(bookings) ? bookings : [bookings].filter(Boolean);
  const users = await clients.userMap(list.map((booking) => booking.userId));
  const hydrated = list.map((booking) => ({
    ...booking,
    user: users.get(booking.userId) || null,
  }));
  return Array.isArray(bookings) ? hydrated : hydrated[0] || null;
}

async function attachOccupancyUsers(occupancies, clients = identityClient) {
  const list = Array.isArray(occupancies) ? occupancies : [occupancies].filter(Boolean);
  const users = await clients.userMap(list.map((occupancy) => occupancy.userId));
  const hydrated = list.map((occupancy) => ({
    ...occupancy,
    user: users.get(occupancy.userId) || null,
  }));
  return Array.isArray(occupancies) ? hydrated : hydrated[0] || null;
}

function snapshotParty(contract, party) {
  const value = contract?.contentSnapshot?.parties?.[party];
  return value ? { ...value } : null;
}

async function attachContractUsers(contracts, clients = identityClient) {
  const list = Array.isArray(contracts) ? contracts : [contracts].filter(Boolean);
  const actorIds = list.flatMap((contract) =>
    Array.isArray(contract.events) ? contract.events.map((event) => event.actorId) : [],
  );
  const actors = await clients.userMap(actorIds);
  const hydrated = list.map((contract) => ({
    ...contract,
    host: snapshotParty(contract, "host"),
    renter: snapshotParty(contract, "renter"),
    ...(Array.isArray(contract.events)
      ? {
          events: contract.events.map((event) => ({
            ...event,
            actor: actors.get(event.actorId) || null,
          })),
        }
      : {}),
  }));
  return Array.isArray(contracts) ? hydrated : hydrated[0] || null;
}

module.exports = {
  attachBookingUsers,
  attachContractUsers,
  attachOccupancyUsers,
  identityClient,
};
