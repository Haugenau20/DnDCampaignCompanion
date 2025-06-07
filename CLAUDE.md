# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands
- **Start development**: `.\scripts\start-dev.ps1` (starts Firebase emulators + React dev server)
- **Stop development**: `.\scripts\start-dev.ps1 -Action stop`
- **Check status**: `.\scripts\start-dev.ps1 -Action status`
- **Restart services**: `.\scripts\start-dev.ps1 -Action restart`
- **Export emulator data**: `.\scripts\start-dev.ps1 -Action export`
- **Generate sample data**: `.\scripts\manage-dev-data.ps1 -Action generate`

### Development URLs
- **React App**: http://localhost:3000
- **Firebase Emulator UI**: http://localhost:4000
- **Individual Emulators**:
  - Auth: http://localhost:9099
  - Firestore: http://localhost:8080
  - Functions: http://localhost:5001

## Code Style Guidelines
- **TypeScript**: Use strict typing with interfaces/types in dedicated files
- **Theme System**: NEVER use hardcoded colors - always use theme variables
- **Formatting**: React components use PascalCase, utilities use camelCase
- **Quotes**: Use double quotes (") per ESLint config
- **Documentation**: Provide JSDoc comments for all functions, components, and complex variables
- **Components**: Components should focus on player-facing features (not DM tools)
- **Firebase**: Always use service classes from BaseFirebaseService

## Project Purpose
This is a tool for D&D players (not DMs) to collect and organize their shared campaign data including stories, rumors, NPCs, locations, and quests.

## Development Principles
- Follow KISS (Keep It Simple, Stupid): Write straightforward, uncomplicated solutions
- Apply YAGNI (You Aren't Gonna Need It): Don't add speculative features
- Adhere to SOLID Principles
- Maintain DRY (Don't Repeat Yourself): Avoid code duplication

## Architecture
- **State Management**: Use React Context API providers for state
- **Components**: Organized in core, features, layout, and shared directories
- **Firebase**: Access through context hooks like `useAuth()`, `useGroups()`, etc.
- **Feature Organization**: NPCs, Locations, Quests, Rumors, and Stories each have dedicated context providers and components