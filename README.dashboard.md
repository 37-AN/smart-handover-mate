# MSSQL Real-Time Dashboard System

A full-stack real-time dashboard system that connects to Microsoft SQL Server, syncs production data to a local dashboard database, and displays it in a beautiful React web interface.

## 📋 Features

- **Real-Time Data Sync**: Automatically syncs production data every 10 seconds
- **Live Dashboard**: React frontend with auto-refresh every 5 seconds
- **RESTful API**: Express backend with health check and data endpoints
- **Fault Tolerant**: Automatic database reconnection on connection loss
- **Docker Ready**: Full Docker and Docker Compose support
- **Beautiful UI**: Modern, responsive interface built with TailwindCSS
- **Connection Monitoring**: Real-time connection status indicators

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Production    │         │   Node.js API    │         │  React Frontend  │
│   MSSQL DB      │────────▶│   (Port 5000)    │◀────────│   (Port 3000)    │
│  (Read-Only)    │ 10s sync│   + Dashboard DB │  5s poll│  Auto-refresh UI │
└─────────────────┘         └──────────────────┘         └──────────────────┘
```

## 📁 Project Structure

```
/
├── backend/
│   ├── server.js              # Express server with MSSQL sync logic
│   ├── package.json           # Backend dependencies
│   ├── .env.example           # Environment variables template
│   ├── Dockerfile             # Backend container configuration
│   └── .dockerignore          # Docker ignore rules
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── App.css            # Component styles
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles with Tailwind
│   ├── index.html             # HTML template
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # TailwindCSS configuration
│   ├── postcss.config.js      # PostCSS configuration
│   ├── .env.example           # Frontend environment template
│   ├── Dockerfile             # Frontend container configuration
│   └── .dockerignore          # Docker ignore rules
├── docker-compose.yml         # Multi-container orchestration
├── .env.dashboard.example     # Root environment template
└── README.dashboard.md        # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (for local development)
- **Docker & Docker Compose** (for containerized deployment)
- **MSSQL Server** (Production and Dashboard databases)
- **Network Access** to both database servers

### Option 1: Run with Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.dashboard.example .env

   # Edit .env with your database credentials
   nano .env  # or use your preferred editor
   ```

   Update the following values in `.env`:
   ```env
   # Production Database (Read-Only)
   PROD_DB_USER=your_prod_username
   PROD_DB_PASSWORD=your_prod_password
   PROD_DB_SERVER=192.168.0.10
   PROD_DB_DATABASE=ProductionDB

   # Local Dashboard Database
   LOCAL_DB_USER=your_local_username
   LOCAL_DB_PASSWORD=your_local_password
   LOCAL_DB_SERVER=localhost
   LOCAL_DB_DATABASE=DashboardDB
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the dashboard**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api/data
   - Health Check: http://localhost:5000/api/health

5. **View logs**
   ```bash
   # All services
   docker-compose logs -f

   # Backend only
   docker-compose logs -f backend

   # Frontend only
   docker-compose logs -f frontend
   ```

6. **Stop the services**
   ```bash
   docker-compose down
   ```

### Option 2: Run Locally (Development)

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the server**
   ```bash
   npm start

   # Or with auto-reload during development
   npm run dev
   ```

   The backend will start on http://localhost:5000

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   # Edit VITE_API_URL if your backend is on a different URL
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will start on http://localhost:3000

## 🗄️ Database Setup

### Dashboard Database Schema

The backend automatically creates the `DashboardTable` if it doesn't exist:

```sql
CREATE TABLE DashboardTable (
    ID INT PRIMARY KEY,
    Status NVARCHAR(255),
    DateTime DATETIME2,
    LastUpdated DATETIME2 DEFAULT GETDATE()
);

CREATE INDEX idx_datetime ON DashboardTable(DateTime DESC);
```

### Production Database Requirements

Your production database should have a table named `ProductionTable` with the following structure:

```sql
CREATE TABLE ProductionTable (
    ID INT PRIMARY KEY,
    Status NVARCHAR(255),
    DateTime DATETIME2
);
```

**Note**: You can customize the table name and columns by editing the SQL queries in `backend/server.js`.

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Server port
PORT=5000

# Production DB (Read-Only)
PROD_DB_USER=sa
PROD_DB_PASSWORD=your_password
PROD_DB_SERVER=192.168.0.10
PROD_DB_DATABASE=ProductionDB

