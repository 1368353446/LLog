# LLog - Local Timeline Data Manager

[中文版本](README_ZH.md)

LLog is a lightweight, self-hosted timeline-based data management application that works both as a web application in your browser and with a local server for persistent storage. It allows you to manage events, topics, and tasks with a beautiful timeline interface.

## Features

- 📅 **Timeline-based Interface**: Visualize your events in a chronological timeline
- 🏷️ **Topic Management**: Organize events by topics for better categorization
- ✅ **Task Tracking**: Keep track of your to-do items with completion status
- 💾 **Dual Storage System**: 
  - Browser storage for offline use (works without server)
  - Local server for persistent data storage
  - Automatic synchronization between both when server is available
- 🔄 **Automatic Backup**: Keeps last 30 backups of your data
- 📤 **Import/Export**: Easily migrate your data between installations
- 🌐 **Cross-platform**: Works on Windows, macOS, and Linux

## How It Works

LLog can be used in two ways:

1. **Browser-only Mode**: 
   - Simply open `index.html` in your browser
   - All data is stored in your browser's localStorage
   - No server required, works completely offline
   - Perfect for quick usage and testing

2. **Server Mode** (for persistent local storage):
   - Run the local server to enable file-based data storage
   - Data is automatically synchronized between browser and local files
   - Provides backup and export capabilities
   - Works even when browser data is cleared

The frontend automatically detects whether the server is available and switches between modes accordingly.

## Quick Start

### Method 1: Direct Browser Usage (No Installation Required)

1. Simply open `index.html` in your browser
2. Start using LLog immediately - all data is saved in your browser
3. No server needed for basic functionality

### Method 2: With Local Server (For Persistent Storage)

You can start the local server in two ways:

**Option A: Using Pre-built Executable**
1. Download the pre-built executable for your platform from the [Releases](https://github.com/your-username/llog/releases) page
2. Run the executable
3. Open `index.html` in your browser
4. The app will automatically connect to the local server

**Option B: Running from Source Code**
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/llog.git
   cd llog
   ```

2. Install dependencies:
   ```bash
   npm run setup
   ```

3. Start the server:
   ```bash
   ./start.sh
   ```
   Or manually:
   ```bash
   npm start
   ```

4. Open `index.html` in your browser

## Use Cases

- Personal journal and event tracking
- Project management with timeline visualization
- Meeting notes and action item tracking
- Daily task management
- Research and idea organization

## Building from Source

If you want to build the project yourself:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/llog.git
   cd llog
   ```

2. Install dependencies:
   ```bash
   npm run setup
   ```

3. Install pkg for building executables:
   ```bash
   npm install -g pkg
   ```

4. Build executables:
   ```bash
   ./pack.sh
   ```
   Or manually:
   ```bash
   pkg server.js --targets node18-linux-x64 --output data_service
   pkg server.js --targets node18-win-x64 --output data_service.exe
   ```

## Project Structure

```
LLog/
├── app/                # Application directory
│   ├── index.html      # Frontend client application (main entry point)
│   ├── styles.css      # CSS styles for the frontend
│   ├── script.js       # JavaScript application logic
│   ├── server.js       # Main server implementation
│   ├── start.sh        # Interactive startup script
│   ├── pack.sh         # Packaging script for executables
│   ├── ecosystem.config.js # PM2 configuration for production
│   ├── package.json    # Project dependencies and scripts
│   └── test/           # Test directory
├── data/               # Data storage directory
│   ├── llog_data.json  # Main data file
│   ├── backups/        # Automatic backups
│   └── exports/        # Exported data files
└── README.md           # This file
```

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/data` - Get all data
- `POST /api/data` - Save data
- `POST /api/export` - Export data to file
- `POST /api/import` - Import data from latest export
- `GET /api/backups` - List backups
- `POST /api/restore/:filename` - Restore from backup
- `GET /api/info` - Server information

## Development

### Running in Development Mode

```bash
npm run dev
```

### Running in Production Mode (PM2)

```bash
npm run pm2:start
```

### Running Tests

```bash
# First start the server in another terminal
npm start

# Then run tests
npm test
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)
- `LLOG_DATA_DIR` - Data directory path (default: ./data)
- `NODE_ENV` - Environment (development/production)

