# LLog - Local Timeline Data Manager

[中文版本](README_ZH.md)

LLog is a lightweight, self-hosted timeline-based data management application that works both as a web application in your browser and with a local server for persistent storage. It allows you to manage events, topics, and tasks with a beautiful timeline interface.

## Features

- 📅 **Timeline-based Interface**: Visualize your events in a chronological timeline
- 🏷️ **Topic Management**: Organize events by topics for better categorization
- ✅ **Task Tracking**: Keep track of your to-do items with completion status
- 💾 **Dual Storage System**: 
  - Browser storage for offline use
  - Local server for persistent data storage
  - Automatic synchronization between both when server is available
- 🔄 **Automatic Backup**: Keeps last 30 backups of your data
- 📤 **Import/Export**: Easily migrate your data between installations
- 🌐 **Cross-platform**: Works on Windows, macOS, and Linux

## Use Cases

- Personal journal and event tracking
- Project management with timeline visualization
- Meeting notes and action item tracking
- Daily task management
- Research and idea organization

## Quick Start

### Option 1: Run Pre-built Executable (Recommended)

1. Download the pre-built executable for your platform from the [Releases](https://github.com/your-username/llog/releases) page
2. Run the executable:
   - Windows: Double-click `my-node-service.exe`
   - Linux/macOS: Run `./my-node-service` in terminal
3. Open your browser and navigate to http://127.0.0.1:3001
4. Start using LLog!

### Option 2: Run from Source Code

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

4. Open your browser and navigate to http://127.0.0.1:3001

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
   pkg server.js --targets node18-linux-x64 --output my-node-service
   pkg server.js --targets node18-win-x64 --output my-node-service.exe
   ```

## Project Structure

```
llog/
├── index.html          # Frontend client application
├── server.js           # Main server implementation
├── start.sh            # Interactive startup script
├── pack.sh             # Packaging script for executables
├── ecosystem.config.js # PM2 configuration for production
├── package.json        # Project dependencies and scripts
├── test-server.js      # API testing suite
├── data/               # Data storage directory
│   ├── llog_data.json  # Main data file
│   ├── backups/        # Automatic backups
│   └── exports/        # Exported data files
└── logs/               # Server logs (created at runtime)
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

## License

MIT License - see [LICENSE](LICENSE) file for details.