# Dashboard DB
LOCAL_DB_USER=sa
LOCAL_DB_PASSWORD=your_password
LOCAL_DB_SERVER=localhost
LOCAL_DB_DATABASE=DashboardDB
```

### Frontend Configuration

Edit `frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000
```

### Sync Interval Configuration

To change sync intervals, edit `backend/server.js`:

```javascript
// Current: sync every 10 seconds
setInterval(syncData, 10000);  // Change 10000 to desired milliseconds
```

For frontend refresh interval, edit `frontend/src/App.jsx`:

```javascript
// Current: refresh every 5 seconds
const intervalId = setInterval(fetchData, 5000);  // Change 5000 to desired milliseconds
```

## 📡 API Endpoints

### GET /api/data

Returns the last 50 rows from the dashboard database.

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "ID": 1,
      "Status": "Active",
      "DateTime": "2024-01-15T10:30:00.000Z",
      "LastUpdated": "2024-01-15T10:35:00.000Z"
    }
  ],
  "timestamp": "2024-01-15T10:35:05.000Z"
}
```

### GET /api/health

Health check endpoint showing database connection status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:35:05.000Z",
  "connections": {
    "production": "connected",
    "dashboard": "connected"
  }
}
```

## 🔍 Monitoring and Troubleshooting

### Check Backend Logs

```bash
# Docker
docker-compose logs -f backend

# Local
# Logs appear in the terminal where you ran npm start
```

### Check Frontend Logs

```bash
# Docker
docker-compose logs -f frontend

# Local
# Logs appear in browser console (F12)
```

### Common Issues

#### Backend can't connect to databases

1. Verify database credentials in `.env`
2. Check network connectivity to database servers
3. Ensure firewall allows connections
4. Verify SQL Server allows remote connections
5. Check SQL Server authentication mode (SQL Server and Windows Authentication)

#### Frontend shows "Disconnected"

1. Verify backend is running: `curl http://localhost:5000/api/health`
2. Check `VITE_API_URL` in frontend `.env`
3. Check browser console for CORS errors
4. Ensure backend CORS is properly configured

#### Data not syncing

1. Check backend logs for sync errors
2. Verify production table exists and has data
3. Check database permissions (backend needs INSERT/UPDATE on dashboard DB)
4. Verify table schema matches expected structure

#### Docker containers keep restarting

1. Check container logs: `docker-compose logs backend`
2. Verify `.env` file exists and has correct values
3. Check database connectivity from Docker network
4. Ensure database servers are accessible from Docker containers

## 🛠️ Customization

### Changing Table Names

Edit the SQL queries in `backend/server.js`:

```javascript
// Change 'ProductionTable' to your table name
const productionQuery = `
  SELECT TOP 100
    ID, Status, DateTime
  FROM YourProductionTableName
  ORDER BY DateTime DESC
`;

// Change 'DashboardTable' to your preferred name
const createTableQuery = `
  IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'YourDashboardTableName')
  ...
`;
```

### Adding More Columns

1. Update the SQL queries in `backend/server.js`
2. Modify the table creation logic
3. Update the merge/UPSERT query
4. Add new columns to the frontend table in `frontend/src/App.jsx`

### Styling the Frontend

The frontend uses TailwindCSS. Edit `frontend/src/App.jsx` to customize styles:

```javascript
// Example: Change header color
<header className="bg-blue-600 shadow-md">  // Change bg-blue-600 to your color
```

## 📦 Production Deployment

### Building for Production

#### Frontend Production Build

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`. Serve it with nginx or any static file server.

#### Backend Production

For production, consider:

1. Using environment-specific `.env` files
2. Setting up proper logging (Winston, Pino)
3. Using a process manager (PM2, systemd)
4. Setting up monitoring (Prometheus, New Relic)
5. Implementing rate limiting
6. Adding authentication/authorization

### Docker Production Build

Create optimized production images:

**Frontend Production Dockerfile:**

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 Security Considerations

1. **Database Credentials**: Store in environment variables, never in code
2. **Network Security**: Use VPN or private networks for database connections
3. **SQL Injection**: Parameterized queries are used throughout
4. **CORS**: Configure appropriately for production
5. **HTTPS**: Use reverse proxy (nginx) with SSL certificates
6. **Authentication**: Add JWT or OAuth for production use
7. **Rate Limiting**: Implement API rate limiting

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Test database connections
npm start

# Check health endpoint
curl http://localhost:5000/api/health

# Check data endpoint
curl http://localhost:5000/api/data
```

### Frontend Testing

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 License

MIT License - feel free to use this project for any purpose.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review backend logs for connection issues
- Check browser console for frontend errors
- Verify database connectivity and credentials

## 🎯 Roadmap

Future enhancements:
- [ ] User authentication and authorization
- [ ] Multiple dashboard views
- [ ] Data filtering and search
- [ ] Export to CSV/Excel
- [ ] Real-time WebSocket updates
- [ ] Dashboard customization
- [ ] Alert and notification system
- [ ] Historical data charts
- [ ] Mobile responsive improvements
- [ ] Dark mode theme

---

**Built with ❤️ using React, Node.js, Express, and Microsoft SQL Server**
