// controllers/venueController.js
const { getConnection } = require("../config/db");

// Create a new venue
async function createVenue(req, res) {
  let connection;
  try {
    console.log("[createVenue] Starting venue creation process");
    
    // Get user info from the authenticated token
    const userId = req.user.userId;
    const userType = req.user.userType;
    
    console.log(`[createVenue] User ID: ${userId}, User Type: ${userType}`);

    // Check if user is a venue owner
    console.log(`[createVenue] Checking if user is a venue owner (userType: ${userType})`);
    if (userType !== "venue") {
      console.log(`[createVenue] User is not a venue owner, userType: ${userType}`);
      return res
        .status(403)
        .json({ error: "Only venue owners can create venues" });
    }
    console.log(`[createVenue] User is a venue owner, proceeding`);

    // Get venue data from request body
    const {
      name,
      capacity,
      facilities,
      available_dates,
      location,
      pricing_type,
      cost_hourly,
      cost_daily,
      description,
      category,
      rules,
      contact_email,
      availability_info,
      working_hours,
    } = req.body;

    // Validate required fields
    if (!name || !capacity || !description || !category || !contact_email) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Format data for database insertion
    const facilitiesStr =
      typeof facilities === "string" ? facilities : JSON.stringify(facilities);
    const rulesStr = typeof rules === "string" ? rules : JSON.stringify(rules);
    const locationStr =
      typeof location === "string" ? location : JSON.stringify(location);
    const workingHoursStr =
      typeof working_hours === "string"
        ? working_hours
        : JSON.stringify(working_hours || {});

    // Establish database connection
    connection = await getConnection();

    // First, get the venue_owner_ID for this user
    console.log(`[createVenue] Querying venue_owner table for user_ID: ${userId}`);
    const [venueOwnerResult] = await connection.query(
      "SELECT venue_owner_ID FROM venue_owner WHERE user_ID = ?",
      [userId]
    );
    
    console.log(`[createVenue] venue_owner query result:`, venueOwnerResult);

    if (venueOwnerResult.length === 0) {
      console.log(`[createVenue] Venue owner profile not found for user_ID: ${userId}`);
      return res.status(404).json({ error: "Venue owner profile not found" });
    }
    
    console.log(`[createVenue] Found venue_owner_ID: ${venueOwnerResult[0].venue_owner_ID}`);

    const venue_owner_ID = venueOwnerResult[0].venue_owner_ID;
    console.log(`[createVenue] Using venue_owner_ID: ${venue_owner_ID}`);

    // Insert venue into database, including venue_owner_ID
    console.log(`[createVenue] Preparing to insert venue into database`);
    console.log(`[createVenue] Insert query parameters:`, {
      name, location: locationStr, capacity, facilities: facilitiesStr,
      available_dates, userId, venue_owner_ID, description, category,
      rules: rulesStr, contact_email, pricing_type, cost_hourly, cost_daily,
      working_hours: workingHoursStr
    });
    
    console.log(`[createVenue] Executing INSERT query for venue table`);
    const [results] = await connection.query(
      `INSERT INTO venue (
        name, 
        location, 
        capacity, 
        facilities, 
        available_dates, 
        user_ID, 
        venue_owner_ID,
        is_available, 
        availability_info, 
        description, 
        category, 
        rules, 
        contact_email, 
        pricing_type, 
        cost_hourly, 
        cost_daily,
        working_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        locationStr,
        capacity,
        facilitiesStr,
        available_dates,
        userId,
        venue_owner_ID, // Add venue_owner_ID
        1, // is_available default to true
        availability_info || available_dates,
        description,
        category,
        rulesStr,
        contact_email,
        pricing_type,
        cost_hourly || null,
        cost_daily || null,
        workingHoursStr,
      ]
    );

    // Handle image uploads separately if exists
    console.log(`[createVenue] Checking for image uploads`);
    if (req.files && req.files.images) {
      console.log(`[createVenue] Images found in request:`, req.files.images);
      
      // Store full URLs instead of just paths
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      console.log(`[createVenue] Base URL for images: ${baseUrl}`);
      
      try {
        const images = Array.isArray(req.files.images)
          ? req.files.images
              .map((file) => {
                console.log(`[createVenue] Processing image file: ${file.originalname}, size: ${file.size}`);
                return `${baseUrl}/uploads/venues/${file.filename}`;
              })
              .join(",")
          : `${baseUrl}/uploads/venues/${req.files.images.filename}`;
        
        console.log(`[createVenue] Final images string: ${images}`);

        console.log(`[createVenue] Updating venue with images`);
        await connection.query("UPDATE venue SET images = ? WHERE venue_ID = ?", [
          images,
          results.insertId,
        ]);
        console.log(`[createVenue] Venue updated with images successfully`);
      } catch (imgError) {
        console.error(`[createVenue] Error processing images:`, imgError);
        // Continue with venue creation even if image processing fails
      }
    }

    // Get the created venue
    console.log(`[createVenue] Retrieving the created venue with ID: ${results.insertId}`);
    const [venueResult] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [results.insertId]
    );

    console.log(`[createVenue] Venue creation completed successfully`);
    res.status(201).json({
      message: "Venue created successfully",
      venue: venueResult[0],
    });
  } catch (error) {
    console.error("[createVenue] ERROR creating venue:", error);
    
    // Log more detailed error information
    if (error.sql) {
      console.error("[createVenue] SQL query that failed:", error.sql);
    }
    
    if (error.code) {
      console.error("[createVenue] Error code:", error.code);
    }
    
    // Log the full error stack trace
    console.error("[createVenue] Error stack trace:", error.stack);
    
    // Check for specific error types
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      console.error("[createVenue] Foreign key constraint error - likely an issue with venue_owner_ID");
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      console.error("[createVenue] NULL value provided for a NOT NULL column");
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.error("[createVenue] Duplicate entry for a unique key");
    }
    
    // Return more detailed error information to help debugging
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message,
      code: error.code || null,
      sqlState: error.sqlState || null
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get all venues for the current user
async function getUserVenues(req, res) {
  let connection;
  try {
    // Get user info from the authenticated token
    const userId = req.user.userId;

    // Establish database connection
    connection = await getConnection();

    // Get all venues for the user
    const [venues] = await connection.query(
      "SELECT * FROM venue WHERE user_ID = ? ORDER BY venue_ID DESC",
      [userId]
    );

    res.status(200).json({
      venues,
    });
  } catch (error) {
    console.error("Error getting user venues:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get a single venue by ID
async function getVenueById(req, res) {
  let connection;
  try {
    const { id } = req.params;

    // Establish database connection
    connection = await getConnection();

    // Get venue
    const [venues] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [id]
    );

    if (venues.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // If user is not the owner and venue is not available, deny access
    if (req.user.userId !== venues[0].user_ID && !venues[0].is_available) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.status(200).json({
      venue: venues[0],
    });
  } catch (error) {
    console.error("Error getting venue:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get all available venues (for event organizers)
async function getAvailableVenues(req, res) {
  let connection;
  try {
    // Establish database connection
    connection = await getConnection();

    // Step 1: Get all available venues first
    const [venues] = await connection.query(
      "SELECT * FROM venue WHERE is_available = 1"
    );

    console.log("Raw venues from database:", venues);

    // Step 2: Lookup venue owners one by one to ensure correct data
    const formattedVenues = [];

    for (const venue of venues) {
      // Get the venue owner by ID directly
      if (venue.venue_owner_ID) {
        const [ownerResult] = await connection.query(
          "SELECT name FROM venue_owner WHERE venue_owner_ID = ?",
          [venue.venue_owner_ID]
        );

        console.log(`Found owner for venue ${venue.venue_ID}:`, ownerResult);

        const ownerName =
          ownerResult.length > 0 ? ownerResult[0].name : "Unknown Owner";

        formattedVenues.push({
          id: venue.venue_ID,
          name: venue.name || "Unnamed Venue",
          userID: venue.user_ID,
          venue_owner_ID: venue.venue_owner_ID,
          ownerName: ownerName,
          capacity: venue.capacity || 0,
          category: venue.category || "Venue",
          pricing_type: venue.pricing_type || "hourly",
          cost_hourly: venue.cost_hourly || 0,
          cost_daily: venue.cost_daily || 0,
          images: venue.images ? venue.images.split(",") : [],
          location: venue.location || null,
        });
      } else {
        // No owner ID found
        formattedVenues.push({
          id: venue.venue_ID,
          name: venue.name || "Unnamed Venue",
          userID: venue.user_ID,
          venue_owner_ID: venue.venue_owner_ID,
          ownerName: "No Owner Found",
          capacity: venue.capacity || 0,
          category: venue.category || "Venue",
          pricing_type: venue.pricing_type || "hourly",
          cost_hourly: venue.cost_hourly || 0,
          cost_daily: venue.cost_daily || 0,
          images: venue.images ? venue.images.split(",") : [],
          location: venue.location || null,
        });
      }
    }

    console.log("Final venues with direct owner lookup:", formattedVenues);

    // Return the properly formatted venues
    res.status(200).json({
      venues: formattedVenues,
    });
  } catch (error) {
    console.error("Error getting available venues:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Update a venue
async function updateVenue(req, res) {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Establish database connection
    connection = await getConnection();

    // Check if venue exists and user owns it
    const [venues] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [id]
    );

    if (venues.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (req.user.userId !== venues[0].user_ID) {
      return res
        .status(403)
        .json({ error: "You don't have permission to update this venue" });
    }

    // Get venue data from request body
    const {
      name,
      capacity,
      facilities,
      available_dates,
      location,
      pricing_type,
      cost_hourly,
      cost_daily,
      description,
      category,
      rules,
      contact_email,
      is_available,
      availability_info,
      working_hours,
    } = req.body;

    // Format data for database update
    const facilitiesStr =
      typeof facilities === "string"
        ? facilities
        : JSON.stringify(facilities || {});
    const rulesStr =
      typeof rules === "string" ? rules : JSON.stringify(rules || {});
    const locationStr =
      typeof location === "string" ? location : JSON.stringify(location || {});
    const workingHoursStr =
      typeof working_hours === "string"
        ? working_hours
        : JSON.stringify(working_hours || {});

    // Build update query based on provided fields
    let updateQuery = "UPDATE venue SET ";
    let queryParams = [];
    let updateFields = [];

    if (name) {
      updateFields.push("name = ?");
      queryParams.push(name);
    }

    if (capacity) {
      updateFields.push("capacity = ?");
      queryParams.push(capacity);
    }

    if (facilities) {
      updateFields.push("facilities = ?");
      queryParams.push(facilitiesStr);
    }

    if (available_dates) {
      updateFields.push("available_dates = ?");
      queryParams.push(available_dates);
    }

    if (location) {
      updateFields.push("location = ?");
      queryParams.push(locationStr);
    }

    if (pricing_type) {
      updateFields.push("pricing_type = ?");
      queryParams.push(pricing_type);
    }

    if (cost_hourly !== undefined) {
      updateFields.push("cost_hourly = ?");
      queryParams.push(cost_hourly);
    }

    if (cost_daily !== undefined) {
      updateFields.push("cost_daily = ?");
      queryParams.push(cost_daily);
    }

    if (description) {
      updateFields.push("description = ?");
      queryParams.push(description);
    }

    if (category) {
      updateFields.push("category = ?");
      queryParams.push(category);
    }

    if (rules) {
      updateFields.push("rules = ?");
      queryParams.push(rulesStr);
    }

    if (contact_email) {
      updateFields.push("contact_email = ?");
      queryParams.push(contact_email);
    }

    if (is_available !== undefined) {
      updateFields.push("is_available = ?");
      queryParams.push(is_available);
    }

    if (availability_info) {
      updateFields.push("availability_info = ?");
      queryParams.push(availability_info);
    }

    if (working_hours) {
      updateFields.push("working_hours = ?");
      queryParams.push(workingHoursStr);
    }

    // No fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateQuery += updateFields.join(", ");
    updateQuery += " WHERE venue_ID = ?";
    queryParams.push(id);

    // Execute update
    await connection.query(updateQuery, queryParams);

    // Handle image uploads separately if exists
    if (req.files && req.files.images) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const images = Array.isArray(req.files.images)
        ? req.files.images
            .map((file) => `${baseUrl}/uploads/venues/${file.filename}`)
            .join(",")
        : `${baseUrl}/uploads/venues/${req.files.images.filename}`;

      await connection.query("UPDATE venue SET images = ? WHERE venue_ID = ?", [
        images,
        id,
      ]);
    }

    // Get updated venue
    const [updatedVenue] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [id]
    );

    res.status(200).json({
      message: "Venue updated successfully",
      venue: updatedVenue[0],
    });
  } catch (error) {
    console.error("Error updating venue:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Delete a venue
async function deleteVenue(req, res) {
  let connection;
  try {
    const { id } = req.params;

    // Establish database connection
    connection = await getConnection();

    // Check if venue exists and user owns it
    const [venues] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [id]
    );

    if (venues.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (req.user.userId !== venues[0].user_ID) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this venue" });
    }

    // Delete venue
    await connection.query("DELETE FROM venue WHERE venue_ID = ?", [id]);

    res.status(200).json({
      message: "Venue deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting venue:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get venue owner details by ID
async function getVenueOwnerById(req, res) {
  let connection;
  try {
    const ownerId = req.params.id;

    if (!ownerId) {
      return res.status(400).json({ error: "Venue owner ID is required" });
    }

    // Establish database connection
    connection = await getConnection();

    // Get venue owner details
    const [ownerResults] = await connection.query(
      "SELECT venue_owner_ID, name, tax_number, logo FROM venue_owner WHERE venue_owner_ID = ?",
      [ownerId]
    );

    if (ownerResults.length === 0) {
      return res.status(404).json({ error: "Venue owner not found" });
    }

    const venueOwner = ownerResults[0];

    // Get venues owned by this venue owner
    const [venuesResults] = await connection.query(
      `SELECT venue_ID, name, capacity, category, pricing_type, cost_hourly, cost_daily, images, is_available
       FROM venue 
       WHERE venue_owner_ID = ?`,
      [ownerId]
    );

    // Format venues data
    const venues = venuesResults.map((venue) => ({
      id: venue.venue_ID,
      name: venue.name,
      capacity: venue.capacity,
      category: venue.category,
      pricing_type: venue.pricing_type,
      cost_hourly: venue.cost_hourly,
      cost_daily: venue.cost_daily,
      images: venue.images
        ? typeof venue.images === "string"
          ? venue.images.split(",")
          : venue.images
        : [],
      is_available: venue.is_available === 1,
    }));

    // Return venue owner with their venues
    res.status(200).json({
      owner: {
        id: venueOwner.venue_owner_ID,
        name: venueOwner.name,
        tax_number: venueOwner.tax_number,
        logo: venueOwner.logo,
        venues: venues,
      },
    });
  } catch (error) {
    console.error("Error getting venue owner:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get venue owner ID from venue ID
async function getVenueOwnerIdByVenueId(req, res) {
  let connection;
  try {
    const venueId = req.params.id;

    if (!venueId) {
      return res.status(400).json({ error: "Venue ID is required" });
    }

    // Establish database connection
    connection = await getConnection();

    // Get venue owner ID
    const [results] = await connection.query(
      "SELECT venue_owner_ID FROM venue WHERE venue_ID = ?",
      [venueId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.status(200).json({ venue_owner_ID: results[0].venue_owner_ID });
  } catch (error) {
    console.error("Error getting venue owner ID:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Search for venue owner by name
async function searchVenueOwnerByName(req, res) {
  let connection;
  try {
    const { ownerName } = req.body;

    if (!ownerName) {
      return res.status(400).json({ error: "Owner name is required" });
    }

    // Establish database connection
    connection = await getConnection();

    // Get venue owner by name
    const [ownerResults] = await connection.query(
      "SELECT venue_owner_ID, name, tax_number, logo FROM venue_owner WHERE name = ?",
      [ownerName]
    );

    if (ownerResults.length === 0) {
      return res.status(404).json({ error: "Venue owner not found" });
    }

    const venueOwner = ownerResults[0];

    // Get venues owned by this venue owner
    const [venuesResults] = await connection.query(
      `SELECT venue_ID, name, capacity, category, pricing_type, cost_hourly, cost_daily, images, is_available
       FROM venue 
       WHERE venue_owner_ID = ?`,
      [venueOwner.venue_owner_ID]
    );

    // Format venues data
    const venues = venuesResults.map((venue) => ({
      id: venue.venue_ID,
      name: venue.name,
      capacity: venue.capacity,
      category: venue.category,
      pricing_type: venue.pricing_type,
      cost_hourly: venue.cost_hourly,
      cost_daily: venue.cost_daily,
      images: venue.images
        ? typeof venue.images === "string"
          ? venue.images.split(",")
          : venue.images
        : [],
      is_available: venue.is_available === 1,
    }));

    // Return venue owner with their venues
    res.status(200).json({
      success: true,
      owner: {
        id: venueOwner.venue_owner_ID,
        name: venueOwner.name,
        tax_number: venueOwner.tax_number,
        logo: venueOwner.logo,
        venues: venues,
      },
    });
  } catch (error) {
    console.error("Error searching venue owner by name:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Reserve a venue (mark it as unavailable)
async function reserveVenue(req, res) {
  let connection;
  try {
    // Get user info from the authenticated token
    const userId = req.user.userId;
    const userType = req.user.userType;

    // Check if user is an organizer
    if (userType !== "organizer") {
      return res
        .status(403)
        .json({ error: "Only event organizers can reserve venues" });
    }

    const { venueId } = req.params;

    if (!venueId) {
      return res.status(400).json({ error: "Venue ID is required" });
    }

    // Establish database connection
    connection = await getConnection();

    // Check if venue exists and is available
    const [venueResult] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ? AND is_available = 1",
      [venueId]
    );

    if (venueResult.length === 0) {
      return res
        .status(404)
        .json({ error: "Venue not found or not available" });
    }

    // Update venue to mark it as unavailable
    await connection.query(
      "UPDATE venue SET is_available = 0 WHERE venue_ID = ?",
      [venueId]
    );

    // Get the updated venue
    const [updatedVenue] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ?",
      [venueId]
    );

    res.status(200).json({
      message: "Venue reserved successfully",
      venue: updatedVenue[0],
    });
  } catch (error) {
    console.error("Error reserving venue:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get dashboard statistics for venue owner
async function getVenueOwnerDashboardStats(req, res) {
  let connection;
  try {
    // Get user info from the authenticated token
    console.log('User from token:', req.user);
    const userId = req.user.userId;
    console.log('User ID:', userId);
    
    // Establish database connection
    connection = await getConnection();

    // Log the SQL query we're about to execute
    console.log('Executing venue query with user ID:', userId);
    
    // Get all venues for the user directly (same as in getUserVenues)
    const [venuesResult] = await connection.query(
      "SELECT * FROM venue WHERE user_ID = ? ORDER BY venue_ID DESC",
      [userId]
    );
    
    console.log('Venues result count:', venuesResult.length);

    if (venuesResult.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalEarnings: 0,
          totalBookings: 0,
          upcomingBookings: 0,
          pendingBookings: 0,
          totalVenues: 0,
          recentBookings: [],
          venues: []
        }
      });
    }

    // Extract venue IDs
    const venueIds = venuesResult.map(venue => venue.venue_ID);
    console.log('Venue IDs:', venueIds);
    
    // Get total earnings from paid reservations
    let earningsQuery, earningsParams = [];
    
    if (venueIds.length > 0) {
      // Construct the query with placeholders for each venue ID
      const placeholders = venueIds.map(() => '?').join(',');
      earningsQuery = `SELECT SUM(total_cost) as totalEarnings FROM venue_reservations WHERE payment_status = 'paid' AND venue_ID IN (${placeholders})`;
      earningsParams = venueIds;
    } else {
      // Default query when there are no venues
      earningsQuery = "SELECT 0 as totalEarnings";
    }
    
    const [earningsResult] = await connection.query(earningsQuery, earningsParams);

    // Get total bookings count
    let bookingsQuery, bookingsParams = [];
    
    if (venueIds.length > 0) {
      const placeholders = venueIds.map(() => '?').join(',');
      bookingsQuery = `SELECT COUNT(*) as totalBookings FROM venue_reservations WHERE venue_ID IN (${placeholders})`;
      bookingsParams = venueIds;
    } else {
      // Default query when there are no venues
      bookingsQuery = "SELECT 0 as totalBookings";
    }
    
    const [totalBookingsResult] = await connection.query(bookingsQuery, bookingsParams);

    // Get upcoming bookings count (future reservations that are paid)
    const today = new Date().toISOString().split('T')[0];
    let upcomingQuery, upcomingParams = [];
    
    if (venueIds.length > 0) {
      const placeholders = venueIds.map(() => '?').join(',');
      upcomingQuery = `SELECT COUNT(*) as upcomingBookings FROM venue_reservations WHERE reservation_date >= ? AND payment_status = 'paid' AND venue_ID IN (${placeholders})`;
      upcomingParams = [today, ...venueIds];
    } else {
      // Default query when there are no venues
      upcomingQuery = "SELECT 0 as upcomingBookings";
    }
    
    const [upcomingBookingsResult] = await connection.query(upcomingQuery, upcomingParams);

    // Get pending bookings count (only pending reservations, not cancelled ones)
    let pendingQuery, pendingParams = [];
    
    if (venueIds.length > 0) {
      const placeholders = venueIds.map(() => '?').join(',');
      pendingQuery = `SELECT COUNT(*) as pendingBookings FROM venue_reservations WHERE payment_status = 'pending' AND venue_ID IN (${placeholders})`;
      pendingParams = venueIds;
    } else {
      // Default query when there are no venues
      pendingQuery = "SELECT 0 as pendingBookings";
    }
    
    const [pendingBookingsResult] = await connection.query(pendingQuery, pendingParams);

    // Get recent bookings from both venue_reservations and events
    let venueBookingsQuery, eventBookingsQuery, bookingParams = [];
    
    if (venueIds.length > 0) {
      const placeholders = venueIds.map(() => '?').join(',');
      
      // Query for venue reservations
      venueBookingsQuery = `
        SELECT 
          vr.reservation_ID as id,
          DATE_FORMAT(vr.reservation_date, '%M %d, %Y') as start_date,
          DATE_FORMAT(vr.end_date, '%M %d, %Y') as end_date,
          CONCAT(vr.start_time, ' - ', vr.end_time) as time,
          v.name as venue_name,
          u.name as client_name,
          vr.total_cost as amount,
          vr.payment_status as status,
          vr.created_at as created_at,
          'venue_reservation' as booking_type
        FROM venue_reservations vr
        JOIN venue v ON vr.venue_ID = v.venue_ID
        JOIN user u ON vr.organizer_ID = u.user_ID
        WHERE vr.venue_ID IN (${placeholders})`;
      
      // Query for events - updated to match new event table schema
      eventBookingsQuery = `
        SELECT 
          e.event_ID as id,
          DATE_FORMAT(e.start_date, '%M %d, %Y') as start_date,
          DATE_FORMAT(e.end_date, '%M %d, %Y') as end_date,
          CONCAT(e.start_time, ' - ', e.end_time) as time,
          e.name as event_name,
          u.name as client_name,
          e.price as amount,
          CASE WHEN e.reservation_ID IS NOT NULL THEN 'paid' ELSE 'pending' END as status,
          e.start_date as created_at,
          'event' as booking_type,
          (SELECT v.name FROM venue v JOIN venue_reservations vr ON v.venue_ID = vr.venue_ID WHERE vr.reservation_ID = e.reservation_ID LIMIT 1) as venue_name
        FROM event e
        JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
        JOIN user u ON vr.organizer_ID = u.user_ID
        WHERE e.reservation_ID IN (
          SELECT reservation_ID FROM venue_reservations WHERE venue_ID IN (${placeholders})
        )`;
      
      bookingParams = venueIds;
    } else {
      // Default query when there are no venues - return empty array
      venueBookingsQuery = "SELECT 1 as id LIMIT 0";
      eventBookingsQuery = "SELECT 1 as id LIMIT 0";
    }
    
    // Execute both queries
    const [venueBookingsResult] = await connection.query(venueBookingsQuery, bookingParams);
    const [eventBookingsResult] = await connection.query(eventBookingsQuery, bookingParams);
    
    // Combine results
    const combinedBookings = [...venueBookingsResult, ...eventBookingsResult];
    
    // Sort by created_at date (newest first) and limit to 5
    combinedBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentBookings = combinedBookings.slice(0, 5).map(booking => ({
      id: booking.id,
      eventName: booking.event_name || null,
      venueName: booking.venue_name || null,
      clientName: booking.client_name,
      startDate: booking.start_date,
      endDate: booking.end_date,
      time: booking.time,
      amount: booking.amount,
      status: booking.status,
      bookingType: booking.booking_type,
      createdAt: booking.created_at
    }));

    // Return dashboard statistics
    res.status(200).json({
      success: true,
      stats: {
        totalEarnings: earningsResult[0].totalEarnings || 0,
        totalBookings: totalBookingsResult[0].totalBookings,
        upcomingBookings: upcomingBookingsResult[0].upcomingBookings,
        pendingBookings: pendingBookingsResult[0].pendingBookings,
        totalVenues: venuesResult.length,
        venues: venuesResult,
        recentBookings: recentBookings
      }
    });
  } catch (error) {
    console.error("Error getting venue owner stats:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get detailed information about a venue by ID
async function getVenueDetails(req, res) {
  const venueId = req.params.id;
  let connection;

  try {
    // Establish database connection
    connection = await getConnection();
    
    // Get venue details - all data is in the venue table
    const [venueResult] = await connection.query(
      `SELECT v.*, u.name as owner_name, u.email as owner_email 
       FROM venue v 
       JOIN user u ON v.user_ID = u.user_ID 
       WHERE v.venue_ID = ?`,
      [venueId]
    );

    if (venueResult.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const venue = venueResult[0];
    
    // Parse JSON fields if they exist
    try {
      // Parse facilities as amenities if it exists and is a string
      if (venue.facilities && typeof venue.facilities === 'string') {
        try {
          // Try to parse as JSON object
          const parsedFacilities = JSON.parse(venue.facilities);
          
          // Check if it's an array of strings/numbers or an object
          if (Array.isArray(parsedFacilities)) {
            // Convert array to object with meaningful keys
            venue.amenities = {};
            parsedFacilities.forEach((facility, index) => {
              // If the facility is a string, use it as both key and value
              if (typeof facility === 'string') {
                venue.amenities[facility] = true;
              } else {
                // If it's a number or something else, create a named key
                venue.amenities[`amenity${index}`] = facility.toString();
              }
            });
          } else if (typeof parsedFacilities === 'object') {
            venue.amenities = parsedFacilities;
          } else {
            venue.amenities = { 'facilities': venue.facilities };
          }
        } catch (e) {
          // If parsing fails, use as is
          venue.amenities = { 'facilities': venue.facilities };
        }
      } else {
        venue.amenities = {};
      }
      
      // Parse rules if it exists and is a string
      if (venue.rules && typeof venue.rules === 'string') {
        try {
          // Try to parse as JSON object
          const parsedRules = JSON.parse(venue.rules);
          
          // Check if it's an array of strings/numbers or an object
          if (Array.isArray(parsedRules)) {
            // Convert array to object with meaningful keys
            venue.rules = {};
            parsedRules.forEach((rule, index) => {
              // If the rule is a string, use it as both key and value
              if (typeof rule === 'string') {
                venue.rules[rule] = true;
              } else {
                // If it's a number or something else, create a named key
                venue.rules[`rule${index}`] = rule.toString();
              }
            });
          } else if (typeof parsedRules === 'object') {
            venue.rules = parsedRules;
          } else {
            venue.rules = { 'rule': venue.rules };
          }
        } catch (e) {
          // If parsing fails, use as is
          venue.rules = { 'rule': venue.rules };
        }
      } else {
        venue.rules = {};
      }
      
      // Handle images - if it's a comma-separated string, convert to array
      if (venue.images && typeof venue.images === 'string') {
        venue.images = venue.images.split(',').map(img => img.trim());
      } else if (!venue.images) {
        venue.images = [];
      }
      
      // Parse working_hours if it exists and is a string
      if (venue.working_hours && typeof venue.working_hours === 'string') {
        venue.working_hours = JSON.parse(venue.working_hours);
      } else {
        venue.working_hours = {};
      }
      
      // Parse availability_info if it exists and is a string
      if (venue.availability_info && typeof venue.availability_info === 'string') {
        venue.availability = venue.availability_info;
      } else {
        venue.availability = '';
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      // Continue with the original data if parsing fails
    }

    res.status(200).json(venue);
  } catch (error) {
    console.error("Error fetching venue details:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Update an existing venue
async function updateVenue(req, res) {
  let connection;
  try {
    // Get user info from the authenticated token
    const userId = req.user.userId;
    const userType = req.user.userType;
    const venueId = req.params.id;

    // Check if user is a venue owner
    if (userType !== "venue") {
      return res
        .status(403)
        .json({ error: "Only venue owners can update venues" });
    }

    // Get venue data from request body
    const {
      name,
      capacity,
      facilities,
      available_dates,
      location,
      pricing_type,
      cost_hourly,
      cost_daily,
      description,
      category,
      rules,
      contact_email,
      availability_info,
      working_hours,
      is_available
    } = req.body;

    // Validate required fields
    if (!name || !capacity || !description || !category || !contact_email) {
      return res.status(400).json({ error: "Required fields are missing" });
    }

    // Format data for database update
    const facilitiesStr =
      typeof facilities === "string" ? facilities : JSON.stringify(facilities);
    const rulesStr = typeof rules === "string" ? rules : JSON.stringify(rules);
    const locationStr =
      typeof location === "string" ? location : JSON.stringify(location);
    const workingHoursStr =
      typeof working_hours === "string"
        ? working_hours
        : JSON.stringify(working_hours || {});

    // Establish database connection
    connection = await getConnection();

    // Check if venue exists and belongs to the user
    const [venueCheck] = await connection.query(
      "SELECT * FROM venue WHERE venue_ID = ? AND user_ID = ?",
      [venueId, userId]
    );

    if (venueCheck.length === 0) {
      return res.status(404).json({
        error: "Venue not found or you don't have permission to update it"
      });
    }

    // Handle image uploads if there are any
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // If new images are uploaded, use them
      imageUrls = req.files.map(file => file.filename);
    } else if (req.body.existingImages) {
      // If no new images but existing images are specified, use those
      imageUrls = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : [req.body.existingImages];
    } else if (venueCheck[0].images) {
      // If no new images and no existing images specified, keep the current ones
      imageUrls = venueCheck[0].images.split(',').map(img => img.trim());
    }

    // Update venue in database
    const [result] = await connection.query(
      `UPDATE venue SET 
        name = ?, 
        location = ?, 
        capacity = ?, 
        facilities = ?, 
        available_dates = ?, 
        images = ?, 
        is_available = ?, 
        availability_info = ?, 
        description = ?, 
        category = ?, 
        rules = ?, 
        contact_email = ?, 
        working_hours = ?, 
        pricing_type = ?, 
        cost_hourly = ?, 
        cost_daily = ? 
      WHERE venue_ID = ? AND user_ID = ?`,
      [
        name,
        locationStr,
        capacity,
        facilitiesStr,
        available_dates,
        imageUrls.join(","),
        is_available !== undefined ? is_available : venueCheck[0].is_available,
        availability_info || available_dates,
        description,
        category,
        rulesStr,
        contact_email,
        workingHoursStr,
        pricing_type,
        cost_hourly || null,
        cost_daily || null,
        venueId,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to update venue" });
    }

    res.status(200).json({
      success: true,
      message: "Venue updated successfully",
      venueId: venueId
    });
  } catch (error) {
    console.error("Error updating venue:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  createVenue,
  getUserVenues,
  getVenueById,
  updateVenue,
  deleteVenue,
  getVenueOwnerDashboardStats,
  getVenueDetails,
  getAvailableVenues,
  searchVenueOwnerByName,
  getVenueOwnerById,
  getVenueOwnerIdByVenueId,
  reserveVenue
};
