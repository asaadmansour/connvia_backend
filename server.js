const cleanupPendingReservations = require("./jobs/cleanupReservations");

// Set up cleanup job to run every minute
setInterval(cleanupPendingReservations, 60000);
