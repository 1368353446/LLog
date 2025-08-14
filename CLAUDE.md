# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is LLog, a local timeline-based data server and client application built with Node.js, Express, and vanilla JavaScript. The system manages timeline events, topics, and tasks with data persistence to JSON files. It includes automatic backup functionality, data export/import capabilities, and a dual storage system that works both in the browser and with a local server.

Key features:
- Frontend: A responsive HTML/JavaScript client that stores data in browser localStorage
- Backend: A Node.js/Express server that persists data to local JSON files
- Dual storage: Data is automatically synchronized between browser storage and local files when the server is available
- Automatic backup system (keeps last 30 backups)
- Data export/import functionality
- CORS enabled for cross-origin requests

## Common Development Commands

### Starting the Server
- `npm start` - Start the server in development mode
- `npm run dev` - Start the server with automatic restart on file changes (requires nodemon)
- `npm run pm2:start` - Start the server in production mode using PM2
- `./start.sh` - Interactive script to choose startup mode

### Testing
- `npm test` - Run server API tests (server must be running separately)
- `node test-server.js` - Alternative way to run tests

### Managing PM2 Process
- `npm run pm2:stop` - Stop the PM2 process
- `npm run pm2:restart` - Restart the PM2 process
- `npm run pm2:logs` - View PM2 logs
- `npm run pm2:monit` - Monitor PM2 processes

### Setup Commands
- `npm run setup` - Install dependencies and PM2 globally
- `npm run install:pm2` - Install PM2 globally
- `npm run install:nodemon` - Install nodemon globally

## Code Architecture

### Main Components
1. **index.html** - Frontend client application
   - Timeline-based UI for managing events, topics, and tasks
   - Browser localStorage for data persistence
   - Automatic connection detection to local server
   - Dual storage system that syncs with server when available

2. **server.js** - Core server implementation with Express.js
   - REST API endpoints for data management
   - File-based data persistence with automatic backups
   - Directory structure management
   - Health checks and server information endpoints

3. **test-server.js** - HTTP-based API testing suite
   - Comprehensive tests for all server endpoints
   - Test data generation and validation

4. **start.sh** - Interactive startup script
   - Environment validation
   - Dependency installation
   - Mode selection (dev, dev+watch, production)

5. **ecosystem.config.js** - PM2 process management configuration
   - Production deployment settings
   - Logging and restart policies

### Data Model
The system manages three main data entities stored in `data/llog_data.json`:
- **events**: Timeline events with timestamps
- **topics**: Topics that can be associated with events
- **tasks**: Task items that can be marked as done

### Key Features
- Automatic backup system (keeps last 30 backups)
- Data export/import functionality
- CORS enabled for cross-origin requests
- Health check and server info endpoints
- Graceful shutdown handling
- Dual storage system (browser + local files)

### Directory Structure
- `data/` - Main data storage directory
- `data/backups/` - Automatic backup files
- `data/exports/` - Exported data files
- `logs/` - Server logs (created at runtime)

### Environment Configuration
- `PORT` - Server port (default: 3001)
- `LLOG_DATA_DIR` - Data directory path (default: ./data)
- `NODE_ENV` - Environment (development/production)