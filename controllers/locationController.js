const { getConnection } = require('../config/db');

/**
 * Get all Egyptian governorates
 */
exports.getAllGovernorates = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    console.log('Fetching all governorates...');
    
    // This is a simplified version - in a real implementation, you would fetch from a database
    const governorates = [
      { id: 1, name: 'Cairo' },
      { id: 2, name: 'Alexandria' },
      { id: 3, name: 'Giza' },
      { id: 4, name: 'Sharm El Sheikh' },
      { id: 5, name: 'Luxor' },
      { id: 6, name: 'Aswan' },
      { id: 7, name: 'Port Said' },
      { id: 8, name: 'Suez' },
      { id: 9, name: 'Hurghada' },
      { id: 10, name: 'Mansoura' }
    ];
    
    return res.status(200).json({
      success: true,
      data: {
        governorates
      }
    });
  } catch (error) {
    console.error('Error in getAllGovernorates:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get districts by governorate ID
 */
exports.getDistrictsByGovernorate = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { governorateId } = req.params;
    
    if (!governorateId) {
      return res.status(400).json({ success: false, error: 'Governorate ID is required' });
    }
    
    console.log(`Fetching districts for governorate ID: ${governorateId}`);
    
    // This is a simplified version - in a real implementation, you would fetch from a database
    const districtsByGovernorate = {
      1: [ // Cairo
        { id: 101, name: 'Heliopolis' },
        { id: 102, name: 'Nasr City' },
        { id: 103, name: 'Maadi' },
        { id: 104, name: 'New Cairo' },
        { id: 105, name: 'Downtown' },
        { id: 106, name: 'Zamalek' },
        { id: 107, name: 'Dokki' },
        { id: 108, name: 'Mohandessin' }
      ],
      2: [ // Alexandria
        { id: 201, name: 'Montaza' },
        { id: 202, name: 'Sidi Gaber' },
        { id: 203, name: 'Smouha' },
        { id: 204, name: 'Glim' },
        { id: 205, name: 'Miami' },
        { id: 206, name: 'Agami' }
      ],
      3: [ // Giza
        { id: 301, name: 'Dokki' },
        { id: 302, name: 'Mohandessin' },
        { id: 303, name: 'Haram' },
        { id: 304, name: 'Faisal' },
        { id: 305, name: '6th of October' },
        { id: 306, name: 'Sheikh Zayed' }
      ],
      4: [ // Sharm El Sheikh
        { id: 401, name: 'Naama Bay' },
        { id: 402, name: 'Sharks Bay' },
        { id: 403, name: 'Nabq Bay' },
        { id: 404, name: 'Old Market' }
      ],
      5: [ // Luxor
        { id: 501, name: 'East Bank' },
        { id: 502, name: 'West Bank' },
        { id: 503, name: 'Karnak' }
      ],
      6: [ // Aswan
        { id: 601, name: 'Aswan City' },
        { id: 602, name: 'Elephantine Island' },
        { id: 603, name: 'Nubian Village' }
      ],
      7: [ // Port Said
        { id: 701, name: 'Al-Arab' },
        { id: 702, name: 'Al-Manakh' },
        { id: 703, name: 'Port Fouad' }
      ],
      8: [ // Suez
        { id: 801, name: 'Suez City' },
        { id: 802, name: 'Ain Sokhna' }
      ],
      9: [ // Hurghada
        { id: 901, name: 'Sekalla' },
        { id: 902, name: 'El Dahar' },
        { id: 903, name: 'El Gouna' },
        { id: 904, name: 'Sahl Hasheesh' }
      ],
      10: [ // Mansoura
        { id: 1001, name: 'Mansoura City' },
        { id: 1002, name: 'Talkha' },
        { id: 1003, name: 'Mit Ghamr' }
      ]
    };
    
    const districts = districtsByGovernorate[governorateId] || [];
    
    return res.status(200).json({
      success: true,
      data: {
        districts
      }
    });
  } catch (error) {
    console.error('Error in getDistrictsByGovernorate:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Get all locations (governorates with their districts)
 */
exports.getAllLocations = async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    console.log('Fetching all locations...');
    
    // This is a simplified version - in a real implementation, you would fetch from a database
    const locations = [
      { 
        id: 1, 
        name: 'Cairo',
        districts: [
          { id: 101, name: 'Heliopolis' },
          { id: 102, name: 'Nasr City' },
          { id: 103, name: 'Maadi' },
          { id: 104, name: 'New Cairo' },
          { id: 105, name: 'Downtown' },
          { id: 106, name: 'Zamalek' },
          { id: 107, name: 'Dokki' },
          { id: 108, name: 'Mohandessin' }
        ]
      },
      { 
        id: 2, 
        name: 'Alexandria',
        districts: [
          { id: 201, name: 'Montaza' },
          { id: 202, name: 'Sidi Gaber' },
          { id: 203, name: 'Smouha' },
          { id: 204, name: 'Glim' },
          { id: 205, name: 'Miami' },
          { id: 206, name: 'Agami' }
        ]
      },
      { 
        id: 3, 
        name: 'Giza',
        districts: [
          { id: 301, name: 'Dokki' },
          { id: 302, name: 'Mohandessin' },
          { id: 303, name: 'Haram' },
          { id: 304, name: 'Faisal' },
          { id: 305, name: '6th of October' },
          { id: 306, name: 'Sheikh Zayed' }
        ]
      },
      { 
        id: 4, 
        name: 'Sharm El Sheikh',
        districts: [
          { id: 401, name: 'Naama Bay' },
          { id: 402, name: 'Sharks Bay' },
          { id: 403, name: 'Nabq Bay' },
          { id: 404, name: 'Old Market' }
        ]
      },
      { 
        id: 5, 
        name: 'Luxor',
        districts: [
          { id: 501, name: 'East Bank' },
          { id: 502, name: 'West Bank' },
          { id: 503, name: 'Karnak' }
        ]
      }
    ];
    
    return res.status(200).json({
      success: true,
      data: {
        locations
      }
    });
  } catch (error) {
    console.error('Error in getAllLocations:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    if (connection) connection.release();
  }
};
