const { pool } = require("../config/db");
const config = require("../config/config");

// Get base URL from config or use default
const baseUrl = config.baseUrl || "http://localhost:3008";

/**
 * Create a new event
 */
exports.createEvent = async (req, res) => {
  let connection;
  try {
    console.log("Creating new event with data:", req.body);
    console.log("File uploaded:", req.file ? req.file.filename : "None");

    // Extract data from request body with new field names
    const {
      name,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      price,
      duration,
      reservation_ID,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !start_date ||
      !start_time ||
      !price ||
      !reservation_ID
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `${baseUrl}/uploads/events/${req.file.filename}`;
      console.log("Image path set to:", imagePath);
    }

    // Get connection from pool
    connection = await pool.getConnection();

    // Insert the event with image path and new fields
    const [result] = await connection.query(
      `INSERT INTO event (name, description, start_date, end_date, start_time, end_time, price, duration, reservation_ID, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        start_date,
        end_date || start_date,
        start_time,
        end_time || start_time,
        price,
        duration,
        reservation_ID,
        imagePath,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: {
        event_ID: result.insertId,
        name,
        description,
        start_date,
        end_date: end_date || start_date,
        start_time,
        end_time: end_time || start_time,
        price,
        duration,
        reservation_ID,
        image: imagePath,
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get all events for attendees with category information
 */
exports.getAllEvents = async (req, res) => {
  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();

    // Get query parameters for filtering
    const { category, search } = req.query;

    console.log("Fetching events with filters:", { category, search });

    // Base query with joins to get category information and organizer details
    let query = `
      SELECT 
        e.event_ID, 
        e.name, 
        e.description, 
        e.start_date, 
        e.end_date, 
        e.start_time, 
        e.end_time, 
        e.price, 
        e.image,
        v.name as venue_name,
        v.location as venue_location,
        v.capacity as venue_capacity,
        s.subcategory_id,
        s.name as subcategory_name,
        c.category_ID,
        c.name as category_name,
        o.organizer_ID,
        o.company_name as organizer_company,
        u.name as organizer_name,
        vr.attendees_count,
        COALESCE(vr.attendees_count, 0) as current_attendees
      FROM event e
      LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
      LEFT JOIN venue v ON vr.venue_ID = v.venue_ID
      LEFT JOIN subcategories s ON vr.subcategory_id = s.subcategory_id
      LEFT JOIN category c ON s.category_id = c.category_ID
      LEFT JOIN organizer o ON vr.organizer_ID = o.organizer_ID
      LEFT JOIN user u ON o.user_ID = u.user_ID
      WHERE 1=1`;

    const queryParams = [];

    // Add category filter if provided
    if (category) {
      query += " AND c.name = ?";
      queryParams.push(category);
    }

    // Add search filter if provided
    if (search) {
      query += " AND (e.name LIKE ? OR e.description LIKE ? OR v.name LIKE ?)";
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Order by start date, with upcoming events first
    query += " ORDER BY e.start_date ASC";

    console.log("Executing query:", query);
    console.log("With params:", queryParams);

    // Execute the query
    const [events] = await connection.query(query, queryParams);

    console.log(`Found ${events.length} events`);

    // Format the events for the frontend
    if (events.length > 0) {
      console.log("Raw event data from database:", {
        event_ID: events[0].event_ID,
        name: events[0].name,
        venue_capacity: events[0].venue_capacity,
        attendees_count: events[0].attendees_count,
        current_attendees: events[0].current_attendees,
      });
    }

    const formattedEvents = events.map((event) => {
      // Format date range
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);
      const formattedStartDate = startDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const formattedEndDate = endDate.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      // Format date string - only show start date and time
      let dateRange;
      if (event.start_date === event.end_date) {
        dateRange = `${formattedStartDate}, ${event.start_time}`;
      } else {
        dateRange = `${formattedStartDate}, ${event.start_time}`;
      }

      // Format price
      const price = event.price === 0 ? "Free" : `${event.price}`;

      // Extract coordinates from the location field if available
      let coordinates;

      // Try to use venue_location if it contains coordinates
      if (
        event.venue_location &&
        typeof event.venue_location === "string" &&
        (event.venue_location.includes("lat") ||
          event.venue_location.includes("lng"))
      ) {
        coordinates = event.venue_location;
        console.log("Using coordinates from venue_location:", coordinates);
      } else {
        // Use default coordinates if venue_location doesn't contain coordinates
        const latitude = "30.051894";
        const longitude = "31.285135";
        coordinates = `{"lat":"${latitude}","lng":"${longitude}"}`;
        console.log("Using default New Cairo coordinates:", coordinates);
      }

      // Make sure venue_location is a string for consistent handling in the frontend
      const venue_location =
        typeof coordinates === "string"
          ? coordinates
          : JSON.stringify(coordinates);

      return {
        id: event.event_ID,
        title: event.name,
        description: event.description,
        category: event.category_name || "Event", // Use actual category name if available
        subcategory: event.subcategory_name || "General", // Use actual subcategory name if available
        categoryId: event.category_ID, // Include category ID for filtering
        subcategoryId: event.subcategory_id, // Include subcategory ID for filtering
        image:
          event.image ||
          "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
        dateRange: dateRange,
        venue: event.venue_name || "Unknown Venue",
        location: venue_location,
        price: price,
        attendees: `${event.current_attendees || 0} Attendees`,
        venue_capacity: event.venue_capacity || 0,
        current_attendees: event.current_attendees || 0,
        organizer_name: event.organizer_company || "Unknown Organizer",
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        coordinates: coordinates, // Add coordinates for map display
        isFavorite: false, // Default value
      };
    });

    // Default categories if we can't get them from the database
    const defaultCategories = [
      {
        id: 1,
        name: "Arts & Culture",
        image:
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80",
      },
      {
        id: 2,
        name: "Food & Drink",
        image:
          "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
      },
      {
        id: 3,
        name: "Film & Media",
        image:
          "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80",
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        events: formattedEvents,
        categories: defaultCategories,
        featuredEvents: formattedEvents.slice(0, 2), // First 2 events as featured
        recommendedEvents: formattedEvents.slice(2, 4), // Next 2 events as recommended
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get all categories and subcategories
 */
exports.getCategories = async (req, res) => {
  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();

    // Get all categories
    const [categories] = await connection.query(
      `SELECT category_ID, name, description, img_url FROM category ORDER BY name ASC`
    );

    // Get all subcategories with their parent category
    const [subcategories] = await connection.query(
      `SELECT s.subcategory_id, s.category_id, s.name, s.description, s.img_url 
       FROM subcategories s
       JOIN category c ON s.category_id = c.category_ID
       ORDER BY s.name ASC`
    );

    // Format the response
    const formattedCategories = categories.map((cat) => {
      // Find all subcategories for this category
      const relatedSubcategories = subcategories.filter(
        (subcat) => subcat.category_id === cat.category_ID
      );

      return {
        id: cat.category_ID,
        name: cat.name,
        description: cat.description,
        image:
          cat.img_url ||
          "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80",
        subcategories: relatedSubcategories.map((subcat) => ({
          id: subcat.subcategory_id,
          name: subcat.name,
          description: subcat.description,
          image:
            subcat.img_url ||
            cat.img_url ||
            "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80",
        })),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        categories: formattedCategories,
      },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get events for the authenticated organizer
 */
exports.getOrganizerEvents = async (req, res) => {
  let connection;
  try {
    const userId = req.user.userId;
    console.log("Fetching events for user ID:", userId);

    connection = await pool.getConnection();

    // Find the organizer_ID from the user_ID
    const [organizerRows] = await connection.query(
      "SELECT organizer_ID FROM organizer WHERE user_ID = ?",
      [userId]
    );

    if (organizerRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Organizer not found",
      });
    }

    const organizerId = organizerRows[0].organizer_ID;
    console.log("Organizer ID:", organizerId);

    // Get all events created by this organizer with ticket sales data
    const [eventRows] = await connection.query(
      `SELECT 
        e.*, 
        v.name as venue_name, 
        v.capacity as venue_capacity, 
        vr.attendees_count,
        COALESCE(
          (SELECT SUM(ar.quantity) 
           FROM attendee_reservations ar 
           WHERE ar.event_ID = e.event_ID AND ar.payment_status = 'confirmed'), 
          0
        ) as tickets_sold
       FROM event e
       LEFT JOIN venue_reservations vr ON e.reservation_ID = vr.reservation_ID
       LEFT JOIN venue v ON vr.venue_ID = v.venue_ID
       WHERE vr.organizer_ID = ?
       ORDER BY e.start_date DESC`,
      [organizerId]
    );

    console.log(
      "Events with ticket sales data:",
      eventRows.map((event) => ({
        event_ID: event.event_ID,
        name: event.name,
        tickets_sold: event.tickets_sold,
      }))
    );

    return res.status(200).json({
      success: true,
      data: eventRows,
    });
  } catch (error) {
    console.error("Error fetching organizer events:", error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// No need for additional exports as we're using exports.functionName throughout the file
