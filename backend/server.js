const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration for Production DB (read-only)
const prodConfig = {
  user: process.env.PROD_DB_USER,
  password: process.env.PROD_DB_PASSWORD,
  server: process.env.PROD_DB_SERVER,
  database: process.env.PROD_DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Database configuration for Local Dashboard DB
const localConfig = {
  user: process.env.LOCAL_DB_USER,
  password: process.env.LOCAL_DB_PASSWORD,
  server: process.env.LOCAL_DB_SERVER,
  database: process.env.LOCAL_DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pools
let prodPool = null;
let localPool = null;

/**
 * Connect to Production Database with retry logic
 */
async function connectToProductionDB(retryCount = 0) {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  try {
    console.log('Connecting to Production Database...');
    prodPool = await sql.connect(prodConfig);
    console.log('✓ Successfully connected to Production Database');
    return prodPool;
  } catch (err) {
    console.error(`✗ Failed to connect to Production Database (Attempt ${retryCount + 1}/${maxRetries}):`, err.message);

    if (retryCount < maxRetries) {
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectToProductionDB(retryCount + 1);
    } else {
      console.error('Max retries reached for Production Database connection');
      throw err;
    }
  }
}

/**
 * Connect to Local Dashboard Database with retry logic
 */
async function connectToLocalDB(retryCount = 0) {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  try {
    console.log('Connecting to Local Dashboard Database...');
    localPool = await new sql.ConnectionPool(localConfig).connect();
    console.log('✓ Successfully connected to Local Dashboard Database');
    return localPool;
  } catch (err) {
    console.error(`✗ Failed to connect to Local Dashboard Database (Attempt ${retryCount + 1}/${maxRetries}):`, err.message);

    if (retryCount < maxRetries) {
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectToLocalDB(retryCount + 1);
    } else {
      console.error('Max retries reached for Local Dashboard Database connection');
      throw err;
    }
  }
}

/**
 * Initialize Dashboard Table if it doesn't exist
 */
async function initializeDashboardTable() {
  try {
    const createTableQuery = `
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DashboardTable')
      BEGIN
        CREATE TABLE DashboardTable (
          ID INT PRIMARY KEY,
          Status NVARCHAR(255),
          DateTime DATETIME2,
          LastUpdated DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_datetime ON DashboardTable(DateTime DESC);
        PRINT 'DashboardTable created successfully';
      END
      ELSE
      BEGIN
        PRINT 'DashboardTable already exists';
      END
    `;

    await localPool.request().query(createTableQuery);
    console.log('✓ Dashboard table initialized');
  } catch (err) {
    console.error('✗ Error initializing dashboard table:', err.message);
    throw err;
  }
}

/**
 * Sync data from Production DB to Dashboard DB
 */
async function syncData() {
  try {
    console.log('Starting data sync...');

    // Check if connections are alive
    if (!prodPool || !prodPool.connected) {
      console.log('Production DB connection lost, reconnecting...');
      await connectToProductionDB();
    }

    if (!localPool || !localPool.connected) {
      console.log('Local DB connection lost, reconnecting...');
      await connectToLocalDB();
    }

    // Fetch data from Production DB
    // Note: Update the table name and columns according to your actual production schema
    const productionQuery = `
      SELECT TOP 100
        ID,
        Status,
        DateTime
      FROM ProductionTable
      ORDER BY DateTime DESC
    `;

    const prodResult = await prodPool.request().query(productionQuery);
    const rows = prodResult.recordset;

    console.log(`Fetched ${rows.length} rows from Production Database`);

    // Merge data into Dashboard DB
    if (rows.length > 0) {
      for (const row of rows) {
        const mergeQuery = `
          MERGE DashboardTable AS target
          USING (SELECT @id AS ID, @status AS Status, @dateTime AS DateTime) AS source
          ON target.ID = source.ID
          WHEN MATCHED THEN
            UPDATE SET
              Status = @status,
              DateTime = @dateTime,
              LastUpdated = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (ID, Status, DateTime, LastUpdated)
            VALUES (@id, @status, @dateTime, GETDATE());
        `;

        await localPool.request()
          .input('id', sql.Int, row.ID)
          .input('status', sql.NVarChar, row.Status)
          .input('dateTime', sql.DateTime2, row.DateTime)
          .query(mergeQuery);
      }

      console.log(`✓ Successfully synced ${rows.length} rows to Dashboard Database`);
    } else {
      console.log('⚠ No data to sync');
    }

  } catch (err) {
    console.error('✗ Error during data sync:', err.message);

    // Attempt to reconnect if connection was lost
    if (err.message.includes('Connection is closed') || err.message.includes('ConnectionError')) {
      console.log('Attempting to reconnect databases...');
      try {
        await connectToProductionDB();
        await connectToLocalDB();
      } catch (reconnectErr) {
        console.error('Failed to reconnect:', reconnectErr.message);
      }
    }
  }
}

/**
 * API endpoint to get dashboard data
 */
app.get('/api/data', async (req, res) => {
  try {
    // Check if local connection is alive
    if (!localPool || !localPool.connected) {
      console.log('Local DB connection lost, reconnecting...');
      await connectToLocalDB();
    }

    const query = `
      SELECT TOP 50
        ID,
        Status,
        DateTime,
        LastUpdated
      FROM DashboardTable
      ORDER BY DateTime DESC
    `;

    const result = await localPool.request().query(query);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('✗ Error fetching dashboard data:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: err.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: {
      production: prodPool && prodPool.connected ? 'connected' : 'disconnected',
      dashboard: localPool && localPool.connected ? 'connected' : 'disconnected'
    }
  };

  const isHealthy = prodPool?.connected && localPool?.connected;
  res.status(isHealthy ? 200 : 503).json(health);
});

/**
 * Start server and initialize connections
 */
async function startServer() {
  try {
    // Connect to both databases
    await connectToProductionDB();
    await connectToLocalDB();

    // Initialize dashboard table
    await initializeDashboardTable();

    // Perform initial sync
    await syncData();

    // Set up periodic sync every 10 seconds
    setInterval(syncData, 10000);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}/api/data`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔄 Auto-sync interval: 10 seconds`);
      console.log(`========================================\n`);
    });

  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  if (prodPool) await prodPool.close();
  if (localPool) await localPool.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  if (prodPool) await prodPool.close();
  if (localPool) await localPool.close();
  process.exit(0);
});

// Start the server
startServer();
